export type FactoryBillingPlanId = "free" | "team";
export type FactoryBillingStatus = "active" | "trialing" | "past_due" | "scheduled_cancel";
export type FactoryGithubInstallationStatus = "connected" | "install_required" | "reconnect_required";
export type FactoryGithubSyncStatus = "pending" | "syncing" | "synced" | "error";
export type FactoryOrganizationKind = "personal" | "organization";

export interface FactoryUser {
  id: string;
  name: string;
  email: string;
  githubLogin: string;
  roleLabel: string;
  eligibleOrganizationIds: string[];
}

export interface FactoryOrganizationMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  state: "active" | "invited";
}

export interface FactoryInvoice {
  id: string;
  label: string;
  issuedAt: string;
  amountUsd: number;
  status: "paid" | "open";
}

export interface FactoryBillingState {
  planId: FactoryBillingPlanId;
  status: FactoryBillingStatus;
  seatsIncluded: number;
  trialEndsAt: string | null;
  renewalAt: string | null;
  stripeCustomerId: string;
  paymentMethodLabel: string;
  invoices: FactoryInvoice[];
}

export interface FactoryGithubState {
  connectedAccount: string;
  installationStatus: FactoryGithubInstallationStatus;
  syncStatus: FactoryGithubSyncStatus;
  importedRepoCount: number;
  lastSyncLabel: string;
  lastSyncAt: number | null;
}

export interface FactoryOrganizationSettings {
  displayName: string;
  slug: string;
  primaryDomain: string;
  seatAccrualMode: "first_prompt";
  defaultModel: "claude-sonnet-4" | "claude-opus-4" | "gpt-4o" | "o3";
  autoImportRepos: boolean;
}

export interface FactoryOrganization {
  id: string;
  workspaceId: string;
  kind: FactoryOrganizationKind;
  settings: FactoryOrganizationSettings;
  github: FactoryGithubState;
  billing: FactoryBillingState;
  members: FactoryOrganizationMember[];
  seatAssignments: string[];
  repoCatalog: string[];
}

export interface FactoryAppSnapshot {
  auth: {
    status: "signed_out" | "signed_in";
    currentUserId: string | null;
  };
  activeOrganizationId: string | null;
  users: FactoryUser[];
  organizations: FactoryOrganization[];
}

export interface UpdateFactoryOrganizationProfileInput {
  organizationId: string;
  displayName: string;
  slug: string;
  primaryDomain: string;
}
