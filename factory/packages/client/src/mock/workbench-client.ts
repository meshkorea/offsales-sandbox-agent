import {
  MODEL_GROUPS,
  buildInitialMockLayoutViewModel,
  groupWorkbenchProjects,
  nowMs,
  providerAgent,
  randomReply,
  removeFileTreePath,
  slugify,
  uid,
} from "../workbench-model.js";
import { getMockFactoryAppClient } from "../mock-app.js";
import { injectMockLatency } from "./latency.js";
import type {
  HandoffWorkbenchAddTabResponse,
  HandoffWorkbenchChangeModelInput,
  HandoffWorkbenchCreateHandoffInput,
  HandoffWorkbenchCreateHandoffResponse,
  HandoffWorkbenchDiffInput,
  HandoffWorkbenchRenameInput,
  HandoffWorkbenchRenameSessionInput,
  HandoffWorkbenchSelectInput,
  HandoffWorkbenchSetSessionUnreadInput,
  HandoffWorkbenchSendMessageInput,
  HandoffWorkbenchSnapshot,
  HandoffWorkbenchTabInput,
  HandoffWorkbenchUpdateDraftInput,
  WorkbenchAgentTab as AgentTab,
  WorkbenchHandoff as Handoff,
  WorkbenchTranscriptEvent as TranscriptEvent,
} from "@sandbox-agent/factory-shared";
import type { HandoffWorkbenchClient } from "../workbench-client.js";

function buildTranscriptEvent(params: {
  sessionId: string;
  sender: "client" | "agent";
  createdAt: number;
  payload: unknown;
  eventIndex: number;
}): TranscriptEvent {
  return {
    id: uid(),
    sessionId: params.sessionId,
    sender: params.sender,
    createdAt: params.createdAt,
    payload: params.payload,
    connectionId: "mock-connection",
    eventIndex: params.eventIndex,
  };
}

class MockWorkbenchStore implements HandoffWorkbenchClient {
  private snapshot: HandoffWorkbenchSnapshot;
  private listeners = new Set<() => void>();
  private pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(workspaceId: string) {
    this.snapshot = buildInitialMockLayoutViewModel(workspaceId);
  }

