import { actor, queue } from "rivetkit";
import { workflow } from "rivetkit/workflow";
import type { ProviderId } from "@sandbox-agent/foundry-shared";
import { getTask, getSandboxInstance, selfTaskStatusSync } from "../handles.js";
import { logActorWarning, resolveErrorMessage, resolveErrorStack } from "../logging.js";
import { reportWorkflowIssueToOrganization } from "../runtime-issues.js";
import { type PollingControlState, runWorkflowPollingLoop } from "../polling.js";

export interface TaskStatusSyncInput {
  workspaceId: string;
  repoId: string;
  taskId: string;
  providerId: ProviderId;
  sandboxId: string;
  sessionId: string;
  intervalMs: number;
}

interface SetIntervalCommand {
  intervalMs: number;
}

interface TaskStatusSyncState extends PollingControlState {
  workspaceId: string;
  repoId: string;
  taskId: string;
  providerId: ProviderId;
  sandboxId: string;
  sessionId: string;
}

const CONTROL = {
  start: "task.status_sync.control.start",
  stop: "task.status_sync.control.stop",
  setInterval: "task.status_sync.control.set_interval",
  force: "task.status_sync.control.force",
} as const;

function isActorNotFoundError(error: unknown): boolean {
  const message = resolveErrorMessage(error).toLowerCase();
  return message.includes("actor not found");
}

async function pollSessionStatus(c: { state: TaskStatusSyncState }): Promise<void> {
  const sandboxInstance = getSandboxInstance(c, c.state.workspaceId, c.state.providerId, c.state.sandboxId);
  const status = await sandboxInstance.sessionStatus({ sessionId: c.state.sessionId });

  const parent = getTask(c, c.state.workspaceId, c.state.repoId, c.state.taskId);
  await parent.syncWorkbenchSessionStatus({
    sessionId: c.state.sessionId,
    status: status.status,
    at: Date.now(),
  });
}

async function runTaskStatusSyncWorkflow(ctx: any): Promise<void> {
  await runWorkflowPollingLoop(ctx, {
    loopName: "task-status-sync-loop",
    control: CONTROL,
    onPoll: async (loopCtx) => {
      const pollingCtx = loopCtx as any;
      try {
        await pollSessionStatus(pollingCtx);
      } catch (error) {
        if (isActorNotFoundError(error)) {
          pollingCtx.state.running = false;
          logActorWarning("task-status-sync", "stopping orphaned poller", {
            workspaceId: pollingCtx.state.workspaceId,
            repoId: pollingCtx.state.repoId,
            taskId: pollingCtx.state.taskId,
            sandboxId: pollingCtx.state.sandboxId,
            sessionId: pollingCtx.state.sessionId,
            error: resolveErrorMessage(error),
          });
          return;
        }
        logActorWarning("task-status-sync", "poll failed", {
          error: resolveErrorMessage(error),
          stack: resolveErrorStack(error),
        });
      }
    },
  });
}

const taskStatusSyncConfig: any = {
  queues: {
    [CONTROL.start]: queue(),
    [CONTROL.stop]: queue(),
    [CONTROL.setInterval]: queue(),
    [CONTROL.force]: queue(),
  },
  options: {
    // Polling actors rely on timer-based wakeups; sleeping would pause the timer and stop polling.
    noSleep: true,
  },
  createState: (_c, input: TaskStatusSyncInput): TaskStatusSyncState => ({
    workspaceId: input.workspaceId,
    repoId: input.repoId,
    taskId: input.taskId,
    providerId: input.providerId,
    sandboxId: input.sandboxId,
    sessionId: input.sessionId,
    intervalMs: input.intervalMs,
    running: true,
  }),
  actions: {
    async start(c): Promise<void> {
      const self = selfTaskStatusSync(c);
      await self.send(CONTROL.start, {}, { wait: true, timeout: 15_000 });
    },

    async stop(c): Promise<void> {
      const self = selfTaskStatusSync(c);
      await self.send(CONTROL.stop, {}, { wait: true, timeout: 15_000 });
    },

    async setIntervalMs(c, payload: SetIntervalCommand): Promise<void> {
      const self = selfTaskStatusSync(c);
      await self.send(CONTROL.setInterval, payload, { wait: true, timeout: 15_000 });
    },

    async force(c): Promise<void> {
      const self = selfTaskStatusSync(c);
      await self.send(CONTROL.force, {}, { wait: true, timeout: 5 * 60_000 });
    },
  },
  run: workflow(runTaskStatusSyncWorkflow, {
    onError: async (c: any, event) => {
      await reportWorkflowIssueToOrganization(c, event, {
        actorType: "task_status_sync",
        organizationId: c.state.workspaceId,
        scopeId: c.state.sessionId,
        scopeLabel: `Task status sync ${c.state.taskId}`,
      });
    },
  }),
};

export const taskStatusSync = (actor as any)(taskStatusSyncConfig);
