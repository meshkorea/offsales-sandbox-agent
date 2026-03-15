// @ts-nocheck
import { eq } from "drizzle-orm";
import { actor, queue } from "rivetkit";
import { workflow } from "rivetkit/workflow";
import type { FoundryOrganization } from "@sandbox-agent/foundry-shared";
import { getActorRuntimeContext } from "../context.js";
import { getOrCreateOrganization, getOrCreateRepository, getTask } from "../handles.js";
import { repoIdFromRemote } from "../../services/repo.js";
import { resolveOrganizationGithubAuth } from "../../services/github-auth.js";
import { expectQueueResponse } from "../../services/queue.js";
import { organizationWorkflowQueueName } from "../organization/queues.js";
import { repositoryWorkflowQueueName } from "../repository/workflow.js";
import { taskWorkflowQueueName } from "../task/workflow/index.js";
import { githubDataDb } from "./db/db.js";
import { githubBranches, githubMembers, githubMeta, githubPullRequests, githubRepositories } from "./db/schema.js";
import { GITHUB_DATA_QUEUE_NAMES, runGithubDataWorkflow } from "./workflow.js";

const META_ROW_ID = 1;
const SYNC_REPOSITORY_BATCH_SIZE = 10;

type GithubSyncPhase =
  | "discovering_repositories"
  | "syncing_repositories"
  | "syncing_branches"
  | "syncing_members"
  | "syncing_pull_requests";

interface GithubDataInput {
  organizationId: string;
}

interface GithubMemberRecord {
  id: string;
  login: string;
  name: string;
  email?: string | null;
  role?: string | null;
  state?: string | null;
}

interface GithubRepositoryRecord {
  fullName: string;
  cloneUrl: string;
  private: boolean;
  defaultBranch: string;
}

interface GithubBranchRecord {
  repoId: string;
  branchName: string;
  commitSha: string;
}

interface GithubPullRequestRecord {
  repoId: string;
  repoFullName: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  url: string;
  headRefName: string;
  baseRefName: string;
  authorLogin: string | null;
  isDraft: boolean;
  updatedAt: number;
}

interface FullSyncInput {
  connectedAccount?: string | null;
  installationStatus?: FoundryOrganization["github"]["installationStatus"];
  installationId?: number | null;
  githubLogin?: string | null;
  kind?: FoundryOrganization["kind"] | null;
  accessToken?: string | null;
  label?: string | null;
}

interface ClearStateInput {
  connectedAccount: string;
  installationStatus: FoundryOrganization["github"]["installationStatus"];
  installationId: number | null;
  label: string;
}

async function sendOrganizationCommand(organization: any, name: Parameters<typeof organizationWorkflowQueueName>[0], body: unknown): Promise<void> {
  await expectQueueResponse<{ ok: true }>(
    await organization.send(organizationWorkflowQueueName(name), body, { wait: true, timeout: 60_000 }),
  );
}

interface PullRequestWebhookInput {
  connectedAccount: string;
  installationStatus: FoundryOrganization["github"]["installationStatus"];
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

interface GithubMetaState {
  connectedAccount: string;
  installationStatus: FoundryOrganization["github"]["installationStatus"];
  syncStatus: FoundryOrganization["github"]["syncStatus"];
  installationId: number | null;
  lastSyncLabel: string;
  lastSyncAt: number | null;
  syncGeneration: number;
  syncPhase: GithubSyncPhase | null;
  processedRepositoryCount: number;
  totalRepositoryCount: number;
}

function normalizePrStatus(input: { state: string; isDraft?: boolean; merged?: boolean }): "OPEN" | "DRAFT" | "CLOSED" | "MERGED" {
  const state = input.state.trim().toUpperCase();
  if (input.merged || state === "MERGED") return "MERGED";
  if (state === "CLOSED") return "CLOSED";
  return input.isDraft ? "DRAFT" : "OPEN";
}

function pullRequestSummaryFromRow(row: any) {
  return {
    prId: row.prId,
    repoId: row.repoId,
    repoFullName: row.repoFullName,
    number: row.number,
    status: Boolean(row.isDraft) ? "draft" : "ready",
    title: row.title,
    state: row.state,
    url: row.url,
    headRefName: row.headRefName,
    baseRefName: row.baseRefName,
    authorLogin: row.authorLogin ?? null,
    isDraft: Boolean(row.isDraft),
    updatedAtMs: row.updatedAt,
  };
}

function chunkItems<T>(items: T[], size: number): T[][] {
  if (items.length === 0) {
    return [];
  }
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function readMeta(c: any): Promise<GithubMetaState> {
  const row = await c.db.select().from(githubMeta).where(eq(githubMeta.id, META_ROW_ID)).get();
  return {
    connectedAccount: row?.connectedAccount ?? "",
    installationStatus: (row?.installationStatus ?? "install_required") as FoundryOrganization["github"]["installationStatus"],
    syncStatus: (row?.syncStatus ?? "pending") as FoundryOrganization["github"]["syncStatus"],
    installationId: row?.installationId ?? null,
    lastSyncLabel: row?.lastSyncLabel ?? "Waiting for first import",
    lastSyncAt: row?.lastSyncAt ?? null,
    syncGeneration: row?.syncGeneration ?? 0,
    syncPhase: (row?.syncPhase ?? null) as GithubSyncPhase | null,
    processedRepositoryCount: row?.processedRepositoryCount ?? 0,
    totalRepositoryCount: row?.totalRepositoryCount ?? 0,
  };
}

async function writeMeta(c: any, patch: Partial<GithubMetaState>) {
  const current = await readMeta(c);
  const next = {
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
      syncGeneration: next.syncGeneration,
      syncPhase: next.syncPhase,
      processedRepositoryCount: next.processedRepositoryCount,
      totalRepositoryCount: next.totalRepositoryCount,
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
        syncGeneration: next.syncGeneration,
        syncPhase: next.syncPhase,
        processedRepositoryCount: next.processedRepositoryCount,
        totalRepositoryCount: next.totalRepositoryCount,
        updatedAt: Date.now(),
      },
    })
    .run();
  return next;
}

