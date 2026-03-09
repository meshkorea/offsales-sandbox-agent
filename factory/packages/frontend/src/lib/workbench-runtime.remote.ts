import {
  createHandoffWorkbenchClient,
  type HandoffWorkbenchClient,
} from "@sandbox-agent/factory-client/workbench";
import { backendClient } from "./backend";

export function createWorkbenchRuntimeClient(workspaceId: string): HandoffWorkbenchClient {
  return createHandoffWorkbenchClient({
    mode: "remote",
    backend: backendClient,
    workspaceId,
  });
}
