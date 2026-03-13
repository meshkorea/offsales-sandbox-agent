// @ts-nocheck
import { randomUUID } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { actor, queue } from "rivetkit";
import { Loop, workflow } from "rivetkit/workflow";
import type { FoundryGithubInstallationStatus, FoundryGithubSyncStatus } from "@sandbox-agent/foundry-shared";
import { repoIdFromRemote } from "../../services/repo.js";
import { resolveWorkspaceGithubAuth } from "../../services/github-auth.js";
import { getActorRuntimeContext } from "../context.js";
import { getOrCreateOrganization, getOrCreateRepository, selfGithubState } from "../handles.js";
import { APP_SHELL_ORGANIZATION_ID } from "../organization/app-shell.js";
import { githubStateDb } from "./db/db.js";
import { githubMembers, githubMeta, githubPullRequests, githubRepositories } from "./db/schema.js";

const META_ROW_ID = 1;
const GITHUB_PR_BATCH_SIZE = 10;
const GITHUB_QUEUE_NAMES = ["github.command.full_sync"] as const;

interface GithubStateInput {
  organizationId: string;
}

interface GithubStateMeta {
  connectedAccount: string;
  installationStatus: FoundryGithubInstallationStatus;
  syncStatus: FoundryGithubSyncStatus;
  installationId: number | null;
  lastSyncLabel: string;
  lastSyncAt: number | null;
  syncPhase: string | null;
  syncRunStartedAt: number | null;
  syncRepositoriesTotal: number | null;
  syncRepositoriesCompleted: number;
  syncPullRequestRepositoriesCompleted: number;
}

interface SyncMemberSeed {
  id: string;
  login: string;
  name: string;
  email?: string | null;
  role?: string | null;
  state?: string | null;
}

interface FullSyncInput {
  kind: "personal" | "organization";
  githubLogin: string;
  connectedAccount: string;
  installationStatus: FoundryGithubInstallationStatus;
  installationId: number | null;
  accessToken?: string | null;
  label?: string;
  fallbackMembers?: SyncMemberSeed[];
  force?: boolean;
}

interface FullSyncCommand extends FullSyncInput {
  runId: string;
  runStartedAt: number;
}

interface PullRequestWebhookInput {
  connectedAccount: string;
  installationStatus: FoundryGithubInstallationStatus;
  installationId: number | null;
  repository: {
    fullName: string;
    cloneUrl: string;
    private: boolean;
  };
  pullRequest: {
    number: number;
    title: string;
    body: string | null;
    state: string;
    url: string;
    headRefName: string;
    baseRefName: string;
    authorLogin: string | null;
    isDraft: boolean;
    merged?: boolean;
  };
}

interface GitHubRepositorySnapshot {
  fullName: string;
  cloneUrl: string;
  private: boolean;
}

interface GitHubPullRequestSnapshot {
  repoFullName: string;
  cloneUrl: string;
  number: number;
  title: string;
  body?: string | null;
  state: string;
  url: string;
  headRefName: string;
  baseRefName: string;
  authorLogin?: string | null;
  isDraft?: boolean;
}

interface FullSyncSeed {
  repositories: GitHubRepositorySnapshot[];
  members: SyncMemberSeed[];
  pullRequestSource: "installation" | "user" | "none";
}

function githubWorkflowQueueName(name: string): string {
  return name;
}

function normalizePullRequestStatus(input: { state: string; isDraft?: boolean; merged?: boolean }): "draft" | "ready" | "closed" | "merged" {
  const rawState = input.state.trim().toUpperCase();
  if (input.merged || rawState === "MERGED") {
    return "merged";
  }
  if (rawState === "CLOSED") {
    return "closed";
  }
  return input.isDraft ? "draft" : "ready";
}

function repoBelongsToAccount(fullName: string, accountLogin: string): boolean {
  const owner = fullName.split("/")[0]?.trim().toLowerCase() ?? "";
  return owner.length > 0 && owner === accountLogin.trim().toLowerCase();
}

function batchLabel(completed: number, total: number): string {
  return `Syncing pull requests (${completed}/${total} repositories)...`;
}

