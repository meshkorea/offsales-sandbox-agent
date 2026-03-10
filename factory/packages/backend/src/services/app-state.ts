import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  FactoryAppSnapshot,
  FactoryBillingPlanId,
  FactoryOrganization,
  FactoryUser,
  UpdateFactoryOrganizationProfileInput,
} from "@sandbox-agent/factory-shared";

interface PersistedFactorySession {
  sessionId: string;
  currentUserId: string | null;
  activeOrganizationId: string | null;
}

interface PersistedFactoryAppState {
  users: FactoryUser[];
  organizations: FactoryOrganization[];
  sessions: PersistedFactorySession[];
}

function nowIso(daysFromNow = 0): string {
  const value = new Date();
  value.setDate(value.getDate() + daysFromNow);
  return value.toISOString();
}

function planSeatsIncluded(planId: FactoryBillingPlanId): number {
  switch (planId) {
    case "free":
      return 1;
    case "team":
      return 5;
    case "enterprise":
      return 25;
  }
}

function buildDefaultState(): PersistedFactoryAppState {
  return {
    users: [
      {
        id: "user-nathan",
        name: "Nathan",
        email: "nathan@acme.dev",
        githubLogin: "nathan",
        roleLabel: "Founder",
        eligibleOrganizationIds: ["personal-nathan", "acme", "rivet"],
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
          stripeCustomerId: "cus_remote_personal_nathan",
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
          lastSyncLabel: "Waiting for first import",
        },
        billing: {
          planId: "team",
          status: "active",
          seatsIncluded: 5,
          trialEndsAt: null,
          renewalAt: nowIso(18),
          stripeCustomerId: "cus_remote_acme_team",
          paymentMethodLabel: "Visa ending in 4242",
          invoices: [
            { id: "inv-acme-001", label: "March 2026", issuedAt: "2026-03-01", amountUsd: 240, status: "paid" },
          ],
        },
        members: [
          { id: "member-acme-nathan", name: "Nathan", email: "nathan@acme.dev", role: "owner", state: "active" },
          { id: "member-acme-maya", name: "Maya", email: "maya@acme.dev", role: "admin", state: "active" },
          { id: "member-acme-priya", name: "Priya", email: "priya@acme.dev", role: "member", state: "active" },
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
          trialEndsAt: nowIso(12),
          renewalAt: nowIso(12),
          stripeCustomerId: "cus_remote_rivet_enterprise",
          paymentMethodLabel: "ACH verified",
          invoices: [
            { id: "inv-rivet-001", label: "Enterprise pilot", issuedAt: "2026-03-04", amountUsd: 0, status: "paid" },
          ],
        },
        members: [
          { id: "member-rivet-jamie", name: "Jamie", email: "jamie@rivet.dev", role: "owner", state: "active" },
          { id: "member-rivet-nathan", name: "Nathan", email: "nathan@acme.dev", role: "member", state: "active" },
        ],
        seatAssignments: ["jamie@rivet.dev"],
        repoImportStatus: "not_started",
        repoCatalog: ["rivet/dashboard", "rivet/agents", "rivet/billing", "rivet/infrastructure"],
      },
    ],
    sessions: [],
  };
}

function githubRemote(repo: string): string {
  return `https://github.com/${repo}.git`;
}

export interface FactoryAppStoreOptions {
  filePath?: string;
  onOrganizationReposReady?: (organization: FactoryOrganization) => Promise<void>;
}

export class FactoryAppStore {
  private readonly filePath: string;
  private readonly onOrganizationReposReady?: (organization: FactoryOrganization) => Promise<void>;
  private state: PersistedFactoryAppState;
  private readonly importTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(options: FactoryAppStoreOptions = {}) {
    this.filePath =
      options.filePath ??
      join(process.cwd(), ".sandbox-agent-factory", "backend", "app-state.json");
    this.onOrganizationReposReady = options.onOrganizationReposReady;
    this.state = this.loadState();
  }

  ensureSession(sessionId?: string | null): string {
    if (sessionId) {
      const existing = this.state.sessions.find((candidate) => candidate.sessionId === sessionId);
      if (existing) {
        return existing.sessionId;
      }
    }

    const nextSessionId = randomUUID();
    this.state.sessions.push({
      sessionId: nextSessionId,
      currentUserId: null,
      activeOrganizationId: null,
    });
    this.persist();
    return nextSessionId;
  }