  getSnapshot(): HandoffWorkbenchSnapshot {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async createHandoff(input: HandoffWorkbenchCreateHandoffInput): Promise<HandoffWorkbenchCreateHandoffResponse> {
    await this.injectAsyncLatency();
    const id = uid();
    const tabId = `session-${id}`;
    const repo = this.snapshot.repos.find((candidate) => candidate.id === input.repoId);
    if (!repo) {
      throw new Error(`Cannot create mock handoff for unknown repo ${input.repoId}`);
    }
    const nextHandoff: Handoff = {
      id,
      repoId: repo.id,
      title: input.title?.trim() || "New Handoff",
      status: "new",
      repoName: repo.label,
      updatedAtMs: nowMs(),
      branch: input.branch?.trim() || null,
      pullRequest: null,
      tabs: [
        {
          id: tabId,
          sessionId: tabId,
          sessionName: "Session 1",
          agent: providerAgent(MODEL_GROUPS.find((group) => group.models.some((model) => model.id === (input.model ?? "claude-sonnet-4")))?.provider ?? "Claude"),
          model: input.model ?? "claude-sonnet-4",
          status: "idle",
          thinkingSinceMs: null,
          unread: false,
          created: false,
          draft: { text: "", attachments: [], updatedAtMs: null },
          transcript: [],
        },
      ],
      fileChanges: [],
      diffs: {},
      fileTree: [],
    };

    this.updateState((current) => ({
      ...current,
      handoffs: [nextHandoff, ...current.handoffs],
    }));

    const task = input.task.trim();
    if (task) {
      await this.sendMessage({
        handoffId: id,
        tabId,
        text: task,
        attachments: [],
      });
    }

    return { handoffId: id, tabId };
  }

  async markHandoffUnread(input: HandoffWorkbenchSelectInput): Promise<void> {
    await this.injectAsyncLatency();
    this.updateHandoff(input.handoffId, (handoff) => {
      const targetTab = handoff.tabs[handoff.tabs.length - 1] ?? null;
      if (!targetTab) {
        return handoff;
      }

      return {
        ...handoff,
        tabs: handoff.tabs.map((tab) => (tab.id === targetTab.id ? { ...tab, unread: true } : tab)),
      };
    });
  }

  async renameHandoff(input: HandoffWorkbenchRenameInput): Promise<void> {
    await this.injectAsyncLatency();
    const value = input.value.trim();
    if (!value) {
      throw new Error(`Cannot rename handoff ${input.handoffId} to an empty title`);
    }
    this.updateHandoff(input.handoffId, (handoff) => ({ ...handoff, title: value, updatedAtMs: nowMs() }));
  }

  async renameBranch(input: HandoffWorkbenchRenameInput): Promise<void> {
    await this.injectAsyncLatency();
    const value = input.value.trim();
    if (!value) {
      throw new Error(`Cannot rename branch for handoff ${input.handoffId} to an empty value`);
    }
    this.updateHandoff(input.handoffId, (handoff) => ({ ...handoff, branch: value, updatedAtMs: nowMs() }));
  }

  async archiveHandoff(input: HandoffWorkbenchSelectInput): Promise<void> {
    await this.injectAsyncLatency();
    this.updateHandoff(input.handoffId, (handoff) => ({ ...handoff, status: "archived", updatedAtMs: nowMs() }));
  }

  async publishPr(input: HandoffWorkbenchSelectInput): Promise<void> {
    await this.injectAsyncLatency();
    const nextPrNumber = Math.max(0, ...this.snapshot.handoffs.map((handoff) => handoff.pullRequest?.number ?? 0)) + 1;
    this.updateHandoff(input.handoffId, (handoff) => ({
      ...handoff,
      updatedAtMs: nowMs(),
      pullRequest: { number: nextPrNumber, status: "ready" },
    }));
  }

  async pushHandoff(input: HandoffWorkbenchSelectInput): Promise<void> {
    await this.injectAsyncLatency();
    this.updateHandoff(input.handoffId, (handoff) => ({
      ...handoff,
      updatedAtMs: nowMs(),
    }));
  }

  async revertFile(input: HandoffWorkbenchDiffInput): Promise<void> {
    await this.injectAsyncLatency();
    this.updateHandoff(input.handoffId, (handoff) => {
      const file = handoff.fileChanges.find((entry) => entry.path === input.path);
      const nextDiffs = { ...handoff.diffs };
      delete nextDiffs[input.path];

      return {
        ...handoff,
        fileChanges: handoff.fileChanges.filter((entry) => entry.path !== input.path),
        diffs: nextDiffs,
        fileTree: file?.type === "A" ? removeFileTreePath(handoff.fileTree, input.path) : handoff.fileTree,
      };
    });
  }

  async updateDraft(input: HandoffWorkbenchUpdateDraftInput): Promise<void> {
    this.assertTab(input.handoffId, input.tabId);
    this.updateHandoff(input.handoffId, (handoff) => ({
      ...handoff,
      updatedAtMs: nowMs(),
      tabs: handoff.tabs.map((tab) =>
        tab.id === input.tabId
          ? {
              ...tab,
              draft: {
                text: input.text,
                attachments: input.attachments,
                updatedAtMs: nowMs(),
              },
            }
          : tab,
      ),
    }));
  }

  async sendMessage(input: HandoffWorkbenchSendMessageInput): Promise<void> {
    await this.injectAsyncLatency();
    const text = input.text.trim();
    if (!text) {
      throw new Error(`Cannot send an empty mock prompt for handoff ${input.handoffId}`);
    }

    this.assertTab(input.handoffId, input.tabId);
    const startedAtMs = nowMs();
    getMockFactoryAppClient().recordSeatUsage(this.snapshot.workspaceId);

    this.updateHandoff(input.handoffId, (currentHandoff) => {
      const isFirstOnHandoff = currentHandoff.status === "new";
      const synthesizedTitle = text.length > 50 ? `${text.slice(0, 47)}...` : text;
      const newTitle =
        isFirstOnHandoff && currentHandoff.title === "New Handoff" ? synthesizedTitle : currentHandoff.title;
      const newBranch =
        isFirstOnHandoff && !currentHandoff.branch ? `feat/${slugify(synthesizedTitle)}` : currentHandoff.branch;
      const userMessageLines = [text, ...input.attachments.map((attachment) => `@ ${attachment.filePath}:${attachment.lineNumber}`)];
      const userEvent = buildTranscriptEvent({
        sessionId: input.tabId,
        sender: "client",
        createdAt: startedAtMs,
        eventIndex: candidateEventIndex(currentHandoff, input.tabId),
        payload: {
          method: "session/prompt",
          params: {
            prompt: userMessageLines.map((line) => ({ type: "text", text: line })),
          },
        },
      });

      return {
        ...currentHandoff,
        title: newTitle,
        branch: newBranch,
        status: "running",
        updatedAtMs: startedAtMs,
        tabs: currentHandoff.tabs.map((candidate) =>
          candidate.id === input.tabId
            ? {
                ...candidate,
                created: true,
                status: "running",
                unread: false,
                thinkingSinceMs: startedAtMs,
                draft: { text: "", attachments: [], updatedAtMs: startedAtMs },
                transcript: [...candidate.transcript, userEvent],
              }
            : candidate,
        ),
      };
    });

    const existingTimer = this.pendingTimers.get(input.tabId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      const handoff = this.requireHandoff(input.handoffId);
      const replyTab = this.requireTab(handoff, input.tabId);
      const completedAtMs = nowMs();
      const replyEvent = buildTranscriptEvent({
        sessionId: input.tabId,
        sender: "agent",
        createdAt: completedAtMs,
        eventIndex: candidateEventIndex(handoff, input.tabId),
        payload: {
          result: {
            text: randomReply(),
            durationMs: completedAtMs - startedAtMs,
          },
        },
      });

      this.updateHandoff(input.handoffId, (currentHandoff) => {
        const updatedTabs = currentHandoff.tabs.map((candidate) => {
          if (candidate.id !== input.tabId) {
            return candidate;
          }

          return {
            ...candidate,
            status: "idle" as const,
            thinkingSinceMs: null,
            unread: true,
            transcript: [...candidate.transcript, replyEvent],
          };
        });
        const anyRunning = updatedTabs.some((candidate) => candidate.status === "running");

        return {
          ...currentHandoff,
          updatedAtMs: completedAtMs,
          tabs: updatedTabs,
          status: currentHandoff.status === "archived" ? "archived" : anyRunning ? "running" : "idle",
        };
      });

      this.pendingTimers.delete(input.tabId);
    }, 2_500);

    this.pendingTimers.set(input.tabId, timer);
  }

