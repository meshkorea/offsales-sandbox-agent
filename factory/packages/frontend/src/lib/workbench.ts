import type { HandoffWorkbenchClient } from "@sandbox-agent/factory-client/workbench";
import { createWorkbenchRuntimeClient } from "@workbench-runtime";
import { frontendClientMode } from "./env";
export { resolveRepoRouteHandoffId } from "./workbench-routing";

const workbenchClientCache = new Map<string, HandoffWorkbenchClient>();

export function getHandoffWorkbenchClient(workspaceId: string): HandoffWorkbenchClient {
  const cacheKey = `${frontendClientMode}:${workspaceId}`;
  const existing = workbenchClientCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const client = createWorkbenchRuntimeClient(workspaceId);
  workbenchClientCache.set(cacheKey, client);
  return client;
}
