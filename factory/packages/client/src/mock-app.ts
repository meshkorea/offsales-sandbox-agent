import { injectMockLatency } from "./mock/latency.js";

export type MockBillingPlanId = "free" | "team" | "enterprise";
export type MockBillingStatus = "active" | "trialing" | "past_due" | "scheduled_cancel";
export type MockRepoImportStatus = "ready" | "not_started" | "importing";
export type MockGithubInstallationStatus = "connected" | "install_required" | "reconnect_required";
export type MockOrganizationKind = "personal" | "organization";

export interface MockFactoryUser {
  id: string;
  name: string;
  email: string;
  githubLogin: string;
  roleLabel: string;
  eligibleOrganizationIds: string[];
}

export interface MockFactoryOrganizationMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  state: "active" | "invited";
}

export interface MockFactoryInvoice {
  id: string;
  label: string;
  issuedAt: string;
  amountUsd: number;
  status: "paid" | "open";
}

export interface MockFactoryBillingState {
  planId: MockBillingPlanId;
  status: MockBillingStatus;
  seatsIncluded: number;
  trialEndsAt: string | null;
  renewalAt: string | null;
  stripeCustomerId: string;
  paymentMethodLabel: string;
  invoices: MockFactoryInvoice[];
}

export interface MockFactoryGithubState {
  connectedAccount: string;
  installationStatus: MockGithubInstallationStatus;
  importedRepoCount: number;
  lastSyncLabel: string;
}

export interface MockFactoryOrganizationSettings {
  displayName: string;
  slug: string;
  primaryDomain: string;
  seatAccrualMode: "first_prompt";
  defaultModel: "claude-sonnet-4" | "claude-opus-4" | "gpt-4o" | "o3";
  autoImportRepos: boolean;
}

export interface MockFactoryOrganization {
  id: string;
  workspaceId: string;
  kind: MockOrganizationKind;
  settings: MockFactoryOrganizationSettings;
  github: MockFactoryGithubState;
  billing: MockFactoryBillingState;
  members: MockFactoryOrganizationMember[];
  seatAssignments: string[];
  repoImportStatus: MockRepoImportStatus;
  repoCatalog: string[];
}

export interface MockFactoryAppSnapshot {
  auth: {
    status: "signed_out" | "signed_in";
    currentUserId: string | null;
  };
  activeOrganizationId: string | null;
  users: MockFactoryUser[];
  organizations: MockFactoryOrganization[];
}

export interface UpdateMockOrganizationProfileInput {
  organizationId: string;
  displayName: string;
  slug: string;
  primaryDomain: string;
}

export interface MockFactoryAppClient {
  getSnapshot(): MockFactoryAppSnapshot;
  subscribe(listener: () => void): () => void;
  signInWithGithub(userId: string): Promise<void>;
  signOut(): Promise<void>;
  selectOrganization(organizationId: string): Promise<void>;
  updateOrganizationProfile(input: UpdateMockOrganizationProfileInput): Promise<void>;
  triggerRepoImport(organizationId: string): Promise<void>;
  completeHostedCheckout(organizationId: string, planId: MockBillingPlanId): Promise<void>;
  cancelScheduledRenewal(organizationId: string): Promise<void>;
  resumeSubscription(organizationId: string): Promise<void>;
  reconnectGithub(organizationId: string): Promise<void>;
  recordSeatUsage(workspaceId: string): void;
}

const STORAGE_KEY = "sandbox-agent-factory:mock-app:v1";

function isoDate(daysFromNow: number): string {
  const value = new Date();
  value.setDate(value.getDate() + daysFromNow);
  return value.toISOString();
}

