import { useSyncExternalStore } from "react";
import {
  createFactoryAppClient,
  currentFactoryOrganization,
  currentFactoryUser,
  eligibleFactoryOrganizations,
  type FactoryAppClient,
} from "@sandbox-agent/factory-client";
import type { FactoryAppSnapshot, FactoryOrganization } from "@sandbox-agent/factory-shared";
import { backendClient } from "./backend";
import { frontendClientMode } from "./env";

const appClient: FactoryAppClient = createFactoryAppClient({
  mode: frontendClientMode,
  backend: frontendClientMode === "remote" ? backendClient : undefined,
});

export function useMockAppSnapshot(): FactoryAppSnapshot {
  return useSyncExternalStore(
    appClient.subscribe.bind(appClient),
    appClient.getSnapshot.bind(appClient),
    appClient.getSnapshot.bind(appClient),
  );
}

export function useMockAppClient(): FactoryAppClient {
  return appClient;
}

export const activeMockUser = currentFactoryUser;
export const activeMockOrganization = currentFactoryOrganization;
export const eligibleOrganizations = eligibleFactoryOrganizations;

export function getMockOrganizationById(
  snapshot: FactoryAppSnapshot,
  organizationId: string,
): FactoryOrganization | null {
  return snapshot.organizations.find((organization) => organization.id === organizationId) ?? null;
}

