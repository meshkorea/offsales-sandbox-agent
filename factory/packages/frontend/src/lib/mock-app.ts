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

const REMOTE_APP_SESSION_STORAGE_KEY = "sandbox-agent-factory:remote-app-session";

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

// Track whether the remote client has delivered its first real snapshot.
// Before the first fetch completes the snapshot is the default empty signed_out state,
// so we show a loading screen.  Once the fetch returns we know the truth.
let firstSnapshotDelivered = false;

// The remote client notifies listeners after refresh(), which sets `firstSnapshotDelivered`.
const origSubscribe = appClient.subscribe.bind(appClient);
appClient.subscribe = (listener: () => void): (() => void) => {
  const wrappedListener = () => {
    firstSnapshotDelivered = true;
    listener();
  };
  return origSubscribe(wrappedListener);
};

export function isAppSnapshotBootstrapping(snapshot: FactoryAppSnapshot): boolean {
  if (frontendClientMode !== "remote" || typeof window === "undefined") {
    return false;
  }

  const hasStoredSession = window.localStorage.getItem(REMOTE_APP_SESSION_STORAGE_KEY)?.trim().length;
  if (!hasStoredSession) {
    return false;
  }

  // If the backend has already responded and we're still signed_out, the session is stale.
  if (firstSnapshotDelivered) {
    return false;
  }

  // Still waiting for the initial fetch — show the loading screen.
  return (
    snapshot.auth.status === "signed_out" &&
    snapshot.users.length === 0 &&
    snapshot.organizations.length === 0
  );
}

export function getMockOrganizationById(
  snapshot: FactoryAppSnapshot,
  organizationId: string,
): FactoryOrganization | null {
  return snapshot.organizations.find((organization) => organization.id === organizationId) ?? null;
}
