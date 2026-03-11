import {
  createTaskWorkbenchClient,
  type TaskWorkbenchClient,
} from "@sandbox-agent/factory-client/workbench";
import { backendClient } from "./backend";

export function createWorkbenchRuntimeClient(workspaceId: string): TaskWorkbenchClient {
  return createTaskWorkbenchClient({
    mode: "remote",
    backend: backendClient,
    workspaceId,
  });
}
