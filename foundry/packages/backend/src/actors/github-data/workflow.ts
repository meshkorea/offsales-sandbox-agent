// @ts-nocheck
import { Loop } from "rivetkit/workflow";
import { clearStateMutation, handlePullRequestWebhookMutation, reloadRepositoryMutation, runFullSync } from "./index.js";

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
  const meta = await ctx.step({
    name: "github-data-read-meta",
    timeout: 30_000,
    run: async () => {
      const { readMeta } = await import("./index.js");
      return await readMeta(ctx);
    },
  });

  if (meta.syncStatus === "pending") {
    try {
      await runFullSync(ctx, { label: "Importing repository catalog..." });
    } catch {
      // Best-effort initial sync. runFullSync persists the failure state.
    }
  }

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
        await runFullSync(loopCtx, msg.body);
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "githubData.command.reloadRepository") {
        const result = await reloadRepositoryMutation(loopCtx, msg.body);
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "githubData.command.clearState") {
        await clearStateMutation(loopCtx, msg.body);
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "githubData.command.handlePullRequestWebhook") {
        await handlePullRequestWebhookMutation(loopCtx, msg.body);
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
