import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { HandoffWorkbenchClient } from "@sandbox-agent/factory-client";
import { useNavigate } from "@tanstack/react-router";

import { DiffContent } from "./mock-layout/diff-content";
import { MessageList } from "./mock-layout/message-list";
import { PromptComposer } from "./mock-layout/prompt-composer";
import { RightSidebar } from "./mock-layout/right-sidebar";
import { Sidebar } from "./mock-layout/sidebar";
import { TabStrip } from "./mock-layout/tab-strip";
import { TranscriptHeader } from "./mock-layout/transcript-header";
import { RightSidebarSkeleton, SidebarSkeleton, TranscriptSkeleton } from "./mock-layout/skeleton";
import { PROMPT_TEXTAREA_MAX_HEIGHT, PROMPT_TEXTAREA_MIN_HEIGHT, PanelHeaderBar, SPanel, ScrollBody, Shell } from "./mock-layout/ui";
import {
  buildDisplayMessages,
  buildHistoryEvents,
  diffPath,
  diffTabId,
  formatThinkingDuration,
  isDiffTab,
  type Handoff,
  type HistoryEvent,
  type LineAttachment,
  type Message,
  type ModelId,
} from "./mock-layout/view-model";

function firstAgentTabId(handoff: Handoff): string | null {
  return handoff.tabs[0]?.id ?? null;
}

function sanitizeOpenDiffs(handoff: Handoff, paths: string[] | undefined): string[] {
  if (!paths) {
    return [];
  }

  return paths.filter((path) => handoff.diffs[path] != null);
}

function sanitizeLastAgentTabId(handoff: Handoff, tabId: string | null | undefined): string | null {
  if (tabId && handoff.tabs.some((tab) => tab.id === tabId)) {
    return tabId;
  }

  return firstAgentTabId(handoff);
}

function sanitizeActiveTabId(
  handoff: Handoff,
  tabId: string | null | undefined,
  openDiffs: string[],
  lastAgentTabId: string | null,
): string | null {
  if (tabId) {
    if (handoff.tabs.some((tab) => tab.id === tabId)) {
      return tabId;
    }
    if (isDiffTab(tabId) && openDiffs.includes(diffPath(tabId))) {
      return tabId;
    }
  }

  return openDiffs.length > 0 ? diffTabId(openDiffs[openDiffs.length - 1]!) : lastAgentTabId;
}

