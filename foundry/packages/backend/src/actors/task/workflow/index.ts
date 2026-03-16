import { logActorWarning, resolveErrorMessage } from "../../logging.js";
import { getCurrentRecord } from "./common.js";
import { initBootstrapDbActivity, initCompleteActivity, initEnqueueProvisionActivity, initFailedActivity } from "./init.js";
import {
  handleArchiveActivity,
  handleAttachActivity,
  handleGetActivity,
  handlePushActivity,
  handleSimpleCommandActivity,
  handleSwitchActivity,
  killDestroySandboxActivity,
  killWriteDbActivity,
} from "./commands.js";
import { TASK_QUEUE_NAMES } from "./queue.js";
import {
  changeWorkspaceModel,
  closeWorkspaceSession,
  createWorkspaceSession,
  ensureWorkspaceSession,
  refreshWorkspaceDerivedState,
  refreshWorkspaceSessionTranscript,
  markWorkspaceUnread,
  publishWorkspacePr,
  renameWorkspaceTask,
  renameWorkspaceSession,
  selectWorkspaceSession,
  revertWorkspaceFile,
  sendWorkspaceMessage,
  setWorkspaceSessionUnread,
  stopWorkspaceSession,
  syncTaskPullRequest,
  syncWorkspaceSessionStatus,
  updateWorkspaceDraft,
} from "../workspace.js";

export { TASK_QUEUE_NAMES, taskWorkflowQueueName } from "./queue.js";

type TaskQueueName = (typeof TASK_QUEUE_NAMES)[number];

type CommandHandler = (c: any, msg: { name: TaskQueueName; body: any; complete: (response: unknown) => Promise<void> }) => Promise<void>;

const commandHandlers: Record<TaskQueueName, CommandHandler> = {
  "task.command.initialize": async (c, msg) => {
    const body = msg.body;
    await initBootstrapDbActivity(c, body);
    await initEnqueueProvisionActivity(c, body);
    const currentRecord = await getCurrentRecord(c);
    try {
      await msg.complete(currentRecord);
    } catch (error) {
      logActorWarning("task.workflow", "initialize completion failed", {
        error: resolveErrorMessage(error),
      });
    }
  },

  "task.command.provision": async (c, msg) => {
    try {
      await initCompleteActivity(c, msg.body);
      await msg.complete({ ok: true });
    } catch (error) {
      await initFailedActivity(c, error, msg.body);
      await msg.complete({
        ok: false,
        error: resolveErrorMessage(error),
      });
    }
  },

  "task.command.attach": async (c, msg) => {
    await handleAttachActivity(c, msg);
  },

  "task.command.switch": async (c, msg) => {
    await handleSwitchActivity(c, msg);
  },

  "task.command.push": async (c, msg) => {
    await handlePushActivity(c, msg);
  },

  "task.command.sync": async (c, msg) => {
    await handleSimpleCommandActivity(c, msg, "task.sync");
  },

  "task.command.merge": async (c, msg) => {
    await handleSimpleCommandActivity(c, msg, "task.merge");
  },

  "task.command.archive": async (c, msg) => {
    await handleArchiveActivity(c, msg);
  },

  "task.command.kill": async (c, msg) => {
    await killDestroySandboxActivity(c);
    await killWriteDbActivity(c, msg);
  },

  "task.command.get": async (c, msg) => {
    await handleGetActivity(c, msg);
  },

  "task.command.pull_request.sync": async (c, msg) => {
    await syncTaskPullRequest(c, msg.body?.pullRequest ?? null);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.mark_unread": async (c, msg) => {
    await markWorkspaceUnread(c, msg.body?.authSessionId);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.rename_task": async (c, msg) => {
    await renameWorkspaceTask(c, msg.body.value);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.create_session": async (c, msg) => {
    try {
      const created = await createWorkspaceSession(c, msg.body?.model, msg.body?.authSessionId);
      await msg.complete(created);
    } catch (error) {
      await msg.complete({ error: resolveErrorMessage(error) });
    }
  },

  "task.command.workspace.create_session_and_send": async (c, msg) => {
    try {
      const created = await createWorkspaceSession(c, msg.body?.model, msg.body?.authSessionId);
      await sendWorkspaceMessage(c, created.sessionId, msg.body.text, [], msg.body?.authSessionId);
    } catch (error) {
      logActorWarning("task.workflow", "create_session_and_send failed", {
        error: resolveErrorMessage(error),
      });
    }
    await msg.complete({ ok: true });
  },

  "task.command.workspace.ensure_session": async (c, msg) => {
    await ensureWorkspaceSession(c, msg.body.sessionId, msg.body?.model, msg.body?.authSessionId);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.rename_session": async (c, msg) => {
    await renameWorkspaceSession(c, msg.body.sessionId, msg.body.title);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.select_session": async (c, msg) => {
    await selectWorkspaceSession(c, msg.body.sessionId, msg.body?.authSessionId);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.set_session_unread": async (c, msg) => {
    await setWorkspaceSessionUnread(c, msg.body.sessionId, msg.body.unread, msg.body?.authSessionId);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.update_draft": async (c, msg) => {
    await updateWorkspaceDraft(c, msg.body.sessionId, msg.body.text, msg.body.attachments, msg.body?.authSessionId);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.change_model": async (c, msg) => {
    await changeWorkspaceModel(c, msg.body.sessionId, msg.body.model, msg.body?.authSessionId);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.send_message": async (c, msg) => {
    try {
      await sendWorkspaceMessage(c, msg.body.sessionId, msg.body.text, msg.body.attachments, msg.body?.authSessionId);
      await msg.complete({ ok: true });
    } catch (error) {
      await msg.complete({ error: resolveErrorMessage(error) });
    }
  },

  "task.command.workspace.stop_session": async (c, msg) => {
    await stopWorkspaceSession(c, msg.body.sessionId);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.sync_session_status": async (c, msg) => {
    await syncWorkspaceSessionStatus(c, msg.body.sessionId, msg.body.status, msg.body.at);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.refresh_derived": async (c, msg) => {
    await refreshWorkspaceDerivedState(c);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.refresh_session_transcript": async (c, msg) => {
    await refreshWorkspaceSessionTranscript(c, msg.body.sessionId);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.close_session": async (c, msg) => {
    await closeWorkspaceSession(c, msg.body.sessionId, msg.body?.authSessionId);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.publish_pr": async (c, msg) => {
    await publishWorkspacePr(c);
    await msg.complete({ ok: true });
  },

  "task.command.workspace.revert_file": async (c, msg) => {
    await revertWorkspaceFile(c, msg.body.path);
    await msg.complete({ ok: true });
  },
};

/**
 * Plain run handler (no workflow engine). Drains the queue using `c.queue.iter()`
 * with completable messages.
 */
export async function runTaskCommandLoop(c: any): Promise<void> {
  for await (const msg of c.queue.iter({ names: [...TASK_QUEUE_NAMES], completable: true })) {
    const handler = commandHandlers[msg.name as TaskQueueName];
    if (handler) {
      try {
        await handler(c, msg);
      } catch (error) {
        const message = resolveErrorMessage(error);
        logActorWarning("task.workflow", "task command failed", {
          queueName: msg.name,
          error: message,
        });
        await msg.complete({ error: message }).catch(() => {});
      }
    } else {
      logActorWarning("task.workflow", "unknown queue message", { queueName: msg.name });
      await msg.complete({ error: `Unknown command: ${msg.name}` });
    }
  }
}
