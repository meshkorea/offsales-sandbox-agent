// @ts-nocheck
import { randomUUID } from "node:crypto";
import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { Loop } from "rivetkit/workflow";
import type { AgentType, TaskRecord, TaskSummary, ProviderId, RepoOverview, RepoStackAction, RepoStackActionResult } from "@sandbox-agent/foundry-shared";
import { getActorRuntimeContext } from "../context.js";
import { getOrCreateGithubState, getTask, getOrCreateTask, getOrCreateHistory, selfRepository } from "../handles.js";
import { isActorNotFoundError, logActorWarning, resolveErrorMessage } from "../logging.js";
import { foundryRepoClonePath } from "../../services/foundry-paths.js";
import { resolveWorkspaceGithubAuth } from "../../services/github-auth.js";
import { expectQueueResponse } from "../../services/queue.js";
import { withRepoGitLock } from "../../services/repo-git-lock.js";
import { branches, taskIndex, repoMeta } from "./db/schema.js";
import { deriveFallbackTitle } from "../../services/create-flow.js";
import { normalizeBaseBranchName } from "../../integrations/git-spice/index.js";
import { parentLookupFromStack } from "./stack-model.js";
import { sortBranchesForOverview } from "./stack-model.js";
import { taskWorkflowQueueName } from "../task/workflow/index.js";

interface EnsureProjectCommand {
  remoteUrl: string;
}

interface EnsureProjectResult {
  localPath: string;
}

interface CreateTaskCommand {
  taskId?: string | null;
  task: string;
  providerId: ProviderId;
  agentType: AgentType | null;
  explicitTitle: string | null;
  explicitBranchName: string | null;
  initialPrompt: string | null;
  onBranch: string | null;
}

interface HydrateTaskIndexCommand {}

interface ListReservedBranchesCommand {}

interface RegisterTaskBranchCommand {
  taskId: string;
  branchName: string;
  requireExistingRemote?: boolean;
}

interface ListTaskSummariesCommand {
  includeArchived?: boolean;
}

interface GetTaskEnrichedCommand {
  taskId: string;
}

interface GetPullRequestForBranchCommand {
  branchName: string;
}

interface ApplyGithubPullRequestStateCommand {
  branchName: string;
  state: string;
}

interface RepoOverviewCommand {}

interface RunRepoStackActionCommand {
  action: RepoStackAction;
  branchName?: string;
  parentBranch?: string;
}

const PROJECT_QUEUE_NAMES = [
  "project.command.ensure",
  "project.command.hydrateTaskIndex",
  "project.command.createTask",
  "project.command.registerTaskBranch",
  "project.command.runRepoStackAction",
] as const;

type ProjectQueueName = (typeof PROJECT_QUEUE_NAMES)[number];

export { PROJECT_QUEUE_NAMES };

export function projectWorkflowQueueName(name: ProjectQueueName): ProjectQueueName {
  return name;
}

async function ensureLocalClone(c: any, remoteUrl: string): Promise<string> {
  const { config, driver } = getActorRuntimeContext();
  const localPath = foundryRepoClonePath(config, c.state.workspaceId, c.state.repoId);
  const auth = await resolveWorkspaceGithubAuth(c, c.state.workspaceId);
  await driver.git.ensureCloned(remoteUrl, localPath, { githubToken: auth?.githubToken ?? null });
  c.state.localPath = localPath;
  return localPath;
}

