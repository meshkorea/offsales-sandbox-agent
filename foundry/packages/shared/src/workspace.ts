import type { SandboxProviderId, TaskStatus } from "./contracts.js";

export type WorkspaceTaskStatus = TaskStatus | "new";
export type WorkspaceAgentKind = "Claude" | "Codex" | "Cursor";
export type WorkspaceModelId =
  | "claude-sonnet-4"
  | "claude-opus-4"
  | "gpt-5.3-codex"
  | "gpt-5.4"
  | "gpt-5.2-codex"
  | "gpt-5.1-codex-max"
  | "gpt-5.2"
  | "gpt-5.1-codex-mini";
export type WorkspaceSessionStatus = "pending_provision" | "pending_session_create" | "ready" | "running" | "idle" | "error";

export interface WorkspaceTranscriptEvent {
  id: string;
  eventIndex: number;
  sessionId: string;
  createdAt: number;
  connectionId: string;
  sender: "client" | "agent";
  payload: unknown;
}

export interface WorkspaceComposerDraft {
  text: string;
  attachments: WorkspaceLineAttachment[];
  updatedAtMs: number | null;
}

/** Session metadata without transcript content. */
export interface WorkspaceSessionSummary {
  id: string;
  /** Stable UI session id used for routing and task-local identity. */
  sessionId: string;
  /** Underlying sandbox session id when provisioning has completed. */
  sandboxSessionId?: string | null;
  sessionName: string;
  agent: WorkspaceAgentKind;
  model: WorkspaceModelId;
  status: WorkspaceSessionStatus;
  thinkingSinceMs: number | null;
  unread: boolean;
  created: boolean;
  errorMessage?: string | null;
}

/** Full session content — only fetched when viewing a specific session. */
export interface WorkspaceSessionDetail {
  /** Stable UI session id used for the session topic key and routing. */
  sessionId: string;
  sandboxSessionId: string | null;
  sessionName: string;
  agent: WorkspaceAgentKind;
  model: WorkspaceModelId;
  status: WorkspaceSessionStatus;
  thinkingSinceMs: number | null;
  unread: boolean;
  created: boolean;
  errorMessage?: string | null;
  draft: WorkspaceComposerDraft;
  transcript: WorkspaceTranscriptEvent[];
}

export interface WorkspaceFileChange {
  path: string;
  added: number;
  removed: number;
  type: "M" | "A" | "D";
}

export interface WorkspaceFileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: WorkspaceFileTreeNode[];
}

export interface WorkspaceLineAttachment {
  id: string;
  filePath: string;
  lineNumber: number;
  lineContent: string;
}

export interface WorkspaceHistoryEvent {
  id: string;
  messageId: string;
  preview: string;
  sessionName: string;
  sessionId: string;
  createdAtMs: number;
  detail: string;
}

export type WorkspaceDiffLineKind = "context" | "add" | "remove" | "hunk";

export interface WorkspaceParsedDiffLine {
  kind: WorkspaceDiffLineKind;
  lineNumber: number;
  text: string;
}

export interface WorkspacePullRequestSummary {
  number: number;
  title: string;
  state: string;
  url: string;
  headRefName: string;
  baseRefName: string;
  repoFullName: string;
  authorLogin: string | null;
  isDraft: boolean;
  updatedAtMs: number;
}

export interface WorkspaceSandboxSummary {
  sandboxProviderId: SandboxProviderId;
  sandboxId: string;
  cwd: string | null;
}

/** Sidebar-level task data. Materialized in the organization actor's SQLite. */
export interface WorkspaceTaskSummary {
  id: string;
  repoId: string;
  title: string;
  status: WorkspaceTaskStatus;
  repoName: string;
  updatedAtMs: number;
  branch: string | null;
  pullRequest: WorkspacePullRequestSummary | null;
  /** Summary of sessions — no transcript content. */
  sessionsSummary: WorkspaceSessionSummary[];
}

