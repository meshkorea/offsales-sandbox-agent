import {
  createTaskWorkbenchClient,
  type TaskWorkbenchClient,
} from "@sandbox-agent/factory-client/workbench";

export function createWorkbenchRuntimeClient(workspaceId: string): TaskWorkbenchClient {
  return createTaskWorkbenchClient({
    mode: "mock",
    workspaceId,
  });
}