async function refreshRepositoryBranches(c: any, localPath: string): Promise<void> {
  const { driver } = getActorRuntimeContext();
  const at = Date.now();
  const auth = await resolveWorkspaceGithubAuth(c, c.state.workspaceId);

  const enrichedItems = await withRepoGitLock(localPath, async () => {
    await driver.git.fetch(localPath, { githubToken: auth?.githubToken ?? null });
    const remoteBranches = await driver.git.listRemoteBranches(localPath);
    const stackEntries = await driver.stack.listStack(localPath).catch(() => []);
    const parentByBranch = parentLookupFromStack(stackEntries);
    const baseRef = await driver.git.remoteDefaultBaseRef(localPath);
    const baseSha = await driver.git.revParse(localPath, baseRef).catch(() => "");

    return await Promise.all(
      remoteBranches.map(async (branch) => {
        const [diffStat, headSha, conflictsWithMain] = await Promise.all([
          driver.git.diffStatForBranch(localPath, branch.branchName).catch(() => null),
          driver.git.revParse(localPath, `origin/${branch.branchName}`).catch(() => ""),
          driver.git.conflictsWithMain(localPath, branch.branchName).catch(() => false),
        ]);

        return {
          branchName: branch.branchName,
          commitSha: branch.commitSha,
          parentBranch: parentByBranch.get(branch.branchName) ?? null,
          trackedInStack: parentByBranch.has(branch.branchName),
          diffStat,
          hasUnpushed: Boolean(baseSha && headSha && headSha !== baseSha),
          conflictsWithMain,
        };
      }),
    );
  });

  const incoming = new Set(enrichedItems.map((item) => item.branchName));
  for (const item of enrichedItems) {
    const existing = await c.db
      .select({
        firstSeenAt: branches.firstSeenAt,
      })
      .from(branches)
      .where(eq(branches.branchName, item.branchName))
      .get();

    await c.db
      .insert(branches)
      .values({
        branchName: item.branchName,
        commitSha: item.commitSha,
        parentBranch: item.parentBranch,
        trackedInStack: item.trackedInStack ? 1 : 0,
        diffStat: item.diffStat ?? null,
        hasUnpushed: item.hasUnpushed ? 1 : 0,
        conflictsWithMain: item.conflictsWithMain ? 1 : 0,
        firstSeenAt: existing?.firstSeenAt ?? at,
        lastSeenAt: at,
        updatedAt: at,
      })
      .onConflictDoUpdate({
        target: branches.branchName,
        set: {
          commitSha: item.commitSha,
          parentBranch: item.parentBranch,
          trackedInStack: item.trackedInStack ? 1 : 0,
          diffStat: item.diffStat ?? null,
          hasUnpushed: item.hasUnpushed ? 1 : 0,
          conflictsWithMain: item.conflictsWithMain ? 1 : 0,
          firstSeenAt: existing?.firstSeenAt ?? at,
          lastSeenAt: at,
          updatedAt: at,
        },
      })
      .run();
  }

  const existingRows = await c.db.select({ branchName: branches.branchName }).from(branches).all();
  for (const row of existingRows) {
    if (incoming.has(row.branchName)) {
      continue;
    }
    await c.db.delete(branches).where(eq(branches.branchName, row.branchName)).run();
  }
}

async function deleteStaleTaskIndexRow(c: any, taskId: string): Promise<void> {
  try {
    await c.db.delete(taskIndex).where(eq(taskIndex.taskId, taskId)).run();
  } catch {
    // Best-effort cleanup only; preserve the original caller flow.
  }
}

function isStaleTaskReferenceError(error: unknown): boolean {
  const message = resolveErrorMessage(error);
  return isActorNotFoundError(error) || message.startsWith("Task not found:");
}

async function ensureTaskIndexHydrated(c: any): Promise<void> {
  if (c.state.taskIndexHydrated) {
    return;
  }

  const existing = await c.db.select({ taskId: taskIndex.taskId }).from(taskIndex).limit(1).get();

  if (existing) {
    c.state.taskIndexHydrated = true;
    return;
  }

  // Migration path for old project actors that only tracked tasks in history.
  try {
    const history = await getOrCreateHistory(c, c.state.workspaceId, c.state.repoId);
    const rows = await history.list({ limit: 5_000 });
    const seen = new Set<string>();
    let skippedMissingTaskActors = 0;

    for (const row of rows) {
      if (!row.taskId || seen.has(row.taskId)) {
        continue;
      }
      seen.add(row.taskId);

      try {
        const h = getTask(c, c.state.workspaceId, c.state.repoId, row.taskId);
        await h.get();
      } catch (error) {
        if (isStaleTaskReferenceError(error)) {
          skippedMissingTaskActors += 1;
          continue;
        }
        throw error;
      }

      await c.db
        .insert(taskIndex)
        .values({
          taskId: row.taskId,
          branchName: row.branchName,
          createdAt: row.createdAt,
          updatedAt: row.createdAt,
        })
        .onConflictDoNothing()
        .run();
    }

    if (skippedMissingTaskActors > 0) {
      logActorWarning("project", "skipped missing tasks while hydrating index", {
        workspaceId: c.state.workspaceId,
        repoId: c.state.repoId,
        skippedMissingTaskActors,
      });
    }
  } catch (error) {
    logActorWarning("project", "task index hydration from history failed", {
      workspaceId: c.state.workspaceId,
      repoId: c.state.repoId,
      error: resolveErrorMessage(error),
    });
  }

  c.state.taskIndexHydrated = true;
}

async function ensureProjectReady(c: any): Promise<string> {
  if (!c.state.remoteUrl) {
    throw new Error("project remoteUrl is not initialized");
  }
  if (!c.state.localPath) {
    await ensureLocalClone(c, c.state.remoteUrl);
  }
  if (!c.state.localPath) {
    throw new Error("project local repo is not initialized");
  }
  await refreshRepositoryBranches(c, c.state.localPath);
  return c.state.localPath;
}

