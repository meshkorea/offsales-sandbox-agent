import type { AppConfig } from "@openhandoff/shared";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

function expandPath(input: string): string {
  if (input.startsWith("~/")) {
    return `${homedir()}/${input.slice(2)}`;
  }
  return input;
}

export function openhandoffDataDir(config: AppConfig): string {
  // Keep data collocated with the backend DB by default.
  const dbPath = expandPath(config.backend.dbPath);
  return resolve(dirname(dbPath));
}

export function openhandoffRepoClonePath(config: AppConfig, workspaceId: string, repoId: string): string {
  return resolve(join(openhandoffDataDir(config), "repos", workspaceId, repoId));
}