async function publishSyncProgress(c: any, patch: Partial<GithubMetaState>): Promise<GithubMetaState> {
  const meta = await writeMeta(c, patch);
  const organization = await getOrCreateOrganization(c, c.state.organizationId);
  await sendOrganizationCommand(organization, "organization.command.github.sync_progress.apply", {
    connectedAccount: meta.connectedAccount,
    installationStatus: meta.installationStatus,
    installationId: meta.installationId,
    syncStatus: meta.syncStatus,
    lastSyncLabel: meta.lastSyncLabel,
    lastSyncAt: meta.lastSyncAt,
    syncGeneration: meta.syncGeneration,
    syncPhase: meta.syncPhase,
    processedRepositoryCount: meta.processedRepositoryCount,
    totalRepositoryCount: meta.totalRepositoryCount,
  });
  return meta;
}

async function runSyncStep<T>(c: any, name: string, run: () => Promise<T>): Promise<T> {
  if (typeof c.step !== "function") {
    return await run();
  }
  return await c.step({
    name,
    timeout: 90_000,
    run,
  });
}

async function getOrganizationContext(c: any, overrides?: FullSyncInput) {
  const organizationHandle = await getOrCreateOrganization(c, c.state.organizationId);
  const organizationState = await organizationHandle.getOrganizationShellStateIfInitialized({});
  if (!organizationState) {
    throw new Error(`Organization ${c.state.organizationId} is not initialized`);
  }
  const auth = await resolveOrganizationGithubAuth(c, c.state.organizationId);
  return {
    kind: overrides?.kind ?? organizationState.snapshot.kind,
    githubLogin: overrides?.githubLogin ?? organizationState.githubLogin,
    connectedAccount: overrides?.connectedAccount ?? organizationState.snapshot.github.connectedAccount ?? organizationState.githubLogin,
    installationId: overrides?.installationId ?? organizationState.githubInstallationId ?? null,
    installationStatus:
      overrides?.installationStatus ??
      organizationState.snapshot.github.installationStatus ??
      (organizationState.snapshot.kind === "personal" ? "connected" : "reconnect_required"),
    accessToken: overrides?.accessToken ?? auth?.githubToken ?? null,
  };
}

async function upsertRepositories(c: any, repositories: GithubRepositoryRecord[], updatedAt: number, syncGeneration: number) {
  for (const repository of repositories) {
    await c.db
      .insert(githubRepositories)
      .values({
        repoId: repoIdFromRemote(repository.cloneUrl),
        fullName: repository.fullName,
        cloneUrl: repository.cloneUrl,
        private: repository.private ? 1 : 0,
        defaultBranch: repository.defaultBranch,
        syncGeneration,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: githubRepositories.repoId,
        set: {
          fullName: repository.fullName,
          cloneUrl: repository.cloneUrl,
          private: repository.private ? 1 : 0,
          defaultBranch: repository.defaultBranch,
          syncGeneration,
          updatedAt,
        },
      })
      .run();
  }
}