  async stopAgent(input: HandoffWorkbenchTabInput): Promise<void> {
    await this.injectAsyncLatency();
    this.assertTab(input.handoffId, input.tabId);
    const existing = this.pendingTimers.get(input.tabId);
    if (existing) {
      clearTimeout(existing);
      this.pendingTimers.delete(input.tabId);
    }

    this.updateHandoff(input.handoffId, (currentHandoff) => {
      const updatedTabs = currentHandoff.tabs.map((candidate) =>
        candidate.id === input.tabId ? { ...candidate, status: "idle" as const, thinkingSinceMs: null } : candidate,
      );
      const anyRunning = updatedTabs.some((candidate) => candidate.status === "running");

      return {
        ...currentHandoff,
        updatedAtMs: nowMs(),
        tabs: updatedTabs,
        status: currentHandoff.status === "archived" ? "archived" : anyRunning ? "running" : "idle",
      };
    });
  }

  async setSessionUnread(input: HandoffWorkbenchSetSessionUnreadInput): Promise<void> {
    await this.injectAsyncLatency();
    this.updateHandoff(input.handoffId, (currentHandoff) => ({
      ...currentHandoff,
      tabs: currentHandoff.tabs.map((candidate) =>
        candidate.id === input.tabId ? { ...candidate, unread: input.unread } : candidate,
      ),
    }));
  }

  async renameSession(input: HandoffWorkbenchRenameSessionInput): Promise<void> {
    await this.injectAsyncLatency();
    const title = input.title.trim();
    if (!title) {
      throw new Error(`Cannot rename session ${input.tabId} to an empty title`);
    }
    this.updateHandoff(input.handoffId, (currentHandoff) => ({
      ...currentHandoff,
      tabs: currentHandoff.tabs.map((candidate) =>
        candidate.id === input.tabId ? { ...candidate, sessionName: title } : candidate,
      ),
    }));
  }