async function ensureProjectReadyForRead(c: any): Promise<string> {
  if (!c.state.remoteUrl) {
    throw new Error("project remoteUrl is not initialized");
  }

  if (!c.state.localPath) {
    const result = await projectActions.ensure(c, { remoteUrl: c.state.remoteUrl });
    const localPath = result?.localPath ?? c.state.localPath;
    if (!localPath) {
      throw new Error("project local repo is not initialized");
    }
    return localPath;
  }

  return c.state.localPath;
}

async function ensureTaskIndexHydratedForRead(c: any): Promise<void> {
  if (c.state.taskIndexHydrated) {
    return;
  }
  await projectActions.hydrateTaskIndex(c, {});
}

async function forceProjectSync(c: any, localPath: string): Promise<void> {
  await refreshRepositoryBranches(c, localPath);
}

async function enrichTaskRecord(c: any, record: TaskRecord): Promise<TaskRecord> {
  const branchName = record.branchName;
  const br =
    branchName != null
      ? await c.db
          .select({
            diffStat: branches.diffStat,
            hasUnpushed: branches.hasUnpushed,
            conflictsWithMain: branches.conflictsWithMain,
            parentBranch: branches.parentBranch,
          })
          .from(branches)
          .where(eq(branches.branchName, branchName))
          .get()
      : null;

  const githubState = await getOrCreateGithubState(c, c.state.workspaceId);
  const pr = branchName != null ? await githubState.getPullRequestForBranch({ repoId: c.state.repoId, branchName }) : null;

  return {
    ...record,
    diffStat: br?.diffStat ?? null,
    hasUnpushed: br?.hasUnpushed != null ? String(br.hasUnpushed) : null,
    conflictsWithMain: br?.conflictsWithMain != null ? String(br.conflictsWithMain) : null,
    parentBranch: br?.parentBranch ?? null,
    prUrl: pr?.url ?? null,
    prAuthor: null,
    ciStatus: null,
    reviewStatus: null,
    reviewer: null,
  };
}

async function ensureProjectMutation(c: any, cmd: EnsureProjectCommand): Promise<EnsureProjectResult> {
  c.state.remoteUrl = cmd.remoteUrl;
  const localPath = await ensureLocalClone(c, cmd.remoteUrl);

  await c.db
    .insert(repoMeta)
    .values({
      id: 1,
      remoteUrl: cmd.remoteUrl,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: repoMeta.id,
      set: {
        remoteUrl: cmd.remoteUrl,
        updatedAt: Date.now(),
      },
    })
    .run();

  await refreshRepositoryBranches(c, localPath);
  return { localPath };
}

async function hydrateTaskIndexMutation(c: any, _cmd?: HydrateTaskIndexCommand): Promise<void> {
  await ensureTaskIndexHydrated(c);
}