async function sweepRepositories(c: any, syncGeneration: number) {
  const rows = await c.db.select({ repoId: githubRepositories.repoId, syncGeneration: githubRepositories.syncGeneration }).from(githubRepositories).all();
  for (const row of rows) {
    if (row.syncGeneration === syncGeneration) {
      continue;
    }
    await c.db.delete(githubRepositories).where(eq(githubRepositories.repoId, row.repoId)).run();
  }
}

async function upsertBranches(c: any, branches: GithubBranchRecord[], updatedAt: number, syncGeneration: number) {
  for (const branch of branches) {
    await c.db
      .insert(githubBranches)
      .values({
        branchId: `${branch.repoId}:${branch.branchName}`,
        repoId: branch.repoId,
        branchName: branch.branchName,
        commitSha: branch.commitSha,
        syncGeneration,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: githubBranches.branchId,
        set: {
          repoId: branch.repoId,
          branchName: branch.branchName,
          commitSha: branch.commitSha,
          syncGeneration,
          updatedAt,
        },
      })
      .run();
  }
}

async function sweepBranches(c: any, syncGeneration: number) {
  const rows = await c.db.select({ branchId: githubBranches.branchId, syncGeneration: githubBranches.syncGeneration }).from(githubBranches).all();
  for (const row of rows) {
    if (row.syncGeneration === syncGeneration) {
      continue;
    }
    await c.db.delete(githubBranches).where(eq(githubBranches.branchId, row.branchId)).run();
  }
}

async function upsertMembers(c: any, members: GithubMemberRecord[], updatedAt: number, syncGeneration: number) {
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
        syncGeneration,
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
          syncGeneration,
          updatedAt,
        },
      })
      .run();
  }
}

async function sweepMembers(c: any, syncGeneration: number) {
  const rows = await c.db.select({ memberId: githubMembers.memberId, syncGeneration: githubMembers.syncGeneration }).from(githubMembers).all();
  for (const row of rows) {
    if (row.syncGeneration === syncGeneration) {
      continue;
    }
    await c.db.delete(githubMembers).where(eq(githubMembers.memberId, row.memberId)).run();
  }
}

async function upsertPullRequests(c: any, pullRequests: GithubPullRequestRecord[], syncGeneration: number) {
  for (const pullRequest of pullRequests) {
    await c.db
      .insert(githubPullRequests)
      .values({
        prId: `${pullRequest.repoId}#${pullRequest.number}`,
        repoId: pullRequest.repoId,
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
        syncGeneration,
        updatedAt: pullRequest.updatedAt,
      })
      .onConflictDoUpdate({
        target: githubPullRequests.prId,
        set: {
          repoId: pullRequest.repoId,
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
          syncGeneration,
          updatedAt: pullRequest.updatedAt,
        },
      })
      .run();
  }
}

async function sweepPullRequests(c: any, syncGeneration: number) {
  const rows = await c.db.select({ prId: githubPullRequests.prId, syncGeneration: githubPullRequests.syncGeneration }).from(githubPullRequests).all();
  for (const row of rows) {
    if (row.syncGeneration === syncGeneration) {
      continue;
    }
    await c.db.delete(githubPullRequests).where(eq(githubPullRequests.prId, row.prId)).run();
  }
}

async function refreshTaskSummaryForBranch(c: any, repoId: string, branchName: string, pullRequest: ReturnType<typeof pullRequestSummaryFromRow> | null) {
  const repositoryRecord = await c.db.select().from(githubRepositories).where(eq(githubRepositories.repoId, repoId)).get();
  if (!repositoryRecord) {
    return;
  }
  const repository = await getOrCreateRepository(c, c.state.organizationId, repoId);
  await expectQueueResponse<{ ok: true }>(
    await repository.send(
      repositoryWorkflowQueueName("repository.command.refreshTaskSummaryForBranch"),
      { branchName, pullRequest },
      { wait: true, timeout: 10_000 },
    ),
  );
}

async function emitPullRequestChangeEvents(c: any, beforeRows: any[], afterRows: any[]) {
  const beforeById = new Map(beforeRows.map((row) => [row.prId, row]));
  const afterById = new Map(afterRows.map((row) => [row.prId, row]));

  for (const [prId, row] of afterById) {
    const previous = beforeById.get(prId);
    const changed =
      !previous ||
      previous.title !== row.title ||
      previous.state !== row.state ||
      previous.url !== row.url ||
      previous.headRefName !== row.headRefName ||
      previous.baseRefName !== row.baseRefName ||
      previous.authorLogin !== row.authorLogin ||
      previous.isDraft !== row.isDraft ||
      previous.updatedAt !== row.updatedAt;
    if (!changed) {
      continue;
    }
    await refreshTaskSummaryForBranch(c, row.repoId, row.headRefName, pullRequestSummaryFromRow(row));
  }

  for (const [prId, row] of beforeById) {
    if (afterById.has(prId)) {
      continue;
    }
    await refreshTaskSummaryForBranch(c, row.repoId, row.headRefName, null);
  }
}

