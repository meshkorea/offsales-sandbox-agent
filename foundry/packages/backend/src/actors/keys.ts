export type ActorKey = string[];

const ACTOR_KEY_SCHEMA_VERSION = "v2";

export function workspaceKey(workspaceId: string): ActorKey {
  return ["ws", ACTOR_KEY_SCHEMA_VERSION, workspaceId];
}

export function projectKey(workspaceId: string, repoId: string): ActorKey {
  return ["ws", ACTOR_KEY_SCHEMA_VERSION, workspaceId, "project", repoId];
}

export function taskKey(workspaceId: string, repoId: string, taskId: string): ActorKey {
  return ["ws", ACTOR_KEY_SCHEMA_VERSION, workspaceId, "project", repoId, "task", taskId];
}

export function sandboxInstanceKey(workspaceId: string, providerId: string, sandboxId: string): ActorKey {
  return ["ws", ACTOR_KEY_SCHEMA_VERSION, workspaceId, "provider", providerId, "sandbox", sandboxId];
}

export function historyKey(workspaceId: string, repoId: string): ActorKey {
  return ["ws", ACTOR_KEY_SCHEMA_VERSION, workspaceId, "project", repoId, "history"];
}

export function projectPrSyncKey(workspaceId: string, repoId: string): ActorKey {
  return ["ws", ACTOR_KEY_SCHEMA_VERSION, workspaceId, "project", repoId, "pr-sync"];
}

export function projectBranchSyncKey(workspaceId: string, repoId: string): ActorKey {
  return ["ws", ACTOR_KEY_SCHEMA_VERSION, workspaceId, "project", repoId, "branch-sync"];
}

export function taskStatusSyncKey(workspaceId: string, repoId: string, taskId: string, sandboxId: string, sessionId: string): ActorKey {
  // Include sandbox + session so multiple sandboxes/sessions can be tracked per task.
  return ["ws", ACTOR_KEY_SCHEMA_VERSION, workspaceId, "project", repoId, "task", taskId, "status-sync", sandboxId, sessionId];
}
