import { actor, queue } from "rivetkit";
import { workflow } from "rivetkit/workflow";
import type {
  TaskRecord,
  TaskWorkspaceChangeModelInput,
  TaskWorkspaceRenameInput,
  TaskWorkspaceRenameSessionInput,
  TaskWorkspaceSetSessionUnreadInput,
  TaskWorkspaceSendMessageInput,
  TaskWorkspaceUpdateDraftInput,
  SandboxProviderId,
} from "@sandbox-agent/foundry-shared";
import { expectQueueResponse } from "../../services/queue.js";
import { selfTask } from "../handles.js";
import { taskDb } from "./db/db.js";
import { getCurrentRecord } from "./workflow/common.js";
import {
  changeWorkspaceModel,
  closeWorkspaceSession,
  createWorkspaceSession,
  getSessionDetail,
  getTaskDetail,
  getTaskSummary,
  markWorkspaceUnread,
  publishWorkspacePr,
  renameWorkspaceTask,
  renameWorkspaceSession,
  revertWorkspaceFile,
  sendWorkspaceMessage,
  syncWorkspaceSessionStatus,
  setWorkspaceSessionUnread,
  stopWorkspaceSession,
  updateWorkspaceDraft,
} from "./workspace.js";
import { TASK_QUEUE_NAMES, taskWorkflowQueueName, runTaskWorkflow } from "./workflow/index.js";

export interface TaskInput {
  organizationId: string;
  repoId: string;
  taskId: string;
  repoRemote: string;
  branchName: string | null;
  title: string | null;
  task: string;
  sandboxProviderId: SandboxProviderId;
  explicitTitle: string | null;
  explicitBranchName: string | null;
}

interface InitializeCommand {
  sandboxProviderId?: SandboxProviderId;
}

interface TaskActionCommand {
  reason?: string;
}

interface TaskSessionCommand {
  sessionId: string;
  authSessionId?: string;
}

interface TaskStatusSyncCommand {
  sessionId: string;
  status: "running" | "idle" | "error";
  at: number;
}

interface TaskWorkspaceValueCommand {
  value: string;
  authSessionId?: string;
}

interface TaskWorkspaceSessionTitleCommand {
  sessionId: string;
  title: string;
  authSessionId?: string;
}

interface TaskWorkspaceSessionUnreadCommand {
  sessionId: string;
  unread: boolean;
  authSessionId?: string;
}

interface TaskWorkspaceUpdateDraftCommand {
  sessionId: string;
  text: string;
  attachments: Array<any>;
  authSessionId?: string;
}

interface TaskWorkspaceChangeModelCommand {
  sessionId: string;
  model: string;
  authSessionId?: string;
}

interface TaskWorkspaceSendMessageCommand {
  sessionId: string;
  text: string;
  attachments: Array<any>;
  authSessionId?: string;
}

interface TaskWorkspaceCreateSessionCommand {
  model?: string;
  authSessionId?: string;
}

interface TaskWorkspaceCreateSessionAndSendCommand {
  model?: string;
  text: string;
  authSessionId?: string;
}

interface TaskWorkspaceSessionCommand {
  sessionId: string;
  authSessionId?: string;
}