async function autoArchiveTaskForClosedPullRequest(c: any, row: any) {
  const repositoryRecord = await c.db.select().from(githubRepositories).where(eq(githubRepositories.repoId, row.repoId)).get();
  if (!repositoryRecord) {
    return;
  }
  const repository = await getOrCreateRepository(c, c.state.organizationId, row.repoId);
  const match = await repository.findTaskForBranch({
    branchName: row.headRefName,
  });
  if (!match?.taskId) {
    return;
  }
  try {
    const task = getTask(c, c.state.organizationId, row.repoId, match.taskId);
    await task.send(taskWorkflowQueueName("task.command.archive"), { reason: `PR ${String(row.state).toLowerCase()}` }, { wait: false });
  } catch {
    // Best-effort only. Task summary refresh will still clear the PR state.
  }
}

async function resolveRepositories(c: any, context: Awaited<ReturnType<typeof getOrganizationContext>>): Promise<GithubRepositoryRecord[]> {
  const { appShell } = getActorRuntimeContext();
  if (context.kind === "personal") {
    if (!context.accessToken) {
      return [];
    }
    return await appShell.github.listUserRepositories(context.accessToken);
  }

  if (context.installationId != null) {
    try {
      return await appShell.github.listInstallationRepositories(context.installationId);
    } catch (error) {
      if (!context.accessToken) {
        throw error;
      }
    }
  }

  if (!context.accessToken) {
    return [];
  }

  return (await appShell.github.listUserRepositories(context.accessToken)).filter((repository) => repository.fullName.startsWith(`${context.githubLogin}/`));
}

async function resolveMembers(c: any, context: Awaited<ReturnType<typeof getOrganizationContext>>): Promise<GithubMemberRecord[]> {
  const { appShell } = getActorRuntimeContext();
  if (context.kind === "personal") {
    return [];
  }
  if (context.installationId != null) {
    try {
      return await appShell.github.listInstallationMembers(context.installationId, context.githubLogin);
    } catch (error) {
      if (!context.accessToken) {
        throw error;
      }
    }
  }
  if (!context.accessToken) {
    return [];
  }
  return await appShell.github.listOrganizationMembers(context.accessToken, context.githubLogin);
}

async function listPullRequestsForRepositories(
  context: Awaited<ReturnType<typeof getOrganizationContext>>,
  repositories: GithubRepositoryRecord[],
): Promise<GithubPullRequestRecord[]> {
  const { appShell } = getActorRuntimeContext();
  if (repositories.length === 0) {
    return [];
  }

  let pullRequests: Array<{
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
    merged?: boolean;
  }> = [];

  if (context.installationId != null) {
    try {
      pullRequests = await appShell.github.listInstallationPullRequestsForRepositories(context.installationId, repositories);
    } catch (error) {
      if (!context.accessToken) {
        throw error;
      }
    }
  }

  if (pullRequests.length === 0 && context.accessToken) {
    pullRequests = await appShell.github.listPullRequestsForUserRepositories(context.accessToken, repositories);
  }

  return pullRequests.map((pullRequest) => ({
    repoId: repoIdFromRemote(pullRequest.cloneUrl),
    repoFullName: pullRequest.repoFullName,
    number: pullRequest.number,
    title: pullRequest.title,
    body: pullRequest.body ?? null,
    state: normalizePrStatus(pullRequest),
    url: pullRequest.url,
    headRefName: pullRequest.headRefName,
    baseRefName: pullRequest.baseRefName,
    authorLogin: pullRequest.authorLogin ?? null,
    isDraft: Boolean(pullRequest.isDraft),
    updatedAt: Date.now(),
  }));
}

async function listRepositoryBranchesForContext(
  context: Awaited<ReturnType<typeof getOrganizationContext>>,
  repository: GithubRepositoryRecord,
): Promise<GithubBranchRecord[]> {
  const { appShell } = getActorRuntimeContext();
  let branches: Array<{ name: string; commitSha: string }> = [];

  if (context.installationId != null) {
    try {
      branches = await appShell.github.listInstallationRepositoryBranches(context.installationId, repository.fullName);
    } catch (error) {
      if (!context.accessToken) {
        throw error;
      }
    }
  }

  if (branches.length === 0 && context.accessToken) {
    branches = await appShell.github.listUserRepositoryBranches(context.accessToken, repository.fullName);
  }

  const repoId = repoIdFromRemote(repository.cloneUrl);
  return branches.map((branch) => ({
    repoId,
    branchName: branch.name,
    commitSha: branch.commitSha,
  }));
}

