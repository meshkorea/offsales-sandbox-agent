// @ts-nocheck
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Loop } from "rivetkit/workflow";
import type {
  AddRepoInput,
  CreateTaskInput,
  TaskRecord,
  TaskSummary,
  TaskWorkbenchChangeModelInput,
  TaskWorkbenchCreateTaskInput,
  TaskWorkbenchDiffInput,
  TaskWorkbenchRenameInput,
  TaskWorkbenchRenameSessionInput,
  TaskWorkbenchSelectInput,
  TaskWorkbenchSetSessionUnreadInput,
  TaskWorkbenchSendMessageInput,
  TaskWorkbenchSnapshot,
  TaskWorkbenchTabInput,
  TaskWorkbenchUpdateDraftInput,
  HistoryEvent,
  HistoryQueryInput,
  ListTasksInput,
  ProviderId,
  RepoOverview,
  RepoStackActionInput,
  RepoStackActionResult,
  RepoRecord,
  StarSandboxAgentRepoInput,
  StarSandboxAgentRepoResult,
  SwitchResult,
  WorkspaceUseInput,
} from "@sandbox-agent/foundry-shared";
import { getActorRuntimeContext } from "../context.js";
import { getOrCreateGithubState, getOrCreateHistory, getOrCreateRepository, getOrCreateTask, getTask, selfOrganization } from "../handles.js";
import { logActorWarning, resolveErrorMessage } from "../logging.js";
import { clearActorRuntimeIssues as clearOrganizationActorRuntimeIssues, upsertActorRuntimeIssue } from "../runtime-issues.js";
import { normalizeRemoteUrl, repoIdFromRemote } from "../../services/repo.js";
import { resolveWorkspaceGithubAuth } from "../../services/github-auth.js";
import { foundryRepoClonePath } from "../../services/foundry-paths.js";
import { taskLookup, repos, providerProfiles } from "./db/schema.js";
import { agentTypeForModel } from "../task/workbench.js";
import { expectQueueResponse } from "../../services/queue.js";
import { workspaceAppActions } from "./app-shell.js";
import { projectWorkflowQueueName } from "../repository/actions.js";

interface WorkspaceState {
  workspaceId: string;
}

interface RefreshProviderProfilesCommand {
  providerId?: ProviderId;
}

interface GetTaskInput {
  workspaceId: string;
  taskId: string;
}

interface TaskProxyActionInput extends GetTaskInput {
  reason?: string;
}

interface RepoOverviewInput {
  workspaceId: string;
  repoId: string;
}

const WORKSPACE_QUEUE_NAMES = ["workspace.command.addRepo", "workspace.command.createTask", "workspace.command.refreshProviderProfiles"] as const;
const SANDBOX_AGENT_REPO = "rivet-dev/sandbox-agent";

type WorkspaceQueueName = (typeof WORKSPACE_QUEUE_NAMES)[number];

export { WORKSPACE_QUEUE_NAMES };

export function workspaceWorkflowQueueName(name: WorkspaceQueueName): WorkspaceQueueName {
  return name;
}

function assertWorkspace(c: { state: WorkspaceState }, workspaceId: string): void {
  if (workspaceId !== c.state.workspaceId) {
    throw new Error(`Workspace actor mismatch: actor=${c.state.workspaceId} command=${workspaceId}`);
  }
}

async function resolveRepoId(c: any, taskId: string): Promise<string> {
  const row = await c.db.select({ repoId: taskLookup.repoId }).from(taskLookup).where(eq(taskLookup.taskId, taskId)).get();

  if (row) {
    return row.repoId;
  }

  const repoRows = await c.db.select({ repoId: repos.repoId, remoteUrl: repos.remoteUrl }).from(repos).orderBy(desc(repos.updatedAt)).all();
  for (const repoRow of repoRows) {
    try {
      const project = await getOrCreateRepository(c, c.state.workspaceId, repoRow.repoId, repoRow.remoteUrl);
      const summaries = await project.listTaskSummaries({ includeArchived: true });
      if (!summaries.some((summary) => summary.taskId === taskId)) {
        continue;
      }
      await upsertTaskLookupRow(c, taskId, repoRow.repoId);
      return repoRow.repoId;
    } catch (error) {
      logActorWarning("workspace", "failed resolving repo from task summary fallback", {
        workspaceId: c.state.workspaceId,
        repoId: repoRow.repoId,
        taskId,
        error: resolveErrorMessage(error),
      });
    }
  }

  throw new Error(`Unknown task: ${taskId}`);
}

