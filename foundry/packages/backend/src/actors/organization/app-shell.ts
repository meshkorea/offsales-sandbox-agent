// @ts-nocheck
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  FoundryAppSnapshot,
  FoundryActorRuntimeState,
  FoundryBillingPlanId,
  FoundryBillingState,
  FoundryOrganization,
  FoundryOrganizationMember,
  FoundryUser,
  UpdateFoundryOrganizationProfileInput,
} from "@sandbox-agent/foundry-shared";
import { getActorRuntimeContext } from "../context.js";
import { getOrCreateGithubState, getOrCreateOrganization, getOrCreateUserGithubData } from "../handles.js";
import { GitHubAppError } from "../../services/app-github.js";
import { repoIdFromRemote, repoLabelFromRemote } from "../../services/repo.js";
import { listActorRuntimeIssues } from "../runtime-issues.js";
import { appSessions, invoices, organizationMembers, organizationProfile, repos, seatAssignments, stripeLookup } from "./db/schema.js";

export const APP_SHELL_ORGANIZATION_ID = "app";

const PROFILE_ROW_ID = "profile";
const OAUTH_TTL_MS = 10 * 60_000;

function assertAppWorkspace(c: any): void {
  if (c.state.workspaceId !== APP_SHELL_ORGANIZATION_ID) {
    throw new Error(`App shell action requires workspace ${APP_SHELL_ORGANIZATION_ID}, got ${c.state.workspaceId}`);
  }
}