async function readMeta(c: any): Promise<GithubStateMeta> {
  const row = await c.db.select().from(githubMeta).where(eq(githubMeta.id, META_ROW_ID)).get();
  return {
    connectedAccount: row?.connectedAccount ?? "",
    installationStatus: (row?.installationStatus ?? "install_required") as FoundryGithubInstallationStatus,
    syncStatus: (row?.syncStatus ?? "pending") as FoundryGithubSyncStatus,
    installationId: row?.installationId ?? null,
    lastSyncLabel: row?.lastSyncLabel ?? "Waiting for first sync",
    lastSyncAt: row?.lastSyncAt ?? null,
    syncPhase: row?.syncPhase ?? null,
    syncRunStartedAt: row?.syncRunStartedAt ?? null,
    syncRepositoriesTotal: row?.syncRepositoriesTotal ?? null,
    syncRepositoriesCompleted: row?.syncRepositoriesCompleted ?? 0,
    syncPullRequestRepositoriesCompleted: row?.syncPullRequestRepositoriesCompleted ?? 0,
  };
}

async function writeMeta(c: any, patch: Partial<GithubStateMeta>): Promise<GithubStateMeta> {
  const current = await readMeta(c);
  const next: GithubStateMeta = {
    ...current,
    ...patch,
  };
  await c.db
    .insert(githubMeta)
    .values({
      id: META_ROW_ID,
      connectedAccount: next.connectedAccount,
      installationStatus: next.installationStatus,
      syncStatus: next.syncStatus,
      installationId: next.installationId,
      lastSyncLabel: next.lastSyncLabel,
      lastSyncAt: next.lastSyncAt,
      syncPhase: next.syncPhase,
      syncRunStartedAt: next.syncRunStartedAt,
      syncRepositoriesTotal: next.syncRepositoriesTotal,
      syncRepositoriesCompleted: next.syncRepositoriesCompleted,
      syncPullRequestRepositoriesCompleted: next.syncPullRequestRepositoriesCompleted,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: githubMeta.id,
      set: {
        connectedAccount: next.connectedAccount,
        installationStatus: next.installationStatus,
        syncStatus: next.syncStatus,
        installationId: next.installationId,
        lastSyncLabel: next.lastSyncLabel,
        lastSyncAt: next.lastSyncAt,
        syncPhase: next.syncPhase,
        syncRunStartedAt: next.syncRunStartedAt,
        syncRepositoriesTotal: next.syncRepositoriesTotal,
        syncRepositoriesCompleted: next.syncRepositoriesCompleted,
        syncPullRequestRepositoriesCompleted: next.syncPullRequestRepositoriesCompleted,
        updatedAt: Date.now(),
      },
    })
    .run();
  return next;
}

async function notifyAppUpdated(c: any): Promise<void> {
  const app = await getOrCreateOrganization(c, APP_SHELL_ORGANIZATION_ID);
  await app.notifyAppUpdated({});
}

async function notifyOrganizationUpdated(c: any): Promise<void> {
  const organization = await getOrCreateOrganization(c, c.state.organizationId);
  await Promise.all([organization.notifyWorkbenchUpdated({}), notifyAppUpdated(c)]);
}

async function upsertRepositories(c: any, repositories: GitHubRepositorySnapshot[], updatedAt: number): Promise<void> {
  for (const repository of repositories) {
    await c.db
      .insert(githubRepositories)
      .values({
        repoId: repoIdFromRemote(repository.cloneUrl),
        fullName: repository.fullName,
        cloneUrl: repository.cloneUrl,
        private: repository.private ? 1 : 0,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: githubRepositories.repoId,
        set: {
          fullName: repository.fullName,
          cloneUrl: repository.cloneUrl,
          private: repository.private ? 1 : 0,
          updatedAt,
        },
      })
      .run();
  }
}

async function upsertMembers(c: any, members: SyncMemberSeed[], updatedAt: number): Promise<void> {
  for (const member of members) {
    await c.db
      .insert(githubMembers)
      .values({
        memberId: member.id,
        login: member.login,
        displayName: member.name || member.login,
        email: member.email ?? null,
        role: member.role ?? null,
        state: member.state ?? "active",
        updatedAt,
      })
      .onConflictDoUpdate({
        target: githubMembers.memberId,
        set: {
          login: member.login,
          displayName: member.name || member.login,
          email: member.email ?? null,
          role: member.role ?? null,
          state: member.state ?? "active",
          updatedAt,
        },
      })
      .run();
  }
}

