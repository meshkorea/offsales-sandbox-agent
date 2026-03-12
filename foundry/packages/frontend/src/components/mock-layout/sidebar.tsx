import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useStyletron } from "baseui";
import { LabelSmall, LabelXSmall } from "baseui/typography";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CloudUpload,
  CreditCard,
  GitPullRequestDraft,
  ListChecks,
  LogOut,
  PanelLeft,
  Plus,
  Settings,
  User,
} from "lucide-react";

import { formatRelativeAge, type Task, type ProjectSection } from "./view-model";
import { ContextMenuOverlay, TaskIndicator, PanelHeaderBar, SPanel, ScrollBody, useContextMenu } from "./ui";
import { activeMockOrganization, eligibleOrganizations, useMockAppClient, useMockAppSnapshot } from "../../lib/mock-app";
import { useFoundryTokens } from "../../app/theme";
import type { FoundryTokens } from "../../styles/tokens";

const PROJECT_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

function projectInitial(label: string): string {
  const parts = label.split("/");
  const name = parts[parts.length - 1] ?? label;
  return name.charAt(0).toUpperCase();
}

function projectIconColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]!;
}

export const Sidebar = memo(function Sidebar({
  projects,
  newTaskRepos,
  selectedNewTaskRepoId,
  activeId,
  onSelect,
  onCreate,
  onSelectNewTaskRepo,
  onMarkUnread,
  onRenameTask,
  onRenameBranch,
  onReorderProjects,
  onToggleSidebar,
}: {
  projects: ProjectSection[];
  newTaskRepos: Array<{ id: string; label: string }>;
  selectedNewTaskRepoId: string;
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onSelectNewTaskRepo: (repoId: string) => void;
  onMarkUnread: (id: string) => void;
  onRenameTask: (id: string) => void;
  onRenameBranch: (id: string) => void;
  onReorderProjects: (fromIndex: number, toIndex: number) => void;
  onToggleSidebar?: () => void;
}) {
  const [css] = useStyletron();
  const t = useFoundryTokens();
  const contextMenu = useContextMenu();
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  return (
    <SPanel>
      <style>{`
        [data-project-header]:hover [data-chevron] {
          display: inline-flex !important;
        }
        [data-project-header]:hover [data-project-icon] {
          display: none !important;
        }
      `}</style>
      {import.meta.env.VITE_DESKTOP ? (
        <div
          className={css({
            height: "38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "10px",
            flexShrink: 0,
            position: "relative",
            zIndex: 9999,
          })}
        >
          {onToggleSidebar ? (
            <div
              role="button"
              tabIndex={0}
              onClick={onToggleSidebar}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onToggleSidebar();
              }}
              className={css({
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                color: t.textTertiary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                ":hover": { color: t.textSecondary, backgroundColor: t.interactiveHover },
              })}
            >
              <PanelLeft size={14} />
            </div>
          ) : null}
        </div>
      ) : null}
      <PanelHeaderBar $style={{ backgroundColor: "transparent", borderBottom: "none" }}>
        <LabelSmall
          color={t.textPrimary}
          $style={{ fontWeight: 500, flex: 1, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", lineHeight: 1 }}
        >
          <ListChecks size={14} />
          Tasks
        </LabelSmall>
        {!import.meta.env.VITE_DESKTOP && onToggleSidebar ? (
          <div
            role="button"
            tabIndex={0}
            onClick={onToggleSidebar}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onToggleSidebar();
            }}
            className={css({
              width: "26px",
              height: "26px",
              borderRadius: "6px",
              color: t.textTertiary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              ":hover": { color: t.textSecondary, backgroundColor: t.interactiveHover },
            })}
          >
            <PanelLeft size={14} />
          </div>
        ) : null}
        <div
          role="button"
          tabIndex={0}
          aria-disabled={newTaskRepos.length === 0}
          onClick={() => {
            if (newTaskRepos.length === 0) {
              return;
            }
            onCreate();
          }}
          onKeyDown={(event) => {
            if (newTaskRepos.length === 0) {
              return;
            }
            if (event.key === "Enter" || event.key === " ") onCreate();
          }}
          className={css({
            width: "26px",
            height: "26px",
            borderRadius: "8px",
            backgroundColor: newTaskRepos.length > 0 ? t.borderMedium : t.interactiveHover,
            color: t.textPrimary,
            cursor: newTaskRepos.length > 0 ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 200ms ease",
            flexShrink: 0,
            opacity: newTaskRepos.length > 0 ? 1 : 0.6,
            ":hover": newTaskRepos.length > 0 ? { backgroundColor: "rgba(255, 255, 255, 0.20)" } : undefined,
          })}
        >
          <Plus size={14} style={{ display: "block" }} />
        </div>
      </PanelHeaderBar>
      <div className={css({ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: "6px" })}>
        <LabelXSmall color={t.textTertiary} $style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Repo
        </LabelXSmall>
        <select
          value={selectedNewTaskRepoId}
          disabled={newTaskRepos.length === 0}
          onChange={(event) => {
            onSelectNewTaskRepo(event.currentTarget.value);
          }}
          className={css({
            width: "100%",
            borderRadius: "8px",
            border: `1px solid ${t.borderDefault}`,
            backgroundColor: t.interactiveHover,
            color: t.textPrimary,
            fontSize: "12px",
            padding: "8px 10px",
            outline: "none",
            cursor: newTaskRepos.length > 0 ? "pointer" : "not-allowed",
            opacity: newTaskRepos.length > 0 ? 1 : 0.6,
          })}
        >
          {newTaskRepos.length === 0 ? <option value="">No repos available</option> : null}
          {newTaskRepos.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.label}
            </option>
          ))}
        </select>
      </div>
      <ScrollBody>
        <div className={css({ padding: "8px", display: "flex", flexDirection: "column", gap: "4px" })}>
          {projects.map((project, projectIndex) => {
            const isCollapsed = collapsedProjects[project.id] === true;
            const isDragOver = dragOverIndex === projectIndex && dragIndexRef.current !== projectIndex;

            return (
              <div
                key={project.id}
                draggable
                onDragStart={(event) => {
                  dragIndexRef.current = projectIndex;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(projectIndex));
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverIndex(projectIndex);
                }}
                onDragLeave={() => {
                  setDragOverIndex((current) => (current === projectIndex ? null : current));
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromIndex = dragIndexRef.current;
                  if (fromIndex != null && fromIndex !== projectIndex) {
                    onReorderProjects(fromIndex, projectIndex);
                  }
                  dragIndexRef.current = null;
                  setDragOverIndex(null);
                }}
                onDragEnd={() => {
                  dragIndexRef.current = null;
                  setDragOverIndex(null);
                }}
                className={css({
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  borderTop: isDragOver ? `2px solid ${t.accent}` : "2px solid transparent",
                  transition: "border-color 150ms ease",
                })}
              >
                <div
                  onClick={() =>
                    setCollapsedProjects((current) => ({
                      ...current,
                      [project.id]: !current[project.id],
                    }))
                  }
                  data-project-header
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 8px 4px",
                    gap: "8px",
                    cursor: "grab",
                    userSelect: "none",
                    ":hover": { opacity: 0.8 },
                  })}
                >
                  <div className={css({ display: "flex", alignItems: "center", gap: "4px", overflow: "hidden" })}>
                    <div className={css({ position: "relative", width: "14px", height: "14px", flexShrink: 0 })}>
                      <span
                        className={css({
                          position: "absolute",
                          inset: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "3px",
                          fontSize: "9px",
                          fontWeight: 700,
                          lineHeight: 1,
                          color: t.textOnAccent,
                          backgroundColor: projectIconColor(project.label),
                        })}
                        data-project-icon
                      >
                        {projectInitial(project.label)}
                      </span>
                      <span className={css({ position: "absolute", inset: 0, display: "none", alignItems: "center", justifyContent: "center" })} data-chevron>
                        {isCollapsed ? <ChevronDown size={12} color={t.textTertiary} /> : <ChevronUp size={12} color={t.textTertiary} />}
                      </span>
                    </div>
                    <LabelSmall
                      color={t.textSecondary}
                      $style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {project.label}
                    </LabelSmall>
                  </div>
                  {isCollapsed ? <LabelXSmall color={t.textTertiary}>{formatRelativeAge(project.updatedAtMs)}</LabelXSmall> : null}
                </div>

                {!isCollapsed &&
                  project.tasks.map((task) => {
                    const isActive = task.id === activeId;
                    const isDim = task.status === "archived";
                    const isRunning = task.tabs.some((tab) => tab.status === "running");
                    const hasUnread = task.tabs.some((tab) => tab.unread);
                    const isDraft = task.pullRequest == null || task.pullRequest.status === "draft";
                    const totalAdded = task.fileChanges.reduce((sum, file) => sum + file.added, 0);
                    const totalRemoved = task.fileChanges.reduce((sum, file) => sum + file.removed, 0);
                    const hasDiffs = totalAdded > 0 || totalRemoved > 0;

                    return (
                      <div
                        key={task.id}
                        onClick={() => onSelect(task.id)}
                        onContextMenu={(event) =>
                          contextMenu.open(event, [
                            { label: "Rename task", onClick: () => onRenameTask(task.id) },
                            { label: "Rename branch", onClick: () => onRenameBranch(task.id) },
                            { label: "Mark as unread", onClick: () => onMarkUnread(task.id) },
                          ])
                        }
                        className={css({
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid transparent",
                          backgroundColor: isActive ? t.interactiveHover : "transparent",
                          cursor: "pointer",
                          transition: "all 200ms ease",
                          ":hover": {
                            backgroundColor: t.interactiveHover,
                          },
                        })}
                      >
                        <div className={css({ display: "flex", alignItems: "center", gap: "8px" })}>
                          <div
                            className={css({
                              width: "14px",
                              minWidth: "14px",
                              height: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            })}
                          >
                            <TaskIndicator isRunning={isRunning} hasUnread={hasUnread} isDraft={isDraft} />
                          </div>
                          <LabelSmall
                            $style={{
                              fontWeight: hasUnread ? 600 : 400,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              minWidth: 0,
                              flexShrink: 1,
                            }}
                            color={hasUnread ? t.textPrimary : t.textSecondary}
                          >
                            {task.title}
                          </LabelSmall>
                          {task.pullRequest != null ? (
                            <span className={css({ display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0 })}>
                              <LabelXSmall color={t.textSecondary} $style={{ fontWeight: 600 }}>
                                #{task.pullRequest.number}
                              </LabelXSmall>
                              {task.pullRequest.status === "draft" ? <CloudUpload size={11} color={t.accent} /> : null}
                            </span>
                          ) : (
                            <GitPullRequestDraft size={11} color={t.textTertiary} />
                          )}
                          {hasDiffs ? (
                            <div className={css({ display: "flex", gap: "4px", flexShrink: 0, marginLeft: "auto" })}>
                              <span className={css({ fontSize: "11px", color: t.statusSuccess })}>+{totalAdded}</span>
                              <span className={css({ fontSize: "11px", color: t.statusError })}>-{totalRemoved}</span>
                            </div>
                          ) : null}
                          <LabelXSmall color={t.textTertiary} $style={{ flexShrink: 0, marginLeft: hasDiffs ? undefined : "auto" }}>
                            {formatRelativeAge(task.updatedAtMs)}
                          </LabelXSmall>
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </ScrollBody>
      <SidebarFooter />
      {contextMenu.menu ? <ContextMenuOverlay menu={contextMenu.menu} onClose={contextMenu.close} /> : null}
    </SPanel>
  );
});

const menuButtonStyle = (highlight: boolean, tokens: FoundryTokens) =>
  ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "none",
    background: highlight ? tokens.interactiveHover : "transparent",
    color: tokens.textSecondary,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 400 as const,
    textAlign: "left" as const,
    transition: "background 120ms ease, color 120ms ease",
  }) satisfies React.CSSProperties;