const TranscriptPanel = memo(function TranscriptPanel({
  client,
  handoff,
  activeTabId,
  lastAgentTabId,
  openDiffs,
  onSyncRouteSession,
  onSetActiveTabId,
  onSetLastAgentTabId,
  onSetOpenDiffs,
}: {
  client: HandoffWorkbenchClient;
  handoff: Handoff;
  activeTabId: string | null;
  lastAgentTabId: string | null;
  openDiffs: string[];
  onSyncRouteSession: (handoffId: string, sessionId: string | null, replace?: boolean) => void;
  onSetActiveTabId: (tabId: string | null) => void;
  onSetLastAgentTabId: (tabId: string | null) => void;
  onSetOpenDiffs: (paths: string[]) => void;
}) {
  const [defaultModel, setDefaultModel] = useState<ModelId>("claude-sonnet-4");
  const [editingField, setEditingField] = useState<"title" | "branch" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingSessionTabId, setEditingSessionTabId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState("");
  const [pendingHistoryTarget, setPendingHistoryTarget] = useState<{ messageId: string; tabId: string } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [timerNowMs, setTimerNowMs] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const activeDiff = activeTabId && isDiffTab(activeTabId) ? diffPath(activeTabId) : null;
  const activeAgentTab = activeDiff ? null : (handoff.tabs.find((candidate) => candidate.id === activeTabId) ?? handoff.tabs[0] ?? null);
  const promptTab = handoff.tabs.find((candidate) => candidate.id === lastAgentTabId) ?? handoff.tabs[0] ?? null;
  const isTerminal = handoff.status === "archived";
  const historyEvents = useMemo(() => buildHistoryEvents(handoff.tabs), [handoff.tabs]);
  const activeMessages = useMemo(() => buildDisplayMessages(activeAgentTab), [activeAgentTab]);
  const draft = promptTab?.draft.text ?? "";
  const attachments = promptTab?.draft.attachments ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages.length]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeTabId, handoff.id]);

  useEffect(() => {
    setEditingSessionTabId(null);
    setEditingSessionName("");
  }, [handoff.id]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = `${PROMPT_TEXTAREA_MIN_HEIGHT}px`;
    const nextHeight = Math.min(textarea.scrollHeight, PROMPT_TEXTAREA_MAX_HEIGHT);
    textarea.style.height = `${Math.max(PROMPT_TEXTAREA_MIN_HEIGHT, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > PROMPT_TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
  }, [draft, activeTabId, handoff.id]);

  useEffect(() => {
    if (!pendingHistoryTarget || activeTabId !== pendingHistoryTarget.tabId) {
      return;
    }

    const targetNode = messageRefs.current.get(pendingHistoryTarget.messageId);
    if (!targetNode) {
      return;
    }

    targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
    setPendingHistoryTarget(null);
  }, [activeMessages.length, activeTabId, pendingHistoryTarget]);

  useEffect(() => {
    if (!copiedMessageId) {
      return;
    }

    const timer = setTimeout(() => {
      setCopiedMessageId(null);
    }, 1_200);

    return () => clearTimeout(timer);
  }, [copiedMessageId]);

  useEffect(() => {
    if (!activeAgentTab || activeAgentTab.status !== "running" || activeAgentTab.thinkingSinceMs === null) {
      return;
    }

    setTimerNowMs(Date.now());
    const timer = window.setInterval(() => {
      setTimerNowMs(Date.now());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [activeAgentTab?.id, activeAgentTab?.status, activeAgentTab?.thinkingSinceMs]);

  useEffect(() => {
    if (!activeAgentTab?.unread) {
      return;
    }

    void client.setSessionUnread({
      handoffId: handoff.id,
      tabId: activeAgentTab.id,
      unread: false,
    });
  }, [activeAgentTab?.id, activeAgentTab?.unread, client, handoff.id]);

  const startEditingField = useCallback((field: "title" | "branch", value: string) => {
    setEditingField(field);
    setEditValue(value);
  }, []);

  const cancelEditingField = useCallback(() => {
    setEditingField(null);
  }, []);

  const commitEditingField = useCallback(
    (field: "title" | "branch") => {
      const value = editValue.trim();
      if (!value) {
        setEditingField(null);
        return;
      }

      if (field === "title") {
        void client.renameHandoff({ handoffId: handoff.id, value });
      } else {
        void client.renameBranch({ handoffId: handoff.id, value });
      }
      setEditingField(null);
    },
    [client, editValue, handoff.id],
  );

  const updateDraft = useCallback(
    (nextText: string, nextAttachments: LineAttachment[]) => {
      if (!promptTab) {
        return;
      }

      void client.updateDraft({
        handoffId: handoff.id,
        tabId: promptTab.id,
        text: nextText,
        attachments: nextAttachments,
      });
    },
    [client, handoff.id, promptTab],
  );

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text || !promptTab) {
      return;
    }

    onSetActiveTabId(promptTab.id);
    onSetLastAgentTabId(promptTab.id);
    void client.sendMessage({
      handoffId: handoff.id,
      tabId: promptTab.id,
      text,
      attachments,
    });
  }, [attachments, client, draft, handoff.id, onSetActiveTabId, onSetLastAgentTabId, promptTab]);

  const stopAgent = useCallback(() => {
    if (!promptTab) {
      return;
    }

    void client.stopAgent({
      handoffId: handoff.id,
      tabId: promptTab.id,
    });
  }, [client, handoff.id, promptTab]);

  const switchTab = useCallback(
    (tabId: string) => {
      onSetActiveTabId(tabId);

      if (!isDiffTab(tabId)) {
        onSetLastAgentTabId(tabId);
        const tab = handoff.tabs.find((candidate) => candidate.id === tabId);
        if (tab?.unread) {
          void client.setSessionUnread({
            handoffId: handoff.id,
            tabId,
            unread: false,
          });
        }
        onSyncRouteSession(handoff.id, tabId);
      }
    },
    [client, handoff.id, handoff.tabs, onSetActiveTabId, onSetLastAgentTabId, onSyncRouteSession],
  );

  const setTabUnread = useCallback(
    (tabId: string, unread: boolean) => {
      void client.setSessionUnread({ handoffId: handoff.id, tabId, unread });
    },
    [client, handoff.id],
  );

  const startRenamingTab = useCallback(
    (tabId: string) => {
      const targetTab = handoff.tabs.find((candidate) => candidate.id === tabId);
      if (!targetTab) {
        throw new Error(`Unable to rename missing session tab ${tabId}`);
      }

      setEditingSessionTabId(tabId);
      setEditingSessionName(targetTab.sessionName);
    },
    [handoff.tabs],
  );

  const cancelTabRename = useCallback(() => {
    setEditingSessionTabId(null);
    setEditingSessionName("");
  }, []);

  const commitTabRename = useCallback(() => {
    if (!editingSessionTabId) {
      return;
    }

    const trimmedName = editingSessionName.trim();
    if (!trimmedName) {
      cancelTabRename();
      return;
    }

    void client.renameSession({
      handoffId: handoff.id,
      tabId: editingSessionTabId,
      title: trimmedName,
    });
    cancelTabRename();
  }, [cancelTabRename, client, editingSessionName, editingSessionTabId, handoff.id]);

  const closeTab = useCallback(
    (tabId: string) => {
      const remainingTabs = handoff.tabs.filter((candidate) => candidate.id !== tabId);
      const nextTabId = remainingTabs[0]?.id ?? null;

      if (activeTabId === tabId) {
        onSetActiveTabId(nextTabId);
      }
      if (lastAgentTabId === tabId) {
        onSetLastAgentTabId(nextTabId);
      }

      onSyncRouteSession(handoff.id, nextTabId);
      void client.closeTab({ handoffId: handoff.id, tabId });
    },
    [activeTabId, client, handoff.id, handoff.tabs, lastAgentTabId, onSetActiveTabId, onSetLastAgentTabId, onSyncRouteSession],
  );

  const closeDiffTab = useCallback(
    (path: string) => {
      const nextOpenDiffs = openDiffs.filter((candidate) => candidate !== path);
      onSetOpenDiffs(nextOpenDiffs);
      if (activeTabId === diffTabId(path)) {
        onSetActiveTabId(
          nextOpenDiffs.length > 0 ? diffTabId(nextOpenDiffs[nextOpenDiffs.length - 1]!) : (lastAgentTabId ?? firstAgentTabId(handoff)),
        );
      }
    },
    [activeTabId, handoff, lastAgentTabId, onSetActiveTabId, onSetOpenDiffs, openDiffs],
  );

  const addTab = useCallback(() => {
    void (async () => {
      const { tabId } = await client.addTab({ handoffId: handoff.id });
      onSetLastAgentTabId(tabId);
      onSetActiveTabId(tabId);
      onSyncRouteSession(handoff.id, tabId);
    })();
  }, [client, handoff.id, onSetActiveTabId, onSetLastAgentTabId, onSyncRouteSession]);

  const changeModel = useCallback(
    (model: ModelId) => {
      if (!promptTab) {
        throw new Error(`Unable to change model for handoff ${handoff.id} without an active prompt tab`);
      }

      void client.changeModel({
        handoffId: handoff.id,
        tabId: promptTab.id,
        model,
      });
    },
    [client, handoff.id, promptTab],
  );

  const addAttachment = useCallback(
    (filePath: string, lineNumber: number, lineContent: string) => {
      if (!promptTab) {
        return;
      }

      const nextAttachment = { id: `${filePath}:${lineNumber}`, filePath, lineNumber, lineContent };
      if (attachments.some((attachment) => attachment.filePath === filePath && attachment.lineNumber === lineNumber)) {
        return;
      }

      updateDraft(draft, [...attachments, nextAttachment]);
    },
    [attachments, draft, promptTab, updateDraft],
  );

  const removeAttachment = useCallback(
    (id: string) => {
      updateDraft(
        draft,
        attachments.filter((attachment) => attachment.id !== id),
      );
    },
    [attachments, draft, updateDraft],
  );

  const jumpToHistoryEvent = useCallback(
    (event: HistoryEvent) => {
      setPendingHistoryTarget({ messageId: event.messageId, tabId: event.tabId });

      if (activeTabId !== event.tabId) {
        switchTab(event.tabId);
        return;
      }

      const targetNode = messageRefs.current.get(event.messageId);
      if (targetNode) {
        targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
        setPendingHistoryTarget(null);
      }
    },
    [activeTabId, switchTab],
  );

  const copyMessage = useCallback(async (message: Message) => {
    try {
      if (!window.navigator.clipboard) {
        throw new Error("Clipboard API unavailable in mock layout");
      }

      await window.navigator.clipboard.writeText(message.text);
      setCopiedMessageId(message.id);
    } catch (error) {
      console.error("Failed to copy transcript message", error);
    }
  }, []);

  const thinkingTimerLabel =
    activeAgentTab?.status === "running" && activeAgentTab.thinkingSinceMs !== null
      ? formatThinkingDuration(timerNowMs - activeAgentTab.thinkingSinceMs)
      : null;

  return (
    <SPanel>
      <TranscriptHeader
        handoff={handoff}
        activeTab={activeAgentTab}
        editingField={editingField}
        editValue={editValue}
        onEditValueChange={setEditValue}
        onStartEditingField={startEditingField}
        onCommitEditingField={commitEditingField}
        onCancelEditingField={cancelEditingField}
        onSetActiveTabUnread={(unread) => {
          if (activeAgentTab) {
            setTabUnread(activeAgentTab.id, unread);
          }
        }}
      />
      <TabStrip
        handoff={handoff}
        activeTabId={activeTabId}
        openDiffs={openDiffs}
        editingSessionTabId={editingSessionTabId}
        editingSessionName={editingSessionName}
        onEditingSessionNameChange={setEditingSessionName}
        onSwitchTab={switchTab}
        onStartRenamingTab={startRenamingTab}
        onCommitSessionRename={commitTabRename}
        onCancelSessionRename={cancelTabRename}
        onSetTabUnread={setTabUnread}
        onCloseTab={closeTab}
        onCloseDiffTab={closeDiffTab}
        onAddTab={addTab}
      />
      {activeDiff ? (
        <DiffContent
          filePath={activeDiff}
          file={handoff.fileChanges.find((file) => file.path === activeDiff)}
          diff={handoff.diffs[activeDiff]}
          onAddAttachment={addAttachment}
        />
      ) : handoff.tabs.length === 0 ? (
        <ScrollBody>
          <div
            style={{
              minHeight: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px",
            }}
          >
            <div
              style={{
                maxWidth: "420px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Create the first session</h2>
              <p style={{ margin: 0, opacity: 0.75 }}>
                Sessions are where you chat with the agent. Start one now to send the first prompt on this handoff.
              </p>
              <button
                type="button"
                onClick={addTab}
                style={{
                  alignSelf: "center",
                  border: 0,
                  borderRadius: "999px",
                  padding: "10px 18px",
                  background: "#ff4f00",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                New session
              </button>
            </div>
          </div>
        </ScrollBody>
      ) : (
        <ScrollBody>
          <MessageList
            tab={activeAgentTab}
            scrollRef={scrollRef}
            messageRefs={messageRefs}
            historyEvents={historyEvents}
            onSelectHistoryEvent={jumpToHistoryEvent}
            copiedMessageId={copiedMessageId}
            onCopyMessage={(message) => {
              void copyMessage(message);
            }}
            thinkingTimerLabel={thinkingTimerLabel}
          />
        </ScrollBody>
      )}
      {!isTerminal && promptTab ? (
        <PromptComposer
          draft={draft}
          textareaRef={textareaRef}
          placeholder={!promptTab.created ? "Describe your task..." : "Send a message..."}
          attachments={attachments}
          defaultModel={defaultModel}
          model={promptTab.model}
          isRunning={promptTab.status === "running"}
          onDraftChange={(value) => updateDraft(value, attachments)}
          onSend={sendMessage}
          onStop={stopAgent}
          onRemoveAttachment={removeAttachment}
          onChangeModel={changeModel}
          onSetDefaultModel={setDefaultModel}
        />
      ) : null}
    </SPanel>
  );
});

interface MockLayoutProps {
  client: HandoffWorkbenchClient;
  workspaceId: string;
  selectedHandoffId?: string | null;
  selectedSessionId?: string | null;
  sidebarTitle?: string;
  sidebarSubtitle?: string;
  sidebarActions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}

export function MockLayout({
  client,
  workspaceId,
  selectedHandoffId,
  selectedSessionId,
  sidebarTitle,
  sidebarSubtitle,
  sidebarActions,
}: MockLayoutProps) {
  const navigate = useNavigate();
  const viewModel = useSyncExternalStore(
    client.subscribe.bind(client),
    client.getSnapshot.bind(client),
    client.getSnapshot.bind(client),
  );
  const handoffs = viewModel.handoffs ?? [];
  const projects = viewModel.projects ?? [];
  const [activeTabIdByHandoff, setActiveTabIdByHandoff] = useState<Record<string, string | null>>({});
  const [lastAgentTabIdByHandoff, setLastAgentTabIdByHandoff] = useState<Record<string, string | null>>({});
  const [openDiffsByHandoff, setOpenDiffsByHandoff] = useState<Record<string, string[]>>({});

  const activeHandoff = useMemo(
    () => handoffs.find((handoff) => handoff.id === selectedHandoffId) ?? handoffs[0] ?? null,
    [handoffs, selectedHandoffId],
  );

  useEffect(() => {
    if (activeHandoff) {
      return;
    }

    const fallbackHandoffId = handoffs[0]?.id;
    if (!fallbackHandoffId) {
      return;
    }

    const fallbackHandoff = handoffs.find((handoff) => handoff.id === fallbackHandoffId) ?? null;

    void navigate({
      to: "/workspaces/$workspaceId/handoffs/$handoffId",
      params: {
        workspaceId,
        handoffId: fallbackHandoffId,
      },
      search: { sessionId: fallbackHandoff?.tabs[0]?.id ?? undefined },
      replace: true,
    });
  }, [activeHandoff, handoffs, navigate, workspaceId]);

  const openDiffs = activeHandoff ? sanitizeOpenDiffs(activeHandoff, openDiffsByHandoff[activeHandoff.id]) : [];
  const lastAgentTabId = activeHandoff ? sanitizeLastAgentTabId(activeHandoff, lastAgentTabIdByHandoff[activeHandoff.id]) : null;
  const activeTabId = activeHandoff
    ? sanitizeActiveTabId(activeHandoff, activeTabIdByHandoff[activeHandoff.id], openDiffs, lastAgentTabId)
    : null;

  const syncRouteSession = useCallback(
    (handoffId: string, sessionId: string | null, replace = false) => {
      void navigate({
        to: "/workspaces/$workspaceId/handoffs/$handoffId",
        params: {
          workspaceId,
          handoffId,
        },
        search: { sessionId: sessionId ?? undefined },
        ...(replace ? { replace: true } : {}),
      });
    },
    [navigate, workspaceId],
  );

  useEffect(() => {
    if (!activeHandoff) {
      return;
    }

    const resolvedRouteSessionId = sanitizeLastAgentTabId(activeHandoff, selectedSessionId);
    if (!resolvedRouteSessionId) {
      return;
    }

    if (selectedSessionId !== resolvedRouteSessionId) {
      syncRouteSession(activeHandoff.id, resolvedRouteSessionId, true);
      return;
    }

    if (lastAgentTabIdByHandoff[activeHandoff.id] === resolvedRouteSessionId) {
      return;
    }

    setLastAgentTabIdByHandoff((current) => ({
      ...current,
      [activeHandoff.id]: resolvedRouteSessionId,
    }));
    setActiveTabIdByHandoff((current) => {
      const currentActive = current[activeHandoff.id];
      if (currentActive && isDiffTab(currentActive)) {
        return current;
      }

      return {
        ...current,
        [activeHandoff.id]: resolvedRouteSessionId,
      };
    });
  }, [activeHandoff, lastAgentTabIdByHandoff, selectedSessionId, syncRouteSession]);

  const createHandoff = useCallback(() => {
    void (async () => {
      const repoId = activeHandoff?.repoId ?? viewModel.repos[0]?.id ?? "";
      if (!repoId) {
        throw new Error("Cannot create a handoff without an available repo");
      }

      const { handoffId, tabId } = await client.createHandoff({
        repoId,
        task: "",
        model: "gpt-4o",
      });
      await navigate({
        to: "/workspaces/$workspaceId/handoffs/$handoffId",
        params: {
          workspaceId,
          handoffId,
        },
        search: { sessionId: tabId ?? undefined },
      });
    })();
  }, [activeHandoff?.repoId, client, navigate, viewModel.repos, workspaceId]);

  const openDiffTab = useCallback(
    (path: string) => {
      if (!activeHandoff) {
        throw new Error("Cannot open a diff tab without an active handoff");
      }
      setOpenDiffsByHandoff((current) => {
        const existing = sanitizeOpenDiffs(activeHandoff, current[activeHandoff.id]);
        if (existing.includes(path)) {
          return current;
        }

        return {
          ...current,
          [activeHandoff.id]: [...existing, path],
        };
      });
      setActiveTabIdByHandoff((current) => ({
        ...current,
        [activeHandoff.id]: diffTabId(path),
      }));
    },
    [activeHandoff],
  );

  const selectHandoff = useCallback(
    (id: string) => {
      const handoff = handoffs.find((candidate) => candidate.id === id) ?? null;
      void navigate({
        to: "/workspaces/$workspaceId/handoffs/$handoffId",
        params: {
          workspaceId,
          handoffId: id,
        },
        search: { sessionId: handoff?.tabs[0]?.id ?? undefined },
      });
    },
    [handoffs, navigate, workspaceId],
  );

  const markHandoffUnread = useCallback((id: string) => {
    void client.markHandoffUnread({ handoffId: id });
  }, [client]);

  const renameHandoff = useCallback(
    (id: string) => {
      const currentHandoff = handoffs.find((handoff) => handoff.id === id);
      if (!currentHandoff) {
        throw new Error(`Unable to rename missing handoff ${id}`);
      }

      const nextTitle = window.prompt("Rename handoff", currentHandoff.title);
      if (nextTitle === null) {
        return;
      }

      const trimmedTitle = nextTitle.trim();
      if (!trimmedTitle) {
        return;
      }

      void client.renameHandoff({ handoffId: id, value: trimmedTitle });
    },
    [client, handoffs],
  );

  const renameBranch = useCallback(
    (id: string) => {
      const currentHandoff = handoffs.find((handoff) => handoff.id === id);
      if (!currentHandoff) {
        throw new Error(`Unable to rename missing handoff ${id}`);
      }

      const nextBranch = window.prompt("Rename branch", currentHandoff.branch ?? "");
      if (nextBranch === null) {
        return;
      }

      const trimmedBranch = nextBranch.trim();
      if (!trimmedBranch) {
        return;
      }

      void client.renameBranch({ handoffId: id, value: trimmedBranch });
    },
    [client, handoffs],
  );

  const archiveHandoff = useCallback(() => {
    if (!activeHandoff) {
      throw new Error("Cannot archive without an active handoff");
    }
    void client.archiveHandoff({ handoffId: activeHandoff.id });
  }, [activeHandoff, client]);

  const publishPr = useCallback(() => {
    if (!activeHandoff) {
      throw new Error("Cannot publish PR without an active handoff");
    }
    void client.publishPr({ handoffId: activeHandoff.id });
  }, [activeHandoff, client]);

  const pushHandoff = useCallback(() => {
    if (!activeHandoff) {
      throw new Error("Cannot push without an active handoff");
    }
    void client.pushHandoff({ handoffId: activeHandoff.id });
  }, [activeHandoff, client]);

  const revertFile = useCallback(
    (path: string) => {
      if (!activeHandoff) {
        throw new Error("Cannot revert a file without an active handoff");
      }
      setOpenDiffsByHandoff((current) => ({
        ...current,
        [activeHandoff.id]: sanitizeOpenDiffs(activeHandoff, current[activeHandoff.id]).filter((candidate) => candidate !== path),
      }));
      setActiveTabIdByHandoff((current) => ({
        ...current,
        [activeHandoff.id]:
          current[activeHandoff.id] === diffTabId(path)
            ? sanitizeLastAgentTabId(activeHandoff, lastAgentTabIdByHandoff[activeHandoff.id])
            : current[activeHandoff.id] ?? null,
      }));

      void client.revertFile({
        handoffId: activeHandoff.id,
        path,
      });
    },
    [activeHandoff, client, lastAgentTabIdByHandoff],
  );

  // Show full-page skeleton while the client snapshot is still empty (initial load)
  const isInitialLoad = handoffs.length === 0 && projects.length === 0 && viewModel.repos.length === 0;
  if (isInitialLoad) {
    return (
      <Shell>
        <SPanel>
          <PanelHeaderBar>
            <div style={{ flex: 1 }} />
          </PanelHeaderBar>
          <ScrollBody>
            <SidebarSkeleton />
          </ScrollBody>
        </SPanel>
        <SPanel>
          <PanelHeaderBar>
            <div style={{ flex: 1 }} />
          </PanelHeaderBar>
          <TranscriptSkeleton />
        </SPanel>
        <SPanel>
          <PanelHeaderBar>
            <div style={{ flex: 1 }} />
          </PanelHeaderBar>
          <RightSidebarSkeleton />
        </SPanel>
      </Shell>
    );
  }

  if (!activeHandoff) {
    return (
      <Shell>
        <Sidebar
          workspaceId={workspaceId}
          repoCount={viewModel.repos.length}
          projects={projects}
          activeId=""
          title={sidebarTitle}
          subtitle={sidebarSubtitle}
          actions={sidebarActions}
          onSelect={selectHandoff}
          onCreate={createHandoff}
          onMarkUnread={markHandoffUnread}
          onRenameHandoff={renameHandoff}
          onRenameBranch={renameBranch}
        />
        <SPanel>
          <ScrollBody>
            <div
              style={{
                minHeight: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px",
              }}
            >
              <div
                style={{
                  maxWidth: "420px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Create your first handoff</h2>
                <p style={{ margin: 0, opacity: 0.75 }}>
                  {viewModel.repos.length > 0
                    ? "Start from the sidebar to create a handoff on the first available repo."
                    : "No repos are available in this workspace yet."}
                </p>
                <button
                  type="button"
                  onClick={createHandoff}
                  disabled={viewModel.repos.length === 0}
                  style={{
                    alignSelf: "center",
                    border: 0,
                    borderRadius: "999px",
                    padding: "10px 18px",
                    background: viewModel.repos.length > 0 ? "#ff4f00" : "#444",
                    color: "#fff",
                    cursor: viewModel.repos.length > 0 ? "pointer" : "not-allowed",
                    fontWeight: 600,
                  }}
                >
                  New handoff
                </button>
              </div>
            </div>
          </ScrollBody>
        </SPanel>
        <SPanel />
      </Shell>
    );
  }

  return (
    <Shell>
      <Sidebar
        workspaceId={workspaceId}
        repoCount={viewModel.repos.length}
        projects={projects}
        activeId={activeHandoff.id}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        actions={sidebarActions}
        onSelect={selectHandoff}
        onCreate={createHandoff}
        onMarkUnread={markHandoffUnread}
        onRenameHandoff={renameHandoff}
        onRenameBranch={renameBranch}
      />
      <TranscriptPanel
        client={client}
        handoff={activeHandoff}
        activeTabId={activeTabId}
        lastAgentTabId={lastAgentTabId}
        openDiffs={openDiffs}
        onSyncRouteSession={syncRouteSession}
        onSetActiveTabId={(tabId) => {
          setActiveTabIdByHandoff((current) => ({ ...current, [activeHandoff.id]: tabId }));
        }}
        onSetLastAgentTabId={(tabId) => {
          setLastAgentTabIdByHandoff((current) => ({ ...current, [activeHandoff.id]: tabId }));
        }}
        onSetOpenDiffs={(paths) => {
          setOpenDiffsByHandoff((current) => ({ ...current, [activeHandoff.id]: paths }));
        }}
      />
      <RightSidebar
        handoff={activeHandoff}
        activeTabId={activeTabId}
        onOpenDiff={openDiffTab}
        onArchive={archiveHandoff}
        onPush={pushHandoff}
        onRevertFile={revertFile}
        onPublishPr={publishPr}
      />
    </Shell>
  );
}
