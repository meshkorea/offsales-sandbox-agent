import { Loop } from "rivetkit/workflow";
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

type WorkflowHandler = (loopCtx: any, msg: { name: TaskQueueName; body: any; complete: (response: unknown) => Promise<void> }) => Promise<void>;

const commandHandlers: Record<TaskQueueName, WorkflowHandler> = {
  "task.command.initialize": async (loopCtx, msg) => {
    const body = msg.body;

    await loopCtx.step("init-bootstrap-db", async () => initBootstrapDbActivity(loopCtx, body));
    await loopCtx.step("init-enqueue-provision", async () => initEnqueueProvisionActivity(loopCtx, body));
    await loopCtx.removed("init-dispatch-provision-v2", "step");
    const currentRecord = await loopCtx.step("init-read-current-record", async () => getCurrentRecord(loopCtx));
    try {
      await msg.complete(currentRecord);
    } catch (error) {
      logActorWarning("task.workflow", "initialize completion failed", {
        error: resolveErrorMessage(error),
      });
    }
  },

  "task.command.provision": async (loopCtx, msg) => {
    await loopCtx.removed("init-failed", "step");
    await loopCtx.removed("init-failed-v2", "step");
    try {
      await loopCtx.removed("init-ensure-name", "step");
      await loopCtx.removed("init-assert-name", "step");
      await loopCtx.removed("init-create-sandbox", "step");
      await loopCtx.removed("init-ensure-agent", "step");
      await loopCtx.removed("init-start-sandbox-instance", "step");
      await loopCtx.removed("init-expose-sandbox", "step");
      await loopCtx.removed("init-create-session", "step");
      await loopCtx.removed("init-write-db", "step");
      await loopCtx.removed("init-start-status-sync", "step");
      await loopCtx.step("init-complete", async () => initCompleteActivity(loopCtx, msg.body));
      await msg.complete({ ok: true });
    } catch (error) {
      await loopCtx.step("init-failed-v3", async () => initFailedActivity(loopCtx, error, msg.body));
      await msg.complete({
        ok: false,
        error: resolveErrorMessage(error),
      });
    }
  },

  "task.command.attach": async (loopCtx, msg) => {
    await loopCtx.step("handle-attach", async () => handleAttachActivity(loopCtx, msg));
  },

  "task.command.switch": async (loopCtx, msg) => {
    await loopCtx.step("handle-switch", async () => handleSwitchActivity(loopCtx, msg));
  },

  "task.command.push": async (loopCtx, msg) => {
    await loopCtx.step("handle-push", async () => handlePushActivity(loopCtx, msg));
  },

  "task.command.sync": async (loopCtx, msg) => {
    await loopCtx.step("handle-sync", async () => handleSimpleCommandActivity(loopCtx, msg, "task.sync"));
  },

  "task.command.merge": async (loopCtx, msg) => {
    await loopCtx.step("handle-merge", async () => handleSimpleCommandActivity(loopCtx, msg, "task.merge"));
  },

  "task.command.archive": async (loopCtx, msg) => {
    await loopCtx.step("handle-archive", async () => handleArchiveActivity(loopCtx, msg));
  },

  "task.command.kill": async (loopCtx, msg) => {
    await loopCtx.step("kill-destroy-sandbox", async () => killDestroySandboxActivity(loopCtx));
    await loopCtx.step("kill-write-db", async () => killWriteDbActivity(loopCtx, msg));
  },

  "task.command.get": async (loopCtx, msg) => {
    await loopCtx.step("handle-get", async () => handleGetActivity(loopCtx, msg));
  },

  "task.command.pull_request.sync": async (loopCtx, msg) => {
    await loopCtx.step("task-pull-request-sync", async () => syncTaskPullRequest(loopCtx, msg.body?.pullRequest ?? null));
    await msg.complete({ ok: true });
  },

  "task.command.workspace.mark_unread": async (loopCtx, msg) => {
    await loopCtx.step("workspace-mark-unread", async () => markWorkspaceUnread(loopCtx, msg.body?.authSessionId));
    await msg.complete({ ok: true });
  },

  "task.command.workspace.rename_task": async (loopCtx, msg) => {
    await loopCtx.step("workspace-rename-task", async () => renameWorkspaceTask(loopCtx, msg.body.value));
    await msg.complete({ ok: true });
  },

  "task.command.workspace.create_session": async (loopCtx, msg) => {
    try {
      const created = await loopCtx.step({
        name: "workspace-create-session",
        timeout: 5 * 60_000,
        run: async () => createWorkspaceSession(loopCtx, msg.body?.model, msg.body?.authSessionId),
      });
      await msg.complete(created);
    } catch (error) {
      await msg.complete({ error: resolveErrorMessage(error) });
    }
  },

  "task.command.workspace.create_session_and_send": async (loopCtx, msg) => {
    try {
      const created = await loopCtx.step({
        name: "workspace-create-session-for-send",
        timeout: 5 * 60_000,
        run: async () => createWorkspaceSession(loopCtx, msg.body?.model, msg.body?.authSessionId),
      });
      await loopCtx.step({
        name: "workspace-send-initial-message",
        timeout: 5 * 60_000,
        run: async () => sendWorkspaceMessage(loopCtx, created.sessionId, msg.body.text, [], msg.body?.authSessionId),
      });
    } catch (error) {
      logActorWarning("task.workflow", "create_session_and_send failed", {
        error: resolveErrorMessage(error),
      });
    }
    await msg.complete({ ok: true });
  },

  "task.command.workspace.ensure_session": async (loopCtx, msg) => {
    await loopCtx.step({
      name: "workspace-ensure-session",
      timeout: 5 * 60_000,
      run: async () => ensureWorkspaceSession(loopCtx, msg.body.sessionId, msg.body?.model, msg.body?.authSessionId),
    });
    await msg.complete({ ok: true });
  },

  "task.command.workspace.rename_session": async (loopCtx, msg) => {
    await loopCtx.step("workspace-rename-session", async () => renameWorkspaceSession(loopCtx, msg.body.sessionId, msg.body.title));
    await msg.complete({ ok: true });
  },

  "task.command.workspace.select_session": async (loopCtx, msg) => {
    await loopCtx.step("workspace-select-session", async () => selectWorkspaceSession(loopCtx, msg.body.sessionId, msg.body?.authSessionId));
    await msg.complete({ ok: true });
  },

  "task.command.workspace.set_session_unread": async (loopCtx, msg) => {
    await loopCtx.step("workspace-set-session-unread", async () => setWorkspaceSessionUnread(loopCtx, msg.body.sessionId, msg.body.unread, msg.body?.authSessionId));
    await msg.complete({ ok: true });
  },

  "task.command.workspace.update_draft": async (loopCtx, msg) => {
    await loopCtx.step("workspace-update-draft", async () => updateWorkspaceDraft(loopCtx, msg.body.sessionId, msg.body.text, msg.body.attachments, msg.body?.authSessionId));
    await msg.complete({ ok: true });
  },

  "task.command.workspace.change_model": async (loopCtx, msg) => {
    await loopCtx.step("workspace-change-model", async () => changeWorkspaceModel(loopCtx, msg.body.sessionId, msg.body.model, msg.body?.authSessionId));
    await msg.complete({ ok: true });
  },

  "task.command.workspace.send_message": async (loopCtx, msg) => {
    try {
      await loopCtx.step({
        name: "workspace-send-message",
        timeout: 10 * 60_000,
        run: async () => sendWorkspaceMessage(loopCtx, msg.body.sessionId, msg.body.text, msg.body.attachments, msg.body?.authSessionId),
      });
      await msg.complete({ ok: true });
    } catch (error) {
      await msg.complete({ error: resolveErrorMessage(error) });
    }
  },

  "task.command.workspace.stop_session": async (loopCtx, msg) => {
    await loopCtx.step({
      name: "workspace-stop-session",
      timeout: 5 * 60_000,
      run: async () => stopWorkspaceSession(loopCtx, msg.body.sessionId),
    });
    await msg.complete({ ok: true });
  },

  "task.command.workspace.sync_session_status": async (loopCtx, msg) => {
    await loopCtx.step("workspace-sync-session-status", async () => syncWorkspaceSessionStatus(loopCtx, msg.body.sessionId, msg.body.status, msg.body.at));
    await msg.complete({ ok: true });
  },

  "task.command.workspace.refresh_derived": async (loopCtx, msg) => {
    await loopCtx.step({
      name: "workspace-refresh-derived",
      timeout: 5 * 60_000,
      run: async () => refreshWorkspaceDerivedState(loopCtx),
    });
    await msg.complete({ ok: true });
  },

  "task.command.workspace.refresh_session_transcript": async (loopCtx, msg) => {
    await loopCtx.step({
      name: "workspace-refresh-session-transcript",
      timeout: 60_000,
      run: async () => refreshWorkspaceSessionTranscript(loopCtx, msg.body.sessionId),
    });
    await msg.complete({ ok: true });
  },

  "task.command.workspace.close_session": async (loopCtx, msg) => {
    await loopCtx.step({
      name: "workspace-close-session",
      timeout: 5 * 60_000,
      run: async () => closeWorkspaceSession(loopCtx, msg.body.sessionId, msg.body?.authSessionId),
    });
    await msg.complete({ ok: true });
  },

  "task.command.workspace.publish_pr": async (loopCtx, msg) => {
    await loopCtx.step({
      name: "workspace-publish-pr",
      timeout: 10 * 60_000,
      run: async () => publishWorkspacePr(loopCtx),
    });
    await msg.complete({ ok: true });
  },

  "task.command.workspace.revert_file": async (loopCtx, msg) => {
    await loopCtx.step({
      name: "workspace-revert-file",
      timeout: 5 * 60_000,
      run: async () => revertWorkspaceFile(loopCtx, msg.body.path),
    });
    await msg.complete({ ok: true });
  },
};

export async function runTaskWorkflow(ctx: any): Promise<void> {
  await ctx.loop("task-command-loop", async (loopCtx: any) => {
    const msg = await loopCtx.queue.next("next-command", {
      names: [...TASK_QUEUE_NAMES],
      completable: true,
    });
    if (!msg) {
      return Loop.continue(undefined);
    }
    const handler = commandHandlers[msg.name as TaskQueueName];
    if (handler) {
      try {
        await handler(loopCtx, msg);
      } catch (error) {
        const message = resolveErrorMessage(error);
        logActorWarning("task.workflow", "task workflow command failed", {
          queueName: msg.name,
          error: message,
        });
        await msg.complete({ error: message }).catch(() => {});
      }
    }
    return Loop.continue(undefined);
  });
}
