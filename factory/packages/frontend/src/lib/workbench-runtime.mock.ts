import {
  createHandoffWorkbenchClient,
  type HandoffWorkbenchClient,
} from "@sandbox-agent/factory-client/workbench";

export function createWorkbenchRuntimeClient(workspaceId: string): HandoffWorkbenchClient {
  return createHandoffWorkbenchClient({
    mode: "mock",
    workspaceId,
  });
}
