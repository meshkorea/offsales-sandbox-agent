// @ts-nocheck
import { desc, eq } from "drizzle-orm";
import { Loop } from "rivetkit/workflow";
import type {
  CreateTaskInput,
  AuditLogEvent,
  HistoryQueryInput,
  ListTasksInput,
  SandboxProviderId,
  RepoOverview,
  RepoRecord,
  StarSandboxAgentRepoInput,
  StarSandboxAgentRepoResult,
  SwitchResult,
  TaskRecord,
  TaskSummary,
  TaskWorkspaceChangeModelInput,
  TaskWorkspaceCreateTaskInput,
  TaskWorkspaceDiffInput,
  TaskWorkspaceRenameInput,
  TaskWorkspaceRenameSessionInput,
  TaskWorkspaceSelectInput,
  TaskWorkspaceSetSessionUnreadInput,
  TaskWorkspaceSendMessageInput,
  TaskWorkspaceSessionInput,
  TaskWorkspaceUpdateDraftInput,
  WorkspaceRepositorySummary,
  WorkspaceTaskSummary,
  OrganizationEvent,
  OrganizationSummarySnapshot,
  OrganizationUseInput,
} from "@sandbox-agent/foundry-shared";
import { getActorRuntimeContext } from "../context.js";
import { getOrCreateAuditLog, getOrCreateGithubData, getTask as getTaskHandle, getOrCreateRepository, selfOrganization } from "../handles.js";
import { logActorWarning, resolveErrorMessage } from "../logging.js";
import { defaultSandboxProviderId } from "../../sandbox-config.js";
import { repoIdFromRemote } from "../../services/repo.js";
import { resolveOrganizationGithubAuth } from "../../services/github-auth.js";
import { organizationProfile, repos } from "./db/schema.js";
import { agentTypeForModel } from "../task/workspace.js";
import { expectQueueResponse } from "../../services/queue.js";
import { organizationAppActions } from "./app-shell.js";

interface OrganizationState {
  organizationId: string;
}

interface GetTaskInput {
  organizationId: string;
  repoId?: string;
  taskId: string;
}

interface TaskProxyActionInput extends GetTaskInput {
  reason?: string;
}

interface RepoOverviewInput {
  organizationId: string;
  repoId: string;
}

const ORGANIZATION_QUEUE_NAMES = ["organization.command.createTask", "organization.command.syncGithubSession"] as const;
const SANDBOX_AGENT_REPO = "rivet-dev/sandbox-agent";

type OrganizationQueueName = (typeof ORGANIZATION_QUEUE_NAMES)[number];

export { ORGANIZATION_QUEUE_NAMES };

export function organizationWorkflowQueueName(name: OrganizationQueueName): OrganizationQueueName {
  return name;
}

const ORGANIZATION_PROFILE_ROW_ID = 1;

function assertOrganization(c: { state: OrganizationState }, organizationId: string): void {
  if (organizationId !== c.state.organizationId) {
    throw new Error(`Organization actor mismatch: actor=${c.state.organizationId} command=${organizationId}`);
  }
}