async function resolveBranches(
  c: any,
  context: Awaited<ReturnType<typeof getOrganizationContext>>,
  repositories: GithubRepositoryRecord[],
  onBatch?: (branches: GithubBranchRecord[]) => Promise<void>,
  onProgress?: (processedRepositoryCount: number, totalRepositoryCount: number) => Promise<void>,
): Promise<void> {
  const batches = chunkItems(repositories, SYNC_REPOSITORY_BATCH_SIZE);
  let processedRepositoryCount = 0;

  for (const batch of batches) {
    const batchBranches = await runSyncStep(c, `github-sync-branches-${processedRepositoryCount / SYNC_REPOSITORY_BATCH_SIZE + 1}`, async () =>
      (await Promise.all(batch.map((repository) => listRepositoryBranchesForContext(context, repository)))).flat(),
    );
    if (onBatch) {
      await onBatch(batchBranches);
    }
    processedRepositoryCount += batch.length;
    if (onProgress) {
      await onProgress(processedRepositoryCount, repositories.length);
    }
  }
}

async function resolvePullRequests(
  c: any,
  context: Awaited<ReturnType<typeof getOrganizationContext>>,
  repositories: GithubRepositoryRecord[],
  onBatch?: (pullRequests: GithubPullRequestRecord[]) => Promise<void>,
  onProgress?: (processedRepositoryCount: number, totalRepositoryCount: number) => Promise<void>,
): Promise<void> {
  const batches = chunkItems(repositories, SYNC_REPOSITORY_BATCH_SIZE);
  let processedRepositoryCount = 0;

  for (const batch of batches) {
    const batchPullRequests = await runSyncStep(c, `github-sync-pull-requests-${processedRepositoryCount / SYNC_REPOSITORY_BATCH_SIZE + 1}`, async () =>
      listPullRequestsForRepositories(context, batch),
    );
    if (onBatch) {
      await onBatch(batchPullRequests);
    }
    processedRepositoryCount += batch.length;
    if (onProgress) {
      await onProgress(processedRepositoryCount, repositories.length);
    }
  }
}

async function refreshRepositoryBranches(
  c: any,
  context: Awaited<ReturnType<typeof getOrganizationContext>>,
  repository: GithubRepositoryRecord,
  updatedAt: number,
): Promise<void> {
  const currentMeta = await readMeta(c);
  const nextBranches = await listRepositoryBranchesForContext(context, repository);
  await c.db
    .delete(githubBranches)
    .where(eq(githubBranches.repoId, repoIdFromRemote(repository.cloneUrl)))
    .run();

  for (const branch of nextBranches) {
    await c.db
      .insert(githubBranches)
      .values({
        branchId: `${branch.repoId}:${branch.branchName}`,
        repoId: branch.repoId,
        branchName: branch.branchName,
        commitSha: branch.commitSha,
        syncGeneration: currentMeta.syncGeneration,
        updatedAt,
      })
      .run();
  }
}

async function readAllPullRequestRows(c: any) {
  return await c.db.select().from(githubPullRequests).all();
}

