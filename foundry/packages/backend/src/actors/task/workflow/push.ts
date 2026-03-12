// @ts-nocheck
import { eq } from "drizzle-orm";
import { getActorRuntimeContext } from "../../context.js";
import { resolveWorkspaceGithubAuth } from "../../../services/github-auth.js";
import { taskRuntime, taskSandboxes } from "../db/schema.js";
import { TASK_ROW_ID, appendHistory, getCurrentRecord } from "./common.js";

export interface PushActiveBranchOptions {
  reason?: string | null;
  historyKind?: string;
  commitMessage?: string | null;
}

function wrapBashScript(script: string): string {
  const encoded = Buffer.from(script, "utf8").toString("base64");
  return `bash -lc "$(printf %s ${JSON.stringify(encoded)} | base64 -d)"`;
}

export async function pushActiveBranchActivity(loopCtx: any, options: PushActiveBranchOptions = {}): Promise<void> {
  const record = await getCurrentRecord(loopCtx);
  const activeSandboxId = record.activeSandboxId;
  const branchName = loopCtx.state.branchName ?? record.branchName;
  const commitMessage = (options.commitMessage?.trim() || loopCtx.state.title?.trim() || branchName || "Foundry update").slice(0, 240);

  if (!activeSandboxId) {
    throw new Error("cannot push: no active sandbox");
  }
  if (!branchName) {
    throw new Error("cannot push: task branch is not set");
  }

  const activeSandbox = record.sandboxes.find((sandbox: any) => sandbox.sandboxId === activeSandboxId) ?? null;
  const providerId = activeSandbox?.providerId ?? record.providerId;
  const cwd = activeSandbox?.cwd ?? null;
  if (!cwd) {
    throw new Error("cannot push: active sandbox cwd is not set");
  }

  const { providers } = getActorRuntimeContext();
  const provider = providers.get(providerId);
  const auth = await resolveWorkspaceGithubAuth(loopCtx, loopCtx.state.workspaceId);
  const commandEnv =
    auth?.githubToken && auth.githubToken.trim().length > 0
      ? {
          GITHUB_TOKEN: auth.githubToken,
        }
      : undefined;

  const now = Date.now();
  await loopCtx.db
    .update(taskRuntime)
    .set({ statusMessage: `pushing branch ${branchName}`, updatedAt: now })
    .where(eq(taskRuntime.id, TASK_ROW_ID))
    .run();

  await loopCtx.db
    .update(taskSandboxes)
    .set({ statusMessage: `pushing branch ${branchName}`, updatedAt: now })
    .where(eq(taskSandboxes.sandboxId, activeSandboxId))
    .run();

  const script = [
    "set -euo pipefail",
    `cd ${JSON.stringify(cwd)}`,
    "export GIT_TERMINAL_PROMPT=0",
    "git rev-parse --verify HEAD >/dev/null",
    'git config user.email "foundry@local" >/dev/null 2>&1 || true',
    'git config user.name "Foundry" >/dev/null 2>&1 || true',
    'git config credential.helper ""',
    "if ! git config --local --get http.https://github.com/.extraheader >/dev/null 2>&1; then",
    '  TOKEN="${GITHUB_TOKEN:-}"',
    '  if [ -z "$TOKEN" ]; then echo "missing github token for push" >&2; exit 1; fi',
    "  AUTH_HEADER=\"$(printf 'x-access-token:%s' \"$TOKEN\" | base64 | tr -d '\\n')\"",
    '  git config http.https://github.com/.extraheader "AUTHORIZATION: basic $AUTH_HEADER"',
    "fi",
    "git add -A",
    "if ! git diff --cached --quiet --ignore-submodules --; then",
    `  git commit -m ${JSON.stringify(commitMessage)}`,
    "fi",
    `git push -u origin ${JSON.stringify(branchName)}`,
  ].join("\n");

  const result = await provider.executeCommand({
    workspaceId: loopCtx.state.workspaceId,
    sandboxId: activeSandboxId,
    command: wrapBashScript(script),
    ...(commandEnv ? { env: commandEnv } : {}),
    label: `git push ${branchName}`,
  });

  if (result.exitCode !== 0) {
    throw new Error(`git push failed (${result.exitCode}): ${result.result}`);
  }

  const updatedAt = Date.now();
  await loopCtx.db
    .update(taskRuntime)
    .set({ statusMessage: `push complete for ${branchName}`, updatedAt })
    .where(eq(taskRuntime.id, TASK_ROW_ID))
    .run();

  await loopCtx.db
    .update(taskSandboxes)
    .set({ statusMessage: `push complete for ${branchName}`, updatedAt })
    .where(eq(taskSandboxes.sandboxId, activeSandboxId))
    .run();

  await appendHistory(loopCtx, options.historyKind ?? "task.push", {
    reason: options.reason ?? null,
    branchName,
    sandboxId: activeSandboxId,
  });
}
