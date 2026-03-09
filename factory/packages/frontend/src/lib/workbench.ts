import { createHandoffWorkbenchClient } from "@openhandoff/client";
import { backendClient } from "./backend";
import { defaultWorkspaceId, frontendClientMode } from "./env";

export const handoffWorkbenchClient = createHandoffWorkbenchClient({
  mode: frontendClientMode,
  backend: backendClient,
  workspaceId: defaultWorkspaceId,
});