function assertOrganizationWorkspace(c: any): void {
  if (c.state.workspaceId === APP_SHELL_ORGANIZATION_ID) {
    throw new Error("Organization action cannot run on the reserved app workspace");
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function personalWorkspaceId(login: string): string {
  return `personal-${slugify(login)}`;
}

function organizationWorkspaceId(kind: FoundryOrganization["kind"], login: string): string {
  return kind === "personal" ? personalWorkspaceId(login) : slugify(login);
}

function hasRepoScope(scopes: string[]): boolean {
  return scopes.some((scope) => scope === "repo" || scope.startsWith("repo:"));
}

function encodeOauthState(payload: { sessionId: string; nonce: string }): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeOauthState(value: string): { sessionId: string; nonce: string } {
  const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
  if (typeof parsed.sessionId !== "string" || typeof parsed.nonce !== "string") {
    throw new Error("GitHub OAuth state is malformed");
  }
  return {
    sessionId: parsed.sessionId,
    nonce: parsed.nonce,
  };
}

function seatsIncludedForPlan(planId: FoundryBillingPlanId): number {
  switch (planId) {
    case "free":
      return 1;
    case "team":
      return 5;
  }
}

function stripeStatusToBillingStatus(stripeStatus: string, cancelAtPeriodEnd: boolean): FoundryBillingState["status"] {
  if (cancelAtPeriodEnd) {
    return "scheduled_cancel";
  }
  if (stripeStatus === "trialing") {
    return "trialing";
  }
  if (stripeStatus === "past_due" || stripeStatus === "unpaid" || stripeStatus === "incomplete") {
    return "past_due";
  }
  return "active";
}

function formatUnixDate(value: number): string {
  return new Date(value * 1000).toISOString().slice(0, 10);
}

function stringFromMetadata(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stripeWebhookSubscription(event: any) {
  const object = event.data.object as Record<string, unknown>;
  const items = (object.items as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];
  const price = items[0]?.price as Record<string, unknown> | undefined;
  return {
    id: typeof object.id === "string" ? object.id : "",
    customerId: typeof object.customer === "string" ? object.customer : "",
    priceId: typeof price?.id === "string" ? price.id : null,
    status: typeof object.status === "string" ? object.status : "active",
    cancelAtPeriodEnd: object.cancel_at_period_end === true,
    currentPeriodEnd: typeof object.current_period_end === "number" ? object.current_period_end : null,
    trialEnd: typeof object.trial_end === "number" ? object.trial_end : null,
    defaultPaymentMethodLabel: "Payment method on file",
  };
}

async function getAppSessionRow(c: any, sessionId: string) {
  assertAppWorkspace(c);
  return await c.db.select().from(appSessions).where(eq(appSessions.id, sessionId)).get();
}

async function requireAppSessionRow(c: any, sessionId: string) {
  const row = await getAppSessionRow(c, sessionId);
  if (!row) {
    throw new Error(`Unknown app session: ${sessionId}`);
  }
  return row;
}

async function ensureAppSession(c: any, requestedSessionId?: string | null): Promise<string> {
  assertAppWorkspace(c);
  const requested = typeof requestedSessionId === "string" && requestedSessionId.trim().length > 0 ? requestedSessionId.trim() : null;

  if (requested) {
    const existing = await getAppSessionRow(c, requested);
    if (existing) {
      return requested;
    }
  }

  const sessionId = requested ?? randomUUID();
  const now = Date.now();
  await c.db
    .insert(appSessions)
    .values({
      id: sessionId,
      currentUserId: null,
      activeOrganizationId: null,
      starterRepoStatus: "pending",
      starterRepoStarredAt: null,
      starterRepoSkippedAt: null,
      oauthState: null,
      oauthStateExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
  return sessionId;
}

async function updateAppSession(c: any, sessionId: string, patch: Record<string, unknown>): Promise<void> {
  assertAppWorkspace(c);
  await c.db
    .update(appSessions)
    .set({
      ...patch,
      updatedAt: Date.now(),
    })
    .where(eq(appSessions.id, sessionId))
    .run();
}

async function getOrganizationState(workspace: any) {
  return await workspace.getOrganizationShellState({});
}

async function buildAppSnapshot(c: any, sessionId: string): Promise<FoundryAppSnapshot> {
  assertAppWorkspace(c);
  const session = await requireAppSessionRow(c, sessionId);
  const userProfile = session.currentUserId != null ? await getOrCreateUserGithubData(c, session.currentUserId).then((user) => user.getProfile()) : null;
  const eligibleOrganizationIds = userProfile?.eligibleOrganizationIds ?? [];

  const organizations: FoundryOrganization[] = [];
  for (const organizationId of eligibleOrganizationIds) {
    try {
      const workspace = await getOrCreateOrganization(c, organizationId);
      const organizationState = await getOrganizationState(workspace);
      organizations.push(organizationState.snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Actor not found")) {
        throw error;
      }
    }
  }

  const currentUser: FoundryUser | null = userProfile
    ? {
        id: userProfile.userId,
        name: userProfile.displayName,
        email: userProfile.email,
        githubLogin: userProfile.githubLogin,
        roleLabel: "GitHub user",
        eligibleOrganizationIds,
      }
    : null;

  const activeOrganizationId =
    currentUser && session.activeOrganizationId && organizations.some((organization) => organization.id === session.activeOrganizationId)
      ? session.activeOrganizationId
      : currentUser && organizations.length === 1
        ? (organizations[0]?.id ?? null)
        : null;

  return {
    auth: {
      status: currentUser ? "signed_in" : "signed_out",
      currentUserId: currentUser?.id ?? null,
    },
    activeOrganizationId,
    onboarding: {
      starterRepo: {
        repoFullName: "rivet-dev/sandbox-agent",
        repoUrl: "https://github.com/rivet-dev/sandbox-agent",
        status: session.starterRepoStatus ?? "pending",
        starredAt: session.starterRepoStarredAt ?? null,
        skippedAt: session.starterRepoSkippedAt ?? null,
      },
    },
    users: currentUser ? [currentUser] : [],
    organizations,
  };
}

async function requireSignedInSession(c: any, sessionId: string) {
  const session = await requireAppSessionRow(c, sessionId);
  if (!session.currentUserId) {
    throw new Error("User must be signed in");
  }
  const userGithub = await getOrCreateUserGithubData(c, session.currentUserId);
  const profile = await userGithub.getProfile();
  const auth = await userGithub.getAuth();
  if (!profile || !auth) {
    throw new Error(`GitHub user data is not initialized for session user ${session.currentUserId}`);
  }
  return {
    session,
    profile,
    auth,
  };
}

function requireEligibleOrganization(userProfile: { eligibleOrganizationIds: string[] }, organizationId: string): void {
  if (!userProfile.eligibleOrganizationIds.includes(organizationId)) {
    throw new Error(`Organization ${organizationId} is not available in this app session`);
  }
}

async function upsertStripeLookupEntries(c: any, organizationId: string, customerId: string | null, subscriptionId: string | null): Promise<void> {
  assertAppWorkspace(c);
  const now = Date.now();
  for (const lookupKey of [customerId ? `customer:${customerId}` : null, subscriptionId ? `subscription:${subscriptionId}` : null]) {
    if (!lookupKey) {
      continue;
    }
    await c.db
      .insert(stripeLookup)
      .values({
        lookupKey,
        organizationId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: stripeLookup.lookupKey,
        set: {
          organizationId,
          updatedAt: now,
        },
      })
      .run();
  }
}

async function findOrganizationIdForStripeEvent(c: any, customerId: string | null, subscriptionId: string | null): Promise<string | null> {
  assertAppWorkspace(c);
  const customerLookup = customerId
    ? await c.db
        .select({ organizationId: stripeLookup.organizationId })
        .from(stripeLookup)
        .where(eq(stripeLookup.lookupKey, `customer:${customerId}`))
        .get()
    : null;
  if (customerLookup?.organizationId) {
    return customerLookup.organizationId;
  }

  const subscriptionLookup = subscriptionId
    ? await c.db
        .select({ organizationId: stripeLookup.organizationId })
        .from(stripeLookup)
        .where(eq(stripeLookup.lookupKey, `subscription:${subscriptionId}`))
        .get()
    : null;
  return subscriptionLookup?.organizationId ?? null;
}

async function safeListOrganizations(accessToken: string): Promise<any[]> {
  const { appShell } = getActorRuntimeContext();
  try {
    return await appShell.github.listOrganizations(accessToken);
  } catch (error) {
    if (error instanceof GitHubAppError && error.status === 403) {
      return [];
    }
    throw error;
  }
}

async function safeListInstallations(accessToken: string): Promise<any[]> {
  const { appShell } = getActorRuntimeContext();
  try {
    return await appShell.github.listInstallations(accessToken);
  } catch (error) {
    if (error instanceof GitHubAppError && (error.status === 403 || error.status === 404)) {
      return [];
    }
    throw error;
  }
}

async function syncGithubSessionFromToken(
  c: any,
  sessionId: string,
  accessToken: string,
  scopes: string[] = [],
  options?: { organizationLogins?: string[] | null },
): Promise<{ sessionId: string; redirectTo: string }> {
  assertAppWorkspace(c);
  const { appShell } = getActorRuntimeContext();
  const session = await requireAppSessionRow(c, sessionId);
  const resolvedScopes =
    scopes.length > 0
      ? [...new Set(scopes.map((value) => value.trim()).filter((value) => value.length > 0))]
      : await appShell.github.getTokenScopes(accessToken).catch(() => []);
  const viewer = await appShell.github.getViewer(accessToken);
  const requestedOrganizationLogins = new Set(
    (options?.organizationLogins ?? []).map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0),
  );
  const organizations = (await safeListOrganizations(accessToken)).filter(
    (organization) => requestedOrganizationLogins.size === 0 || requestedOrganizationLogins.has(organization.login.trim().toLowerCase()),
  );
  const installations = await safeListInstallations(accessToken);
  const userId = `user-${slugify(viewer.login)}`;

  const linkedOrganizationIds: string[] = [];
  const accounts = [
    {
      githubAccountId: viewer.id,
      githubLogin: viewer.login,
      githubAccountType: "User",
      kind: "personal" as const,
      displayName: viewer.name || viewer.login,
    },
    ...organizations.map((organization) => ({
      githubAccountId: organization.id,
      githubLogin: organization.login,
      githubAccountType: "Organization",
      kind: "organization" as const,
      displayName: organization.name || organization.login,
    })),
  ];

  for (const account of accounts) {
    const organizationId = organizationWorkspaceId(account.kind, account.githubLogin);
    const installation = installations.find((candidate) => candidate.accountLogin === account.githubLogin) ?? null;
    const workspace = await getOrCreateOrganization(c, organizationId);
    await workspace.syncOrganizationShellFromGithub({
      userId,
      userName: viewer.name || viewer.login,
      userEmail: viewer.email ?? `${viewer.login}@users.noreply.github.com`,
      githubAccountId: account.githubAccountId,
      githubLogin: account.githubLogin,
      githubAccountType: account.githubAccountType,
      kind: account.kind,
      displayName: account.displayName,
    });

    if (account.kind === "personal" || installation?.id || accessToken) {
      const installationStatus =
        account.kind === "personal"
          ? "connected"
          : installation?.id
            ? "connected"
            : appShell.github.isAppConfigured()
              ? "install_required"
              : "reconnect_required";
      const githubState = await getOrCreateGithubState(c, organizationId);
      void githubState
        .fullSync({
          kind: account.kind,
          githubLogin: account.githubLogin,
          connectedAccount: account.githubLogin,
          installationStatus,
          installationId: account.kind === "personal" ? null : (installation?.id ?? null),
          accessToken,
          label: "Syncing GitHub data...",
          fallbackMembers:
            account.kind === "personal"
              ? [
                  {
                    id: userId,
                    login: viewer.login,
                    name: viewer.name || viewer.login,
                    email: viewer.email ?? `${viewer.login}@users.noreply.github.com`,
                    role: "owner",
                    state: "active",
                  },
                ]
              : [],
        })
        .catch(() => {});
    }

    linkedOrganizationIds.push(organizationId);
  }

  const activeOrganizationId =
    session.activeOrganizationId && linkedOrganizationIds.includes(session.activeOrganizationId)
      ? session.activeOrganizationId
      : linkedOrganizationIds.length === 1
        ? (linkedOrganizationIds[0] ?? null)
        : null;

  const userGithub = await getOrCreateUserGithubData(c, userId);
  await userGithub.upsert({
    githubUserId: viewer.id,
    githubLogin: viewer.login,
    displayName: viewer.name || viewer.login,
    email: viewer.email ?? `${viewer.login}@users.noreply.github.com`,
    accessToken,
    scopes: resolvedScopes,
    eligibleOrganizationIds: linkedOrganizationIds,
  });

  await updateAppSession(c, session.id, {
    currentUserId: userId,
    activeOrganizationId,
    oauthState: null,
    oauthStateExpiresAt: null,
  });

  return {
    sessionId: session.id,
    redirectTo: `${appShell.appUrl}/organizations?foundrySession=${encodeURIComponent(session.id)}`,
  };
}

async function readOrganizationProfileRow(c: any) {
  assertOrganizationWorkspace(c);
  return await c.db.select().from(organizationProfile).where(eq(organizationProfile.id, PROFILE_ROW_ID)).get();
}

async function requireOrganizationProfileRow(c: any) {
  const row = await readOrganizationProfileRow(c);
  if (!row) {
    throw new Error(`Organization profile is not initialized for workspace ${c.state.workspaceId}`);
  }
  return row;
}

async function listOrganizationMembers(c: any): Promise<FoundryOrganizationMember[]> {
  assertOrganizationWorkspace(c);
  const rows = await c.db.select().from(organizationMembers).orderBy(organizationMembers.role, organizationMembers.name).all();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    state: row.state,
  }));
}

async function listOrganizationSeatAssignments(c: any): Promise<string[]> {
  assertOrganizationWorkspace(c);
  const rows = await c.db.select({ email: seatAssignments.email }).from(seatAssignments).orderBy(seatAssignments.email).all();
  return rows.map((row) => row.email);
}

async function listOrganizationInvoices(c: any): Promise<FoundryBillingState["invoices"]> {
  assertOrganizationWorkspace(c);
  const rows = await c.db.select().from(invoices).orderBy(desc(invoices.issuedAt), desc(invoices.createdAt)).all();
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    issuedAt: row.issuedAt,
    amountUsd: row.amountUsd,
    status: row.status,
  }));
}

