// @ts-nocheck
import { eq } from "drizzle-orm";
import { actor } from "rivetkit";
import type { FoundryGithubInstallationStatus, FoundryGithubSyncStatus } from "@sandbox-agent/foundry-shared";
import { repoIdFromRemote } from "../../services/repo.js";
import { resolveWorkspaceGithubAuth } from "../../services/github-auth.js";
import { getActorRuntimeContext } from "../context.js";
import { getOrCreateOrganization, getOrCreateRepository, selfGithubState } from "../handles.js";
import { githubStateDb } from "./db/db.js";
import { githubMembers, githubMeta, githubPullRequests, githubRepositories } from "./db/schema.js";

const META_ROW_ID = 1;

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

interface FullSyncSnapshot {
  repositories: Array<{ fullName: string; cloneUrl: string; private: boolean }>;
  members: SyncMemberSeed[];
  loadPullRequests: () => Promise<
    Array<{
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
    }>
  >;
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
        updatedAt: Date.now(),
      },
    })
    .run();
  return next;
}

async function replaceRepositories(c: any, repositories: Array<{ fullName: string; cloneUrl: string; private: boolean }>): Promise<void> {
  await c.db.delete(githubRepositories).run();
  const now = Date.now();
  for (const repository of repositories) {
    await c.db
      .insert(githubRepositories)
      .values({
        repoId: repoIdFromRemote(repository.cloneUrl),
        fullName: repository.fullName,
        cloneUrl: repository.cloneUrl,
        private: repository.private ? 1 : 0,
        updatedAt: now,
      })
      .run();
  }
}

async function replaceMembers(c: any, members: SyncMemberSeed[]): Promise<void> {
  await c.db.delete(githubMembers).run();
  const now = Date.now();
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
        updatedAt: now,
      })
      .run();
  }
}

async function replacePullRequests(
  c: any,
  pullRequests: Array<{
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
  }>,
): Promise<void> {
  await c.db.delete(githubPullRequests).run();
  const now = Date.now();
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
        updatedAt: now,
      })
      .run();
  }
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

function repoBelongsToAccount(fullName: string, accountLogin: string): boolean {
  const owner = fullName.split("/")[0]?.trim().toLowerCase() ?? "";
  return owner.length > 0 && owner === accountLogin.trim().toLowerCase();
}

export const githubState = actor({
  db: githubStateDb,
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
      });
      const organization = await getOrCreateOrganization(c, c.state.organizationId);
      await organization.applyOrganizationRepositoryCatalog({
        repositories: [],
      });
    },

    async fullSync(c, input: FullSyncInput) {
      const { appShell } = getActorRuntimeContext();
      const organization = await getOrCreateOrganization(c, c.state.organizationId);

      await writeMeta(c, {
        connectedAccount: input.connectedAccount,
        installationStatus: input.installationStatus,
        installationId: input.installationId,
        syncStatus: "syncing",
        lastSyncLabel: input.label ?? "Syncing GitHub data...",
      });

      try {
        const syncFromUserToken = async (): Promise<FullSyncSnapshot> => {
          const rawRepositories = input.accessToken ? await appShell.github.listUserRepositories(input.accessToken) : [];
          const repositories =
            input.kind === "organization"
              ? rawRepositories.filter((repository) => repoBelongsToAccount(repository.fullName, input.githubLogin))
              : rawRepositories;
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
            loadPullRequests: async () => (input.accessToken ? await appShell.github.listPullRequestsForUserRepositories(input.accessToken, repositories) : []),
          };
        };

        const { repositories, members, loadPullRequests } =
          input.installationId != null
            ? await (async (): Promise<FullSyncSnapshot> => {
                try {
                  const repositories = await appShell.github.listInstallationRepositories(input.installationId!);
                  const members =
                    input.kind === "organization"
                      ? await appShell.github.listInstallationMembers(input.installationId!, input.githubLogin)
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
                    loadPullRequests: async () => await appShell.github.listInstallationPullRequests(input.installationId!),
                  };
                } catch (error) {
                  if (!input.accessToken) {
                    throw error;
                  }
                  return await syncFromUserToken();
                }
              })()
            : await syncFromUserToken();

        await replaceRepositories(c, repositories);
        await organization.applyOrganizationRepositoryCatalog({
          repositories,
        });
        await replaceMembers(c, members);
        const pullRequests = await loadPullRequests();
        await replacePullRequests(c, pullRequests);

        const lastSyncLabel = repositories.length > 0 ? `Synced ${repositories.length} repositories` : "No repositories available";
        await writeMeta(c, {
          connectedAccount: input.connectedAccount,
          installationStatus: input.installationStatus,
          installationId: input.installationId,
          syncStatus: "synced",
          lastSyncLabel,
          lastSyncAt: Date.now(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "GitHub sync failed";
        const installationStatus = error instanceof Error && /403|404|401/.test(error.message) ? "reconnect_required" : input.installationStatus;
        await writeMeta(c, {
          connectedAccount: input.connectedAccount,
          installationStatus,
          installationId: input.installationId,
          syncStatus: "error",
          lastSyncLabel: message,
        });
        throw error;
      }

      return await selfGithubState(c).getSummary();
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
      });

      const repository = await getOrCreateRepository(c, c.state.organizationId, repoIdFromRemote(input.repository.cloneUrl), input.repository.cloneUrl);
      await repository.applyGithubPullRequestState({
        branchName: input.pullRequest.headRefName,
        state: input.pullRequest.state,
      });
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
        });

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
      });

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
});