async function createTaskMutation(c: any, cmd: CreateTaskCommand): Promise<TaskRecord> {
  const localPath = await ensureProjectReady(c);
  const onBranch = cmd.onBranch?.trim() || null;
  const initialBranchName = onBranch;
  const initialTitle = onBranch ? deriveFallbackTitle(cmd.task, cmd.explicitTitle ?? undefined) : null;
  const taskId = cmd.taskId?.trim() || randomUUID();
  const now = Date.now();

  if (onBranch) {
    await forceProjectSync(c, localPath);

    const branchRow = await c.db.select({ branchName: branches.branchName }).from(branches).where(eq(branches.branchName, onBranch)).get();
    if (!branchRow) {
      throw new Error(`Branch not found in repo snapshot: ${onBranch}`);
    }

    await registerTaskBranchMutation(c, {
      taskId,
      branchName: onBranch,
      requireExistingRemote: true,
    });
  }

  let task: Awaited<ReturnType<typeof getOrCreateTask>>;
  try {
    task = await getOrCreateTask(c, c.state.workspaceId, c.state.repoId, taskId, {
      workspaceId: c.state.workspaceId,
      repoId: c.state.repoId,
      taskId,
      repoRemote: c.state.remoteUrl,
      repoLocalPath: localPath,
      branchName: initialBranchName,
      title: initialTitle,
      task: cmd.task,
      providerId: cmd.providerId,
      agentType: cmd.agentType,
      explicitTitle: onBranch ? null : cmd.explicitTitle,
      explicitBranchName: onBranch ? null : cmd.explicitBranchName,
      initialPrompt: cmd.initialPrompt,
    });
  } catch (error) {
    if (onBranch) {
      await c.db
        .delete(taskIndex)
        .where(eq(taskIndex.taskId, taskId))
        .run()
        .catch(() => {});
    }
    throw error;
  }

  if (!onBranch) {
    await c.db
      .insert(taskIndex)
      .values({
        taskId,
        branchName: initialBranchName,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .run();
  }

  await task.send(
    taskWorkflowQueueName("task.command.initialize"),
    { providerId: cmd.providerId },
    {
      wait: false,
    },
  );

  const history = await getOrCreateHistory(c, c.state.workspaceId, c.state.repoId);
  void history
    .append({
      kind: "task.created",
      taskId,
      payload: {
        repoId: c.state.repoId,
        providerId: cmd.providerId,
      },
    })
    .catch((error: unknown) => {
      logActorWarning("project", "failed appending task.created history event", {
        workspaceId: c.state.workspaceId,
        repoId: c.state.repoId,
        taskId,
        error: resolveErrorMessage(error),
      });
    });

  return {
    workspaceId: c.state.workspaceId,
    repoId: c.state.repoId,
    repoRemote: c.state.remoteUrl,
    taskId,
    branchName: initialBranchName,
    title: initialTitle,
    task: cmd.task,
    providerId: cmd.providerId,
    status: "init_enqueue_provision",
    statusMessage: "provision queued",
    activeSandboxId: null,
    activeSessionId: null,
    sandboxes: [],
    agentType: cmd.agentType ?? null,
    prSubmitted: false,
    diffStat: null,
    hasUnpushed: null,
    conflictsWithMain: null,
    parentBranch: null,
    prUrl: null,
    prAuthor: null,
    ciStatus: null,
    reviewStatus: null,
    reviewer: null,
    createdAt: now,
    updatedAt: now,
  } satisfies TaskRecord;
}

async function registerTaskBranchMutation(c: any, cmd: RegisterTaskBranchCommand): Promise<{ branchName: string; headSha: string }> {
  const localPath = await ensureProjectReady(c);

  const branchName = cmd.branchName.trim();
  const requireExistingRemote = cmd.requireExistingRemote === true;
  if (!branchName) {
    throw new Error("branchName is required");
  }

  await ensureTaskIndexHydrated(c);

  const existingOwner = await c.db
    .select({ taskId: taskIndex.taskId })
    .from(taskIndex)
    .where(and(eq(taskIndex.branchName, branchName), ne(taskIndex.taskId, cmd.taskId)))
    .get();

  if (existingOwner) {
    let ownerMissing = false;
    try {
      const h = getTask(c, c.state.workspaceId, c.state.repoId, existingOwner.taskId);
      await h.get();
    } catch (error) {
      if (isStaleTaskReferenceError(error)) {
        ownerMissing = true;
        await deleteStaleTaskIndexRow(c, existingOwner.taskId);
        logActorWarning("project", "pruned stale task index row during branch registration", {
          workspaceId: c.state.workspaceId,
          repoId: c.state.repoId,
          taskId: existingOwner.taskId,
          branchName,
        });
      } else {
        throw error;
      }
    }
    if (!ownerMissing) {
      throw new Error(`branch is already assigned to a different task: ${branchName}`);
    }
  }

  const { driver } = getActorRuntimeContext();

  let headSha = "";
  let trackedInStack = false;
  let parentBranch: string | null = null;
  const auth = await resolveWorkspaceGithubAuth(c, c.state.workspaceId);

  await withRepoGitLock(localPath, async () => {
    await driver.git.fetch(localPath, { githubToken: auth?.githubToken ?? null });
    const baseRef = await driver.git.remoteDefaultBaseRef(localPath);
    const normalizedBase = normalizeBaseBranchName(baseRef);

    if (requireExistingRemote) {
      try {
        headSha = await driver.git.revParse(localPath, `origin/${branchName}`);
      } catch {
        throw new Error(`Remote branch not found: ${branchName}`);
      }
    } else {
      await driver.git.ensureRemoteBranch(localPath, branchName, { githubToken: auth?.githubToken ?? null });
      await driver.git.fetch(localPath, { githubToken: auth?.githubToken ?? null });
      try {
        headSha = await driver.git.revParse(localPath, `origin/${branchName}`);
      } catch {
        headSha = await driver.git.revParse(localPath, baseRef);
      }
    }

    if (await driver.stack.available(localPath).catch(() => false)) {
      let stackRows = await driver.stack.listStack(localPath).catch(() => []);
      let stackRow = stackRows.find((entry) => entry.branchName === branchName);

      if (!stackRow) {
        try {
          await driver.stack.trackBranch(localPath, branchName, normalizedBase);
        } catch (error) {
          logActorWarning("project", "stack track failed while registering branch", {
            workspaceId: c.state.workspaceId,
            repoId: c.state.repoId,
            branchName,
            error: resolveErrorMessage(error),
          });
        }
        stackRows = await driver.stack.listStack(localPath).catch(() => []);
        stackRow = stackRows.find((entry) => entry.branchName === branchName);
      }

      trackedInStack = Boolean(stackRow);
      parentBranch = stackRow?.parentBranch ?? null;
    }
  });

  const now = Date.now();
  await c.db
    .insert(branches)
    .values({
      branchName,
      commitSha: headSha,
      parentBranch,
      trackedInStack: trackedInStack ? 1 : 0,
      firstSeenAt: now,
      lastSeenAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: branches.branchName,
      set: {
        commitSha: headSha,
        parentBranch,
        trackedInStack: trackedInStack ? 1 : 0,
        lastSeenAt: now,
        updatedAt: now,
      },
    })
    .run();

  await c.db
    .insert(taskIndex)
    .values({
      taskId: cmd.taskId,
      branchName,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: taskIndex.taskId,
      set: {
        branchName,
        updatedAt: now,
      },
    })
    .run();

  return { branchName, headSha };
}

async function runRepoStackActionMutation(c: any, cmd: RunRepoStackActionCommand): Promise<RepoStackActionResult> {
  const localPath = await ensureProjectReady(c);
  await ensureTaskIndexHydrated(c);

  const { driver } = getActorRuntimeContext();
  const at = Date.now();
  const action = cmd.action;
  const branchName = cmd.branchName?.trim() || null;
  const parentBranch = cmd.parentBranch?.trim() || null;

  if (!(await driver.stack.available(localPath).catch(() => false))) {
    return {
      action,
      executed: false,
      message: "git-spice is not available for this repo",
      at,
    };
  }

  if ((action === "restack_subtree" || action === "rebase_branch" || action === "reparent_branch") && !branchName) {
    throw new Error(`branchName is required for action: ${action}`);
  }
  if (action === "reparent_branch" && !parentBranch) {
    throw new Error("parentBranch is required for action: reparent_branch");
  }

  await forceProjectSync(c, localPath);

  if (branchName) {
    const row = await c.db.select({ branchName: branches.branchName }).from(branches).where(eq(branches.branchName, branchName)).get();
    if (!row) {
      throw new Error(`Branch not found in repo snapshot: ${branchName}`);
    }
  }

  if (action === "reparent_branch") {
    if (!parentBranch) {
      throw new Error("parentBranch is required for action: reparent_branch");
    }
    if (parentBranch === branchName) {
      throw new Error("parentBranch must be different from branchName");
    }
    const parentRow = await c.db.select({ branchName: branches.branchName }).from(branches).where(eq(branches.branchName, parentBranch)).get();
    if (!parentRow) {
      throw new Error(`Parent branch not found in repo snapshot: ${parentBranch}`);
    }
  }

  await withRepoGitLock(localPath, async () => {
    if (action === "sync_repo") {
      await driver.stack.syncRepo(localPath);
    } else if (action === "restack_repo") {
      await driver.stack.restackRepo(localPath);
    } else if (action === "restack_subtree") {
      await driver.stack.restackSubtree(localPath, branchName!);
    } else if (action === "rebase_branch") {
      await driver.stack.rebaseBranch(localPath, branchName!);
    } else if (action === "reparent_branch") {
      await driver.stack.reparentBranch(localPath, branchName!, parentBranch!);
    } else {
      throw new Error(`Unsupported repo stack action: ${action}`);
    }
  });

  await forceProjectSync(c, localPath);

  try {
    const history = await getOrCreateHistory(c, c.state.workspaceId, c.state.repoId);
    await history.append({
      kind: "repo.stack_action",
      branchName: branchName ?? null,
      payload: {
        action,
        branchName: branchName ?? null,
        parentBranch: parentBranch ?? null,
      },
    });
  } catch (error) {
    logActorWarning("project", "failed appending repo stack history event", {
      workspaceId: c.state.workspaceId,
      repoId: c.state.repoId,
      action,
      error: resolveErrorMessage(error),
    });
  }

  return {
    action,
    executed: true,
    message: `stack action executed: ${action}`,
    at,
  };
}

export async function runProjectWorkflow(ctx: any): Promise<void> {
  await ctx.loop("project-command-loop", async (loopCtx: any) => {
    const msg = await loopCtx.queue.next("next-project-command", {
      names: [...PROJECT_QUEUE_NAMES],
      completable: true,
    });
    if (!msg) {
      return Loop.continue(undefined);
    }

    if (msg.name === "project.command.ensure") {
      const result = await loopCtx.step({
        name: "project-ensure",
        timeout: 5 * 60_000,
        run: async () => ensureProjectMutation(loopCtx, msg.body as EnsureProjectCommand),
      });
      await msg.complete(result);
      return Loop.continue(undefined);
    }

    if (msg.name === "project.command.hydrateTaskIndex") {
      await loopCtx.step("project-hydrate-task-index", async () => hydrateTaskIndexMutation(loopCtx, msg.body as HydrateTaskIndexCommand));
      await msg.complete({ ok: true });
      return Loop.continue(undefined);
    }

    if (msg.name === "project.command.createTask") {
      const result = await loopCtx.step({
        name: "project-create-task",
        timeout: 12 * 60_000,
        run: async () => createTaskMutation(loopCtx, msg.body as CreateTaskCommand),
      });
      await msg.complete(result);
      return Loop.continue(undefined);
    }

    if (msg.name === "project.command.registerTaskBranch") {
      const result = await loopCtx.step({
        name: "project-register-task-branch",
        timeout: 5 * 60_000,
        run: async () => registerTaskBranchMutation(loopCtx, msg.body as RegisterTaskBranchCommand),
      });
      await msg.complete(result);
      return Loop.continue(undefined);
    }

    if (msg.name === "project.command.runRepoStackAction") {
      const result = await loopCtx.step({
        name: "project-run-repo-stack-action",
        timeout: 12 * 60_000,
        run: async () => runRepoStackActionMutation(loopCtx, msg.body as RunRepoStackActionCommand),
      });
      await msg.complete(result);
      return Loop.continue(undefined);
    }

    return Loop.continue(undefined);
  });
}

export const projectActions = {
  async ensure(c: any, cmd: EnsureProjectCommand): Promise<EnsureProjectResult> {
    const self = selfRepository(c);
    return expectQueueResponse<EnsureProjectResult>(
      await self.send(projectWorkflowQueueName("project.command.ensure"), cmd, {
        wait: true,
        timeout: 5 * 60_000,
      }),
    );
  },

  async createTask(c: any, cmd: CreateTaskCommand): Promise<TaskRecord> {
    const self = selfRepository(c);
    const taskId = cmd.taskId?.trim() || randomUUID();
    const now = Date.now();
    const initialBranchName = cmd.onBranch?.trim() || null;
    const initialTitle = initialBranchName ? deriveFallbackTitle(cmd.task, cmd.explicitTitle ?? undefined) : null;
    const localPath = c.state.localPath ?? foundryRepoClonePath(getActorRuntimeContext().config, c.state.workspaceId, c.state.repoId);

    await getOrCreateTask(c, c.state.workspaceId, c.state.repoId, taskId, {
      workspaceId: c.state.workspaceId,
      repoId: c.state.repoId,
      taskId,
      repoRemote: c.state.remoteUrl,
      repoLocalPath: localPath,
      branchName: initialBranchName,
      title: initialTitle,
      task: cmd.task,
      providerId: cmd.providerId,
      agentType: cmd.agentType,
      explicitTitle: initialBranchName ? null : cmd.explicitTitle,
      explicitBranchName: initialBranchName ? null : cmd.explicitBranchName,
      initialPrompt: cmd.initialPrompt,
      createdAt: now,
      updatedAt: now,
    });

    await c.db
      .insert(taskIndex)
      .values({
        taskId,
        branchName: initialBranchName,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: taskIndex.taskId,
        set: {
          branchName: initialBranchName,
          updatedAt: now,
        },
      })
      .run();

    await self.send(
      projectWorkflowQueueName("project.command.createTask"),
      {
        ...cmd,
        taskId,
      },
      {
        wait: false,
      },
    );
    return {
      workspaceId: c.state.workspaceId,
      repoId: c.state.repoId,
      repoRemote: c.state.remoteUrl,
      taskId,
      branchName: initialBranchName,
      title: initialTitle,
      task: cmd.task,
      providerId: cmd.providerId,
      status: "init_enqueue_provision",
      statusMessage: "provision queued",
      activeSandboxId: null,
      activeSessionId: null,
      sandboxes: [],
      agentType: cmd.agentType ?? null,
      prSubmitted: false,
      diffStat: null,
      hasUnpushed: null,
      conflictsWithMain: null,
      parentBranch: null,
      prUrl: null,
      prAuthor: null,
      ciStatus: null,
      reviewStatus: null,
      reviewer: null,
      createdAt: now,
      updatedAt: now,
    } satisfies TaskRecord;
  },

  async listReservedBranches(c: any, _cmd?: ListReservedBranchesCommand): Promise<string[]> {
    await ensureTaskIndexHydratedForRead(c);

    const rows = await c.db.select({ branchName: taskIndex.branchName }).from(taskIndex).where(isNotNull(taskIndex.branchName)).all();

    return rows.map((row) => row.branchName).filter((name): name is string => typeof name === "string" && name.trim().length > 0);
  },

  async registerTaskBranch(c: any, cmd: RegisterTaskBranchCommand): Promise<{ branchName: string; headSha: string }> {
    const self = selfRepository(c);
    return expectQueueResponse<{ branchName: string; headSha: string }>(
      await self.send(projectWorkflowQueueName("project.command.registerTaskBranch"), cmd, {
        wait: true,
        timeout: 5 * 60_000,
      }),
    );
  },

  async hydrateTaskIndex(c: any, cmd?: HydrateTaskIndexCommand): Promise<void> {
    const self = selfRepository(c);
    await self.send(projectWorkflowQueueName("project.command.hydrateTaskIndex"), cmd ?? {}, {
      wait: true,
      timeout: 60_000,
    });
  },

  async listTaskSummaries(c: any, cmd?: ListTaskSummariesCommand): Promise<TaskSummary[]> {
    const body = cmd ?? {};
    const records: TaskSummary[] = [];

    await ensureTaskIndexHydratedForRead(c);

    const taskRows = await c.db.select({ taskId: taskIndex.taskId }).from(taskIndex).orderBy(desc(taskIndex.updatedAt)).all();

    for (const row of taskRows) {
      try {
        const h = getTask(c, c.state.workspaceId, c.state.repoId, row.taskId);
        const record = await h.get();

        if (!body.includeArchived && record.status === "archived") {
          continue;
        }

        records.push({
          workspaceId: record.workspaceId,
          repoId: record.repoId,
          taskId: record.taskId,
          branchName: record.branchName,
          title: record.title,
          status: record.status,
          updatedAt: record.updatedAt,
        });
      } catch (error) {
        if (isStaleTaskReferenceError(error)) {
          await deleteStaleTaskIndexRow(c, row.taskId);
          logActorWarning("project", "pruned stale task index row during summary listing", {
            workspaceId: c.state.workspaceId,
            repoId: c.state.repoId,
            taskId: row.taskId,
          });
          continue;
        }
        logActorWarning("project", "failed loading task summary row", {
          workspaceId: c.state.workspaceId,
          repoId: c.state.repoId,
          taskId: row.taskId,
          error: resolveErrorMessage(error),
        });
      }
    }

    records.sort((a, b) => b.updatedAt - a.updatedAt);
    return records;
  },

  async getTaskEnriched(c: any, cmd: GetTaskEnrichedCommand): Promise<TaskRecord> {
    await ensureTaskIndexHydratedForRead(c);

    const row = await c.db.select({ taskId: taskIndex.taskId }).from(taskIndex).where(eq(taskIndex.taskId, cmd.taskId)).get();
    if (!row) {
      throw new Error(`Unknown task in repo ${c.state.repoId}: ${cmd.taskId}`);
    }

    try {
      const h = getTask(c, c.state.workspaceId, c.state.repoId, cmd.taskId);
      const record = await h.get();
      return await enrichTaskRecord(c, record);
    } catch (error) {
      if (isStaleTaskReferenceError(error)) {
        await deleteStaleTaskIndexRow(c, cmd.taskId);
        throw new Error(`Unknown task in repo ${c.state.repoId}: ${cmd.taskId}`);
      }
      throw error;
    }
  },

  async getRepoOverview(c: any, _cmd?: RepoOverviewCommand): Promise<RepoOverview> {
    const localPath = await ensureProjectReadyForRead(c);
    await ensureTaskIndexHydratedForRead(c);
    await forceProjectSync(c, localPath);

    const { driver } = getActorRuntimeContext();
    const now = Date.now();
    const baseRef = await driver.git.remoteDefaultBaseRef(localPath).catch(() => null);
    const stackAvailable = await driver.stack.available(localPath).catch(() => false);

    const branchRowsRaw = await c.db
      .select({
        branchName: branches.branchName,
        commitSha: branches.commitSha,
        parentBranch: branches.parentBranch,
        trackedInStack: branches.trackedInStack,
        diffStat: branches.diffStat,
        hasUnpushed: branches.hasUnpushed,
        conflictsWithMain: branches.conflictsWithMain,
        firstSeenAt: branches.firstSeenAt,
        lastSeenAt: branches.lastSeenAt,
        updatedAt: branches.updatedAt,
      })
      .from(branches)
      .all();

    const taskRows = await c.db
      .select({
        taskId: taskIndex.taskId,
        branchName: taskIndex.branchName,
        updatedAt: taskIndex.updatedAt,
      })
      .from(taskIndex)
      .all();

    const taskMetaByBranch = new Map<string, { taskId: string; title: string | null; status: TaskRecord["status"] | null; updatedAt: number }>();

    for (const row of taskRows) {
      if (!row.branchName) {
        continue;
      }
      try {
        const h = getTask(c, c.state.workspaceId, c.state.repoId, row.taskId);
        const record = await h.get();
        taskMetaByBranch.set(row.branchName, {
          taskId: row.taskId,
          title: record.title ?? null,
          status: record.status,
          updatedAt: record.updatedAt,
        });
      } catch (error) {
        if (isStaleTaskReferenceError(error)) {
          await deleteStaleTaskIndexRow(c, row.taskId);
          logActorWarning("project", "pruned stale task index row during repo overview", {
            workspaceId: c.state.workspaceId,
            repoId: c.state.repoId,
            taskId: row.taskId,
            branchName: row.branchName,
          });
          continue;
        }
        logActorWarning("project", "failed loading task while building repo overview", {
          workspaceId: c.state.workspaceId,
          repoId: c.state.repoId,
          taskId: row.taskId,
          branchName: row.branchName,
          error: resolveErrorMessage(error),
        });
      }
    }

    const githubState = await getOrCreateGithubState(c, c.state.workspaceId);
    const pullRequests = await githubState.listPullRequestsForRepository({ repoId: c.state.repoId });
    const prByBranch = new Map(
      pullRequests.map((row) => [
        row.headRefName,
        {
          prNumber: row.number,
          prState: row.state,
          prUrl: row.url,
        },
      ]),
    );

    const combinedRows = sortBranchesForOverview(
      branchRowsRaw.map((row) => ({
        branchName: row.branchName,
        parentBranch: row.parentBranch ?? null,
        updatedAt: row.updatedAt,
      })),
    );

    const detailByBranch = new Map(branchRowsRaw.map((row) => [row.branchName, row]));

    const branchRows = combinedRows.map((ordering) => {
      const row = detailByBranch.get(ordering.branchName)!;
      const taskMeta = taskMetaByBranch.get(row.branchName);
      const pr = prByBranch.get(row.branchName);
      return {
        branchName: row.branchName,
        commitSha: row.commitSha,
        parentBranch: row.parentBranch ?? null,
        trackedInStack: Boolean(row.trackedInStack),
        diffStat: row.diffStat ?? null,
        hasUnpushed: Boolean(row.hasUnpushed),
        conflictsWithMain: Boolean(row.conflictsWithMain),
        taskId: taskMeta?.taskId ?? null,
        taskTitle: taskMeta?.title ?? null,
        taskStatus: taskMeta?.status ?? null,
        prNumber: pr?.prNumber ?? null,
        prState: pr?.prState ?? null,
        prUrl: pr?.prUrl ?? null,
        ciStatus: null,
        reviewStatus: null,
        reviewer: null,
        firstSeenAt: row.firstSeenAt ?? null,
        lastSeenAt: row.lastSeenAt ?? null,
        updatedAt: Math.max(row.updatedAt, taskMeta?.updatedAt ?? 0),
      };
    });

    return {
      workspaceId: c.state.workspaceId,
      repoId: c.state.repoId,
      remoteUrl: c.state.remoteUrl,
      baseRef,
      stackAvailable,
      fetchedAt: now,
      branches: branchRows,
    };
  },

  async getPullRequestForBranch(
    c: any,
    cmd: GetPullRequestForBranchCommand,
  ): Promise<{ number: number; status: "draft" | "ready" | "closed" | "merged" } | null> {
    const branchName = cmd.branchName?.trim();
    if (!branchName) {
      return null;
    }

    const githubState = await getOrCreateGithubState(c, c.state.workspaceId);
    const pr = await githubState.getPullRequestForBranch({
      repoId: c.state.repoId,
      branchName,
    });

    if (!pr?.number) {
      return null;
    }

    return {
      number: pr.number,
      status: pr.status,
    };
  },

  async applyGithubPullRequestState(c: any, cmd: ApplyGithubPullRequestStateCommand): Promise<void> {
    const branchName = cmd.branchName?.trim();
    if (!branchName) {
      return;
    }
    const normalizedState = cmd.state.trim().toUpperCase();
    if (normalizedState !== "CLOSED" && normalizedState !== "MERGED" && normalizedState !== "closed" && normalizedState !== "merged") {
      return;
    }

    const row = await c.db.select({ taskId: taskIndex.taskId }).from(taskIndex).where(eq(taskIndex.branchName, branchName)).get();
    if (!row) {
      return;
    }

    try {
      const task = getTask(c, c.state.workspaceId, c.state.repoId, row.taskId);
      await task.archive({ reason: `PR ${normalizedState.toLowerCase()}` });
    } catch (error) {
      if (isStaleTaskReferenceError(error)) {
        await deleteStaleTaskIndexRow(c, row.taskId);
        return;
      }
      throw error;
    }
  },

  async runRepoStackAction(c: any, cmd: RunRepoStackActionCommand): Promise<RepoStackActionResult> {
    const self = selfRepository(c);
    return expectQueueResponse<RepoStackActionResult>(
      await self.send(projectWorkflowQueueName("project.command.runRepoStackAction"), cmd, {
        wait: true,
        timeout: 12 * 60_000,
      }),
    );
  },
};