export const task = actor({
  db: taskDb,
  queues: Object.fromEntries(TASK_QUEUE_NAMES.map((name) => [name, queue()])),
  options: {
    name: "Task",
    icon: "wrench",
    actionTimeout: 5 * 60_000,
  },
  createState: (_c, input: TaskInput) => ({
    organizationId: input.organizationId,
    repoId: input.repoId,
    taskId: input.taskId,
    repoRemote: input.repoRemote,
  }),
  actions: {
    async initialize(c, cmd: InitializeCommand): Promise<TaskRecord> {
      const self = selfTask(c);
      const result = await self.send(taskWorkflowQueueName("task.command.initialize"), cmd ?? {}, {
        wait: true,
        timeout: 10_000,
      });
      return expectQueueResponse<TaskRecord>(result);
    },

    async provision(c, cmd: InitializeCommand): Promise<{ ok: true }> {
      const self = selfTask(c);
      await self.send(taskWorkflowQueueName("task.command.provision"), cmd ?? {}, {
        wait: false,
      });
      return { ok: true };
    },

    async attach(c, cmd?: TaskActionCommand): Promise<{ target: string; sessionId: string | null }> {
      const self = selfTask(c);
      const result = await self.send(taskWorkflowQueueName("task.command.attach"), cmd ?? {}, {
        wait: true,
        timeout: 10_000,
      });
      return expectQueueResponse<{ target: string; sessionId: string | null }>(result);
    },

    async switch(c): Promise<{ switchTarget: string }> {
      const self = selfTask(c);
      const result = await self.send(
        taskWorkflowQueueName("task.command.switch"),
        {},
        {
          wait: true,
          timeout: 10_000,
        },
      );
      return expectQueueResponse<{ switchTarget: string }>(result);
    },

    async push(c, cmd?: TaskActionCommand): Promise<void> {
      const self = selfTask(c);
      await self.send(taskWorkflowQueueName("task.command.push"), cmd ?? {}, {
        wait: false,
      });
    },

    async sync(c, cmd?: TaskActionCommand): Promise<void> {
      const self = selfTask(c);
      await self.send(taskWorkflowQueueName("task.command.sync"), cmd ?? {}, {
        wait: false,
      });
    },

    async merge(c, cmd?: TaskActionCommand): Promise<void> {
      const self = selfTask(c);
      await self.send(taskWorkflowQueueName("task.command.merge"), cmd ?? {}, {
        wait: false,
      });
    },

    async archive(c, cmd?: TaskActionCommand): Promise<void> {
      const self = selfTask(c);
      await self.send(taskWorkflowQueueName("task.command.archive"), cmd ?? {}, {
        wait: false,
      });
    },

    async kill(c, cmd?: TaskActionCommand): Promise<void> {
      const self = selfTask(c);
      await self.send(taskWorkflowQueueName("task.command.kill"), cmd ?? {}, {
        wait: false,
      });
    },

    async get(c): Promise<TaskRecord> {
      return await getCurrentRecord({ db: c.db, state: c.state });
    },

    async getTaskSummary(c) {
      return await getTaskSummary(c);
    },

    async getTaskDetail(c, input?: { authSessionId?: string }) {
      return await getTaskDetail(c, input?.authSessionId);
    },

    async getSessionDetail(c, input: { sessionId: string; authSessionId?: string }) {
      return await getSessionDetail(c, input.sessionId, input.authSessionId);
    },

    async markWorkspaceUnread(c, input?: { authSessionId?: string }): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.mark_unread"),
        { authSessionId: input?.authSessionId },
        {
          wait: true,
          timeout: 10_000,
        },
      );
    },

    async renameWorkspaceTask(c, input: TaskWorkspaceRenameInput): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.rename_task"),
        { value: input.value, authSessionId: input.authSessionId } satisfies TaskWorkspaceValueCommand,
        {
          wait: true,
          timeout: 20_000,
        },
      );
    },

    async createWorkspaceSession(c, input?: { model?: string; authSessionId?: string }): Promise<{ sessionId: string }> {
      const self = selfTask(c);
      const result = await self.send(
        taskWorkflowQueueName("task.command.workspace.create_session"),
        {
          ...(input?.model ? { model: input.model } : {}),
          ...(input?.authSessionId ? { authSessionId: input.authSessionId } : {}),
        } satisfies TaskWorkspaceCreateSessionCommand,
        {
          wait: true,
          timeout: 10_000,
        },
      );
      return expectQueueResponse<{ sessionId: string }>(result);
    },

    /**
     * Fire-and-forget: creates a session and sends the initial message.
     * Used by createWorkspaceTask so the caller doesn't block on session creation.
     */
    async createWorkspaceSessionAndSend(c, input: { model?: string; text: string; authSessionId?: string }): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.create_session_and_send"),
        { model: input.model, text: input.text, authSessionId: input.authSessionId } satisfies TaskWorkspaceCreateSessionAndSendCommand,
        { wait: false },
      );
    },

    async renameWorkspaceSession(c, input: TaskWorkspaceRenameSessionInput): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.rename_session"),
        { sessionId: input.sessionId, title: input.title, authSessionId: input.authSessionId } satisfies TaskWorkspaceSessionTitleCommand,
        {
          wait: true,
          timeout: 10_000,
        },
      );
    },

    async setWorkspaceSessionUnread(c, input: TaskWorkspaceSetSessionUnreadInput): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.set_session_unread"),
        { sessionId: input.sessionId, unread: input.unread, authSessionId: input.authSessionId } satisfies TaskWorkspaceSessionUnreadCommand,
        {
          wait: true,
          timeout: 10_000,
        },
      );
    },

    async updateWorkspaceDraft(c, input: TaskWorkspaceUpdateDraftInput): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.update_draft"),
        {
          sessionId: input.sessionId,
          text: input.text,
          attachments: input.attachments,
          authSessionId: input.authSessionId,
        } satisfies TaskWorkspaceUpdateDraftCommand,
        {
          wait: false,
        },
      );
    },

    async changeWorkspaceModel(c, input: TaskWorkspaceChangeModelInput): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.change_model"),
        { sessionId: input.sessionId, model: input.model, authSessionId: input.authSessionId } satisfies TaskWorkspaceChangeModelCommand,
        {
          wait: true,
          timeout: 10_000,
        },
      );
    },

    async sendWorkspaceMessage(c, input: TaskWorkspaceSendMessageInput): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.send_message"),
        {
          sessionId: input.sessionId,
          text: input.text,
          attachments: input.attachments,
          authSessionId: input.authSessionId,
        } satisfies TaskWorkspaceSendMessageCommand,
        {
          wait: false,
        },
      );
    },

    async stopWorkspaceSession(c, input: TaskSessionCommand): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.stop_session"),
        { sessionId: input.sessionId, authSessionId: input.authSessionId } satisfies TaskWorkspaceSessionCommand,
        {
          wait: false,
        },
      );
    },

    async syncWorkspaceSessionStatus(c, input: TaskStatusSyncCommand): Promise<void> {
      const self = selfTask(c);
      await self.send(taskWorkflowQueueName("task.command.workspace.sync_session_status"), input, {
        wait: true,
        timeout: 20_000,
      });
    },

    async closeWorkspaceSession(c, input: TaskSessionCommand): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.close_session"),
        { sessionId: input.sessionId, authSessionId: input.authSessionId } satisfies TaskWorkspaceSessionCommand,
        {
          wait: false,
        },
      );
    },

    async publishWorkspacePr(c): Promise<void> {
      const self = selfTask(c);
      await self.send(
        taskWorkflowQueueName("task.command.workspace.publish_pr"),
        {},
        {
          wait: false,
        },
      );
    },

    async revertWorkspaceFile(c, input: { path: string }): Promise<void> {
      const self = selfTask(c);
      await self.send(taskWorkflowQueueName("task.command.workspace.revert_file"), input, {
        wait: false,
      });
    },
  },
  run: workflow(runTaskWorkflow),
});

export { TASK_QUEUE_NAMES };
