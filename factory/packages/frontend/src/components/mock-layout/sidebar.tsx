import { memo, useState } from "react";
import { useStyletron } from "baseui";
import { LabelSmall, LabelXSmall } from "baseui/typography";
import { CloudUpload, GitPullRequestDraft, Plus } from "lucide-react";

import { formatRelativeAge, type Handoff, type ProjectSection } from "./view-model";
import {
  ContextMenuOverlay,
  HandoffIndicator,
  PanelHeaderBar,
  SPanel,
  ScrollBody,
  useContextMenu,
} from "./ui";

export const Sidebar = memo(function Sidebar({
  workspaceId,
  repoCount,
  projects,
  activeId,
  onSelect,
  onCreate,
  onMarkUnread,
  onRenameHandoff,
  onRenameBranch,
}: {
  workspaceId: string;
  repoCount: number;
  projects: ProjectSection[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onMarkUnread: (id: string) => void;
  onRenameHandoff: (id: string) => void;
  onRenameBranch: (id: string) => void;
}) {
  const [css, theme] = useStyletron();
  const contextMenu = useContextMenu();
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  return (
    <SPanel>
      <PanelHeaderBar>
        <div className={css({ flex: 1, minWidth: 0 })}>
          <LabelSmall color={theme.colors.contentPrimary} $style={{ fontWeight: 600, fontSize: "13px" }}>
            {workspaceId}
          </LabelSmall>
          <LabelXSmall color={theme.colors.contentTertiary}>
            {repoCount} {repoCount === 1 ? "repo" : "repos"}
          </LabelXSmall>
        </div>
        <button
          onClick={onCreate}
          aria-label="Create handoff"
          className={css({
            all: "unset",
            width: "24px",
            height: "24px",
            borderRadius: "4px",
            backgroundColor: "#ff4f00",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 200ms ease",
            ":hover": { backgroundColor: "#ff6a00" },
          })}
        >
          <Plus size={14} />
        </button>
      </PanelHeaderBar>
      <ScrollBody>
        <div className={css({ padding: "8px", display: "flex", flexDirection: "column", gap: "4px" })}>
          {projects.map((project) => {
            const visibleCount = expandedProjects[project.id] ? project.handoffs.length : Math.min(project.handoffs.length, 5);
            const hiddenCount = Math.max(0, project.handoffs.length - visibleCount);

            return (
              <div key={project.id} className={css({ display: "flex", flexDirection: "column", gap: "4px" })}>
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 8px 4px",
                    gap: "8px",
                  })}
                >
                  <LabelSmall
                    color={theme.colors.contentSecondary}
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
                  <LabelXSmall color={theme.colors.contentTertiary}>
                    {project.updatedAtMs > 0 ? formatRelativeAge(project.updatedAtMs) : "No handoffs"}
                  </LabelXSmall>
                </div>

                {project.handoffs.length === 0 ? (
                  <div
                    className={css({
                      padding: "0 12px 10px 34px",
                      color: theme.colors.contentTertiary,
                      fontSize: "12px",
                    })}
                  >
                    No handoffs yet
                  </div>
                ) : null}

                {project.handoffs.slice(0, visibleCount).map((handoff) => {
            const isActive = handoff.id === activeId;
            const isDim = handoff.status === "archived";
            const isRunning = handoff.tabs.some((tab) => tab.status === "running");
            const hasUnread = handoff.tabs.some((tab) => tab.unread);
            const isDraft = handoff.pullRequest == null || handoff.pullRequest.status === "draft";
            const totalAdded = handoff.fileChanges.reduce((sum, file) => sum + file.added, 0);
            const totalRemoved = handoff.fileChanges.reduce((sum, file) => sum + file.removed, 0);
            const hasDiffs = totalAdded > 0 || totalRemoved > 0;

            return (
              <div
                key={handoff.id}
                onClick={() => onSelect(handoff.id)}
                onContextMenu={(event) =>
                  contextMenu.open(event, [
                    { label: "Rename handoff", onClick: () => onRenameHandoff(handoff.id) },
                    { label: "Rename branch", onClick: () => onRenameBranch(handoff.id) },
                    { label: "Mark as unread", onClick: () => onMarkUnread(handoff.id) },
                  ])
                }
                className={css({
                  padding: "12px",
                  borderRadius: "8px",
                  border: isActive ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid transparent",
                  backgroundColor: isActive ? "rgba(255, 255, 255, 0.06)" : "transparent",
                  cursor: "pointer",
                  transition: "all 200ms ease",
                  ":hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    borderColor: theme.colors.borderOpaque,
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
                    <HandoffIndicator isRunning={isRunning} hasUnread={hasUnread} isDraft={isDraft} />
                  </div>
                  <LabelSmall
                    $style={{
                      fontWeight: 600,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    color={isDim ? theme.colors.contentSecondary : theme.colors.contentPrimary}
                  >
                    {handoff.title}
                  </LabelSmall>
                  {hasDiffs ? (
                    <div className={css({ display: "flex", gap: "4px", flexShrink: 0 })}>
                      <span className={css({ fontSize: "11px", color: "#7ee787" })}>+{totalAdded}</span>
                      <span className={css({ fontSize: "11px", color: "#ffa198" })}>-{totalRemoved}</span>
                    </div>
                  ) : null}
                </div>
                <div className={css({ display: "flex", alignItems: "center", marginTop: "4px", gap: "6px" })}>
                  <LabelXSmall
                    color={theme.colors.contentTertiary}
                    $style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flexShrink: 1,
                    }}
                  >
                    {handoff.repoName}
                  </LabelXSmall>
                  {handoff.pullRequest != null ? (
                    <span className={css({ display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0 })}>
                      <LabelXSmall color={theme.colors.contentSecondary} $style={{ fontWeight: 600 }}>
                        #{handoff.pullRequest.number}
                      </LabelXSmall>
                      {handoff.pullRequest.status === "draft" ? <CloudUpload size={11} color="#ff4f00" /> : null}
                    </span>
                  ) : (
                    <GitPullRequestDraft size={11} color={theme.colors.contentTertiary} />
                  )}
                  <LabelXSmall color={theme.colors.contentTertiary} $style={{ marginLeft: "auto", flexShrink: 0 }}>
                    {formatRelativeAge(handoff.updatedAtMs)}
                  </LabelXSmall>
                </div>
              </div>
            );
                })}

                {hiddenCount > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedProjects((current) => ({
                        ...current,
                        [project.id]: true,
                      }))
                    }
                    className={css({
                      all: "unset",
                      padding: "8px 12px 10px 34px",
                      color: theme.colors.contentSecondary,
                      fontSize: "12px",
                      cursor: "pointer",
                      ":hover": { color: theme.colors.contentPrimary },
                    })}
                  >
                    Show {hiddenCount} more
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </ScrollBody>
      {contextMenu.menu ? <ContextMenuOverlay menu={contextMenu.menu} onClose={contextMenu.close} /> : null}
    </SPanel>
  );
});