  getSnapshot(sessionId: string): FactoryAppSnapshot {
    const session = this.requireSession(sessionId);
    return {
      auth: {
        status: session.currentUserId ? "signed_in" : "signed_out",
        currentUserId: session.currentUserId,
      },
      activeOrganizationId: session.activeOrganizationId,
      users: this.state.users,
      organizations: this.state.organizations,
    };
  }

  signInWithGithub(sessionId: string, userId = "user-nathan"): FactoryAppSnapshot {
    const user = this.state.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw new Error(`Unknown user: ${userId}`);
    }

    this.updateSession(sessionId, (session) => ({
      ...session,
      currentUserId: userId,
      activeOrganizationId: user.eligibleOrganizationIds.length === 1 ? user.eligibleOrganizationIds[0] ?? null : null,
    }));

    return this.getSnapshot(sessionId);
  }

  signOut(sessionId: string): FactoryAppSnapshot {
    this.updateSession(sessionId, (session) => ({
      ...session,
      currentUserId: null,
      activeOrganizationId: null,
    }));
    return this.getSnapshot(sessionId);
  }

  async selectOrganization(sessionId: string, organizationId: string): Promise<FactoryAppSnapshot> {
    const session = this.requireSession(sessionId);
    const user = this.requireSignedInUser(session);
    if (!user.eligibleOrganizationIds.includes(organizationId)) {
      throw new Error(`Organization ${organizationId} is not available to ${user.id}`);
    }

    const organization = this.requireOrganization(organizationId);
    this.updateSession(sessionId, (current) => ({
      ...current,
      activeOrganizationId: organizationId,
    }));

    if (organization.repoImportStatus !== "ready") {
      await this.triggerRepoImport(organizationId);
    } else if (this.onOrganizationReposReady) {
      await this.onOrganizationReposReady(this.requireOrganization(organizationId));
    }

    return this.getSnapshot(sessionId);
  }

  updateOrganizationProfile(input: UpdateFactoryOrganizationProfileInput): FactoryAppSnapshot {
    this.updateOrganization(input.organizationId, (organization) => ({
      ...organization,
      settings: {
        ...organization.settings,
        displayName: input.displayName.trim() || organization.settings.displayName,
        slug: input.slug.trim() || organization.settings.slug,
        primaryDomain: input.primaryDomain.trim() || organization.settings.primaryDomain,
      },
    }));
    return this.snapshotForOrganization(input.organizationId);
  }

  async triggerRepoImport(organizationId: string): Promise<FactoryAppSnapshot> {
    const organization = this.requireOrganization(organizationId);
    const existingTimer = this.importTimers.get(organizationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.updateOrganization(organizationId, (current) => ({
      ...current,
      repoImportStatus: "importing",
      github: {
        ...current.github,
        lastSyncLabel: "Importing repository catalog...",
      },
    }));

    const timer = setTimeout(async () => {
      this.updateOrganization(organizationId, (current) => ({
        ...current,
        repoImportStatus: "ready",
        github: {
          ...current.github,
          importedRepoCount: current.repoCatalog.length,
          installationStatus: "connected",
          lastSyncLabel: "Synced just now",
        },
      }));

      if (this.onOrganizationReposReady) {
        await this.onOrganizationReposReady(this.requireOrganization(organizationId));
      }

      this.importTimers.delete(organizationId);
    }, organization.kind === "personal" ? 100 : 1_250);

    this.importTimers.set(organizationId, timer);
    return this.snapshotForOrganization(organizationId);
  }

  completeHostedCheckout(organizationId: string, planId: FactoryBillingPlanId): FactoryAppSnapshot {
    this.updateOrganization(organizationId, (organization) => ({
      ...organization,
      billing: {
        ...organization.billing,
        planId,
        status: "active",
        seatsIncluded: planSeatsIncluded(planId),
        trialEndsAt: null,
        renewalAt: nowIso(30),
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
    return this.snapshotForOrganization(organizationId);
  }

  cancelScheduledRenewal(organizationId: string): FactoryAppSnapshot {
    this.updateOrganization(organizationId, (organization) => ({
      ...organization,
      billing: {
        ...organization.billing,
        status: "scheduled_cancel",
      },
    }));
    return this.snapshotForOrganization(organizationId);
  }

  resumeSubscription(organizationId: string): FactoryAppSnapshot {
    this.updateOrganization(organizationId, (organization) => ({
      ...organization,
      billing: {
        ...organization.billing,
        status: "active",
      },
    }));
    return this.snapshotForOrganization(organizationId);
  }

  reconnectGithub(organizationId: string): FactoryAppSnapshot {
    this.updateOrganization(organizationId, (organization) => ({
      ...organization,
      github: {
        ...organization.github,
        installationStatus: "connected",
        lastSyncLabel: "Reconnected just now",
      },
    }));
    return this.snapshotForOrganization(organizationId);
  }

  recordSeatUsage(workspaceId: string, userEmail: string): void {
    const organization = this.state.organizations.find((candidate) => candidate.workspaceId === workspaceId);
    if (!organization || organization.seatAssignments.includes(userEmail)) {
      return;
    }

    this.updateOrganization(organization.id, (current) => ({
      ...current,
      seatAssignments: [...current.seatAssignments, userEmail],
    }));
  }

  organizationRepos(organizationId: string): string[] {
    return this.requireOrganization(organizationId).repoCatalog.map(githubRemote);
  }

  findUserEmailForWorkspace(workspaceId: string, sessionId: string): string | null {
    const session = this.requireSession(sessionId);
    const user = session.currentUserId ? this.state.users.find((candidate) => candidate.id === session.currentUserId) : null;
    const organization = this.state.organizations.find((candidate) => candidate.workspaceId === workspaceId);
    if (!user || !organization) {
      return null;
    }
    return organization.members.some((member) => member.email === user.email) ? user.email : null;
  }

  private loadState(): PersistedFactoryAppState {
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedFactoryAppState;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid app state");
      }
      return parsed;
    } catch {
      const initial = buildDefaultState();
      this.persistState(initial);
      return initial;
    }
  }

  private snapshotForOrganization(organizationId: string): FactoryAppSnapshot {
    const session = this.state.sessions.find((candidate) => candidate.activeOrganizationId === organizationId);
    if (!session) {
      return {
        auth: { status: "signed_out", currentUserId: null },
        activeOrganizationId: null,
        users: this.state.users,
        organizations: this.state.organizations,
      };
    }
    return this.getSnapshot(session.sessionId);
  }

  private updateSession(
    sessionId: string,
    updater: (session: PersistedFactorySession) => PersistedFactorySession,
  ): void {
    const session = this.requireSession(sessionId);
    this.state = {
      ...this.state,
      sessions: this.state.sessions.map((candidate) => (candidate.sessionId === sessionId ? updater(session) : candidate)),
    };
    this.persist();
  }

  private updateOrganization(
    organizationId: string,
    updater: (organization: FactoryOrganization) => FactoryOrganization,
  ): void {
    this.requireOrganization(organizationId);
    this.state = {
      ...this.state,
      organizations: this.state.organizations.map((candidate) =>
        candidate.id === organizationId ? updater(candidate) : candidate,
      ),
    };
    this.persist();
  }

  private requireSession(sessionId: string): PersistedFactorySession {
    const session = this.state.sessions.find((candidate) => candidate.sessionId === sessionId);
    if (!session) {
      throw new Error(`Unknown app session: ${sessionId}`);
    }
    return session;
  }

  private requireOrganization(organizationId: string): FactoryOrganization {
    const organization = this.state.organizations.find((candidate) => candidate.id === organizationId);
    if (!organization) {
      throw new Error(`Unknown organization: ${organizationId}`);
    }
    return organization;
  }

  private requireSignedInUser(session: PersistedFactorySession): FactoryUser {
    if (!session.currentUserId) {
      throw new Error("User must be signed in");
    }
    const user = this.state.users.find((candidate) => candidate.id === session.currentUserId);
    if (!user) {
      throw new Error(`Unknown user: ${session.currentUserId}`);
    }
    return user;
  }

  private persist(): void {
    this.persistState(this.state);
  }

  private persistState(state: PersistedFactoryAppState): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }
}