function buildDefaultSnapshot(): MockFactoryAppSnapshot {
  return {
    auth: {
      status: "signed_out",
      currentUserId: null,
    },
    activeOrganizationId: null,
    users: [
      {
        id: "user-nathan",
        name: "Nathan",
        email: "nathan@acme.dev",
        githubLogin: "nathan",
        roleLabel: "Founder",
        eligibleOrganizationIds: ["personal-nathan", "acme", "rivet"],
      },
      {
        id: "user-maya",
        name: "Maya",
        email: "maya@acme.dev",
        githubLogin: "maya",
        roleLabel: "Staff Engineer",
        eligibleOrganizationIds: ["acme"],
      },
      {
        id: "user-jamie",
        name: "Jamie",
        email: "jamie@rivet.dev",
        githubLogin: "jamie",
        roleLabel: "Platform Lead",
        eligibleOrganizationIds: ["personal-jamie", "rivet"],
      },
    ],
    organizations: [
      {
        id: "personal-nathan",
        workspaceId: "personal-nathan",
        kind: "personal",
        settings: {
          displayName: "Nathan",
          slug: "nathan",
          primaryDomain: "personal",
          seatAccrualMode: "first_prompt",
          defaultModel: "claude-sonnet-4",
          autoImportRepos: true,
        },
        github: {
          connectedAccount: "nathan",
          installationStatus: "connected",
          importedRepoCount: 1,
          lastSyncLabel: "Synced just now",
        },
        billing: {
          planId: "free",
          status: "active",
          seatsIncluded: 1,
          trialEndsAt: null,
          renewalAt: null,
          stripeCustomerId: "cus_mock_personal_nathan",
          paymentMethodLabel: "No card required",
          invoices: [],
        },
        members: [
          { id: "member-nathan", name: "Nathan", email: "nathan@acme.dev", role: "owner", state: "active" },
        ],
        seatAssignments: ["nathan@acme.dev"],
        repoImportStatus: "ready",
        repoCatalog: ["nathan/personal-site"],
      },
      {
        id: "acme",
        workspaceId: "acme",
        kind: "organization",
        settings: {
          displayName: "Acme",
          slug: "acme",
          primaryDomain: "acme.dev",
          seatAccrualMode: "first_prompt",
          defaultModel: "claude-sonnet-4",
          autoImportRepos: true,
        },
        github: {
          connectedAccount: "acme",
          installationStatus: "connected",
          importedRepoCount: 3,
          lastSyncLabel: "Synced 4 minutes ago",
        },
        billing: {
          planId: "team",
          status: "active",
          seatsIncluded: 5,
          trialEndsAt: null,
          renewalAt: isoDate(18),
          stripeCustomerId: "cus_mock_acme_team",
          paymentMethodLabel: "Visa ending in 4242",
          invoices: [
            { id: "inv-acme-001", label: "March 2026", issuedAt: "2026-03-01", amountUsd: 240, status: "paid" },
            { id: "inv-acme-000", label: "February 2026", issuedAt: "2026-02-01", amountUsd: 240, status: "paid" },
          ],
        },
        members: [
          { id: "member-acme-nathan", name: "Nathan", email: "nathan@acme.dev", role: "owner", state: "active" },
          { id: "member-acme-maya", name: "Maya", email: "maya@acme.dev", role: "admin", state: "active" },
          { id: "member-acme-priya", name: "Priya", email: "priya@acme.dev", role: "member", state: "active" },
          { id: "member-acme-devon", name: "Devon", email: "devon@acme.dev", role: "member", state: "invited" },
        ],
        seatAssignments: ["nathan@acme.dev", "maya@acme.dev"],
        repoImportStatus: "not_started",
        repoCatalog: ["acme/backend", "acme/frontend", "acme/infra"],
      },
      {
        id: "rivet",
        workspaceId: "rivet",
        kind: "organization",
        settings: {
          displayName: "Rivet",
          slug: "rivet",
          primaryDomain: "rivet.dev",
          seatAccrualMode: "first_prompt",
          defaultModel: "o3",
          autoImportRepos: true,
        },
        github: {
          connectedAccount: "rivet-dev",
          installationStatus: "reconnect_required",
          importedRepoCount: 4,
          lastSyncLabel: "Sync stalled 2 hours ago",
        },
        billing: {
          planId: "enterprise",
          status: "trialing",
          seatsIncluded: 25,
          trialEndsAt: isoDate(12),
          renewalAt: isoDate(12),
          stripeCustomerId: "cus_mock_rivet_enterprise",
          paymentMethodLabel: "ACH verified",
          invoices: [{ id: "inv-rivet-001", label: "Enterprise pilot", issuedAt: "2026-03-04", amountUsd: 0, status: "paid" }],
        },
        members: [
          { id: "member-rivet-jamie", name: "Jamie", email: "jamie@rivet.dev", role: "owner", state: "active" },
          { id: "member-rivet-nathan", name: "Nathan", email: "nathan@acme.dev", role: "member", state: "active" },
          { id: "member-rivet-lena", name: "Lena", email: "lena@rivet.dev", role: "admin", state: "active" },
        ],
        seatAssignments: ["jamie@rivet.dev"],
        repoImportStatus: "not_started",
        repoCatalog: ["rivet/dashboard", "rivet/agents", "rivet/billing", "rivet/infrastructure"],
      },
      {
        id: "personal-jamie",
        workspaceId: "personal-jamie",
        kind: "personal",
        settings: {
          displayName: "Jamie",
          slug: "jamie",
          primaryDomain: "personal",
          seatAccrualMode: "first_prompt",
          defaultModel: "claude-opus-4",
          autoImportRepos: true,
        },
        github: {
          connectedAccount: "jamie",
          installationStatus: "connected",
          importedRepoCount: 1,
          lastSyncLabel: "Synced yesterday",
        },
        billing: {
          planId: "free",
          status: "active",
          seatsIncluded: 1,
          trialEndsAt: null,
          renewalAt: null,
          stripeCustomerId: "cus_mock_personal_jamie",
          paymentMethodLabel: "No card required",
          invoices: [],
        },
        members: [{ id: "member-jamie", name: "Jamie", email: "jamie@rivet.dev", role: "owner", state: "active" }],
        seatAssignments: ["jamie@rivet.dev"],
        repoImportStatus: "ready",
        repoCatalog: ["jamie/demo-app"],
      },
    ],
  };
}