async function upsertPullRequests(c: any, pullRequests: GitHubPullRequestSnapshot[], updatedAt: number): Promise<void> {
  for (const pullRequest of pullRequests) {
    const repoId = repoIdFromRemote(pullRequest.cloneUrl);
    await c.db
      .insert(githubPullRequests)
      .values({
        prId: `${repoId}#${pullRequest.number}`,
        repoId,
        repoFullName: pullRequest.repoFullName,
        number: pullRequest.number,
        title: pullRequest.title,
        body: pullRequest.body ?? null,
        state: pullRequest.state,
        url: pullRequest.url,
        headRefName: pullRequest.headRefName,
        baseRefName: pullRequest.baseRefName,
        authorLogin: pullRequest.authorLogin ?? null,
        isDraft: pullRequest.isDraft ? 1 : 0,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: githubPullRequests.prId,
        set: {
          repoId,
          repoFullName: pullRequest.repoFullName,
          title: pullRequest.title,
          body: pullRequest.body ?? null,
          state: pullRequest.state,
          url: pullRequest.url,
          headRefName: pullRequest.headRefName,
          baseRefName: pullRequest.baseRefName,
          authorLogin: pullRequest.authorLogin ?? null,
          isDraft: pullRequest.isDraft ? 1 : 0,
          updatedAt,
        },
      })
      .run();
  }
}

async function pruneStaleRows(c: any, runStartedAt: number): Promise<void> {
  await c.db.delete(githubRepositories).where(lt(githubRepositories.updatedAt, runStartedAt)).run();
  await c.db.delete(githubMembers).where(lt(githubMembers.updatedAt, runStartedAt)).run();
  await c.db.delete(githubPullRequests).where(lt(githubPullRequests.updatedAt, runStartedAt)).run();
}

async function upsertPullRequest(c: any, input: PullRequestWebhookInput): Promise<void> {
  const repoId = repoIdFromRemote(input.repository.cloneUrl);
  const now = Date.now();
  await c.db
    .insert(githubRepositories)
    .values({
      repoId,
      fullName: input.repository.fullName,
      cloneUrl: input.repository.cloneUrl,
      private: input.repository.private ? 1 : 0,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: githubRepositories.repoId,
      set: {
        fullName: input.repository.fullName,
        cloneUrl: input.repository.cloneUrl,
        private: input.repository.private ? 1 : 0,
        updatedAt: now,
      },
    })
    .run();

  await c.db
    .insert(githubPullRequests)
    .values({
      prId: `${repoId}#${input.pullRequest.number}`,
      repoId,
      repoFullName: input.repository.fullName,
      number: input.pullRequest.number,
      title: input.pullRequest.title,
      body: input.pullRequest.body ?? null,
      state: input.pullRequest.state,
      url: input.pullRequest.url,
      headRefName: input.pullRequest.headRefName,
      baseRefName: input.pullRequest.baseRefName,
      authorLogin: input.pullRequest.authorLogin ?? null,
      isDraft: input.pullRequest.isDraft ? 1 : 0,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: githubPullRequests.prId,
      set: {
        title: input.pullRequest.title,
        body: input.pullRequest.body ?? null,
        state: input.pullRequest.state,
        url: input.pullRequest.url,
        headRefName: input.pullRequest.headRefName,
        baseRefName: input.pullRequest.baseRefName,
        authorLogin: input.pullRequest.authorLogin ?? null,
        isDraft: input.pullRequest.isDraft ? 1 : 0,
        updatedAt: now,
      },
    })
    .run();
}

