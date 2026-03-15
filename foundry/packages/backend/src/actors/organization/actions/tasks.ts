// @ts-nocheck
import { desc, eq } from "drizzle-orm";
import type {
  AuditLogEvent,
  CreateTaskInput,
  HistoryQueryInput,
  ListTasksInput,
  RepoOverview,
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
} from "@sandbox-agent/foundry-shared";
import { getActorRuntimeContext } from "../../context.js";
import { getOrCreateAuditLog, getOrCreateRepository, getTask as getTaskHandle, selfOrganization } from "../../handles.js";
import { defaultSandboxProviderId } from "../../../sandbox-config.js";
import { expectQueueResponse } from "../../../services/queue.js";
import { logActorWarning, resolveErrorMessage } from "../../logging.js";
import { repositoryWorkflowQueueName } from "../../repository/workflow.js";
import { taskWorkflowQueueName } from "../../task/workflow/index.js";
import { repos } from "../db/schema.js";
import { organizationWorkflowQueueName } from "../queues.js";

function assertOrganization(c: { state: { organizationId: string } }, organizationId: string): void {
  if (organizationId !== c.state.organizationId) {
    throw new Error(`Organization actor mismatch: actor=${c.state.organizationId} command=${organizationId}`);
  }
}

async function requireRepositoryForTask(c: any, repoId: string) {
  const repoRow = await c.db.select({ repoId: repos.repoId }).from(repos).where(eq(repos.repoId, repoId)).get();
  if (!repoRow) {
    throw new Error(`Unknown repo: ${repoId}`);
  }
  return await getOrCreateRepository(c, c.state.organizationId, repoId);
}

async function requireWorkspaceTask(c: any, repoId: string, taskId: string) {
  return getTaskHandle(c, c.state.organizationId, repoId, taskId);
}

