import type { AppConfig } from "@sandbox-agent/factory-shared";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

function expandPath(input: string): string {
  if (input.startsWith("~/")) {
    return `${homedir()}/${input.slice(2)}`;
  }
  return input;
}

export function factoryDataDir(config: AppConfig): string {
  // Keep data collocated with the backend DB by default.
  const dbPath = expandPath(config.backend.dbPath);
  return resolve(dirname(dbPath));
}

export function factoryRepoClonePath(
  config: AppConfig,
  workspaceId: string,
  repoId: string
): string {
  return resolve(join(factoryDataDir(config), "repos", workspaceId, repoId));
}

