export type ActorKey = string[];

export function organizationKey(organizationId: string): ActorKey {
  return ["org", organizationId];
}

export function repositoryKey(organizationId: string, repoId: string): ActorKey {
  return ["org", organizationId, "repo", repoId];
}

export function githubStateKey(organizationId: string): ActorKey {
  return ["org", organizationId, "github"];
}

export function userGithubDataKey(userId: string): ActorKey {
  return ["user", userId, "github"];
}

export function taskKey(organizationId: string, repoId: string, taskId: string): ActorKey {
  return ["org", organizationId, "repo", repoId, "task", taskId];
}

export function sandboxInstanceKey(organizationId: string, providerId: string, sandboxId: string): ActorKey {
  return ["org", organizationId, "provider", providerId, "sandbox", sandboxId];
}

export function historyKey(organizationId: string, repoId: string): ActorKey {
  return ["org", organizationId, "repo", repoId, "history"];
}

export function taskStatusSyncKey(organizationId: string, repoId: string, taskId: string, sandboxId: string, sessionId: string): ActorKey {
  // Include sandbox + session so multiple sandboxes/sessions can be tracked per task.
  return ["org", organizationId, "repo", repoId, "task", taskId, "status-sync", sandboxId, sessionId];
}
