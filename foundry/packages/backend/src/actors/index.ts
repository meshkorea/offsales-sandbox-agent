import { setup } from "rivetkit";
import { taskStatusSync } from "./task-status-sync/index.js";
import { task } from "./task/index.js";
import { history } from "./history/index.js";
import { githubState } from "./github-state/index.js";
import { repository } from "./repository/index.js";
import { sandboxInstance } from "./sandbox-instance/index.js";
import { organization } from "./organization/index.js";
import { userGithub } from "./user-github-data/index.js";

export function resolveManagerPort(): number {
  const raw = process.env.HF_RIVET_MANAGER_PORT ?? process.env.RIVETKIT_MANAGER_PORT;
  if (!raw) {
    return 7750;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid HF_RIVET_MANAGER_PORT/RIVETKIT_MANAGER_PORT: ${raw}`);
  }
  return parsed;
}

function resolveManagerHost(): string {
  const raw = process.env.HF_RIVET_MANAGER_HOST ?? process.env.RIVETKIT_MANAGER_HOST;
  return raw && raw.trim().length > 0 ? raw.trim() : "0.0.0.0";
}

export const registry = setup({
  use: {
    organization,
    repository,
    githubState,
    userGithub,
    task,
    sandboxInstance,
    history,
    taskStatusSync,
  },
  serveManager: true,
  managerPort: resolveManagerPort(),
  managerHost: resolveManagerHost(),
});

export * from "./context.js";
export * from "./events.js";
export * from "./task-status-sync/index.js";
export * from "./task/index.js";
export * from "./history/index.js";
export * from "./github-state/index.js";
export * from "./keys.js";
export * from "./repository/index.js";
export * from "./sandbox-instance/index.js";
export * from "./organization/index.js";
export * from "./user-github-data/index.js";