async function upsertTaskLookupRow(c: any, taskId: string, repoId: string): Promise<void> {
  await c.db
    .insert(taskLookup)
    .values({
      taskId,
      repoId,
    })
    .onConflictDoUpdate({
      target: taskLookup.taskId,
      set: { repoId },
    })
    .run();
}

async function collectAllTaskSummaries(c: any): Promise<TaskSummary[]> {
  const repoRows = await c.db.select({ repoId: repos.repoId, remoteUrl: repos.remoteUrl }).from(repos).orderBy(desc(repos.updatedAt)).all();
  const taskRows = await c.db.select({ taskId: taskLookup.taskId, repoId: taskLookup.repoId }).from(taskLookup).all();
  const repoById = new Map(repoRows.map((row) => [row.repoId, row]));

  const all: TaskSummary[] = [];
  for (const row of taskRows) {
    const repo = repoById.get(row.repoId);
    if (!repo) {
      continue;
    }
    try {
      const task = getTask(c, c.state.workspaceId, row.repoId, row.taskId);
      const snapshot = await task.get();
      all.push({
        workspaceId: c.state.workspaceId,
        repoId: row.repoId,
        taskId: snapshot.taskId,
        branchName: snapshot.branchName,
        title: snapshot.title,
        status: snapshot.status,
        updatedAt: snapshot.updatedAt,
      });
    } catch (error) {
      logActorWarning("workspace", "failed collecting tasks for repo", {
        workspaceId: c.state.workspaceId,
        repoId: row.repoId,
        taskId: row.taskId,
        error: resolveErrorMessage(error),
      });
    }
  }

  all.sort((a, b) => b.updatedAt - a.updatedAt);
  return all;
}