function parseStoredSnapshot(): MockFactoryAppSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as MockFactoryAppSnapshot;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSnapshot(snapshot: MockFactoryAppSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function planSeatsIncluded(planId: MockBillingPlanId): number {
  switch (planId) {
    case "free":
      return 1;
    case "team":
      return 5;
    case "enterprise":
      return 25;
  }
}

class MockFactoryAppStore implements MockFactoryAppClient {
  private snapshot = parseStoredSnapshot() ?? buildDefaultSnapshot();
  private listeners = new Set<() => void>();
  private importTimers = new Map<string, ReturnType<typeof setTimeout>>();

  getSnapshot(): MockFactoryAppSnapshot {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async signInWithGithub(userId: string): Promise<void> {
    await this.injectAsyncLatency();
    const user = this.snapshot.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw new Error(`Unknown mock user ${userId}`);
    }

    this.updateSnapshot((current) => {
      const activeOrganizationId =
        user.eligibleOrganizationIds.length === 1 ? user.eligibleOrganizationIds[0] ?? null : null;
      return {
        ...current,
        auth: {
          status: "signed_in",
          currentUserId: userId,
        },
        activeOrganizationId,
      };
    });

    if (user.eligibleOrganizationIds.length === 1) {
      await this.selectOrganization(user.eligibleOrganizationIds[0]!);
    }
  }

  async signOut(): Promise<void> {
    await this.injectAsyncLatency();
    this.updateSnapshot((current) => ({
      ...current,
      auth: {
        status: "signed_out",
        currentUserId: null,
      },
      activeOrganizationId: null,
    }));
  }

  async selectOrganization(organizationId: string): Promise<void> {
    await this.injectAsyncLatency();
    const org = this.requireOrganization(organizationId);
    this.updateSnapshot((current) => ({
      ...current,
      activeOrganizationId: organizationId,
    }));

    if (org.repoImportStatus !== "ready") {
      await this.triggerRepoImport(organizationId);
    }
  }

  async updateOrganizationProfile(input: UpdateMockOrganizationProfileInput): Promise<void> {
    await this.injectAsyncLatency();
    this.requireOrganization(input.organizationId);
    this.updateOrganization(input.organizationId, (organization) => ({
      ...organization,
      settings: {
        ...organization.settings,
        displayName: input.displayName.trim() || organization.settings.displayName,
        slug: input.slug.trim() || organization.settings.slug,
        primaryDomain: input.primaryDomain.trim() || organization.settings.primaryDomain,
      },
    }));
  }

  async triggerRepoImport(organizationId: string): Promise<void> {
    await this.injectAsyncLatency();
    this.requireOrganization(organizationId);
    const existingTimer = this.importTimers.get(organizationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.updateOrganization(organizationId, (organization) => ({
      ...organization,
      repoImportStatus: "importing",
      github: {
        ...organization.github,
        lastSyncLabel: "Importing repository catalog...",
      },
    }));

    const timer = setTimeout(() => {
      this.updateOrganization(organizationId, (organization) => ({
        ...organization,
        repoImportStatus: "ready",
        github: {
          ...organization.github,
          importedRepoCount: organization.repoCatalog.length,
          installationStatus: "connected",
          lastSyncLabel: "Synced just now",
        },
      }));
      this.importTimers.delete(organizationId);
    }, 1_250);

    this.importTimers.set(organizationId, timer);
  }

  async completeHostedCheckout(organizationId: string, planId: MockBillingPlanId): Promise<void> {
    await this.injectAsyncLatency();
    this.requireOrganization(organizationId);
    this.updateOrganization(organizationId, (organization) => ({
      ...organization,
      billing: {
        ...organization.billing,
        planId,
        status: "active",
        seatsIncluded: planSeatsIncluded(planId),
        trialEndsAt: null,
        renewalAt: isoDate(30),
        paymentMethodLabel: planId === "enterprise" ? "ACH verified" : "Visa ending in 4242",
        invoices: [
          {
            id: `inv-${organizationId}-${Date.now()}`,
            label: `${organization.settings.displayName} ${planId} upgrade`,
            issuedAt: new Date().toISOString().slice(0, 10),
            amountUsd: planId === "team" ? 240 : planId === "enterprise" ? 1200 : 0,
            status: "paid",
          },
          ...organization.billing.invoices,
        ],
      },
    }));
  }

  async cancelScheduledRenewal(organizationId: string): Promise<void> {
    await this.injectAsyncLatency();
    this.requireOrganization(organizationId);
    this.updateOrganization(organizationId, (organization) => ({
      ...organization,
      billing: {
        ...organization.billing,
        status: "scheduled_cancel",
      },
    }));
  }

  async resumeSubscription(organizationId: string): Promise<void> {
    await this.injectAsyncLatency();
    this.requireOrganization(organizationId);
    this.updateOrganization(organizationId, (organization) => ({
      ...organization,
      billing: {
        ...organization.billing,
        status: "active",
      },
    }));
  }

  async reconnectGithub(organizationId: string): Promise<void> {
    await this.injectAsyncLatency();
    this.requireOrganization(organizationId);
    this.updateOrganization(organizationId, (organization) => ({
      ...organization,
      github: {
        ...organization.github,
        installationStatus: "connected",
        lastSyncLabel: "Reconnected just now",
      },
    }));
  }

  recordSeatUsage(workspaceId: string): void {
    const org = this.snapshot.organizations.find((candidate) => candidate.workspaceId === workspaceId);
    const currentUser = currentMockUser(this.snapshot);
    if (!org || !currentUser) {
      return;
    }

    if (org.seatAssignments.includes(currentUser.email)) {
      return;
    }

    this.updateOrganization(org.id, (organization) => ({
      ...organization,
      seatAssignments: [...organization.seatAssignments, currentUser.email],
    }));
  }

  private injectAsyncLatency(): Promise<void> {
    return injectMockLatency();
  }

  private updateOrganization(
    organizationId: string,
    updater: (organization: MockFactoryOrganization) => MockFactoryOrganization,
  ): void {
    this.updateSnapshot((current) => ({
      ...current,
      organizations: current.organizations.map((organization) =>
        organization.id === organizationId ? updater(organization) : organization,
      ),
    }));
  }

  private updateSnapshot(updater: (current: MockFactoryAppSnapshot) => MockFactoryAppSnapshot): void {
    this.snapshot = updater(this.snapshot);
    saveSnapshot(this.snapshot);
    for (const listener of this.listeners) {
      listener();
    }
  }

  private requireOrganization(organizationId: string): MockFactoryOrganization {
    const organization = this.snapshot.organizations.find((candidate) => candidate.id === organizationId);
    if (!organization) {
      throw new Error(`Unknown mock organization ${organizationId}`);
    }
    return organization;
  }
}

function currentMockUser(snapshot: MockFactoryAppSnapshot): MockFactoryUser | null {
  if (!snapshot.auth.currentUserId) {
    return null;
  }
  return snapshot.users.find((candidate) => candidate.id === snapshot.auth.currentUserId) ?? null;
}

const mockFactoryAppStore = new MockFactoryAppStore();

export function getMockFactoryAppClient(): MockFactoryAppClient {
  return mockFactoryAppStore;
}

export function currentMockFactoryUser(snapshot: MockFactoryAppSnapshot): MockFactoryUser | null {
  return currentMockUser(snapshot);
}

export function currentMockFactoryOrganization(snapshot: MockFactoryAppSnapshot): MockFactoryOrganization | null {
  if (!snapshot.activeOrganizationId) {
    return null;
  }
  return snapshot.organizations.find((candidate) => candidate.id === snapshot.activeOrganizationId) ?? null;
}

export function eligibleMockOrganizations(snapshot: MockFactoryAppSnapshot): MockFactoryOrganization[] {
  const user = currentMockUser(snapshot);
  if (!user) {
    return [];
  }

  const eligible = new Set(user.eligibleOrganizationIds);
  return snapshot.organizations.filter((organization) => eligible.has(organization.id));
}