function SidebarFooter() {
  const [css] = useStyletron();
  const t = useFoundryTokens();
  const navigate = useNavigate();
  const client = useMockAppClient();
  const snapshot = useMockAppSnapshot();
  const organization = activeMockOrganization(snapshot);
  const [open, setOpen] = useState(false);
  const [workspaceFlyoutOpen, setWorkspaceFlyoutOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const flyoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceTriggerRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (workspaceFlyoutOpen && workspaceTriggerRef.current) {
      const rect = workspaceTriggerRef.current.getBoundingClientRect();
      setFlyoutPos({ top: rect.top, left: rect.right + 4 });
    }
  }, [workspaceFlyoutOpen]);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inFlyout = flyoutRef.current?.contains(target);
      if (!inContainer && !inFlyout) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        setOpen(false);
        setWorkspaceFlyoutOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const switchToOrg = useCallback(
    (org: (typeof snapshot.organizations)[number]) => {
      setOpen(false);
      setWorkspaceFlyoutOpen(false);
      void (async () => {
        await client.selectOrganization(org.id);
        await navigate({ to: `/workspaces/${org.workspaceId}` as never });
      })();
    },
    [client, navigate],
  );

  const openFlyout = useCallback(() => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
    setWorkspaceFlyoutOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    flyoutTimerRef.current = setTimeout(() => setWorkspaceFlyoutOpen(false), 150);
  }, []);

  const menuItems: Array<{ icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }> = [];

  if (organization) {
    menuItems.push(
      {
        icon: <Settings size={14} />,
        label: "Settings",
        onClick: () => {
          setOpen(false);
          void navigate({ to: "/organizations/$organizationId/settings" as never, params: { organizationId: organization.id } as never });
        },
      },
      {
        icon: <CreditCard size={14} />,
        label: "Billing",
        onClick: () => {
          setOpen(false);
          void navigate({ to: "/organizations/$organizationId/billing" as never, params: { organizationId: organization.id } as never });
        },
      },
    );
  }

  menuItems.push(
    {
      icon: <User size={14} />,
      label: "Account",
      onClick: () => {
        setOpen(false);
        void navigate({ to: "/account" as never });
      },
    },
    {
      icon: <LogOut size={14} />,
      label: "Sign Out",
      danger: true,
      onClick: () => {
        setOpen(false);
        void (async () => {
          await client.signOut();
          await navigate({ to: "/signin" });
        })();
      },
    },
  );

  const popoverStyle = css({
    borderRadius: "10px",
    border: `1px solid ${t.borderDefault}`,
    backgroundColor: t.surfaceElevated,
    boxShadow: `${t.shadow}, 0 0 0 1px ${t.interactiveSubtle}`,
    padding: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  });

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => setOpen(true), 300);
      }}
      onMouseLeave={() => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
          setOpen(false);
          setWorkspaceFlyoutOpen(false);
        }, 200);
      }}
      className={css({ position: "relative", flexShrink: 0 })}
    >
      {open ? (
        <div
          className={css({
            position: "absolute",
            bottom: "100%",
            left: "8px",
            right: "8px",
            marginBottom: "4px",
            zIndex: 9999,
          })}
        >
          <div className={popoverStyle}>
            {/* Workspace flyout trigger */}
            {organization ? (
              <div ref={workspaceTriggerRef} onMouseEnter={openFlyout} onMouseLeave={closeFlyout}>
                <button
                  type="button"
                  onClick={() => setWorkspaceFlyoutOpen((prev) => !prev)}
                  className={css({
                    ...menuButtonStyle(workspaceFlyoutOpen, t),
                    fontWeight: 500,
                    ":hover": {
                      backgroundColor: t.interactiveHover,
                      color: t.textPrimary,
                    },
                  })}
                >
                  <span
                    className={css({
                      width: "18px",
                      height: "18px",
                      borderRadius: "4px",
                      background: `linear-gradient(135deg, ${projectIconColor(organization.settings.displayName)}, ${projectIconColor(organization.settings.displayName + "x")})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontWeight: 700,
                      color: t.textOnAccent,
                      flexShrink: 0,
                    })}
                  >
                    {organization.settings.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className={css({ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                    {organization.settings.displayName}
                  </span>
                  <ChevronRight size={12} className={css({ flexShrink: 0, color: t.textMuted })} />
                </button>
              </div>
            ) : null}

            {/* Workspace flyout portal */}
            {workspaceFlyoutOpen && organization && flyoutPos
              ? createPortal(
                  <div
                    ref={flyoutRef}
                    className={css({
                      position: "fixed",
                      top: `${flyoutPos.top}px`,
                      left: `${flyoutPos.left}px`,
                      minWidth: "200px",
                      zIndex: 10000,
                    })}
                    onMouseEnter={() => {
                      openFlyout();
                      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                    }}
                    onMouseLeave={() => {
                      closeFlyout();
                      hoverTimerRef.current = setTimeout(() => {
                        setOpen(false);
                        setWorkspaceFlyoutOpen(false);
                      }, 200);
                    }}
                  >
                    <div className={popoverStyle}>
                      {eligibleOrganizations(snapshot).map((org) => {
                        const isActive = organization.id === org.id;
                        return (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => {
                              if (!isActive) switchToOrg(org);
                              else {
                                setOpen(false);
                                setWorkspaceFlyoutOpen(false);
                              }
                            }}
                            className={css({
                              ...menuButtonStyle(isActive, t),
                              fontWeight: isActive ? 600 : 400,
                              color: isActive ? t.textPrimary : t.textTertiary,
                              ":hover": {
                                backgroundColor: t.interactiveHover,
                                color: t.textPrimary,
                              },
                            })}
                          >
                            <span
                              className={css({
                                width: "18px",
                                height: "18px",
                                borderRadius: "4px",
                                background: `linear-gradient(135deg, ${projectIconColor(org.settings.displayName)}, ${projectIconColor(org.settings.displayName + "x")})`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "9px",
                                fontWeight: 700,
                                color: t.textOnAccent,
                                flexShrink: 0,
                              })}
                            >
                              {org.settings.displayName.charAt(0).toUpperCase()}
                            </span>
                            <span className={css({ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                              {org.settings.displayName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>,
                  document.body,
                )
              : null}

            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={css({
                  ...menuButtonStyle(false, t),
                  color: item.danger ? t.statusError : t.textSecondary,
                  ":hover": {
                    backgroundColor: t.interactiveHover,
                    color: item.danger ? t.statusError : t.textPrimary,
                  },
                })}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className={css({ padding: "8px" })}>
        <button
          type="button"
          onClick={() => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            setOpen((prev) => {
              if (prev) setWorkspaceFlyoutOpen(false);
              return !prev;
            });
          }}
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            border: "none",
            background: open ? t.interactiveHover : "transparent",
            color: open ? t.textPrimary : t.textTertiary,
            cursor: "pointer",
            transition: "all 160ms ease",
            ":hover": {
              backgroundColor: t.interactiveHover,
              color: t.textSecondary,
            },
          })}
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
