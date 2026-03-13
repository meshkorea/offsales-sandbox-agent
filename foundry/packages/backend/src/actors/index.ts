import { setup } from "rivetkit";
import { taskStatusSync } from "./task-status-sync/index.js";
import { task } from "./task/index.js";
import { history } from "./history/index.js";
import { projectBranchSync } from "./project-branch-sync/index.js";
import { projectPrSync } from "./project-pr-sync/index.js";
import { project } from "./project/index.js";
import { sandboxInstance } from "./sandbox-instance/index.js";
import { workspace } from "./workspace/index.js";

function normalizePublicApiUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  return value.replace(/\/$/, "");
}

const publicApiUrl = normalizePublicApiUrl(process.env.BETTER_AUTH_URL);
const shouldConfigureRunnerPool = Boolean(publicApiUrl && (process.env.RIVET_ENDPOINT || process.env.RIVET_ENGINE));

export const registry = setup({
  serverless: {
    basePath: "/v1/rivet",
    ...(shouldConfigureRunnerPool
      ? {
          configureRunnerPool: {
            url: `${publicApiUrl}/v1/rivet/start`,
          },
        }
      : {}),
  },
  use: {
    workspace,
    project,
    task,
    sandboxInstance,
    history,
    projectPrSync,
    projectBranchSync,
    taskStatusSync,
  },
});

export * from "./context.js";
export * from "./events.js";
export * from "./task-status-sync/index.js";
export * from "./task/index.js";
export * from "./history/index.js";
export * from "./keys.js";
export * from "./project-branch-sync/index.js";
export * from "./project-pr-sync/index.js";
export * from "./project/index.js";
export * from "./sandbox-instance/index.js";
export * from "./workspace/index.js";