function repoLabelFromRemote(remoteUrl: string): string {
  try {
    const url = new URL(remoteUrl.startsWith("http") ? remoteUrl : `https://${remoteUrl}`);
    const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}/${(parts[1] ?? "").replace(/\.git$/, "")}`;
    }
  } catch {
    // ignore
  }

  return remoteUrl;
}

async function buildWorkbenchSnapshot(c: any): Promise<TaskWorkbenchSnapshot> {
  const repoRows = await c.db
    .select({ repoId: repos.repoId, remoteUrl: repos.remoteUrl, updatedAt: repos.updatedAt })
    .from(repos)
    .orderBy(desc(repos.updatedAt))
    .all();
  const taskRows = await c.db.select({ taskId: taskLookup.taskId, repoId: taskLookup.repoId }).from(taskLookup).all();
  const repoById = new Map(repoRows.map((row) => [row.repoId, row]));

  const tasks: Array<any> = [];
  const projects: Array<any> = [];
  const projectTasksByRepoId = new Map<string, Array<any>>();
  for (const row of taskRows) {
    const repo = repoById.get(row.repoId);
    if (!repo) {
      continue;
    }
    try {
      const task = getTask(c, c.state.workspaceId, row.repoId, row.taskId);
      const snapshot = await task.getWorkbenchSummary({});
      tasks.push(snapshot);
      const repoTasks = projectTasksByRepoId.get(row.repoId) ?? [];
      repoTasks.push(snapshot);
      projectTasksByRepoId.set(row.repoId, repoTasks);
    } catch (error) {
      logActorWarning("workspace", "failed collecting workbench task", {
        workspaceId: c.state.workspaceId,
        repoId: row.repoId,
        taskId: row.taskId,
        error: resolveErrorMessage(error),
      });
    }
  }

  for (const row of repoRows) {
    const projectTasks = (projectTasksByRepoId.get(row.repoId) ?? []).sort((left, right) => right.updatedAtMs - left.updatedAtMs);
    if (projectTasks.length > 0) {
      projects.push({
        id: row.repoId,
        label: repoLabelFromRemote(row.remoteUrl),
        updatedAtMs: projectTasks[0]?.updatedAtMs ?? row.updatedAt,
        tasks: projectTasks,
      });
    }
  }

  tasks.sort((left, right) => right.updatedAtMs - left.updatedAtMs);
  projects.sort((left, right) => right.updatedAtMs - left.updatedAtMs);
  return {
    workspaceId: c.state.workspaceId,
    repos: repoRows.map((row) => ({
      id: row.repoId,
      label: repoLabelFromRemote(row.remoteUrl),
    })),
    projects,
    tasks,
  };
}

async function requireWorkbenchTask(c: any, taskId: string) {
  const repoId = await resolveRepoId(c, taskId);
  return getTask(c, c.state.workspaceId, repoId, taskId);
}

async function addRepoMutation(c: any, input: AddRepoInput): Promise<RepoRecord> {
  assertWorkspace(c, input.workspaceId);

  const remoteUrl = normalizeRemoteUrl(input.remoteUrl);
  if (!remoteUrl) {
    throw new Error("remoteUrl is required");
  }

  const { driver } = getActorRuntimeContext();
  const auth = await resolveWorkspaceGithubAuth(c, c.state.workspaceId);
  await driver.git.validateRemote(remoteUrl, { githubToken: auth?.githubToken ?? null });

  const repoId = repoIdFromRemote(remoteUrl);
  const now = Date.now();

  await c.db
    .insert(repos)
    .values({
      repoId,
      remoteUrl,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: repos.repoId,
      set: {
        remoteUrl,
        updatedAt: now,
      },
    })
    .run();

  await workspaceActions.notifyWorkbenchUpdated(c);
  return {
    workspaceId: c.state.workspaceId,
    repoId,
    remoteUrl,
    createdAt: now,
    updatedAt: now,
  };
}

async function createTaskMutation(c: any, input: CreateTaskInput): Promise<TaskRecord> {
  assertWorkspace(c, input.workspaceId);

  const { config, providers } = getActorRuntimeContext();
  const providerId = input.providerId ?? providers.defaultProviderId();

  const repoId = input.repoId;
  const repoRow = await c.db.select({ remoteUrl: repos.remoteUrl }).from(repos).where(eq(repos.repoId, repoId)).get();
  if (!repoRow) {
    throw new Error(`Unknown repo: ${repoId}`);
  }
  const remoteUrl = repoRow.remoteUrl;
  const taskId = randomUUID();
  const now = Date.now();
  const initialBranchName = input.onBranch?.trim() || null;
  const initialTitle = initialBranchName ? null : (input.explicitTitle ?? null);
  const localPath = foundryRepoClonePath(config, c.state.workspaceId, repoId);

  await c.db
    .insert(providerProfiles)
    .values({
      providerId,
      profileJson: JSON.stringify({ providerId }),
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: providerProfiles.providerId,
      set: {
        profileJson: JSON.stringify({ providerId }),
        updatedAt: now,
      },
    })
    .run();

  await c.db
    .insert(taskLookup)
    .values({
      taskId,
      repoId,
    })
    .onConflictDoUpdate({
      target: taskLookup.taskId,
      set: { repoId },
    })
    .run();

  await getOrCreateTask(c, c.state.workspaceId, repoId, taskId, {
    workspaceId: c.state.workspaceId,
    repoId,
    taskId,
    repoRemote: remoteUrl,
    repoLocalPath: localPath,
    branchName: initialBranchName,
    title: initialTitle,
    task: input.task,
    providerId,
    agentType: input.agentType ?? null,
    explicitTitle: initialBranchName ? null : (input.explicitTitle ?? null),
    explicitBranchName: initialBranchName ? null : (input.explicitBranchName ?? null),
    initialPrompt: null,
    createdAt: now,
    updatedAt: now,
  });

  const project = await getOrCreateRepository(c, c.state.workspaceId, repoId, remoteUrl);
  await project.send(
    projectWorkflowQueueName("project.command.createTask"),
    {
      taskId,
      task: input.task,
      providerId,
      agentType: input.agentType ?? null,
      explicitTitle: input.explicitTitle ?? null,
      explicitBranchName: input.explicitBranchName ?? null,
      onBranch: input.onBranch ?? null,
    },
    {
      wait: false,
    },
  );

  await workspaceActions.notifyWorkbenchUpdated(c);
  return {
    workspaceId: c.state.workspaceId,
    repoId,
    repoRemote: remoteUrl,
    taskId,
    branchName: initialBranchName,
    title: initialTitle,
    task: input.task,
    providerId,
    status: "init_enqueue_provision",
    statusMessage: "provision queued",
    activeSandboxId: null,
    activeSessionId: null,
    sandboxes: [],
    agentType: input.agentType ?? null,
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

async function refreshProviderProfilesMutation(c: any, command?: RefreshProviderProfilesCommand): Promise<void> {
  const body = command ?? {};
  const { providers } = getActorRuntimeContext();
  const providerIds: ProviderId[] = body.providerId ? [body.providerId] : providers.availableProviderIds();

  for (const providerId of providerIds) {
    await c.db
      .insert(providerProfiles)
      .values({
        providerId,
        profileJson: JSON.stringify({ providerId }),
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: providerProfiles.providerId,
        set: {
          profileJson: JSON.stringify({ providerId }),
          updatedAt: Date.now(),
        },
      })
      .run();
  }
}

export async function runWorkspaceWorkflow(ctx: any): Promise<void> {
  await ctx.loop("workspace-command-loop", async (loopCtx: any) => {
    await loopCtx.removed("workspace-create-task", "step");
    const msg = await loopCtx.queue.next("next-workspace-command", {
      names: [...WORKSPACE_QUEUE_NAMES],
      completable: true,
    });
    if (!msg) {
      return Loop.continue(undefined);
    }

    if (msg.name === "workspace.command.addRepo") {
      const result = await loopCtx.step({
        name: "workspace-add-repo",
        timeout: 60_000,
        run: async () => addRepoMutation(loopCtx, msg.body as AddRepoInput),
      });
      await msg.complete(result);
      return Loop.continue(undefined);
    }

    if (msg.name === "workspace.command.createTask") {
      const result = await loopCtx.step({
        name: "workspace-create-task",
        timeout: 60_000,
        run: async () => createTaskMutation(loopCtx, msg.body as CreateTaskInput),
      });
      await msg.complete(result);
      return Loop.continue(undefined);
    }

    if (msg.name === "workspace.command.refreshProviderProfiles") {
      await loopCtx.step("workspace-refresh-provider-profiles", async () =>
        refreshProviderProfilesMutation(loopCtx, msg.body as RefreshProviderProfilesCommand),
      );
      await msg.complete({ ok: true });
    }

    return Loop.continue(undefined);
  });
}

export const workspaceActions = {
  ...workspaceAppActions,
  async recordActorRuntimeIssue(c: any, input: any): Promise<void> {
    await upsertActorRuntimeIssue(c, input);
  },

  async clearActorRuntimeIssues(c: any, input?: { actorId?: string | null }): Promise<void> {
    await clearOrganizationActorRuntimeIssues(c, input);
  },

  async useWorkspace(c: any, input: WorkspaceUseInput): Promise<{ workspaceId: string }> {
    assertWorkspace(c, input.workspaceId);
    return { workspaceId: c.state.workspaceId };
  },

  async addRepo(c: any, input: AddRepoInput): Promise<RepoRecord> {
    const self = selfOrganization(c);
    return expectQueueResponse<RepoRecord>(
      await self.send(workspaceWorkflowQueueName("workspace.command.addRepo"), input, {
        wait: true,
        timeout: 60_000,
      }),
    );
  },

  async listRepos(c: any, input: WorkspaceUseInput): Promise<RepoRecord[]> {
    assertWorkspace(c, input.workspaceId);

    const rows = await c.db
      .select({
        repoId: repos.repoId,
        remoteUrl: repos.remoteUrl,
        createdAt: repos.createdAt,
        updatedAt: repos.updatedAt,
      })
      .from(repos)
      .orderBy(desc(repos.updatedAt))
      .all();

    return rows.map((row) => ({
      workspaceId: c.state.workspaceId,
      repoId: row.repoId,
      remoteUrl: row.remoteUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },

  async createTask(c: any, input: CreateTaskInput): Promise<TaskRecord> {
    return await createTaskMutation(c, input);
  },

  async starSandboxAgentRepo(c: any, input: StarSandboxAgentRepoInput): Promise<StarSandboxAgentRepoResult> {
    assertWorkspace(c, input.workspaceId);
    const githubState = await getOrCreateGithubState(c, c.state.workspaceId);
    await githubState.starRepository({ repoFullName: SANDBOX_AGENT_REPO });
    return {
      repo: SANDBOX_AGENT_REPO,
      starredAt: Date.now(),
    };
  },

  async getWorkbench(c: any, input: WorkspaceUseInput): Promise<TaskWorkbenchSnapshot> {
    assertWorkspace(c, input.workspaceId);
    return await buildWorkbenchSnapshot(c);
  },

  async notifyWorkbenchUpdated(c: any): Promise<void> {
    c.broadcast("workbenchUpdated", { at: Date.now() });
  },

  async createWorkbenchTask(c: any, input: TaskWorkbenchCreateTaskInput): Promise<{ taskId: string }> {
    const created = await workspaceActions.createTask(c, {
      workspaceId: c.state.workspaceId,
      repoId: input.repoId,
      task: input.task,
      ...(input.title ? { explicitTitle: input.title } : {}),
      ...(input.branch ? { explicitBranchName: input.branch } : {}),
      ...(input.model ? { agentType: agentTypeForModel(input.model) } : {}),
    });
    return { taskId: created.taskId };
  },

  async markWorkbenchUnread(c: any, input: TaskWorkbenchSelectInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.markWorkbenchUnread({});
  },

  async renameWorkbenchTask(c: any, input: TaskWorkbenchRenameInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.renameWorkbenchTask(input);
  },

  async renameWorkbenchBranch(c: any, input: TaskWorkbenchRenameInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.renameWorkbenchBranch(input);
  },

  async createWorkbenchSession(c: any, input: TaskWorkbenchSelectInput & { model?: string }): Promise<{ tabId: string }> {
    const task = await requireWorkbenchTask(c, input.taskId);
    return await task.createWorkbenchSession({ ...(input.model ? { model: input.model } : {}) });
  },

  async renameWorkbenchSession(c: any, input: TaskWorkbenchRenameSessionInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.renameWorkbenchSession(input);
  },

  async setWorkbenchSessionUnread(c: any, input: TaskWorkbenchSetSessionUnreadInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.setWorkbenchSessionUnread(input);
  },

  async updateWorkbenchDraft(c: any, input: TaskWorkbenchUpdateDraftInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.updateWorkbenchDraft(input);
  },

  async changeWorkbenchModel(c: any, input: TaskWorkbenchChangeModelInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.changeWorkbenchModel(input);
  },

  async sendWorkbenchMessage(c: any, input: TaskWorkbenchSendMessageInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.sendWorkbenchMessage(input);
  },

  async stopWorkbenchSession(c: any, input: TaskWorkbenchTabInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.stopWorkbenchSession(input);
  },

  async closeWorkbenchSession(c: any, input: TaskWorkbenchTabInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.closeWorkbenchSession(input);
  },

  async publishWorkbenchPr(c: any, input: TaskWorkbenchSelectInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.publishWorkbenchPr({});
  },

  async revertWorkbenchFile(c: any, input: TaskWorkbenchDiffInput): Promise<void> {
    const task = await requireWorkbenchTask(c, input.taskId);
    await task.revertWorkbenchFile(input);
  },

  async listTasks(c: any, input: ListTasksInput): Promise<TaskSummary[]> {
    assertWorkspace(c, input.workspaceId);

    if (input.repoId) {
      const repoRow = await c.db.select({ remoteUrl: repos.remoteUrl }).from(repos).where(eq(repos.repoId, input.repoId)).get();
      if (!repoRow) {
        throw new Error(`Unknown repo: ${input.repoId}`);
      }

      const project = await getOrCreateRepository(c, c.state.workspaceId, input.repoId, repoRow.remoteUrl);
      return await project.listTaskSummaries({ includeArchived: true });
    }

    return await collectAllTaskSummaries(c);
  },

  async getRepoOverview(c: any, input: RepoOverviewInput): Promise<RepoOverview> {
    assertWorkspace(c, input.workspaceId);

    const repoRow = await c.db.select({ remoteUrl: repos.remoteUrl }).from(repos).where(eq(repos.repoId, input.repoId)).get();
    if (!repoRow) {
      throw new Error(`Unknown repo: ${input.repoId}`);
    }

    const project = await getOrCreateRepository(c, c.state.workspaceId, input.repoId, repoRow.remoteUrl);
    await project.ensure({ remoteUrl: repoRow.remoteUrl });
    return await project.getRepoOverview({});
  },

  async runRepoStackAction(c: any, input: RepoStackActionInput): Promise<RepoStackActionResult> {
    assertWorkspace(c, input.workspaceId);

    const repoRow = await c.db.select({ remoteUrl: repos.remoteUrl }).from(repos).where(eq(repos.repoId, input.repoId)).get();
    if (!repoRow) {
      throw new Error(`Unknown repo: ${input.repoId}`);
    }

    const project = await getOrCreateRepository(c, c.state.workspaceId, input.repoId, repoRow.remoteUrl);
    await project.ensure({ remoteUrl: repoRow.remoteUrl });
    return await project.runRepoStackAction({
      action: input.action,
      branchName: input.branchName,
      parentBranch: input.parentBranch,
    });
  },

  async switchTask(c: any, taskId: string): Promise<SwitchResult> {
    const repoId = await resolveRepoId(c, taskId);
    const h = getTask(c, c.state.workspaceId, repoId, taskId);
    const record = await h.get();
    const switched = await h.switch();

    return {
      workspaceId: c.state.workspaceId,
      taskId,
      providerId: record.providerId,
      switchTarget: switched.switchTarget,
    };
  },

  async refreshProviderProfiles(c: any, command?: RefreshProviderProfilesCommand): Promise<void> {
    const self = selfOrganization(c);
    await self.send(workspaceWorkflowQueueName("workspace.command.refreshProviderProfiles"), command ?? {}, {
      wait: true,
      timeout: 60_000,
    });
  },

  async history(c: any, input: HistoryQueryInput): Promise<HistoryEvent[]> {
    assertWorkspace(c, input.workspaceId);

    const limit = input.limit ?? 20;
    const repoRows = await c.db.select({ repoId: repos.repoId }).from(repos).all();

    const allEvents: HistoryEvent[] = [];

    for (const row of repoRows) {
      try {
        const hist = await getOrCreateHistory(c, c.state.workspaceId, row.repoId);
        const items =
          (await hist.list({
            branch: input.branch,
            taskId: input.taskId,
            limit,
          })) ?? [];
        allEvents.push(...items);
      } catch (error) {
        logActorWarning("workspace", "history lookup failed for repo", {
          workspaceId: c.state.workspaceId,
          repoId: row.repoId,
          error: resolveErrorMessage(error),
        });
      }
    }

    allEvents.sort((a, b) => b.createdAt - a.createdAt);
    return allEvents.slice(0, limit);
  },

  async getTask(c: any, input: GetTaskInput): Promise<TaskRecord> {
    assertWorkspace(c, input.workspaceId);

    const repoId = await resolveRepoId(c, input.taskId);

    const repoRow = await c.db.select({ remoteUrl: repos.remoteUrl }).from(repos).where(eq(repos.repoId, repoId)).get();
    if (!repoRow) {
      throw new Error(`Unknown repo: ${repoId}`);
    }

    const project = await getOrCreateRepository(c, c.state.workspaceId, repoId, repoRow.remoteUrl);
    try {
      return await project.getTaskEnriched({ taskId: input.taskId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Unknown task in repo")) {
        throw error;
      }

      logActorWarning("workspace", "repository task index missed known task; falling back to direct task actor read", {
        workspaceId: c.state.workspaceId,
        repoId,
        taskId: input.taskId,
      });

      const task = getTask(c, c.state.workspaceId, repoId, input.taskId);
      return await task.get();
    }
  },

  async attachTask(c: any, input: TaskProxyActionInput): Promise<{ target: string; sessionId: string | null }> {
    assertWorkspace(c, input.workspaceId);
    const repoId = await resolveRepoId(c, input.taskId);
    const h = getTask(c, c.state.workspaceId, repoId, input.taskId);
    return await h.attach({ reason: input.reason });
  },

  async pushTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertWorkspace(c, input.workspaceId);
    const repoId = await resolveRepoId(c, input.taskId);
    const h = getTask(c, c.state.workspaceId, repoId, input.taskId);
    await h.push({ reason: input.reason });
  },

  async syncTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertWorkspace(c, input.workspaceId);
    const repoId = await resolveRepoId(c, input.taskId);
    const h = getTask(c, c.state.workspaceId, repoId, input.taskId);
    await h.sync({ reason: input.reason });
  },

  async mergeTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertWorkspace(c, input.workspaceId);
    const repoId = await resolveRepoId(c, input.taskId);
    const h = getTask(c, c.state.workspaceId, repoId, input.taskId);
    await h.merge({ reason: input.reason });
  },

  async archiveTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertWorkspace(c, input.workspaceId);
    const repoId = await resolveRepoId(c, input.taskId);
    const h = getTask(c, c.state.workspaceId, repoId, input.taskId);
    await h.archive({ reason: input.reason });
  },

  async killTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertWorkspace(c, input.workspaceId);
    const repoId = await resolveRepoId(c, input.taskId);
    const h = getTask(c, c.state.workspaceId, repoId, input.taskId);
    await h.kill({ reason: input.reason });
  },
};