async function listOrganizationRepoCatalog(c: any): Promise<string[]> {
  assertOrganizationWorkspace(c);
  const rows = await c.db.select({ remoteUrl: repos.remoteUrl }).from(repos).orderBy(desc(repos.updatedAt)).all();
  return rows.map((row) => repoLabelFromRemote(row.remoteUrl)).sort((left, right) => left.localeCompare(right));
}

async function buildOrganizationRuntimeState(c: any): Promise<FoundryActorRuntimeState> {
  assertOrganizationWorkspace(c);
  const issues = await listActorRuntimeIssues(c);
  return {
    status: issues.length > 0 ? "error" : "healthy",
    errorCount: issues.length,
    lastErrorAt: issues[0]?.occurredAt ?? null,
    issues,
  };
}

async function buildOrganizationState(c: any) {
  const row = await requireOrganizationProfileRow(c);
  const repoCatalog = await listOrganizationRepoCatalog(c);
  const members = await listOrganizationMembers(c);
  const seatAssignmentEmails = await listOrganizationSeatAssignments(c);
  const invoiceRows = await listOrganizationInvoices(c);
  const githubState = await getOrCreateGithubState(c, c.state.workspaceId);
  const githubSummary = await githubState.getSummary();
  const runtime = await buildOrganizationRuntimeState(c);

  return {
    id: c.state.workspaceId,
    workspaceId: c.state.workspaceId,
    kind: row.kind,
    githubLogin: row.githubLogin,
    githubInstallationId: githubSummary.installationId,
    stripeCustomerId: row.stripeCustomerId ?? null,
    stripeSubscriptionId: row.stripeSubscriptionId ?? null,
    stripePriceId: row.stripePriceId ?? null,
    billingPlanId: row.billingPlanId,
    snapshot: {
      id: c.state.workspaceId,
      workspaceId: c.state.workspaceId,
      kind: row.kind,
      settings: {
        displayName: row.displayName,
        slug: row.slug,
        primaryDomain: row.primaryDomain,
        seatAccrualMode: "first_prompt",
        defaultModel: row.defaultModel,
        autoImportRepos: row.autoImportRepos === 1,
      },
      github: {
        connectedAccount: githubSummary.connectedAccount,
        installationStatus: githubSummary.installationStatus,
        syncStatus: githubSummary.syncStatus,
        importedRepoCount: githubSummary.repositoryCount,
        lastSyncLabel: githubSummary.lastSyncLabel,
        lastSyncAt: githubSummary.lastSyncAt,
      },
      runtime,
      billing: {
        planId: row.billingPlanId,
        status: row.billingStatus,
        seatsIncluded: row.billingSeatsIncluded,
        trialEndsAt: row.billingTrialEndsAt,
        renewalAt: row.billingRenewalAt,
        stripeCustomerId: row.stripeCustomerId ?? "",
        paymentMethodLabel: row.billingPaymentMethodLabel,
        invoices: invoiceRows,
      },
      members,
      seatAssignments: seatAssignmentEmails,
      repoCatalog,
    },
  };
}

async function applySubscriptionState(
  workspace: any,
  subscription: {
    id: string;
    customerId: string;
    priceId: string | null;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: number | null;
    trialEnd: number | null;
    defaultPaymentMethodLabel: string;
  },
  fallbackPlanId: FoundryBillingPlanId,
): Promise<void> {
  await workspace.applyOrganizationStripeSubscription({
    subscription,
    fallbackPlanId,
  });
}

