// @ts-nocheck
import { Loop } from "rivetkit/workflow";
import { logActorWarning, resolveErrorMessage } from "../logging.js";
import {
  applyTaskSummaryUpdateMutation,
  createTaskMutation,
  refreshTaskSummaryForBranchMutation,
  registerTaskBranchMutation,
  removeTaskSummaryMutation,
} from "./actions.js";

export const REPOSITORY_QUEUE_NAMES = [
  "repository.command.createTask",
  "repository.command.registerTaskBranch",
  "repository.command.applyTaskSummaryUpdate",
  "repository.command.removeTaskSummary",
  "repository.command.refreshTaskSummaryForBranch",
] as const;

export type RepositoryQueueName = (typeof REPOSITORY_QUEUE_NAMES)[number];

export function repositoryWorkflowQueueName(name: RepositoryQueueName): RepositoryQueueName {
  return name;
}

export async function runRepositoryWorkflow(ctx: any): Promise<void> {
  await ctx.loop("repository-command-loop", async (loopCtx: any) => {
    const msg = await loopCtx.queue.next("next-repository-command", {
      names: [...REPOSITORY_QUEUE_NAMES],
      completable: true,
    });
    if (!msg) {
      return Loop.continue(undefined);
    }

    try {
      if (msg.name === "repository.command.createTask") {
        const result = await loopCtx.step({
          name: "repository-create-task",
          timeout: 5 * 60_000,
          run: async () => createTaskMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "repository.command.registerTaskBranch") {
        const result = await loopCtx.step({
          name: "repository-register-task-branch",
          timeout: 60_000,
          run: async () => registerTaskBranchMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "repository.command.applyTaskSummaryUpdate") {
        await loopCtx.step({
          name: "repository-apply-task-summary-update",
          timeout: 30_000,
          run: async () => applyTaskSummaryUpdateMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "repository.command.removeTaskSummary") {
        await loopCtx.step({
          name: "repository-remove-task-summary",
          timeout: 30_000,
          run: async () => removeTaskSummaryMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "repository.command.refreshTaskSummaryForBranch") {
        await loopCtx.step({
          name: "repository-refresh-task-summary-for-branch",
          timeout: 60_000,
          run: async () => refreshTaskSummaryForBranchMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }
    } catch (error) {
      const message = resolveErrorMessage(error);
      logActorWarning("repository", "repository workflow command failed", {
        queueName: msg.name,
        error: message,
      });
      await msg.complete({ error: message }).catch(() => {});
    }

    return Loop.continue(undefined);
  });
}
