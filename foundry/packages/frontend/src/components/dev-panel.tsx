import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useStyletron } from "baseui";
import { useFoundryTokens } from "../app/theme";
import { isMockFrontendClient } from "../lib/env";
import type { TaskWorkbenchSnapshot, WorkbenchTask } from "@sandbox-agent/foundry-shared";

interface DevPanelProps {
  workspaceId: string;
  snapshot: TaskWorkbenchSnapshot;
}

interface TopicInfo {
  label: string;
  key: string;
  listenerCount: number;
  hasConnection: boolean;
  lastRefresh: number | null;
}

function timeAgo(ts: number | null): string {
  if (!ts) return "never";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function taskStatusLabel(task: WorkbenchTask): string {
  if (task.status === "archived") return "archived";
  const hasRunning = task.tabs?.some((tab) => tab.status === "running");
  if (hasRunning) return "running";
  return task.status ?? "idle";
}

function statusColor(status: string, t: ReturnType<typeof useFoundryTokens>): string {
  switch (status) {
    case "running":
      return t.statusSuccess;
    case "archived":
      return t.textMuted;
    case "error":
    case "failed":
      return t.statusError;
    default:
      return t.textTertiary;
  }
}

export const DevPanel = memo(function DevPanel({ workspaceId, snapshot }: DevPanelProps) {
  const [css] = useStyletron();
  const t = useFoundryTokens();
  const [now, setNow] = useState(Date.now());

  // Tick every 2s to keep relative timestamps fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  const topics = useMemo((): TopicInfo[] => {
    const items: TopicInfo[] = [];

    // Workbench subscription topic
    items.push({
      label: "Workbench",
      key: `ws:${workspaceId}`,
      listenerCount: 1,
      hasConnection: true,
      lastRefresh: now,
    });

    // Per-task tab subscriptions
    for (const task of snapshot.tasks ?? []) {
      if (task.status === "archived") continue;
      for (const tab of task.tabs ?? []) {
        items.push({
          label: `Tab/${task.title?.slice(0, 16) || task.id.slice(0, 8)}/${tab.sessionName.slice(0, 10)}`,
          key: `${workspaceId}:${task.id}:${tab.id}`,
          listenerCount: 1,
          hasConnection: tab.status === "running",
          lastRefresh: tab.status === "running" ? now : null,
        });
      }
    }

    return items;
  }, [workspaceId, snapshot, now]);

  const tasks = snapshot.tasks ?? [];
  const repos = snapshot.repos ?? [];
  const projects = snapshot.projects ?? [];

  const mono = css({
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace",
    fontSize: "10px",
  });

  return (
    <div
      className={css({
        position: "fixed",
        bottom: "8px",
        right: "8px",
        width: "320px",
        maxHeight: "50vh",
        zIndex: 99999,
        backgroundColor: t.surfaceElevated,
        border: `1px solid ${t.borderMedium}`,
        borderRadius: "6px",
        boxShadow: t.shadow,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      })}
    >
      {/* Header */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          borderBottom: `1px solid ${t.borderSubtle}`,
          backgroundColor: t.surfaceTertiary,
          flexShrink: 0,
        })}
      >
        <span
          className={css({
            fontSize: "10px",
            fontWeight: 600,
            color: t.textSecondary,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          })}
        >
          Dev
          {isMockFrontendClient && <span className={css({ fontSize: "8px", fontWeight: 600, color: t.statusWarning, letterSpacing: "0.3px" })}>MOCK</span>}
        </span>
        <span className={css({ fontSize: "9px", color: t.textMuted })}>Shift+D</span>
      </div>

      {/* Body */}
      <div className={css({ overflowY: "auto", padding: "6px" })}>
        {/* Interest Topics */}
        <Section label="Interest Topics" t={t} css={css}>
          {topics.map((topic) => (
            <div
              key={topic.key}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "2px 0",
              })}
            >
              <span
                className={css({
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: topic.hasConnection ? t.statusSuccess : t.textMuted,
                  flexShrink: 0,
                })}
              />
              <span className={css({ fontSize: "10px", color: t.textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                {topic.label}
              </span>
              <span className={`${mono} ${css({ color: t.textMuted })}`}>{topic.key.length > 24 ? `...${topic.key.slice(-20)}` : topic.key}</span>
              <span className={`${mono} ${css({ color: t.textTertiary })}`}>{timeAgo(topic.lastRefresh)}</span>
            </div>
          ))}
          {topics.length === 0 && <span className={css({ fontSize: "10px", color: t.textMuted })}>No active subscriptions</span>}
        </Section>

        {/* Snapshot Summary */}
        <Section label="Snapshot" t={t} css={css}>
          <div className={css({ display: "flex", gap: "10px", fontSize: "10px" })}>
            <Stat label="repos" value={repos.length} t={t} css={css} />
            <Stat label="projects" value={projects.length} t={t} css={css} />
            <Stat label="tasks" value={tasks.length} t={t} css={css} />
          </div>
        </Section>

        {/* Tasks */}
        {tasks.length > 0 && (
          <Section label="Tasks" t={t} css={css}>
            {tasks.slice(0, 10).map((task) => {
              const status = taskStatusLabel(task);
              return (
                <div
                  key={task.id}
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "1px 0",
                    fontSize: "10px",
                  })}
                >
                  <span
                    className={css({
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      backgroundColor: statusColor(status, t),
                      flexShrink: 0,
                    })}
                  />
                  <span className={css({ color: t.textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                    {task.title || task.id.slice(0, 12)}
                  </span>
                  <span className={`${mono} ${css({ color: statusColor(status, t) })}`}>{status}</span>
                  <span className={`${mono} ${css({ color: t.textMuted })}`}>{task.tabs?.length ?? 0} tabs</span>
                </div>
              );
            })}
          </Section>
        )}

        {/* Workspace */}
        <Section label="Workspace" t={t} css={css}>
          <div className={`${mono} ${css({ color: t.textTertiary })}`}>{workspaceId}</div>
        </Section>
      </div>
    </div>
  );
});

function Section({
  label,
  t,
  css: cssFn,
  children,
}: {
  label: string;
  t: ReturnType<typeof useFoundryTokens>;
  css: ReturnType<typeof useStyletron>[0];
  children: React.ReactNode;
}) {
  return (
    <div className={cssFn({ marginBottom: "6px" })}>
      <div
        className={cssFn({
          fontSize: "9px",
          fontWeight: 600,
          color: t.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "2px",
        })}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  t,
  css: cssFn,
}: {
  label: string;
  value: number;
  t: ReturnType<typeof useFoundryTokens>;
  css: ReturnType<typeof useStyletron>[0];
}) {
  return (
    <span>
      <span className={cssFn({ fontWeight: 600, color: t.textPrimary })}>{value}</span>
      <span className={cssFn({ color: t.textTertiary, marginLeft: "2px" })}>{label}</span>
    </span>
  );
}

export function useDevPanel() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "D" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setVisible((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return visible;
}
