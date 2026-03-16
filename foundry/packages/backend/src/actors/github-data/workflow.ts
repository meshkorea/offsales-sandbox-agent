// @ts-nocheck
import { Loop } from "rivetkit/workflow";
import { clearStateMutation, handlePullRequestWebhookMutation, reloadRepositoryMutation, runFullSync, fullSyncError } from "./index.js";

export const GITHUB_DATA_QUEUE_NAMES = [
  "githubData.command.syncRepos",
  "githubData.command.reloadRepository",
  "githubData.command.clearState",
  "githubData.command.handlePullRequestWebhook",
] as const;

export type GithubDataQueueName = (typeof GITHUB_DATA_QUEUE_NAMES)[number];

export function githubDataWorkflowQueueName(name: GithubDataQueueName): GithubDataQueueName {
  return name;
}

export async function runGithubDataWorkflow(ctx: any): Promise<void> {
  // The org actor sends a "githubData.command.syncRepos" queue message when it
  // creates this actor, so the command loop below handles the initial sync.
  //
  // IMPORTANT: Do NOT use workflow sub-loops (ctx.loop) inside command handlers.
  // RivetKit workflow sub-loops inside a parent loop cause HistoryDivergedError
  // on the second iteration because entries from the first iteration's sub-loop
  // are still in history but not visited during replay of iteration 2. Use native
  // JS loops inside a single step instead. See .context/rivetkit-subloop-bug.md.

  await ctx.loop("github-data-command-loop", async (loopCtx: any) => {
    const msg = await loopCtx.queue.next("next-github-data-command", {
      names: [...GITHUB_DATA_QUEUE_NAMES],
      completable: true,
    });
    if (!msg) {
      return Loop.continue(undefined);
    }

    try {
      if (msg.name === "githubData.command.syncRepos") {
        try {
          // Single opaque step for the entire sync. Do NOT decompose into
          // sub-loops/sub-steps — see comment at top of function.
          await loopCtx.step({
            name: "github-data-sync-repos",
            timeout: 5 * 60_000,
            run: async () => runFullSync(loopCtx, msg.body),
          });
          await msg.complete({ ok: true });
        } catch (error) {
          await loopCtx.step("sync-repos-error", async () => fullSyncError(loopCtx, error));
          const message = error instanceof Error ? error.message : String(error);
          await msg.complete({ error: message }).catch(() => {});
        }
        return Loop.continue(undefined);
      }

      if (msg.name === "githubData.command.reloadRepository") {
        const result = await loopCtx.step({
          name: "github-data-reload-repository",
          timeout: 5 * 60_000,
          run: async () => reloadRepositoryMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "githubData.command.clearState") {
        await loopCtx.step({
          name: "github-data-clear-state",
          timeout: 60_000,
          run: async () => clearStateMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "githubData.command.handlePullRequestWebhook") {
        await loopCtx.step({
          name: "github-data-handle-pull-request-webhook",
          timeout: 60_000,
          run: async () => handlePullRequestWebhookMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await msg.complete({ error: message }).catch(() => {});
    }

    return Loop.continue(undefined);
  });
}
