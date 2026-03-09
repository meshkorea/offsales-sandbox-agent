import { createBackendClient } from "@openhandoff/client";
import { backendEndpoint, defaultWorkspaceId } from "./env";

export const backendClient = createBackendClient({
  endpoint: backendEndpoint,
  defaultWorkspaceId,
});
