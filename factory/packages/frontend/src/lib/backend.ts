import { createBackendClient } from "@sandbox-agent/factory-client/backend";
import { backendEndpoint, defaultWorkspaceId } from "./env";

export const backendClient = createBackendClient({
  endpoint: backendEndpoint,
  defaultWorkspaceId,
});