async function upsertPullRequestSnapshot(
  c: any,
  input: {
    repoId: string;
    repoFullName: string;
    number: number;
    title: string;
    body?: string | null;
    state: string;
    url: string;
    headRefName: string;
    baseRefName: string;
    authorLogin?: string | null;
    isDraft?: boolean;
  },
): Promise<void> {
  const now = Date.now();
  await c.db
    .insert(githubPullRequests)
    .values({
      prId: `${input.repoId}#${input.number}`,
      repoId: input.repoId,
      repoFullName: input.repoFullName,
      number: input.number,
      title: input.title,
      body: input.body ?? null,
      state: input.state,
      url: input.url,
      headRefName: input.headRefName,
      baseRefName: input.baseRefName,
      authorLogin: input.authorLogin ?? null,
      isDraft: input.isDraft ? 1 : 0,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: githubPullRequests.prId,
      set: {
        title: input.title,
        body: input.body ?? null,
        state: input.state,
        url: input.url,
        headRefName: input.headRefName,
        baseRefName: input.baseRefName,
        authorLogin: input.authorLogin ?? null,
        isDraft: input.isDraft ? 1 : 0,
        updatedAt: now,
      },
    })
    .run();
}

async function countRows(c: any) {
  const repositories = await c.db.select().from(githubRepositories).all();
  const members = await c.db.select().from(githubMembers).all();
  const pullRequests = await c.db.select().from(githubPullRequests).all();
  return {
    repositoryCount: repositories.length,
    memberCount: members.length,
    pullRequestCount: pullRequests.length,
  };
}

async function resolveFullSyncSeed(c: any, input: FullSyncCommand): Promise<FullSyncSeed> {
  const { appShell } = getActorRuntimeContext();

  const syncFromUserToken = async (): Promise<FullSyncSeed> => {
    const rawRepositories = input.accessToken ? await appShell.github.listUserRepositories(input.accessToken) : [];
    const repositories =
      input.kind === "organization" ? rawRepositories.filter((repository) => repoBelongsToAccount(repository.fullName, input.githubLogin)) : rawRepositories;
    const members =
      input.accessToken && input.kind === "organization"
        ? await appShell.github.listOrganizationMembers(input.accessToken, input.githubLogin)
        : (input.fallbackMembers ?? []).map((member) => ({
            id: member.id,
            login: member.login,
            name: member.name,
            email: member.email ?? null,
            role: member.role ?? null,
            state: member.state ?? "active",
          }));
    return {
      repositories,
      members,
      pullRequestSource: input.accessToken ? "user" : "none",
    };
  };

  if (input.installationId != null) {
    try {
      const repositories = await appShell.github.listInstallationRepositories(input.installationId);
      const members =
        input.kind === "organization"
          ? await appShell.github.listInstallationMembers(input.installationId, input.githubLogin)
          : (input.fallbackMembers ?? []).map((member) => ({
              id: member.id,
              login: member.login,
              name: member.name,
              email: member.email ?? null,
              role: member.role ?? null,
              state: member.state ?? "active",
            }));
      return {
        repositories,
        members,
        pullRequestSource: "installation",
      };
    } catch (error) {
      if (!input.accessToken) {
        throw error;
      }
      return await syncFromUserToken();
    }
  }

  return await syncFromUserToken();
}

async function loadPullRequestsForBatch(c: any, input: FullSyncCommand, source: FullSyncSeed["pullRequestSource"], repositories: GitHubRepositorySnapshot[]) {
  const { appShell } = getActorRuntimeContext();
  if (repositories.length === 0) {
    return [];
  }
  if (source === "installation" && input.installationId != null) {
    try {
      return await appShell.github.listInstallationPullRequestsForRepositories(input.installationId, repositories);
    } catch (error) {
      if (!input.accessToken) {
        throw error;
      }
    }
  }
  if (source === "user" && input.accessToken) {
    return await appShell.github.listPullRequestsForUserRepositories(input.accessToken, repositories);
  }
  return [];
}

