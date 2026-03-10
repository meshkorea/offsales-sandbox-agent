import type {
  FactoryAppSnapshot,
  FactoryBillingPlanId,
  FactoryOrganization,
  FactoryUser,
  UpdateFactoryOrganizationProfileInput,
} from "@sandbox-agent/factory-shared";
import type { BackendClient } from "./backend-client.js";
import { getMockFactoryAppClient } from "./mock-app.js";
import { createRemoteFactoryAppClient } from "./remote/app-client.js";

export interface FactoryAppClient {
  getSnapshot(): FactoryAppSnapshot;
  subscribe(listener: () => void): () => void;
  signInWithGithub(userId?: string): Promise<void>;
  signOut(): Promise<void>;
  selectOrganization(organizationId: string): Promise<void>;
  updateOrganizationProfile(input: UpdateFactoryOrganizationProfileInput): Promise<void>;
  triggerRepoImport(organizationId: string): Promise<void>;
  completeHostedCheckout(organizationId: string, planId: FactoryBillingPlanId): Promise<void>;
  cancelScheduledRenewal(organizationId: string): Promise<void>;
  resumeSubscription(organizationId: string): Promise<void>;
  reconnectGithub(organizationId: string): Promise<void>;
  recordSeatUsage(workspaceId: string): Promise<void>;
}

export interface CreateFactoryAppClientOptions {
  mode: "mock" | "remote";
  backend?: BackendClient;
}

export function createFactoryAppClient(options: CreateFactoryAppClientOptions): FactoryAppClient {
  if (options.mode === "mock") {
    return getMockFactoryAppClient() as unknown as FactoryAppClient;
  }
  if (!options.backend) {
    throw new Error("Remote app client requires a backend client");
  }
  return createRemoteFactoryAppClient({ backend: options.backend });
}

export function currentFactoryUser(snapshot: FactoryAppSnapshot): FactoryUser | null {
  if (!snapshot.auth.currentUserId) {
    return null;
  }
  return snapshot.users.find((candidate) => candidate.id === snapshot.auth.currentUserId) ?? null;
}

export function currentFactoryOrganization(snapshot: FactoryAppSnapshot): FactoryOrganization | null {
  if (!snapshot.activeOrganizationId) {
    return null;
  }
  return snapshot.organizations.find((candidate) => candidate.id === snapshot.activeOrganizationId) ?? null;
}

export function eligibleFactoryOrganizations(snapshot: FactoryAppSnapshot): FactoryOrganization[] {
  const user = currentFactoryUser(snapshot);
  if (!user) {
    return [];
  }

  const eligible = new Set(user.eligibleOrganizationIds);
  return snapshot.organizations.filter((organization) => eligible.has(organization.id));
}

