import { githubStateKey, historyKey, organizationKey, repositoryKey, sandboxInstanceKey, taskKey, taskStatusSyncKey, userGithubDataKey } from "./keys.js";
import type { ProviderId } from "@sandbox-agent/foundry-shared";

export function actorClient(c: any) {
  return c.client();
}

export async function getOrCreateOrganization(c: any, organizationId: string) {
  return await actorClient(c).organization.getOrCreate(organizationKey(organizationId), {
    createWithInput: organizationId,
  });
}

export async function getOrCreateRepository(c: any, organizationId: string, repoId: string, remoteUrl: string) {
  return await actorClient(c).repository.getOrCreate(repositoryKey(organizationId, repoId), {
    createWithInput: {
      workspaceId: organizationId,
      repoId,
      remoteUrl,
    },
  });
}

export function getRepository(c: any, organizationId: string, repoId: string) {
  return actorClient(c).repository.get(repositoryKey(organizationId, repoId));
}

export async function getOrCreateGithubState(c: any, organizationId: string) {
  return await actorClient(c).githubState.getOrCreate(githubStateKey(organizationId), {
    createWithInput: {
      organizationId,
    },
  });
}

export function getGithubState(c: any, organizationId: string) {
  return actorClient(c).githubState.get(githubStateKey(organizationId));
}

export async function getOrCreateUserGithubData(c: any, userId: string) {
  return await actorClient(c).userGithub.getOrCreate(userGithubDataKey(userId), {
    createWithInput: {
      userId,
    },
  });
}

export function getUserGithubData(c: any, userId: string) {
  return actorClient(c).userGithub.get(userGithubDataKey(userId));
}

export function getTask(c: any, organizationId: string, repoId: string, taskId: string) {
  return actorClient(c).task.get(taskKey(organizationId, repoId, taskId));
}

export async function getOrCreateTask(c: any, organizationId: string, repoId: string, taskId: string, createWithInput: Record<string, unknown>) {
  return await actorClient(c).task.getOrCreate(taskKey(organizationId, repoId, taskId), {
    createWithInput,
  });
}

export async function getOrCreateHistory(c: any, organizationId: string, repoId: string) {
  return await actorClient(c).history.getOrCreate(historyKey(organizationId, repoId), {
    createWithInput: {
      workspaceId: organizationId,
      repoId,
    },
  });
}

export function getSandboxInstance(c: any, organizationId: string, providerId: ProviderId, sandboxId: string) {
  return actorClient(c).sandboxInstance.get(sandboxInstanceKey(organizationId, providerId, sandboxId));
}

export async function getOrCreateSandboxInstance(
  c: any,
  organizationId: string,
  providerId: ProviderId,
  sandboxId: string,
  createWithInput: Record<string, unknown>,
) {
  return await actorClient(c).sandboxInstance.getOrCreate(sandboxInstanceKey(organizationId, providerId, sandboxId), { createWithInput });
}

export async function getOrCreateTaskStatusSync(
  c: any,
  organizationId: string,
  repoId: string,
  taskId: string,
  sandboxId: string,
  sessionId: string,
  createWithInput: Record<string, unknown>,
) {
  return await actorClient(c).taskStatusSync.getOrCreate(taskStatusSyncKey(organizationId, repoId, taskId, sandboxId, sessionId), {
    createWithInput,
  });
}

export function selfTaskStatusSync(c: any) {
  return actorClient(c).taskStatusSync.getForId(c.actorId);
}

export function selfHistory(c: any) {
  return actorClient(c).history.getForId(c.actorId);
}

export function selfTask(c: any) {
  return actorClient(c).task.getForId(c.actorId);
}

export function selfOrganization(c: any) {
  return actorClient(c).organization.getForId(c.actorId);
}

export function selfRepository(c: any) {
  return actorClient(c).repository.getForId(c.actorId);
}

export function selfGithubState(c: any) {
  return actorClient(c).githubState.getForId(c.actorId);
}

export function selfUserGithubData(c: any) {
  return actorClient(c).userGithub.getForId(c.actorId);
}

export function selfSandboxInstance(c: any) {
  return actorClient(c).sandboxInstance.getForId(c.actorId);
}