async function runFullSyncWorkflow(loopCtx: any, msg: any): Promise<void> {
  const body = msg.body as FullSyncCommand;
  const stepPrefix = `github-sync-${body.runId}`;
  let completionSummary: Awaited<ReturnType<typeof readMeta>> & Awaited<ReturnType<typeof countRows>>;

  try {
    const seed = await loopCtx.step({
      name: `${stepPrefix}-resolve-seed`,
      timeout: 5 * 60_000,
      run: async () => resolveFullSyncSeed(loopCtx, body),
    });

    await loopCtx.step(`${stepPrefix}-write-repositories`, async () => {
      await upsertRepositories(loopCtx, seed.repositories, body.runStartedAt);
      const organization = await getOrCreateOrganization(loopCtx, loopCtx.state.organizationId);
      await organization.applyOrganizationRepositoryCatalog({
        repositories: seed.repositories,
      });
      await writeMeta(loopCtx, {
        connectedAccount: body.connectedAccount,
        installationStatus: body.installationStatus,
        installationId: body.installationId,
        syncStatus: "syncing",
        syncPhase: "repositories",
        syncRunStartedAt: body.runStartedAt,
        syncRepositoriesTotal: seed.repositories.length,
        syncRepositoriesCompleted: seed.repositories.length,
        syncPullRequestRepositoriesCompleted: 0,
        lastSyncLabel: seed.repositories.length > 0 ? batchLabel(0, seed.repositories.length) : "No repositories available",
      });
      await notifyAppUpdated(loopCtx);
    });

    await loopCtx.step(`${stepPrefix}-write-members`, async () => {
      await upsertMembers(loopCtx, seed.members, body.runStartedAt);
      await writeMeta(loopCtx, {
        syncPhase: "pull_requests",
      });
      await notifyAppUpdated(loopCtx);
    });

    for (let start = 0; start < seed.repositories.length; start += GITHUB_PR_BATCH_SIZE) {
      const batch = seed.repositories.slice(start, start + GITHUB_PR_BATCH_SIZE);
      const completed = Math.min(start + batch.length, seed.repositories.length);
      await loopCtx.step({
        name: `${stepPrefix}-pull-requests-${start}`,
        timeout: 5 * 60_000,
        run: async () => {
          const pullRequests = await loadPullRequestsForBatch(loopCtx, body, seed.pullRequestSource, batch);
          await upsertPullRequests(loopCtx, pullRequests, Date.now());
          await writeMeta(loopCtx, {
            syncPhase: "pull_requests",
            syncPullRequestRepositoriesCompleted: completed,
            lastSyncLabel: batchLabel(completed, seed.repositories.length),
          });
          await notifyAppUpdated(loopCtx);
        },
      });
    }

    await loopCtx.step(`${stepPrefix}-finalize`, async () => {
      await pruneStaleRows(loopCtx, body.runStartedAt);
      const lastSyncLabel = seed.repositories.length > 0 ? `Synced ${seed.repositories.length} repositories` : "No repositories available";
      await writeMeta(loopCtx, {
        connectedAccount: body.connectedAccount,
        installationStatus: body.installationStatus,
        installationId: body.installationId,
        syncStatus: "synced",
        lastSyncLabel,
        lastSyncAt: Date.now(),
        syncPhase: null,
        syncRunStartedAt: null,
        syncRepositoriesTotal: seed.repositories.length,
        syncRepositoriesCompleted: seed.repositories.length,
        syncPullRequestRepositoriesCompleted: seed.repositories.length,
      });
      completionSummary = {
        ...(await readMeta(loopCtx)),
        ...(await countRows(loopCtx)),
      };
      await notifyOrganizationUpdated(loopCtx);
    });

    await msg.complete(completionSummary);
  } catch (error) {
    await loopCtx.step(`${stepPrefix}-failed`, async () => {
      const message = error instanceof Error ? error.message : "GitHub sync failed";
      const installationStatus = error instanceof Error && /403|404|401/.test(error.message) ? "reconnect_required" : body.installationStatus;
      await writeMeta(loopCtx, {
        connectedAccount: body.connectedAccount,
        installationStatus,
        installationId: body.installationId,
        syncStatus: "error",
        lastSyncLabel: message,
        syncPhase: null,
        syncRunStartedAt: null,
      });
      await notifyAppUpdated(loopCtx);
    });
    throw error;
  }
}

async function runGithubStateWorkflow(ctx: any): Promise<void> {
  await ctx.loop("github-command-loop", async (loopCtx: any) => {
    const msg = await loopCtx.queue.next("next-github-command", {
      names: [...GITHUB_QUEUE_NAMES],
      completable: true,
    });
    if (!msg) {
      return Loop.continue(undefined);
    }

    if (msg.name === "github.command.full_sync") {
      await runFullSyncWorkflow(loopCtx, msg);
      return Loop.continue(undefined);
    }

    return Loop.continue(undefined);
  });
}