  async closeTab(input: HandoffWorkbenchTabInput): Promise<void> {
    await this.injectAsyncLatency();
    this.updateHandoff(input.handoffId, (currentHandoff) => {
      if (currentHandoff.tabs.length <= 1) {
        return currentHandoff;
      }

      return {
        ...currentHandoff,
        tabs: currentHandoff.tabs.filter((candidate) => candidate.id !== input.tabId),
      };
    });
  }

  async addTab(input: HandoffWorkbenchSelectInput): Promise<HandoffWorkbenchAddTabResponse> {
    await this.injectAsyncLatency();
    this.assertHandoff(input.handoffId);
    const nextTab: AgentTab = {
      id: uid(),
      sessionId: null,
      sessionName: `Session ${this.requireHandoff(input.handoffId).tabs.length + 1}`,
      agent: "Claude",
      model: "claude-sonnet-4",
      status: "idle",
      thinkingSinceMs: null,
      unread: false,
      created: false,
      draft: { text: "", attachments: [], updatedAtMs: null },
      transcript: [],
    };

    this.updateHandoff(input.handoffId, (currentHandoff) => ({
      ...currentHandoff,
      updatedAtMs: nowMs(),
      tabs: [...currentHandoff.tabs, nextTab],
    }));
    return { tabId: nextTab.id };
  }

  async changeModel(input: HandoffWorkbenchChangeModelInput): Promise<void> {
    await this.injectAsyncLatency();
    const group = MODEL_GROUPS.find((candidate) => candidate.models.some((entry) => entry.id === input.model));
    if (!group) {
      throw new Error(`Unable to resolve model provider for ${input.model}`);
    }

    this.updateHandoff(input.handoffId, (currentHandoff) => ({
      ...currentHandoff,
      tabs: currentHandoff.tabs.map((candidate) =>
        candidate.id === input.tabId ? { ...candidate, model: input.model, agent: providerAgent(group.provider) } : candidate,
      ),
    }));
  }

  private updateState(updater: (current: HandoffWorkbenchSnapshot) => HandoffWorkbenchSnapshot): void {
    const nextSnapshot = updater(this.snapshot);
    this.snapshot = {
      ...nextSnapshot,
      projects: groupWorkbenchProjects(nextSnapshot.repos, nextSnapshot.handoffs),
    };
    this.notify();
  }

  private updateHandoff(handoffId: string, updater: (handoff: Handoff) => Handoff): void {
    this.assertHandoff(handoffId);
    this.updateState((current) => ({
      ...current,
      handoffs: current.handoffs.map((handoff) => (handoff.id === handoffId ? updater(handoff) : handoff)),
    }));
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private assertHandoff(handoffId: string): void {
    this.requireHandoff(handoffId);
  }

  private assertTab(handoffId: string, tabId: string): void {
    const handoff = this.requireHandoff(handoffId);
    this.requireTab(handoff, tabId);
  }

  private requireHandoff(handoffId: string): Handoff {
    const handoff = this.snapshot.handoffs.find((candidate) => candidate.id === handoffId);
    if (!handoff) {
      throw new Error(`Unable to find mock handoff ${handoffId}`);
    }
    return handoff;
  }

  private requireTab(handoff: Handoff, tabId: string): AgentTab {
    const tab = handoff.tabs.find((candidate) => candidate.id === tabId);
    if (!tab) {
      throw new Error(`Unable to find mock tab ${tabId} in handoff ${handoff.id}`);
    }
    return tab;
  }

  private injectAsyncLatency(): Promise<void> {
    return injectMockLatency();
  }
}

function candidateEventIndex(handoff: Handoff, tabId: string): number {
  const tab = handoff.tabs.find((candidate) => candidate.id === tabId);
  return (tab?.transcript.length ?? 0) + 1;
}

const mockWorkbenchClients = new Map<string, HandoffWorkbenchClient>();

export function getMockWorkbenchClient(workspaceId = "default"): HandoffWorkbenchClient {
  let client = mockWorkbenchClients.get(workspaceId);
  if (!client) {
    client = new MockWorkbenchStore(workspaceId);
    mockWorkbenchClients.set(workspaceId, client);
  }
  return client;
}