export const workspaceAppActions = {
  async ensureAppSession(c: any, input?: { requestedSessionId?: string | null }): Promise<{ sessionId: string }> {
    const sessionId = await ensureAppSession(c, input?.requestedSessionId);
    return { sessionId };
  },

  async getAppSnapshot(c: any, input: { sessionId: string }): Promise<FoundryAppSnapshot> {
    return await buildAppSnapshot(c, input.sessionId);
  },

  async notifyAppUpdated(c: any): Promise<void> {
    assertAppWorkspace(c);
    c.broadcast("appUpdated", { at: Date.now() });
  },

  async resolveAppGithubToken(
    c: any,
    input: { organizationId: string; requireRepoScope?: boolean },
  ): Promise<{ accessToken: string; scopes: string[] } | null> {
    assertAppWorkspace(c);
    const rows = await c.db.select().from(appSessions).orderBy(desc(appSessions.updatedAt)).all();

    const resolveFromRows = async (candidates: typeof rows) => {
      for (const row of candidates) {
        if (!row.currentUserId) {
          continue;
        }

        const userGithub = await getOrCreateUserGithubData(c, row.currentUserId);
        const [profile, auth] = await Promise.all([userGithub.getProfile(), userGithub.getAuth()]);
        if (!profile || !auth || !profile.eligibleOrganizationIds.includes(input.organizationId)) {
          continue;
        }

        if (input.requireRepoScope !== false && !hasRepoScope(auth.scopes)) {
          continue;
        }

        return {
          accessToken: auth.accessToken,
          scopes: auth.scopes,
        };
      }
      return null;
    };

    const preferred = await resolveFromRows(rows.filter((row) => row.activeOrganizationId === input.organizationId));
    if (preferred) {
      return preferred;
    }

    const fallback = await resolveFromRows(rows);
    if (fallback) {
      return fallback;
    }

    return null;
  },

  async startAppGithubAuth(c: any, input: { sessionId: string }): Promise<{ url: string }> {
    assertAppWorkspace(c);
    const { appShell } = getActorRuntimeContext();
    const sessionId = await ensureAppSession(c, input.sessionId);
    const nonce = randomUUID();
    await updateAppSession(c, sessionId, {
      oauthState: nonce,
      oauthStateExpiresAt: Date.now() + OAUTH_TTL_MS,
    });
    return {
      url: appShell.github.buildAuthorizeUrl(encodeOauthState({ sessionId, nonce })),
    };
  },

  async completeAppGithubAuth(c: any, input: { code: string; state: string }): Promise<{ sessionId: string; redirectTo: string }> {
    assertAppWorkspace(c);
    const { appShell } = getActorRuntimeContext();
    const oauth = decodeOauthState(input.state);
    const session = await requireAppSessionRow(c, oauth.sessionId);
    if (!session.oauthState || session.oauthState !== oauth.nonce || !session.oauthStateExpiresAt || session.oauthStateExpiresAt < Date.now()) {
      throw new Error("GitHub OAuth state is invalid or expired");
    }

    const token = await appShell.github.exchangeCode(input.code);
    return await syncGithubSessionFromToken(c, session.id, token.accessToken, token.scopes);
  },

  async bootstrapAppGithubSession(
    c: any,
    input: { accessToken: string; sessionId?: string | null; organizationLogins?: string[] | null },
  ): Promise<{ sessionId: string; redirectTo: string }> {
    assertAppWorkspace(c);
    if (process.env.NODE_ENV === "production") {
      throw new Error("bootstrapAppGithubSession is development-only");
    }
    const sessionId = await ensureAppSession(c, input.sessionId ?? null);
    return await syncGithubSessionFromToken(c, sessionId, input.accessToken, [], {
      organizationLogins: input.organizationLogins ?? null,
    });
  },

  async signOutApp(c: any, input: { sessionId: string }): Promise<FoundryAppSnapshot> {
    assertAppWorkspace(c);
    const sessionId = await ensureAppSession(c, input.sessionId);
    await updateAppSession(c, sessionId, {
      currentUserId: null,
      activeOrganizationId: null,
      starterRepoStatus: "pending",
      starterRepoStarredAt: null,
      starterRepoSkippedAt: null,
      oauthState: null,
      oauthStateExpiresAt: null,
    });
    return await buildAppSnapshot(c, sessionId);
  },

  async skipAppStarterRepo(c: any, input: { sessionId: string }): Promise<FoundryAppSnapshot> {
    assertAppWorkspace(c);
    await requireSignedInSession(c, input.sessionId);
    await updateAppSession(c, input.sessionId, {
      starterRepoStatus: "skipped",
      starterRepoSkippedAt: Date.now(),
      starterRepoStarredAt: null,
    });
    return await buildAppSnapshot(c, input.sessionId);
  },

  async starAppStarterRepo(c: any, input: { sessionId: string; organizationId: string }): Promise<FoundryAppSnapshot> {
    assertAppWorkspace(c);
    const { profile } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.organizationId);
    const workspace = await getOrCreateOrganization(c, input.organizationId);
    await workspace.starSandboxAgentRepo({
      workspaceId: input.organizationId,
    });
    await updateAppSession(c, input.sessionId, {
      starterRepoStatus: "starred",
      starterRepoStarredAt: Date.now(),
      starterRepoSkippedAt: null,
    });
    return await buildAppSnapshot(c, input.sessionId);
  },

  async selectAppOrganization(c: any, input: { sessionId: string; organizationId: string }): Promise<FoundryAppSnapshot> {
    assertAppWorkspace(c);
    const { profile } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.organizationId);
    await updateAppSession(c, input.sessionId, {
      activeOrganizationId: input.organizationId,
    });

    const workspace = await getOrCreateOrganization(c, input.organizationId);
    const organization = await getOrganizationState(workspace);
    if (organization.snapshot.github.syncStatus !== "synced") {
      return await workspaceAppActions.triggerAppRepoImport(c, input);
    }
    return await buildAppSnapshot(c, input.sessionId);
  },

  async updateAppOrganizationProfile(
    c: any,
    input: { sessionId: string; organizationId: string } & UpdateFoundryOrganizationProfileInput,
  ): Promise<FoundryAppSnapshot> {
    assertAppWorkspace(c);
    const { profile } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.organizationId);
    const workspace = await getOrCreateOrganization(c, input.organizationId);
    await workspace.updateOrganizationShellProfile({
      displayName: input.displayName,
      slug: input.slug,
      primaryDomain: input.primaryDomain,
    });
    return await buildAppSnapshot(c, input.sessionId);
  },

  async triggerAppRepoImport(c: any, input: { sessionId: string; organizationId: string }): Promise<FoundryAppSnapshot> {
    assertAppWorkspace(c);
    const { profile, auth } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.organizationId);
    const workspace = await getOrCreateOrganization(c, input.organizationId);
    const organization = await getOrganizationState(workspace);
    const githubState = await getOrCreateGithubState(c, input.organizationId);
    void githubState
      .fullSync({
        kind: organization.snapshot.kind,
        githubLogin: organization.githubLogin,
        connectedAccount: organization.snapshot.github.connectedAccount,
        installationStatus: organization.snapshot.kind === "personal" ? "connected" : organization.snapshot.github.installationStatus,
        installationId: organization.snapshot.kind === "personal" ? null : organization.githubInstallationId,
        accessToken: auth.accessToken,
        label: "Syncing GitHub data...",
        force: true,
        fallbackMembers:
          organization.snapshot.kind === "personal"
            ? [
                {
                  id: profile.userId,
                  login: profile.githubLogin,
                  name: profile.displayName,
                  email: profile.email,
                  role: "owner",
                  state: "active",
                },
              ]
            : [],
      })
      .catch((error) => {
        console.error("foundry github full sync failed", error);
      });

    return await buildAppSnapshot(c, input.sessionId);
  },

  async clearAppOrganizationRuntimeIssues(c: any, input: { sessionId: string; organizationId: string; actorId?: string | null }): Promise<FoundryAppSnapshot> {
    assertAppWorkspace(c);
    const { profile } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.organizationId);
    const workspace = await getOrCreateOrganization(c, input.organizationId);
    await workspace.clearActorRuntimeIssues({
      actorId: input.actorId ?? null,
    });
    return await buildAppSnapshot(c, input.sessionId);
  },

  async beginAppGithubInstall(c: any, input: { sessionId: string; organizationId: string }): Promise<{ url: string }> {
    assertAppWorkspace(c);
    const { profile } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.organizationId);
    const { appShell } = getActorRuntimeContext();
    const workspace = await getOrCreateOrganization(c, input.organizationId);
    const organization = await getOrganizationState(workspace);
    if (organization.snapshot.kind !== "organization") {
      return {
        url: `${appShell.appUrl}/workspaces/${input.organizationId}?foundrySession=${encodeURIComponent(input.sessionId)}`,
      };
    }
    return {
      url: await appShell.github.buildInstallationUrl(organization.githubLogin, randomUUID()),
    };
  },

  async createAppCheckoutSession(c: any, input: { sessionId: string; organizationId: string; planId: FoundryBillingPlanId }): Promise<{ url: string }> {
    assertAppWorkspace(c);
    const { profile } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.organizationId);
    const { appShell } = getActorRuntimeContext();
    const workspace = await getOrCreateOrganization(c, input.organizationId);
    const organization = await getOrganizationState(workspace);

    if (input.planId === "free") {
      await workspace.applyOrganizationFreePlan({ clearSubscription: false });
      return {
        url: `${appShell.appUrl}/organizations/${input.organizationId}/billing?foundrySession=${encodeURIComponent(input.sessionId)}`,
      };
    }

    if (!appShell.stripe.isConfigured()) {
      throw new Error("Stripe is not configured");
    }

    let customerId = organization.stripeCustomerId;
    if (!customerId) {
      customerId = (
        await appShell.stripe.createCustomer({
          organizationId: input.organizationId,
          displayName: organization.snapshot.settings.displayName,
          email: profile.email,
        })
      ).id;
      await workspace.applyOrganizationStripeCustomer({ customerId });
      await upsertStripeLookupEntries(c, input.organizationId, customerId, null);
    }

    return {
      url: await appShell.stripe
        .createCheckoutSession({
          organizationId: input.organizationId,
          customerId,
          customerEmail: profile.email,
          planId: input.planId,
          successUrl: `${appShell.appUrl}/api/rivet/app/billing/checkout/complete?organizationId=${encodeURIComponent(
            input.organizationId,
          )}&foundrySession=${encodeURIComponent(input.sessionId)}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${appShell.appUrl}/organizations/${input.organizationId}/billing?foundrySession=${encodeURIComponent(input.sessionId)}`,
        })
        .then((checkout) => checkout.url),
    };
  },

  async finalizeAppCheckoutSession(c: any, input: { sessionId: string; organizationId: string; checkoutSessionId: string }): Promise<{ redirectTo: string }> {
    assertAppWorkspace(c);
    const { appShell } = getActorRuntimeContext();
    const workspace = await getOrCreateOrganization(c, input.organizationId);
    const organization = await getOrganizationState(workspace);
    const completion = await appShell.stripe.retrieveCheckoutCompletion(input.checkoutSessionId);

    if (completion.customerId) {
      await workspace.applyOrganizationStripeCustomer({ customerId: completion.customerId });
    }
    await upsertStripeLookupEntries(c, input.organizationId, completion.customerId, completion.subscriptionId);

    if (completion.subscriptionId) {
      const subscription = await appShell.stripe.retrieveSubscription(completion.subscriptionId);
      await applySubscriptionState(workspace, subscription, completion.planId ?? organization.billingPlanId);
    }

    if (completion.paymentMethodLabel) {
      await workspace.setOrganizationBillingPaymentMethod({
        label: completion.paymentMethodLabel,
      });
    }

    return {
      redirectTo: `${appShell.appUrl}/organizations/${input.organizationId}/billing?foundrySession=${encodeURIComponent(input.sessionId)}`,
    };
  },

  async createAppBillingPortalSession(c: any, input: { sessionId: string; organizationId: string }): Promise<{ url: string }> {
    assertAppWorkspace(c);
    const { profile } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.organizationId);
    const { appShell } = getActorRuntimeContext();
    const workspace = await getOrCreateOrganization(c, input.organizationId);
    const organization = await getOrganizationState(workspace);
    if (!organization.stripeCustomerId) {
      throw new Error("Stripe customer is not available for this organization");
    }
    const portal = await appShell.stripe.createPortalSession({
      customerId: organization.stripeCustomerId,
      returnUrl: `${appShell.appUrl}/organizations/${input.organizationId}/billing?foundrySession=${encodeURIComponent(input.sessionId)}`,
    });
    return { url: portal.url };
  },

  async cancelAppScheduledRenewal(c: any, input: { sessionId: string; organizationId: string }): Promise<FoundryAppSnapshot> {
    assertAppWorkspace(c);
    const { profile } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.organizationId);
    const { appShell } = getActorRuntimeContext();
    const workspace = await getOrCreateOrganization(c, input.organizationId);
    const organization = await getOrganizationState(workspace);

    if (organization.stripeSubscriptionId && appShell.stripe.isConfigured()) {
      const subscription = await appShell.stripe.updateSubscriptionCancellation(organization.stripeSubscriptionId, true);
      await applySubscriptionState(workspace, subscription, organization.billingPlanId);
      await upsertStripeLookupEntries(c, input.organizationId, subscription.customerId ?? organization.stripeCustomerId, subscription.id);
    } else {
      await workspace.setOrganizationBillingStatus({ status: "scheduled_cancel" });
    }

    return await buildAppSnapshot(c, input.sessionId);
  },

  async resumeAppSubscription(c: any, input: { sessionId: string; organizationId: string }): Promise<FoundryAppSnapshot> {
    assertAppWorkspace(c);
    const { profile } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.organizationId);
    const { appShell } = getActorRuntimeContext();
    const workspace = await getOrCreateOrganization(c, input.organizationId);
    const organization = await getOrganizationState(workspace);

    if (organization.stripeSubscriptionId && appShell.stripe.isConfigured()) {
      const subscription = await appShell.stripe.updateSubscriptionCancellation(organization.stripeSubscriptionId, false);
      await applySubscriptionState(workspace, subscription, organization.billingPlanId);
      await upsertStripeLookupEntries(c, input.organizationId, subscription.customerId ?? organization.stripeCustomerId, subscription.id);
    } else {
      await workspace.setOrganizationBillingStatus({ status: "active" });
    }

    return await buildAppSnapshot(c, input.sessionId);
  },

  async recordAppSeatUsage(c: any, input: { sessionId: string; workspaceId: string }): Promise<FoundryAppSnapshot> {
    assertAppWorkspace(c);
    const { profile } = await requireSignedInSession(c, input.sessionId);
    requireEligibleOrganization(profile, input.workspaceId);
    const workspace = await getOrCreateOrganization(c, input.workspaceId);
    await workspace.recordOrganizationSeatUsage({
      email: profile.email,
    });
    return await buildAppSnapshot(c, input.sessionId);
  },

  async handleAppStripeWebhook(c: any, input: { payload: string; signatureHeader: string | null }): Promise<{ ok: true }> {
    assertAppWorkspace(c);
    const { appShell } = getActorRuntimeContext();
    const event = appShell.stripe.verifyWebhookEvent(input.payload, input.signatureHeader);

    if (event.type === "checkout.session.completed") {
      const object = event.data.object as Record<string, unknown>;
      const organizationId =
        stringFromMetadata(object.metadata, "organizationId") ??
        (await findOrganizationIdForStripeEvent(
          c,
          typeof object.customer === "string" ? object.customer : null,
          typeof object.subscription === "string" ? object.subscription : null,
        ));
      if (organizationId) {
        const workspace = await getOrCreateOrganization(c, organizationId);
        if (typeof object.customer === "string") {
          await workspace.applyOrganizationStripeCustomer({ customerId: object.customer });
        }
        await upsertStripeLookupEntries(
          c,
          organizationId,
          typeof object.customer === "string" ? object.customer : null,
          typeof object.subscription === "string" ? object.subscription : null,
        );
      }
      return { ok: true };
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscription = stripeWebhookSubscription(event);
      const organizationId = await findOrganizationIdForStripeEvent(c, subscription.customerId, subscription.id);
      if (organizationId) {
        const workspace = await getOrCreateOrganization(c, organizationId);
        const organization = await getOrganizationState(workspace);
        await applySubscriptionState(workspace, subscription, appShell.stripe.planIdForPriceId(subscription.priceId ?? "") ?? organization.billingPlanId);
        await upsertStripeLookupEntries(c, organizationId, subscription.customerId, subscription.id);
      }
      return { ok: true };
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = stripeWebhookSubscription(event);
      const organizationId = await findOrganizationIdForStripeEvent(c, subscription.customerId, subscription.id);
      if (organizationId) {
        const workspace = await getOrCreateOrganization(c, organizationId);
        await workspace.applyOrganizationFreePlan({ clearSubscription: true });
      }
      return { ok: true };
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Record<string, unknown>;
      const organizationId = await findOrganizationIdForStripeEvent(c, typeof invoice.customer === "string" ? invoice.customer : null, null);
      if (organizationId) {
        const workspace = await getOrCreateOrganization(c, organizationId);
        const rawAmount = typeof invoice.amount_paid === "number" ? invoice.amount_paid : invoice.amount_due;
        const amountUsd = Math.round((typeof rawAmount === "number" ? rawAmount : 0) / 100);
        await workspace.upsertOrganizationInvoice({
          id: String(invoice.id),
          label: typeof invoice.number === "string" ? `Invoice ${invoice.number}` : "Stripe invoice",
          issuedAt: formatUnixDate(typeof invoice.created === "number" ? invoice.created : Math.floor(Date.now() / 1000)),
          amountUsd: Number.isFinite(amountUsd) ? amountUsd : 0,
          status: event.type === "invoice.paid" ? "paid" : "open",
        });
      }
    }

    return { ok: true };
  },

  async handleAppGithubWebhook(c: any, input: { payload: string; signatureHeader: string | null; eventHeader: string | null }): Promise<{ ok: true }> {
    assertAppWorkspace(c);
    const { appShell } = getActorRuntimeContext();
    const { event, body } = appShell.github.verifyWebhookEvent(input.payload, input.signatureHeader, input.eventHeader);

    const accountLogin = body.installation?.account?.login ?? body.repository?.owner?.login ?? body.organization?.login ?? null;
    const accountType = body.installation?.account?.type ?? body.repository?.owner?.type ?? (body.organization?.login ? "Organization" : null);
    if (!accountLogin) {
      console.log(`[github-webhook] Ignoring ${event}.${body.action ?? ""}: no installation account`);
      return { ok: true };
    }

    const kind: FoundryOrganization["kind"] = accountType === "User" ? "personal" : "organization";
    const organizationId = organizationWorkspaceId(kind, accountLogin);
    const githubState = await getOrCreateGithubState(c, organizationId);

    if (event === "installation" && (body.action === "created" || body.action === "deleted" || body.action === "suspend" || body.action === "unsuspend")) {
      console.log(`[github-webhook] ${event}.${body.action} for ${accountLogin} (org=${organizationId})`);
      if (body.action === "deleted") {
        await githubState.clearState({
          connectedAccount: accountLogin,
          installationStatus: "install_required",
          installationId: null,
          label: "GitHub App installation removed",
        });
      } else if (body.action === "created") {
        await githubState.fullSync({
          kind,
          githubLogin: accountLogin,
          connectedAccount: accountLogin,
          installationStatus: "connected",
          installationId: body.installation?.id ?? null,
          label: "Syncing GitHub data from installation webhook...",
          force: true,
          fallbackMembers: [],
        });
      } else if (body.action === "suspend") {
        await githubState.clearState({
          connectedAccount: accountLogin,
          installationStatus: "reconnect_required",
          installationId: body.installation?.id ?? null,
          label: "GitHub App installation suspended",
        });
      } else if (body.action === "unsuspend") {
        await githubState.fullSync({
          kind,
          githubLogin: accountLogin,
          connectedAccount: accountLogin,
          installationStatus: "connected",
          installationId: body.installation?.id ?? null,
          label: "Resyncing GitHub data after unsuspend...",
          force: true,
          fallbackMembers: [],
        });
      }
      return { ok: true };
    }

    if (event === "installation_repositories") {
      console.log(
        `[github-webhook] ${event}.${body.action} for ${accountLogin}: +${body.repositories_added?.length ?? 0} -${body.repositories_removed?.length ?? 0}`,
      );
      await githubState.fullSync({
        kind,
        githubLogin: accountLogin,
        connectedAccount: accountLogin,
        installationStatus: "connected",
        installationId: body.installation?.id ?? null,
        label: "Resyncing GitHub data after repository access change...",
        force: true,
        fallbackMembers: [],
      });
      return { ok: true };
    }

    if (
      event === "push" ||
      event === "pull_request" ||
      event === "pull_request_review" ||
      event === "pull_request_review_comment" ||
      event === "check_run" ||
      event === "check_suite" ||
      event === "status" ||
      event === "create" ||
      event === "delete"
    ) {
      const repoFullName = body.repository?.full_name;
      if (repoFullName) {
        console.log(`[github-webhook] ${event}.${body.action ?? ""} for ${repoFullName}`);
      }
      if (event === "pull_request" && body.repository?.full_name && body.repository?.clone_url && body.pull_request) {
        await githubState.handlePullRequestWebhook({
          connectedAccount: accountLogin,
          installationStatus: "connected",
          installationId: body.installation?.id ?? null,
          repository: {
            fullName: body.repository.full_name,
            cloneUrl: body.repository.clone_url,
            private: Boolean(body.repository.private),
          },
          pullRequest: {
            number: body.pull_request.number,
            title: body.pull_request.title ?? "",
            body: body.pull_request.body ?? null,
            state: body.pull_request.merged ? "MERGED" : (body.pull_request.state ?? "open"),
            url: body.pull_request.html_url ?? `https://github.com/${body.repository.full_name}/pull/${body.pull_request.number}`,
            headRefName: body.pull_request.head?.ref ?? "",
            baseRefName: body.pull_request.base?.ref ?? "",
            authorLogin: body.pull_request.user?.login ?? null,
            isDraft: Boolean(body.pull_request.draft),
            merged: Boolean(body.pull_request.merged),
          },
        });
      }
      return { ok: true };
    }

    console.log(`[github-webhook] Unhandled event: ${event}.${body.action ?? ""}`);
    return { ok: true };
  },

  async syncOrganizationShellFromGithub(
    c: any,
    input: {
      userId: string;
      userName: string;
      userEmail: string;
      githubAccountId: string;
      githubLogin: string;
      githubAccountType: string;
      kind: FoundryOrganization["kind"];
      displayName: string;
    },
  ): Promise<{ organizationId: string }> {
    assertOrganizationWorkspace(c);
    const now = Date.now();
    const existing = await readOrganizationProfileRow(c);
    const slug = existing?.slug ?? slugify(input.githubLogin);
    const organizationId = organizationWorkspaceId(input.kind, input.githubLogin);
    if (organizationId !== c.state.workspaceId) {
      throw new Error(`Workspace actor mismatch: actor=${c.state.workspaceId} github=${organizationId}`);
    }

    const hasStripeBillingState = Boolean(existing?.stripeCustomerId || existing?.stripeSubscriptionId || existing?.stripePriceId);
    const defaultBillingPlanId = input.kind === "personal" || !hasStripeBillingState ? "free" : (existing?.billingPlanId ?? "team");
    const defaultSeatsIncluded = input.kind === "personal" || !hasStripeBillingState ? 1 : (existing?.billingSeatsIncluded ?? 5);
    const defaultPaymentMethodLabel =
      input.kind === "personal"
        ? "No card required"
        : hasStripeBillingState
          ? (existing?.billingPaymentMethodLabel ?? "Payment method on file")
          : "No payment method on file";

    await c.db
      .insert(organizationProfile)
      .values({
        id: PROFILE_ROW_ID,
        kind: input.kind,
        githubAccountId: input.githubAccountId,
        githubLogin: input.githubLogin,
        githubAccountType: input.githubAccountType,
        displayName: input.displayName,
        slug,
        primaryDomain: existing?.primaryDomain ?? (input.kind === "personal" ? "personal" : `${slug}.github`),
        defaultModel: existing?.defaultModel ?? "claude-sonnet-4",
        autoImportRepos: existing?.autoImportRepos ?? 1,
        repoImportStatus: existing?.repoImportStatus ?? "not_started",
        stripeCustomerId: existing?.stripeCustomerId ?? null,
        stripeSubscriptionId: existing?.stripeSubscriptionId ?? null,
        stripePriceId: existing?.stripePriceId ?? null,
        billingPlanId: defaultBillingPlanId,
        billingStatus: existing?.billingStatus ?? "active",
        billingSeatsIncluded: defaultSeatsIncluded,
        billingTrialEndsAt: existing?.billingTrialEndsAt ?? null,
        billingRenewalAt: existing?.billingRenewalAt ?? null,
        billingPaymentMethodLabel: defaultPaymentMethodLabel,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: organizationProfile.id,
        set: {
          kind: input.kind,
          githubAccountId: input.githubAccountId,
          githubLogin: input.githubLogin,
          githubAccountType: input.githubAccountType,
          displayName: input.displayName,
          billingPlanId: defaultBillingPlanId,
          billingSeatsIncluded: defaultSeatsIncluded,
          billingPaymentMethodLabel: defaultPaymentMethodLabel,
          updatedAt: now,
        },
      })
      .run();

    await c.db
      .insert(organizationMembers)
      .values({
        id: input.userId,
        name: input.userName,
        email: input.userEmail,
        role: input.kind === "personal" ? "owner" : "admin",
        state: "active",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: organizationMembers.id,
        set: {
          name: input.userName,
          email: input.userEmail,
          role: input.kind === "personal" ? "owner" : "admin",
          state: "active",
          updatedAt: now,
        },
      })
      .run();

    return { organizationId };
  },

  async getOrganizationShellState(c: any): Promise<any> {
    assertOrganizationWorkspace(c);
    return await buildOrganizationState(c);
  },

  async updateOrganizationShellProfile(c: any, input: Pick<UpdateFoundryOrganizationProfileInput, "displayName" | "slug" | "primaryDomain">): Promise<void> {
    assertOrganizationWorkspace(c);
    const existing = await requireOrganizationProfileRow(c);
    await c.db
      .update(organizationProfile)
      .set({
        displayName: input.displayName.trim() || existing.displayName,
        slug: input.slug.trim() || existing.slug,
        primaryDomain: input.primaryDomain.trim() || existing.primaryDomain,
        updatedAt: Date.now(),
      })
      .where(eq(organizationProfile.id, PROFILE_ROW_ID))
      .run();
  },

  async applyOrganizationRepositoryCatalog(c: any, input: { repositories: Array<{ fullName: string; cloneUrl: string; private: boolean }> }): Promise<void> {
    assertOrganizationWorkspace(c);
    const now = Date.now();
    const nextRepoIds = new Set(input.repositories.map((repository) => repoIdFromRemote(repository.cloneUrl)));
    const existing = await c.db.select({ repoId: repos.repoId }).from(repos).all();
    for (const row of existing) {
      if (nextRepoIds.has(row.repoId)) {
        continue;
      }
      await c.db.delete(repos).where(eq(repos.repoId, row.repoId)).run();
    }
    for (const repository of input.repositories) {
      const remoteUrl = repository.cloneUrl;
      await c.db
        .insert(repos)
        .values({
          repoId: repoIdFromRemote(remoteUrl),
          remoteUrl,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: repos.repoId,
          set: {
            remoteUrl,
            updatedAt: now,
          },
        })
        .run();
    }
  },

  async applyOrganizationStripeCustomer(c: any, input: { customerId: string }): Promise<void> {
    assertOrganizationWorkspace(c);
    await c.db
      .update(organizationProfile)
      .set({
        stripeCustomerId: input.customerId,
        updatedAt: Date.now(),
      })
      .where(eq(organizationProfile.id, PROFILE_ROW_ID))
      .run();
  },

  async applyOrganizationStripeSubscription(
    c: any,
    input: {
      subscription: {
        id: string;
        customerId: string;
        priceId: string | null;
        status: string;
        cancelAtPeriodEnd: boolean;
        currentPeriodEnd: number | null;
        trialEnd: number | null;
        defaultPaymentMethodLabel: string;
      };
      fallbackPlanId: FoundryBillingPlanId;
    },
  ): Promise<void> {
    assertOrganizationWorkspace(c);
    const { appShell } = getActorRuntimeContext();
    const planId = appShell.stripe.planIdForPriceId(input.subscription.priceId ?? "") ?? input.fallbackPlanId;
    await c.db
      .update(organizationProfile)
      .set({
        stripeCustomerId: input.subscription.customerId || null,
        stripeSubscriptionId: input.subscription.id || null,
        stripePriceId: input.subscription.priceId,
        billingPlanId: planId,
        billingStatus: stripeStatusToBillingStatus(input.subscription.status, input.subscription.cancelAtPeriodEnd),
        billingSeatsIncluded: seatsIncludedForPlan(planId),
        billingTrialEndsAt: input.subscription.trialEnd ? new Date(input.subscription.trialEnd * 1000).toISOString() : null,
        billingRenewalAt: input.subscription.currentPeriodEnd ? new Date(input.subscription.currentPeriodEnd * 1000).toISOString() : null,
        billingPaymentMethodLabel: input.subscription.defaultPaymentMethodLabel || "Payment method on file",
        updatedAt: Date.now(),
      })
      .where(eq(organizationProfile.id, PROFILE_ROW_ID))
      .run();
  },

  async applyOrganizationFreePlan(c: any, input: { clearSubscription: boolean }): Promise<void> {
    assertOrganizationWorkspace(c);
    const patch: Record<string, unknown> = {
      billingPlanId: "free",
      billingStatus: "active",
      billingSeatsIncluded: 1,
      billingTrialEndsAt: null,
      billingRenewalAt: null,
      billingPaymentMethodLabel: "No card required",
      updatedAt: Date.now(),
    };
    if (input.clearSubscription) {
      patch.stripeSubscriptionId = null;
      patch.stripePriceId = null;
    }
    await c.db.update(organizationProfile).set(patch).where(eq(organizationProfile.id, PROFILE_ROW_ID)).run();
  },

  async setOrganizationBillingPaymentMethod(c: any, input: { label: string }): Promise<void> {
    assertOrganizationWorkspace(c);
    await c.db
      .update(organizationProfile)
      .set({
        billingPaymentMethodLabel: input.label,
        updatedAt: Date.now(),
      })
      .where(eq(organizationProfile.id, PROFILE_ROW_ID))
      .run();
  },

  async setOrganizationBillingStatus(c: any, input: { status: FoundryBillingState["status"] }): Promise<void> {
    assertOrganizationWorkspace(c);
    await c.db
      .update(organizationProfile)
      .set({
        billingStatus: input.status,
        updatedAt: Date.now(),
      })
      .where(eq(organizationProfile.id, PROFILE_ROW_ID))
      .run();
  },

  async upsertOrganizationInvoice(c: any, input: { id: string; label: string; issuedAt: string; amountUsd: number; status: "paid" | "open" }): Promise<void> {
    assertOrganizationWorkspace(c);
    await c.db
      .insert(invoices)
      .values({
        id: input.id,
        label: input.label,
        issuedAt: input.issuedAt,
        amountUsd: input.amountUsd,
        status: input.status,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: invoices.id,
        set: {
          label: input.label,
          issuedAt: input.issuedAt,
          amountUsd: input.amountUsd,
          status: input.status,
        },
      })
      .run();
  },

  async recordOrganizationSeatUsage(c: any, input: { email: string }): Promise<void> {
    assertOrganizationWorkspace(c);
    await c.db
      .insert(seatAssignments)
      .values({
        email: input.email,
        createdAt: Date.now(),
      })
      .onConflictDoNothing()
      .run();
  },
};