async function collectAllTaskSummaries(c: any): Promise<TaskSummary[]> {
  const repoRows = await c.db.select({ repoId: repos.repoId, remoteUrl: repos.remoteUrl }).from(repos).orderBy(desc(repos.updatedAt)).all();

  const all: TaskSummary[] = [];
  for (const row of repoRows) {
    try {
      const repository = await getOrCreateRepository(c, c.state.organizationId, row.repoId, row.remoteUrl);
      const snapshot = await repository.listTaskSummaries({ includeArchived: true });
      all.push(...snapshot);
    } catch (error) {
      logActorWarning("organization", "failed collecting tasks for repo", {
        organizationId: c.state.organizationId,
        repoId: row.repoId,
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

function buildRepoSummary(repoRow: { repoId: string; remoteUrl: string; updatedAt: number }, taskRows: WorkspaceTaskSummary[]): WorkspaceRepositorySummary {
  const repoTasks = taskRows.filter((task) => task.repoId === repoRow.repoId);
  const latestActivityMs = repoTasks.reduce((latest, task) => Math.max(latest, task.updatedAtMs), repoRow.updatedAt);

  return {
    id: repoRow.repoId,
    label: repoLabelFromRemote(repoRow.remoteUrl),
    taskCount: repoTasks.length,
    latestActivityMs,
  };
}

async function resolveRepositoryForTask(c: any, taskId: string, repoId?: string | null) {
  if (repoId) {
    const repoRow = await c.db.select({ remoteUrl: repos.remoteUrl }).from(repos).where(eq(repos.repoId, repoId)).get();
    if (!repoRow) {
      throw new Error(`Unknown repo: ${repoId}`);
    }
    const repository = await getOrCreateRepository(c, c.state.organizationId, repoId, repoRow.remoteUrl);
    return { repoId, repository };
  }

  const repoRows = await c.db.select({ repoId: repos.repoId, remoteUrl: repos.remoteUrl }).from(repos).orderBy(desc(repos.updatedAt)).all();
  for (const row of repoRows) {
    const repository = await getOrCreateRepository(c, c.state.organizationId, row.repoId, row.remoteUrl);
    const summaries = await repository.listTaskSummaries({ includeArchived: true });
    if (summaries.some((summary: TaskSummary) => summary.taskId === taskId)) {
      return { repoId: row.repoId, repository };
    }
  }

  throw new Error(`Unknown task: ${taskId}`);
}

async function reconcileWorkspaceProjection(c: any): Promise<OrganizationSummarySnapshot> {
  const repoRows = await c.db
    .select({ repoId: repos.repoId, remoteUrl: repos.remoteUrl, updatedAt: repos.updatedAt })
    .from(repos)
    .orderBy(desc(repos.updatedAt))
    .all();

  const taskRows: WorkspaceTaskSummary[] = [];
  for (const row of repoRows) {
    try {
      const repository = await getOrCreateRepository(c, c.state.organizationId, row.repoId, row.remoteUrl);
      taskRows.push(...(await repository.listWorkspaceTaskSummaries({})));
    } catch (error) {
      logActorWarning("organization", "failed collecting repo during workspace reconciliation", {
        organizationId: c.state.organizationId,
        repoId: row.repoId,
        error: resolveErrorMessage(error),
      });
    }
  }

  taskRows.sort((left, right) => right.updatedAtMs - left.updatedAtMs);
  return {
    organizationId: c.state.organizationId,
    repos: repoRows.map((row) => buildRepoSummary(row, taskRows)).sort((left, right) => right.latestActivityMs - left.latestActivityMs),
    taskSummaries: taskRows,
  };
}

async function requireWorkspaceTask(c: any, repoId: string, taskId: string) {
  return getTaskHandle(c, c.state.organizationId, repoId, taskId);
}

/**
 * Reads the organization sidebar snapshot by fanning out one level to the
 * repository coordinators. Task summaries are repository-owned; organization
 * only aggregates them.
 */
async function getOrganizationSummarySnapshot(c: any): Promise<OrganizationSummarySnapshot> {
  const repoRows = await c.db
    .select({
      repoId: repos.repoId,
      remoteUrl: repos.remoteUrl,
      updatedAt: repos.updatedAt,
    })
    .from(repos)
    .orderBy(desc(repos.updatedAt))
    .all();
  const summaries: WorkspaceTaskSummary[] = [];
  for (const row of repoRows) {
    try {
      const repository = await getOrCreateRepository(c, c.state.organizationId, row.repoId, row.remoteUrl);
      summaries.push(...(await repository.listWorkspaceTaskSummaries({})));
    } catch (error) {
      logActorWarning("organization", "failed reading repository task projection", {
        organizationId: c.state.organizationId,
        repoId: row.repoId,
        error: resolveErrorMessage(error),
      });
    }
  }
  summaries.sort((left, right) => right.updatedAtMs - left.updatedAtMs);

  return {
    organizationId: c.state.organizationId,
    repos: repoRows.map((row) => buildRepoSummary(row, summaries)).sort((left, right) => right.latestActivityMs - left.latestActivityMs),
    taskSummaries: summaries,
  };
}

async function broadcastOrganizationSnapshot(c: any): Promise<void> {
  c.broadcast("organizationUpdated", {
    type: "organizationUpdated",
    snapshot: await getOrganizationSummarySnapshot(c),
  } satisfies OrganizationEvent);
}

async function createTaskMutation(c: any, input: CreateTaskInput): Promise<TaskRecord> {
  assertOrganization(c, input.organizationId);

  const { config } = getActorRuntimeContext();
  const sandboxProviderId = input.sandboxProviderId ?? defaultSandboxProviderId(config);

  const repoId = input.repoId;
  const repoRow = await c.db.select({ remoteUrl: repos.remoteUrl }).from(repos).where(eq(repos.repoId, repoId)).get();
  if (!repoRow) {
    throw new Error(`Unknown repo: ${repoId}`);
  }
  const remoteUrl = repoRow.remoteUrl;

  const repository = await getOrCreateRepository(c, c.state.organizationId, repoId, remoteUrl);

  const created = await repository.createTask({
    task: input.task,
    sandboxProviderId,
    agentType: input.agentType ?? null,
    explicitTitle: input.explicitTitle ?? null,
    explicitBranchName: input.explicitBranchName ?? null,
    onBranch: input.onBranch ?? null,
  });

  return created;
}

export async function runOrganizationWorkflow(ctx: any): Promise<void> {
  await ctx.loop("organization-command-loop", async (loopCtx: any) => {
    const msg = await loopCtx.queue.next("next-organization-command", {
      names: [...ORGANIZATION_QUEUE_NAMES],
      completable: true,
    });
    if (!msg) {
      return Loop.continue(undefined);
    }

    try {
      if (msg.name === "organization.command.createTask") {
        const result = await loopCtx.step({
          name: "organization-create-task",
          timeout: 5 * 60_000,
          run: async () => createTaskMutation(loopCtx, msg.body as CreateTaskInput),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.syncGithubSession") {
        await loopCtx.step({
          name: "organization-sync-github-session",
          timeout: 60_000,
          run: async () => {
            const { syncGithubOrganizations } = await import("./app-shell.js");
            await syncGithubOrganizations(loopCtx, msg.body as { sessionId: string; accessToken: string });
          },
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }
    } catch (error) {
      const message = resolveErrorMessage(error);
      logActorWarning("organization", "organization workflow command failed", {
        queueName: msg.name,
        error: message,
      });
      await msg.complete({ error: message }).catch((completeError: unknown) => {
        logActorWarning("organization", "organization workflow failed completing error response", {
          queueName: msg.name,
          error: resolveErrorMessage(completeError),
        });
      });
    }

    return Loop.continue(undefined);
  });
}

export const organizationActions = {
  ...organizationAppActions,
  async useOrganization(c: any, input: OrganizationUseInput): Promise<{ organizationId: string }> {
    assertOrganization(c, input.organizationId);
    return { organizationId: c.state.organizationId };
  },

  async listRepos(c: any, input: OrganizationUseInput): Promise<RepoRecord[]> {
    assertOrganization(c, input.organizationId);

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
      organizationId: c.state.organizationId,
      repoId: row.repoId,
      remoteUrl: row.remoteUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },

  async createTask(c: any, input: CreateTaskInput): Promise<TaskRecord> {
    const self = selfOrganization(c);
    return expectQueueResponse<TaskRecord>(
      await self.send(organizationWorkflowQueueName("organization.command.createTask"), input, {
        wait: true,
        timeout: 10_000,
      }),
    );
  },

  async starSandboxAgentRepo(c: any, input: StarSandboxAgentRepoInput): Promise<StarSandboxAgentRepoResult> {
    assertOrganization(c, input.organizationId);
    const { driver } = getActorRuntimeContext();
    const auth = await resolveOrganizationGithubAuth(c, c.state.organizationId);
    await driver.github.starRepository(SANDBOX_AGENT_REPO, {
      githubToken: auth?.githubToken ?? null,
    });
    return {
      repo: SANDBOX_AGENT_REPO,
      starredAt: Date.now(),
    };
  },

  async refreshOrganizationSnapshot(c: any): Promise<void> {
    await broadcastOrganizationSnapshot(c);
  },

  async applyGithubRepositoryProjection(c: any, input: { repoId: string; remoteUrl: string }): Promise<void> {
    const now = Date.now();
    const existing = await c.db.select({ repoId: repos.repoId }).from(repos).where(eq(repos.repoId, input.repoId)).get();
    await c.db
      .insert(repos)
      .values({
        repoId: input.repoId,
        remoteUrl: input.remoteUrl,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: repos.repoId,
        set: {
          remoteUrl: input.remoteUrl,
          updatedAt: now,
        },
      })
      .run();
    await broadcastOrganizationSnapshot(c);
  },

  async applyGithubDataProjection(
    c: any,
    input: {
      connectedAccount: string;
      installationStatus: string;
      installationId: number | null;
      syncStatus: string;
      lastSyncLabel: string;
      lastSyncAt: number | null;
      repositories: Array<{ fullName: string; cloneUrl: string; private: boolean }>;
    },
  ): Promise<void> {
    const existingRepos = await c.db.select({ repoId: repos.repoId, remoteUrl: repos.remoteUrl, updatedAt: repos.updatedAt }).from(repos).all();
    const existingById = new Map(existingRepos.map((repo) => [repo.repoId, repo]));
    const nextRepoIds = new Set<string>();
    const now = Date.now();

    for (const repository of input.repositories) {
      const repoId = repoIdFromRemote(repository.cloneUrl);
      nextRepoIds.add(repoId);
      await c.db
        .insert(repos)
        .values({
          repoId,
          remoteUrl: repository.cloneUrl,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: repos.repoId,
          set: {
            remoteUrl: repository.cloneUrl,
            updatedAt: now,
          },
        })
        .run();
      await broadcastOrganizationSnapshot(c);
    }

    for (const repo of existingRepos) {
      if (nextRepoIds.has(repo.repoId)) {
        continue;
      }
      await c.db.delete(repos).where(eq(repos.repoId, repo.repoId)).run();
      await broadcastOrganizationSnapshot(c);
    }

    const profile = await c.db
      .select({ id: organizationProfile.id })
      .from(organizationProfile)
      .where(eq(organizationProfile.id, ORGANIZATION_PROFILE_ROW_ID))
      .get();
    if (profile) {
      await c.db
        .update(organizationProfile)
        .set({
          githubConnectedAccount: input.connectedAccount,
          githubInstallationStatus: input.installationStatus,
          githubSyncStatus: input.syncStatus,
          githubInstallationId: input.installationId,
          githubLastSyncLabel: input.lastSyncLabel,
          githubLastSyncAt: input.lastSyncAt,
          updatedAt: now,
        })
        .where(eq(organizationProfile.id, ORGANIZATION_PROFILE_ROW_ID))
        .run();
    }
  },

  async recordGithubWebhookReceipt(
    c: any,
    input: {
      organizationId: string;
      event: string;
      action?: string | null;
      receivedAt?: number;
    },
  ): Promise<void> {
    assertOrganization(c, input.organizationId);

    const profile = await c.db
      .select({ id: organizationProfile.id })
      .from(organizationProfile)
      .where(eq(organizationProfile.id, ORGANIZATION_PROFILE_ROW_ID))
      .get();
    if (!profile) {
      return;
    }

    await c.db
      .update(organizationProfile)
      .set({
        githubLastWebhookAt: input.receivedAt ?? Date.now(),
        githubLastWebhookEvent: input.action ? `${input.event}.${input.action}` : input.event,
      })
      .where(eq(organizationProfile.id, ORGANIZATION_PROFILE_ROW_ID))
      .run();
  },

  async getOrganizationSummary(c: any, input: OrganizationUseInput): Promise<OrganizationSummarySnapshot> {
    assertOrganization(c, input.organizationId);
    return await getOrganizationSummarySnapshot(c);
  },

  async adminReconcileWorkspaceState(c: any, input: OrganizationUseInput): Promise<OrganizationSummarySnapshot> {
    assertOrganization(c, input.organizationId);
    return await reconcileWorkspaceProjection(c);
  },

  async createWorkspaceTask(c: any, input: TaskWorkspaceCreateTaskInput): Promise<{ taskId: string; sessionId?: string }> {
    // Step 1: Create the task record (wait: true — local state mutations only).
    const created = await organizationActions.createTask(c, {
      organizationId: c.state.organizationId,
      repoId: input.repoId,
      task: input.task,
      ...(input.title ? { explicitTitle: input.title } : {}),
      ...(input.onBranch ? { onBranch: input.onBranch } : input.branch ? { explicitBranchName: input.branch } : {}),
      ...(input.model ? { agentType: agentTypeForModel(input.model) } : {}),
    });

    // Step 2: Enqueue session creation + initial message (wait: false).
    // The task workflow creates the session record and sends the message in
    // the background. The client observes progress via push events on the
    // task subscription topic.
    const task = await requireWorkspaceTask(c, input.repoId, created.taskId);
    await task.createWorkspaceSessionAndSend({
      model: input.model,
      text: input.task,
    });

    return { taskId: created.taskId };
  },

  async markWorkspaceUnread(c: any, input: TaskWorkspaceSelectInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.markWorkspaceUnread({});
  },

  async renameWorkspaceTask(c: any, input: TaskWorkspaceRenameInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.renameWorkspaceTask(input);
  },

  async createWorkspaceSession(c: any, input: TaskWorkspaceSelectInput & { model?: string }): Promise<{ sessionId: string }> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    return await task.createWorkspaceSession({ ...(input.model ? { model: input.model } : {}) });
  },

  async renameWorkspaceSession(c: any, input: TaskWorkspaceRenameSessionInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.renameWorkspaceSession(input);
  },

  async setWorkspaceSessionUnread(c: any, input: TaskWorkspaceSetSessionUnreadInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.setWorkspaceSessionUnread(input);
  },

  async updateWorkspaceDraft(c: any, input: TaskWorkspaceUpdateDraftInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.updateWorkspaceDraft(input);
  },

  async changeWorkspaceModel(c: any, input: TaskWorkspaceChangeModelInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.changeWorkspaceModel(input);
  },

  async sendWorkspaceMessage(c: any, input: TaskWorkspaceSendMessageInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.sendWorkspaceMessage(input);
  },

  async stopWorkspaceSession(c: any, input: TaskWorkspaceSessionInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.stopWorkspaceSession(input);
  },

  async closeWorkspaceSession(c: any, input: TaskWorkspaceSessionInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.closeWorkspaceSession(input);
  },

  async publishWorkspacePr(c: any, input: TaskWorkspaceSelectInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.publishWorkspacePr({});
  },

  async revertWorkspaceFile(c: any, input: TaskWorkspaceDiffInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.revertWorkspaceFile(input);
  },

  async adminReloadGithubOrganization(c: any): Promise<void> {
    await getOrCreateGithubData(c, c.state.organizationId).adminReloadOrganization({});
  },

  async adminReloadGithubPullRequests(c: any): Promise<void> {
    await getOrCreateGithubData(c, c.state.organizationId).adminReloadAllPullRequests({});
  },

  async adminReloadGithubRepository(c: any, input: { repoId: string }): Promise<void> {
    await getOrCreateGithubData(c, c.state.organizationId).reloadRepository(input);
  },

  async adminReloadGithubPullRequest(c: any, input: { repoId: string; prNumber: number }): Promise<void> {
    await getOrCreateGithubData(c, c.state.organizationId).reloadPullRequest(input);
  },

  async listTasks(c: any, input: ListTasksInput): Promise<TaskSummary[]> {
    assertOrganization(c, input.organizationId);

    if (input.repoId) {
      const repoRow = await c.db.select({ remoteUrl: repos.remoteUrl }).from(repos).where(eq(repos.repoId, input.repoId)).get();
      if (!repoRow) {
        throw new Error(`Unknown repo: ${input.repoId}`);
      }

      const repository = await getOrCreateRepository(c, c.state.organizationId, input.repoId, repoRow.remoteUrl);
      return await repository.listTaskSummaries({ includeArchived: true });
    }

    return await collectAllTaskSummaries(c);
  },

  async getRepoOverview(c: any, input: RepoOverviewInput): Promise<RepoOverview> {
    assertOrganization(c, input.organizationId);

    const repoRow = await c.db.select({ remoteUrl: repos.remoteUrl }).from(repos).where(eq(repos.repoId, input.repoId)).get();
    if (!repoRow) {
      throw new Error(`Unknown repo: ${input.repoId}`);
    }

    const repository = await getOrCreateRepository(c, c.state.organizationId, input.repoId, repoRow.remoteUrl);
    return await repository.getRepoOverview({});
  },

  async switchTask(c: any, input: { repoId?: string; taskId: string }): Promise<SwitchResult> {
    const { repoId } = await resolveRepositoryForTask(c, input.taskId, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, repoId, input.taskId);
    const record = await h.get();
    const switched = await h.switch();

    return {
      organizationId: c.state.organizationId,
      taskId: input.taskId,
      sandboxProviderId: record.sandboxProviderId,
      switchTarget: switched.switchTarget,
    };
  },

  async auditLog(c: any, input: HistoryQueryInput): Promise<AuditLogEvent[]> {
    assertOrganization(c, input.organizationId);

    const limit = input.limit ?? 20;
    const repoRows = await c.db.select({ repoId: repos.repoId }).from(repos).all();

    const allEvents: AuditLogEvent[] = [];

    for (const row of repoRows) {
      try {
        const auditLog = await getOrCreateAuditLog(c, c.state.organizationId, row.repoId);
        const items = await auditLog.list({
          branch: input.branch,
          taskId: input.taskId,
          limit,
        });
        allEvents.push(...items);
      } catch (error) {
        logActorWarning("organization", "audit log lookup failed for repo", {
          organizationId: c.state.organizationId,
          repoId: row.repoId,
          error: resolveErrorMessage(error),
        });
      }
    }

    allEvents.sort((a, b) => b.createdAt - a.createdAt);
    return allEvents.slice(0, limit);
  },

  async getTask(c: any, input: GetTaskInput): Promise<TaskRecord> {
    assertOrganization(c, input.organizationId);
    const { repoId } = await resolveRepositoryForTask(c, input.taskId, input.repoId);
    return await getTaskHandle(c, c.state.organizationId, repoId, input.taskId).get();
  },

  async attachTask(c: any, input: TaskProxyActionInput): Promise<{ target: string; sessionId: string | null }> {
    assertOrganization(c, input.organizationId);
    const { repoId } = await resolveRepositoryForTask(c, input.taskId, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, repoId, input.taskId);
    return await h.attach({ reason: input.reason });
  },

  async pushTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertOrganization(c, input.organizationId);
    const { repoId } = await resolveRepositoryForTask(c, input.taskId, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, repoId, input.taskId);
    await h.push({ reason: input.reason });
  },

  async syncTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertOrganization(c, input.organizationId);
    const { repoId } = await resolveRepositoryForTask(c, input.taskId, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, repoId, input.taskId);
    await h.sync({ reason: input.reason });
  },

  async mergeTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertOrganization(c, input.organizationId);
    const { repoId } = await resolveRepositoryForTask(c, input.taskId, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, repoId, input.taskId);
    await h.merge({ reason: input.reason });
  },

  async archiveTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertOrganization(c, input.organizationId);
    const { repoId } = await resolveRepositoryForTask(c, input.taskId, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, repoId, input.taskId);
    await h.archive({ reason: input.reason });
  },

  async killTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertOrganization(c, input.organizationId);
    const { repoId } = await resolveRepositoryForTask(c, input.taskId, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, repoId, input.taskId);
    await h.kill({ reason: input.reason });
  },
};