export const githubState = actor({
  db: githubStateDb,
  queues: Object.fromEntries(GITHUB_QUEUE_NAMES.map((name) => [name, queue()])),
  createState: (_c, input: GithubStateInput) => ({
    organizationId: input.organizationId,
  }),
  actions: {
    async getSummary(c): Promise<GithubStateMeta & { repositoryCount: number; memberCount: number; pullRequestCount: number }> {
      return {
        ...(await readMeta(c)),
        ...(await countRows(c)),
      };
    },

    async listRepositories(c): Promise<Array<{ repoId: string; fullName: string; cloneUrl: string; private: boolean }>> {
      const rows = await c.db.select().from(githubRepositories).all();
      return rows.map((row) => ({
        repoId: row.repoId,
        fullName: row.fullName,
        cloneUrl: row.cloneUrl,
        private: Boolean(row.private),
      }));
    },

    async listPullRequestsForRepository(c, input: { repoId: string }) {
      const rows = await c.db.select().from(githubPullRequests).where(eq(githubPullRequests.repoId, input.repoId)).all();
      return rows.map((row) => ({
        number: row.number,
        title: row.title,
        body: row.body ?? null,
        state: row.state,
        url: row.url,
        headRefName: row.headRefName,
        baseRefName: row.baseRefName,
        authorLogin: row.authorLogin ?? null,
        isDraft: Boolean(row.isDraft),
      }));
    },

    async getPullRequestForBranch(
      c,
      input: { repoId: string; branchName: string },
    ): Promise<{ number: number; state: string; url: string; title: string; body: string | null; status: "draft" | "ready" | "closed" | "merged" } | null> {
      const branchName = input.branchName?.trim();
      if (!branchName) {
        return null;
      }
      const rows = await c.db.select().from(githubPullRequests).where(eq(githubPullRequests.repoId, input.repoId)).all();
      const match = rows.find((candidate) => candidate.headRefName === branchName) ?? null;
      if (!match) {
        return null;
      }
      return {
        number: match.number,
        state: match.state,
        url: match.url,
        title: match.title,
        body: match.body ?? null,
        status: normalizePullRequestStatus({
          state: match.state,
          isDraft: Boolean(match.isDraft),
        }),
      };
    },

    async clearState(
      c,
      input: { connectedAccount: string; installationStatus: FoundryGithubInstallationStatus; installationId: number | null; label: string },
    ): Promise<void> {
      await c.db.delete(githubRepositories).run();
      await c.db.delete(githubMembers).run();
      await c.db.delete(githubPullRequests).run();
      await writeMeta(c, {
        connectedAccount: input.connectedAccount,
        installationStatus: input.installationStatus,
        installationId: input.installationId,
        syncStatus: input.installationStatus === "connected" ? "pending" : "error",
        lastSyncLabel: input.label,
        lastSyncAt: null,
        syncPhase: null,
        syncRunStartedAt: null,
        syncRepositoriesTotal: null,
        syncRepositoriesCompleted: 0,
        syncPullRequestRepositoriesCompleted: 0,
      });
      const organization = await getOrCreateOrganization(c, c.state.organizationId);
      await organization.applyOrganizationRepositoryCatalog({
        repositories: [],
      });
      await notifyOrganizationUpdated(c);
    },

    async fullSync(c, input: FullSyncInput) {
      const current = await readMeta(c);
      const counts = await countRows(c);
      const currentSummary = {
        ...current,
        ...counts,
      };
      const matchesCurrentTarget =
        current.connectedAccount === input.connectedAccount &&
        current.installationStatus === input.installationStatus &&
        current.installationId === input.installationId;

      if (!input.force && current.syncStatus === "syncing") {
        return currentSummary;
      }

      if (!input.force && matchesCurrentTarget && current.syncStatus === "synced" && counts.repositoryCount > 0) {
        return currentSummary;
      }

      const runId = randomUUID();
      const runStartedAt = Date.now();
      await writeMeta(c, {
        connectedAccount: input.connectedAccount,
        installationStatus: input.installationStatus,
        installationId: input.installationId,
        syncStatus: "syncing",
        lastSyncLabel: input.label ?? "Queued GitHub sync...",
        syncPhase: "queued",
        syncRunStartedAt: runStartedAt,
        syncRepositoriesTotal: null,
        syncRepositoriesCompleted: 0,
        syncPullRequestRepositoriesCompleted: 0,
      });
      await notifyAppUpdated(c);

      const self = selfGithubState(c);
      await self.send(
        githubWorkflowQueueName("github.command.full_sync"),
        {
          ...input,
          runId,
          runStartedAt,
        } satisfies FullSyncCommand,
        {
          wait: false,
        },
      );

      return await self.getSummary();
    },

    async handlePullRequestWebhook(c, input: PullRequestWebhookInput): Promise<void> {
      await upsertPullRequest(c, input);
      await writeMeta(c, {
        connectedAccount: input.connectedAccount,
        installationStatus: input.installationStatus,
        installationId: input.installationId,
        syncStatus: "synced",
        lastSyncLabel: `Updated PR #${input.pullRequest.number}`,
        lastSyncAt: Date.now(),
        syncPhase: null,
        syncRunStartedAt: null,
      });

      const repository = await getOrCreateRepository(c, c.state.organizationId, repoIdFromRemote(input.repository.cloneUrl), input.repository.cloneUrl);
      await repository.applyGithubPullRequestState({
        branchName: input.pullRequest.headRefName,
        state: input.pullRequest.state,
      });
      await notifyOrganizationUpdated(c);
    },

    async createPullRequest(
      c,
      input: {
        repoId: string;
        repoPath: string;
        branchName: string;
        title: string;
        body?: string | null;
      },
    ): Promise<{ number: number; url: string }> {
      const { driver } = getActorRuntimeContext();
      const auth = await resolveWorkspaceGithubAuth(c, c.state.organizationId);
      const repository = await c.db.select().from(githubRepositories).where(eq(githubRepositories.repoId, input.repoId)).get();
      const baseRef = await driver.git.remoteDefaultBaseRef(input.repoPath).catch(() => "origin/main");
      const baseRefName = baseRef.replace(/^origin\//, "");
      const now = Date.now();
      let created: { number: number; url: string };

      try {
        created = await driver.github.createPr(input.repoPath, input.branchName, input.title, input.body ?? undefined, {
          githubToken: auth?.githubToken ?? null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/already exists/i.test(message)) {
          throw error;
        }

        const existing = await driver.github.getPrInfo(input.repoPath, input.branchName, {
          githubToken: auth?.githubToken ?? null,
        });
        if (!existing?.number || !existing.url) {
          throw error;
        }

        created = {
          number: existing.number,
          url: existing.url,
        };

        if (repository) {
          await upsertPullRequestSnapshot(c, {
            repoId: input.repoId,
            repoFullName: repository.fullName,
            number: existing.number,
            title: existing.title || input.title,
            body: input.body ?? null,
            state: existing.state,
            url: existing.url,
            headRefName: existing.headRefName || input.branchName,
            baseRefName,
            authorLogin: existing.author || null,
            isDraft: existing.isDraft,
          });
        }

        await writeMeta(c, {
          syncStatus: "synced",
          lastSyncLabel: `Linked existing PR #${existing.number}`,
          lastSyncAt: now,
          syncPhase: null,
          syncRunStartedAt: null,
        });
        await notifyOrganizationUpdated(c);

        return created;
      }

      if (repository) {
        await upsertPullRequestSnapshot(c, {
          repoId: input.repoId,
          repoFullName: repository.fullName,
          number: created.number,
          title: input.title,
          body: input.body ?? null,
          state: "OPEN",
          url: created.url,
          headRefName: input.branchName,
          baseRefName,
          authorLogin: null,
          isDraft: false,
        });
      }

      await writeMeta(c, {
        syncStatus: "synced",
        lastSyncLabel: `Created PR #${created.number}`,
        lastSyncAt: now,
        syncPhase: null,
        syncRunStartedAt: null,
      });
      await notifyOrganizationUpdated(c);

      return created;
    },

    async starRepository(c, input: { repoFullName: string }): Promise<void> {
      const { driver } = getActorRuntimeContext();
      const auth = await resolveWorkspaceGithubAuth(c, c.state.organizationId);
      await driver.github.starRepository(input.repoFullName, {
        githubToken: auth?.githubToken ?? null,
      });
    },
  },
  run: workflow(runGithubStateWorkflow),
});