/** Full task detail — only fetched when viewing a specific task. */
export interface WorkspaceTaskDetail extends WorkspaceTaskSummary {
  /** Original task prompt/instructions shown in the detail view. */
  task: string;
  /** Underlying task runtime status preserved for detail views and error handling. */
  runtimeStatus: TaskStatus;
  diffStat: string | null;
  prUrl: string | null;
  reviewStatus: string | null;
  fileChanges: WorkspaceFileChange[];
  diffs: Record<string, string>;
  fileTree: WorkspaceFileTreeNode[];
  minutesUsed: number;
  /** Sandbox info for this task. */
  sandboxes: WorkspaceSandboxSummary[];
  activeSandboxId: string | null;
}

/** Repo-level summary for organization sidebar. */
export interface WorkspaceRepositorySummary {
  id: string;
  label: string;
  /** Aggregated branch/task overview state (replaces getRepoOverview polling). */
  taskCount: number;
  latestActivityMs: number;
}

/** Organization-level snapshot — initial fetch for the organization topic. */
export interface OrganizationSummarySnapshot {
  organizationId: string;
  repos: WorkspaceRepositorySummary[];
  taskSummaries: WorkspaceTaskSummary[];
}

export interface WorkspaceSession extends WorkspaceSessionSummary {
  draft: WorkspaceComposerDraft;
  transcript: WorkspaceTranscriptEvent[];
}

export interface WorkspaceTask {
  id: string;
  repoId: string;
  title: string;
  status: WorkspaceTaskStatus;
  runtimeStatus?: TaskStatus;
  repoName: string;
  updatedAtMs: number;
  branch: string | null;
  pullRequest: WorkspacePullRequestSummary | null;
  sessions: WorkspaceSession[];
  fileChanges: WorkspaceFileChange[];
  diffs: Record<string, string>;
  fileTree: WorkspaceFileTreeNode[];
  minutesUsed: number;
  activeSandboxId?: string | null;
}

export interface WorkspaceRepo {
  id: string;
  label: string;
}

export interface WorkspaceRepositorySection {
  id: string;
  label: string;
  updatedAtMs: number;
  tasks: WorkspaceTask[];
}

export interface TaskWorkspaceSnapshot {
  organizationId: string;
  repos: WorkspaceRepo[];
  repositories: WorkspaceRepositorySection[];
  tasks: WorkspaceTask[];
}

export interface WorkspaceModelOption {
  id: WorkspaceModelId;
  label: string;
}

export interface WorkspaceModelGroup {
  provider: string;
  models: WorkspaceModelOption[];
}

export interface TaskWorkspaceSelectInput {
  repoId: string;
  taskId: string;
  authSessionId?: string;
}

export interface TaskWorkspaceCreateTaskInput {
  repoId: string;
  task: string;
  title?: string;
  branch?: string;
  onBranch?: string;
  model?: WorkspaceModelId;
  authSessionId?: string;
}

export interface TaskWorkspaceRenameInput {
  repoId: string;
  taskId: string;
  value: string;
}

export interface TaskWorkspaceSendMessageInput {
  repoId: string;
  taskId: string;
  sessionId: string;
  text: string;
  attachments: WorkspaceLineAttachment[];
  authSessionId?: string;
}

export interface TaskWorkspaceSessionInput {
  repoId: string;
  taskId: string;
  sessionId: string;
  authSessionId?: string;
}

export interface TaskWorkspaceRenameSessionInput extends TaskWorkspaceSessionInput {
  title: string;
}

export interface TaskWorkspaceChangeModelInput extends TaskWorkspaceSessionInput {
  model: WorkspaceModelId;
}

export interface TaskWorkspaceUpdateDraftInput extends TaskWorkspaceSessionInput {
  text: string;
  attachments: WorkspaceLineAttachment[];
}

export interface TaskWorkspaceSetSessionUnreadInput extends TaskWorkspaceSessionInput {
  unread: boolean;
}

export interface TaskWorkspaceDiffInput {
  repoId: string;
  taskId: string;
  path: string;
}

export interface TaskWorkspaceCreateTaskResponse {
  taskId: string;
  sessionId?: string;
}

export interface TaskWorkspaceAddSessionResponse {
  sessionId: string;
}