export async function runFullSync(c: any, input: FullSyncInput = {}) {
  const startedAt = Date.now();
  const beforeRows = await readAllPullRequestRows(c);
  const currentMeta = await readMeta(c);
  let context: Awaited<ReturnType<typeof getOrganizationContext>> | null = null;
  let syncGeneration = currentMeta.syncGeneration + 1;

  try {
    context = await getOrganizationContext(c, input);
    syncGeneration = currentMeta.syncGeneration + 1;

    await publishSyncProgress(c, {
      connectedAccount: context.connectedAccount,
      installationStatus: context.installationStatus,
      installationId: context.installationId,
      syncStatus: "syncing",
      lastSyncLabel: input.label?.trim() || "Syncing GitHub data...",
      syncGeneration,
      syncPhase: "discovering_repositories",
      processedRepositoryCount: 0,
      totalRepositoryCount: 0,
    });

    const repositories = await runSyncStep(c, "github-sync-repositories", async () => resolveRepositories(c, context));
    const totalRepositoryCount = repositories.length;

    await publishSyncProgress(c, {
      connectedAccount: context.connectedAccount,
      installationStatus: context.installationStatus,
      installationId: context.installationId,
      syncStatus: "syncing",
      lastSyncLabel: totalRepositoryCount > 0 ? `Importing ${totalRepositoryCount} repositories...` : "No repositories available",
      syncGeneration,
      syncPhase: "syncing_repositories",
      processedRepositoryCount: totalRepositoryCount,
      totalRepositoryCount,
    });

    await upsertRepositories(c, repositories, startedAt, syncGeneration);

    const organization = await getOrCreateOrganization(c, c.state.organizationId);
    await sendOrganizationCommand(organization, "organization.command.github.data_projection.apply", {
      connectedAccount: context.connectedAccount,
      installationStatus: context.installationStatus,
      installationId: context.installationId,
      syncStatus: "syncing",
      lastSyncLabel: totalRepositoryCount > 0 ? `Imported ${totalRepositoryCount} repositories` : "No repositories available",
      lastSyncAt: currentMeta.lastSyncAt,
      syncGeneration,
      syncPhase: totalRepositoryCount > 0 ? "syncing_branches" : null,
      processedRepositoryCount: 0,
      totalRepositoryCount,
      repositories,
    });

    await resolveBranches(
      c,
      context,
      repositories,
      async (batchBranches) => {
        await upsertBranches(c, batchBranches, startedAt, syncGeneration);
      },
      async (processedRepositoryCount, repositoryCount) => {
        await publishSyncProgress(c, {
          connectedAccount: context.connectedAccount,
          installationStatus: context.installationStatus,
          installationId: context.installationId,
          syncStatus: "syncing",
          lastSyncLabel: `Synced branches for ${processedRepositoryCount} of ${repositoryCount} repositories`,
          syncGeneration,
          syncPhase: "syncing_branches",
          processedRepositoryCount,
          totalRepositoryCount: repositoryCount,
        });
      },
    );

    await publishSyncProgress(c, {
      connectedAccount: context.connectedAccount,
      installationStatus: context.installationStatus,
      installationId: context.installationId,
      syncStatus: "syncing",
      lastSyncLabel: "Syncing GitHub members...",
      syncGeneration,
      syncPhase: "syncing_members",
      processedRepositoryCount: totalRepositoryCount,
      totalRepositoryCount,
    });

    const members = await runSyncStep(c, "github-sync-members", async () => resolveMembers(c, context));
    await upsertMembers(c, members, startedAt, syncGeneration);
    await sweepMembers(c, syncGeneration);

    await resolvePullRequests(
      c,
      context,
      repositories,
      async (batchPullRequests) => {
        await upsertPullRequests(c, batchPullRequests, syncGeneration);
      },
      async (processedRepositoryCount, repositoryCount) => {
        await publishSyncProgress(c, {
          connectedAccount: context.connectedAccount,
          installationStatus: context.installationStatus,
          installationId: context.installationId,
          syncStatus: "syncing",
          lastSyncLabel: `Synced pull requests for ${processedRepositoryCount} of ${repositoryCount} repositories`,
          syncGeneration,
          syncPhase: "syncing_pull_requests",
          processedRepositoryCount,
          totalRepositoryCount: repositoryCount,
        });
      },
    );

    await sweepBranches(c, syncGeneration);
    await sweepPullRequests(c, syncGeneration);
    await sweepRepositories(c, syncGeneration);

    await sendOrganizationCommand(organization, "organization.command.github.data_projection.apply", {
      connectedAccount: context.connectedAccount,
      installationStatus: context.installationStatus,
      installationId: context.installationId,
      syncStatus: "synced",
      lastSyncLabel: totalRepositoryCount > 0 ? `Synced ${totalRepositoryCount} repositories` : "No repositories available",
      lastSyncAt: startedAt,
      syncGeneration,
      syncPhase: null,
      processedRepositoryCount: totalRepositoryCount,
      totalRepositoryCount,
      repositories,
    });

    const meta = await writeMeta(c, {
      connectedAccount: context.connectedAccount,
      installationStatus: context.installationStatus,
      installationId: context.installationId,
      syncStatus: "synced",
      lastSyncLabel: totalRepositoryCount > 0 ? `Synced ${totalRepositoryCount} repositories` : "No repositories available",
      lastSyncAt: startedAt,
      syncGeneration,
      syncPhase: null,
      processedRepositoryCount: totalRepositoryCount,
      totalRepositoryCount,
    });

    const afterRows = await readAllPullRequestRows(c);
    await emitPullRequestChangeEvents(c, beforeRows, afterRows);

    return {
      ...meta,
      repositoryCount: repositories.length,
      memberCount: members.length,
      pullRequestCount: afterRows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub import failed";
    await publishSyncProgress(c, {
      connectedAccount: context?.connectedAccount ?? currentMeta.connectedAccount,
      installationStatus: context?.installationStatus ?? currentMeta.installationStatus,
      installationId: context?.installationId ?? currentMeta.installationId,
      syncStatus: "error",
      lastSyncLabel: message,
      syncGeneration,
      syncPhase: null,
      processedRepositoryCount: 0,
      totalRepositoryCount: 0,
    });
    throw error;
  }
}

export const githubData = actor({
  db: githubDataDb,
  queues: Object.fromEntries(GITHUB_DATA_QUEUE_NAMES.map((name) => [name, queue()])),
  options: {
    name: "GitHub Data",
    icon: "github",
    actionTimeout: 5 * 60_000,
  },
  createState: (_c, input: GithubDataInput) => ({
    organizationId: input.organizationId,
  }),
  run: workflow(runGithubDataWorkflow),
  actions: {
    async getSummary(c) {
      const repositories = await c.db.select().from(githubRepositories).all();
      const branches = await c.db.select().from(githubBranches).all();
      const members = await c.db.select().from(githubMembers).all();
      const pullRequests = await c.db.select().from(githubPullRequests).all();
      return {
        ...(await readMeta(c)),
        repositoryCount: repositories.length,
        branchCount: branches.length,
        memberCount: members.length,
        pullRequestCount: pullRequests.length,
      };
    },

    async listRepositories(c) {
      const rows = await c.db.select().from(githubRepositories).all();
      return rows.map((row) => ({
        repoId: row.repoId,
        fullName: row.fullName,
        cloneUrl: row.cloneUrl,
        private: Boolean(row.private),
        defaultBranch: row.defaultBranch,
      }));
    },

    async getRepository(c, input: { repoId: string }) {
      const row = await c.db.select().from(githubRepositories).where(eq(githubRepositories.repoId, input.repoId)).get();
      if (!row) {
        return null;
      }
      return {
        repoId: row.repoId,
        fullName: row.fullName,
        cloneUrl: row.cloneUrl,
        private: Boolean(row.private),
        defaultBranch: row.defaultBranch,
      };
    },

    async listBranchesForRepository(c, input: { repoId: string }) {
      const rows = await c.db.select().from(githubBranches).where(eq(githubBranches.repoId, input.repoId)).all();
      return rows
        .map((row) => ({
          branchName: row.branchName,
          commitSha: row.commitSha,
        }))
        .sort((left, right) => left.branchName.localeCompare(right.branchName));
    },

  },
});

export async function reloadRepositoryMutation(c: any, input: { repoId: string }) {
      const context = await getOrganizationContext(c);
      const current = await c.db.select().from(githubRepositories).where(eq(githubRepositories.repoId, input.repoId)).get();
      if (!current) {
        throw new Error(`Unknown GitHub repository: ${input.repoId}`);
      }
      const { appShell } = getActorRuntimeContext();
      const repository =
        context.installationId != null
          ? await appShell.github.getInstallationRepository(context.installationId, current.fullName)
          : context.accessToken
            ? await appShell.github.getUserRepository(context.accessToken, current.fullName)
            : null;
      if (!repository) {
        throw new Error(`Unable to reload repository: ${current.fullName}`);
      }

      const updatedAt = Date.now();
      const currentMeta = await readMeta(c);
      await c.db
        .insert(githubRepositories)
        .values({
          repoId: input.repoId,
          fullName: repository.fullName,
          cloneUrl: repository.cloneUrl,
          private: repository.private ? 1 : 0,
          defaultBranch: repository.defaultBranch,
          syncGeneration: currentMeta.syncGeneration,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: githubRepositories.repoId,
          set: {
            fullName: repository.fullName,
            cloneUrl: repository.cloneUrl,
            private: repository.private ? 1 : 0,
            defaultBranch: repository.defaultBranch,
            syncGeneration: currentMeta.syncGeneration,
            updatedAt,
          },
        })
        .run();
      await refreshRepositoryBranches(
        c,
        context,
        {
          fullName: repository.fullName,
          cloneUrl: repository.cloneUrl,
          private: repository.private,
          defaultBranch: repository.defaultBranch,
        },
        updatedAt,
      );

      const organization = await getOrCreateOrganization(c, c.state.organizationId);
      await sendOrganizationCommand(organization, "organization.command.github.repository_projection.apply", {
        repoId: input.repoId,
        remoteUrl: repository.cloneUrl,
      });
      return {
        repoId: input.repoId,
        fullName: repository.fullName,
        cloneUrl: repository.cloneUrl,
        private: repository.private,
        defaultBranch: repository.defaultBranch,
      };
}

export async function clearStateMutation(c: any, input: ClearStateInput) {
      const beforeRows = await readAllPullRequestRows(c);
      const currentMeta = await readMeta(c);
      await c.db.delete(githubPullRequests).run();
      await c.db.delete(githubBranches).run();
      await c.db.delete(githubRepositories).run();
      await c.db.delete(githubMembers).run();
      await writeMeta(c, {
        connectedAccount: input.connectedAccount,
        installationStatus: input.installationStatus,
        installationId: input.installationId,
        syncStatus: "pending",
        lastSyncLabel: input.label,
        lastSyncAt: null,
        syncGeneration: currentMeta.syncGeneration,
        syncPhase: null,
        processedRepositoryCount: 0,
        totalRepositoryCount: 0,
      });

      const organization = await getOrCreateOrganization(c, c.state.organizationId);
      await sendOrganizationCommand(organization, "organization.command.github.data_projection.apply", {
        connectedAccount: input.connectedAccount,
        installationStatus: input.installationStatus,
        installationId: input.installationId,
        syncStatus: "pending",
        lastSyncLabel: input.label,
        lastSyncAt: null,
        syncGeneration: currentMeta.syncGeneration,
        syncPhase: null,
        processedRepositoryCount: 0,
        totalRepositoryCount: 0,
        repositories: [],
      });
      await emitPullRequestChangeEvents(c, beforeRows, []);
}

export async function handlePullRequestWebhookMutation(c: any, input: PullRequestWebhookInput) {
      const beforeRows = await readAllPullRequestRows(c);
      const repoId = repoIdFromRemote(input.repository.cloneUrl);
      const currentRepository = await c.db.select().from(githubRepositories).where(eq(githubRepositories.repoId, repoId)).get();
      const updatedAt = Date.now();
      const currentMeta = await readMeta(c);
      const state = normalizePrStatus(input.pullRequest);
      const prId = `${repoId}#${input.pullRequest.number}`;

      await c.db
        .insert(githubRepositories)
        .values({
          repoId,
          fullName: input.repository.fullName,
          cloneUrl: input.repository.cloneUrl,
          private: input.repository.private ? 1 : 0,
          defaultBranch: currentRepository?.defaultBranch ?? input.pullRequest.baseRefName ?? "main",
          syncGeneration: currentMeta.syncGeneration,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: githubRepositories.repoId,
          set: {
            fullName: input.repository.fullName,
            cloneUrl: input.repository.cloneUrl,
            private: input.repository.private ? 1 : 0,
            defaultBranch: currentRepository?.defaultBranch ?? input.pullRequest.baseRefName ?? "main",
            syncGeneration: currentMeta.syncGeneration,
            updatedAt,
          },
        })
        .run();

      if (state === "CLOSED" || state === "MERGED") {
        await c.db.delete(githubPullRequests).where(eq(githubPullRequests.prId, prId)).run();
      } else {
        await c.db
          .insert(githubPullRequests)
          .values({
            prId,
            repoId,
            repoFullName: input.repository.fullName,
            number: input.pullRequest.number,
            title: input.pullRequest.title,
            body: input.pullRequest.body ?? null,
            state,
            url: input.pullRequest.url,
            headRefName: input.pullRequest.headRefName,
            baseRefName: input.pullRequest.baseRefName,
            authorLogin: input.pullRequest.authorLogin ?? null,
            isDraft: input.pullRequest.isDraft ? 1 : 0,
            syncGeneration: currentMeta.syncGeneration,
            updatedAt,
          })
          .onConflictDoUpdate({
            target: githubPullRequests.prId,
            set: {
              title: input.pullRequest.title,
              body: input.pullRequest.body ?? null,
              state,
              url: input.pullRequest.url,
              headRefName: input.pullRequest.headRefName,
              baseRefName: input.pullRequest.baseRefName,
              authorLogin: input.pullRequest.authorLogin ?? null,
              isDraft: input.pullRequest.isDraft ? 1 : 0,
              syncGeneration: currentMeta.syncGeneration,
              updatedAt,
            },
          })
          .run();
      }

      await publishSyncProgress(c, {
        connectedAccount: input.connectedAccount,
        installationStatus: input.installationStatus,
        installationId: input.installationId,
        syncStatus: "synced",
        lastSyncLabel: "GitHub webhook received",
        lastSyncAt: updatedAt,
        syncPhase: null,
        processedRepositoryCount: 0,
        totalRepositoryCount: 0,
      });

      const organization = await getOrCreateOrganization(c, c.state.organizationId);
      await sendOrganizationCommand(organization, "organization.command.github.repository_projection.apply", {
        repoId,
        remoteUrl: input.repository.cloneUrl,
      });

      const afterRows = await readAllPullRequestRows(c);
      await emitPullRequestChangeEvents(c, beforeRows, afterRows);
      if (state === "CLOSED" || state === "MERGED") {
        const previous = beforeRows.find((row) => row.prId === prId);
        if (previous) {
          await autoArchiveTaskForClosedPullRequest(c, {
            ...previous,
            state,
          });
        }
      }
}