async function collectAllTaskSummaries(c: any): Promise<TaskSummary[]> {
  const repoRows = await c.db.select({ repoId: repos.repoId, remoteUrl: repos.remoteUrl }).from(repos).orderBy(desc(repos.updatedAt)).all();

  const all: TaskSummary[] = [];
  for (const row of repoRows) {
    try {
      const repository = await getOrCreateRepository(c, c.state.organizationId, row.repoId);
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

interface GetTaskInput {
  organizationId: string;
  repoId: string;
  taskId: string;
}

interface TaskProxyActionInput extends GetTaskInput {
  reason?: string;
}

interface RepoOverviewInput {
  organizationId: string;
  repoId: string;
}

export async function createTaskMutation(c: any, input: CreateTaskInput): Promise<TaskRecord> {
  assertOrganization(c, input.organizationId);

  const { config } = getActorRuntimeContext();
  const sandboxProviderId = input.sandboxProviderId ?? defaultSandboxProviderId(config);
  await requireRepositoryForTask(c, input.repoId);

  const repository = await getOrCreateRepository(c, c.state.organizationId, input.repoId);
  return expectQueueResponse<TaskRecord>(
    await repository.send(
      repositoryWorkflowQueueName("repository.command.createTask"),
      {
        task: input.task,
        sandboxProviderId,
        explicitTitle: input.explicitTitle ?? null,
        explicitBranchName: input.explicitBranchName ?? null,
        onBranch: input.onBranch ?? null,
      },
      {
        wait: true,
        timeout: 10_000,
      },
    ),
  );
}

export const organizationTaskActions = {
  async createTask(c: any, input: CreateTaskInput): Promise<TaskRecord> {
    const self = selfOrganization(c);
    return expectQueueResponse<TaskRecord>(
      await self.send(organizationWorkflowQueueName("organization.command.createTask"), input, {
        wait: true,
        timeout: 10_000,
      }),
    );
  },

  async createWorkspaceTask(c: any, input: TaskWorkspaceCreateTaskInput): Promise<{ taskId: string; sessionId?: string }> {
    const created = await organizationTaskActions.createTask(c, {
      organizationId: c.state.organizationId,
      repoId: input.repoId,
      task: input.task,
      ...(input.title ? { explicitTitle: input.title } : {}),
      ...(input.onBranch ? { onBranch: input.onBranch } : input.branch ? { explicitBranchName: input.branch } : {}),
    });

    const task = await requireWorkspaceTask(c, input.repoId, created.taskId);
    await task.send(
      taskWorkflowQueueName("task.command.workspace.create_session_and_send"),
      {
        model: input.model,
        text: input.task,
        authSessionId: input.authSessionId,
      },
      { wait: false },
    );

    return { taskId: created.taskId };
  },

  async markWorkspaceUnread(c: any, input: TaskWorkspaceSelectInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await expectQueueResponse<{ ok: true }>(
      await task.send(taskWorkflowQueueName("task.command.workspace.mark_unread"), { authSessionId: input.authSessionId }, { wait: true, timeout: 10_000 }),
    );
  },

  async renameWorkspaceTask(c: any, input: TaskWorkspaceRenameInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await expectQueueResponse<{ ok: true }>(
      await task.send(taskWorkflowQueueName("task.command.workspace.rename_task"), { value: input.value }, { wait: true, timeout: 20_000 }),
    );
  },

  async createWorkspaceSession(c: any, input: TaskWorkspaceSelectInput & { model?: string }): Promise<{ sessionId: string }> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    return await expectQueueResponse<{ sessionId: string }>(
      await task.send(
        taskWorkflowQueueName("task.command.workspace.create_session"),
        {
          ...(input.model ? { model: input.model } : {}),
          ...(input.authSessionId ? { authSessionId: input.authSessionId } : {}),
        },
        { wait: true, timeout: 10_000 },
      ),
    );
  },

  async renameWorkspaceSession(c: any, input: TaskWorkspaceRenameSessionInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await expectQueueResponse<{ ok: true }>(
      await task.send(
        taskWorkflowQueueName("task.command.workspace.rename_session"),
        { sessionId: input.sessionId, title: input.title, authSessionId: input.authSessionId },
        { wait: true, timeout: 10_000 },
      ),
    );
  },

  async selectWorkspaceSession(c: any, input: TaskWorkspaceSessionInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await expectQueueResponse<{ ok: true }>(
      await task.send(
        taskWorkflowQueueName("task.command.workspace.select_session"),
        { sessionId: input.sessionId, authSessionId: input.authSessionId },
        { wait: true, timeout: 10_000 },
      ),
    );
  },

  async setWorkspaceSessionUnread(c: any, input: TaskWorkspaceSetSessionUnreadInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await expectQueueResponse<{ ok: true }>(
      await task.send(
        taskWorkflowQueueName("task.command.workspace.set_session_unread"),
        { sessionId: input.sessionId, unread: input.unread, authSessionId: input.authSessionId },
        { wait: true, timeout: 10_000 },
      ),
    );
  },

  async updateWorkspaceDraft(c: any, input: TaskWorkspaceUpdateDraftInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.send(
      taskWorkflowQueueName("task.command.workspace.update_draft"),
      {
        sessionId: input.sessionId,
        text: input.text,
        attachments: input.attachments,
        authSessionId: input.authSessionId,
      },
      { wait: false },
    );
  },

  async changeWorkspaceModel(c: any, input: TaskWorkspaceChangeModelInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await expectQueueResponse<{ ok: true }>(
      await task.send(
        taskWorkflowQueueName("task.command.workspace.change_model"),
        { sessionId: input.sessionId, model: input.model, authSessionId: input.authSessionId },
        { wait: true, timeout: 10_000 },
      ),
    );
  },

  async sendWorkspaceMessage(c: any, input: TaskWorkspaceSendMessageInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.send(
      taskWorkflowQueueName("task.command.workspace.send_message"),
      {
        sessionId: input.sessionId,
        text: input.text,
        attachments: input.attachments,
        authSessionId: input.authSessionId,
      },
      { wait: false },
    );
  },

  async stopWorkspaceSession(c: any, input: TaskWorkspaceSessionInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.send(
      taskWorkflowQueueName("task.command.workspace.stop_session"),
      { sessionId: input.sessionId, authSessionId: input.authSessionId },
      { wait: false },
    );
  },

  async closeWorkspaceSession(c: any, input: TaskWorkspaceSessionInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.send(
      taskWorkflowQueueName("task.command.workspace.close_session"),
      { sessionId: input.sessionId, authSessionId: input.authSessionId },
      { wait: false },
    );
  },

  async publishWorkspacePr(c: any, input: TaskWorkspaceSelectInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.send(taskWorkflowQueueName("task.command.workspace.publish_pr"), {}, { wait: false });
  },

  async revertWorkspaceFile(c: any, input: TaskWorkspaceDiffInput): Promise<void> {
    const task = await requireWorkspaceTask(c, input.repoId, input.taskId);
    await task.send(taskWorkflowQueueName("task.command.workspace.revert_file"), input, { wait: false });
  },

  async getRepoOverview(c: any, input: RepoOverviewInput): Promise<RepoOverview> {
    assertOrganization(c, input.organizationId);
    const repository = await requireRepositoryForTask(c, input.repoId);
    return await repository.getRepoOverview({});
  },

  async listTasks(c: any, input: ListTasksInput): Promise<TaskSummary[]> {
    assertOrganization(c, input.organizationId);

    if (input.repoId) {
      const repository = await requireRepositoryForTask(c, input.repoId);
      return await repository.listTaskSummaries({ includeArchived: true });
    }

    return await collectAllTaskSummaries(c);
  },

  async switchTask(c: any, input: { repoId: string; taskId: string }): Promise<SwitchResult> {
    await requireRepositoryForTask(c, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, input.repoId, input.taskId);
    const record = await h.get();
    const switched = await expectQueueResponse<{ switchTarget: string }>(
      await h.send(taskWorkflowQueueName("task.command.switch"), {}, { wait: true, timeout: 10_000 }),
    );

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
    const repoRows = await c.db.select({ repoId: repos.repoId }).from(repos).orderBy(desc(repos.updatedAt)).all();
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
    await requireRepositoryForTask(c, input.repoId);
    return await getTaskHandle(c, c.state.organizationId, input.repoId, input.taskId).get();
  },

  async attachTask(c: any, input: TaskProxyActionInput): Promise<{ target: string; sessionId: string | null }> {
    assertOrganization(c, input.organizationId);
    await requireRepositoryForTask(c, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, input.repoId, input.taskId);
    return await expectQueueResponse<{ target: string; sessionId: string | null }>(
      await h.send(taskWorkflowQueueName("task.command.attach"), { reason: input.reason }, { wait: true, timeout: 10_000 }),
    );
  },

  async pushTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertOrganization(c, input.organizationId);
    await requireRepositoryForTask(c, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, input.repoId, input.taskId);
    await h.send(taskWorkflowQueueName("task.command.push"), { reason: input.reason }, { wait: false });
  },

  async syncTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertOrganization(c, input.organizationId);
    await requireRepositoryForTask(c, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, input.repoId, input.taskId);
    await h.send(taskWorkflowQueueName("task.command.sync"), { reason: input.reason }, { wait: false });
  },

  async mergeTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertOrganization(c, input.organizationId);
    await requireRepositoryForTask(c, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, input.repoId, input.taskId);
    await h.send(taskWorkflowQueueName("task.command.merge"), { reason: input.reason }, { wait: false });
  },

  async archiveTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertOrganization(c, input.organizationId);
    await requireRepositoryForTask(c, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, input.repoId, input.taskId);
    await h.send(taskWorkflowQueueName("task.command.archive"), { reason: input.reason }, { wait: false });
  },

  async killTask(c: any, input: TaskProxyActionInput): Promise<void> {
    assertOrganization(c, input.organizationId);
    await requireRepositoryForTask(c, input.repoId);
    const h = getTaskHandle(c, c.state.organizationId, input.repoId, input.taskId);
    await h.send(taskWorkflowQueueName("task.command.kill"), { reason: input.reason }, { wait: false });
  },
};
