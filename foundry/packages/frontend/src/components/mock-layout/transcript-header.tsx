import { memo } from "react";
import { useStyletron } from "baseui";
import { LabelSmall } from "baseui/typography";
import { Clock, MailOpen, PanelLeft, PanelRight } from "lucide-react";

import { useFoundryTokens } from "../../app/theme";
import { PanelHeaderBar } from "./ui";
import { type AgentTab, type Task } from "./view-model";

export const TranscriptHeader = memo(function TranscriptHeader({
  task,
  activeTab,
  editingField,
  editValue,
  onEditValueChange,
  onStartEditingField,
  onCommitEditingField,
  onCancelEditingField,
  onSetActiveTabUnread,
  sidebarCollapsed,
  onToggleSidebar,
  onSidebarPeekStart,
  onSidebarPeekEnd,
  rightSidebarCollapsed,
  onToggleRightSidebar,
}: {
  task: Task;
  activeTab: AgentTab | null | undefined;
  editingField: "title" | "branch" | null;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEditingField: (field: "title" | "branch", value: string) => void;
  onCommitEditingField: (field: "title" | "branch") => void;
  onCancelEditingField: () => void;
  onSetActiveTabUnread: (unread: boolean) => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onSidebarPeekStart?: () => void;
  onSidebarPeekEnd?: () => void;
  rightSidebarCollapsed?: boolean;
  onToggleRightSidebar?: () => void;
}) {
  const [css] = useStyletron();
  const t = useFoundryTokens();
  const isDesktop = !!import.meta.env.VITE_DESKTOP;
  const needsTrafficLightInset = isDesktop && sidebarCollapsed;

  return (
    <PanelHeaderBar $style={{ backgroundColor: t.surfaceSecondary, borderBottom: "none", paddingLeft: needsTrafficLightInset ? "74px" : "14px" }}>
      {sidebarCollapsed && onToggleSidebar ? (
        <div
          className={css({
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: t.textTertiary,
            flexShrink: 0,
            ":hover": { color: t.textSecondary, backgroundColor: t.interactiveHover },
          })}
          onClick={onToggleSidebar}
          onMouseEnter={onSidebarPeekStart}
          onMouseLeave={onSidebarPeekEnd}
        >
          <PanelLeft size={14} />
        </div>
      ) : null}
      {editingField === "title" ? (
        <input
          autoFocus
          value={editValue}
          onChange={(event) => onEditValueChange(event.target.value)}
          onBlur={() => onCommitEditingField("title")}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onCommitEditingField("title");
            } else if (event.key === "Escape") {
              onCancelEditingField();
            }
          }}
          className={css({
            appearance: "none",
            WebkitAppearance: "none",
            background: "none",
            border: "none",
            padding: "0",
            margin: "0",
            outline: "none",
            fontWeight: 500,
            fontSize: "14px",
            color: t.textPrimary,
            borderBottom: `1px solid ${t.borderFocus}`,
            minWidth: "80px",
            maxWidth: "300px",
          })}
        />
      ) : (
        <LabelSmall
          title="Rename"
          color={t.textPrimary}
          $style={{ fontWeight: 400, whiteSpace: "nowrap", cursor: "pointer", ":hover": { textDecoration: "underline" } }}
          onClick={() => onStartEditingField("title", task.title)}
        >
          {task.title}
        </LabelSmall>
      )}
      {task.branch ? (
        editingField === "branch" ? (
          <input
            autoFocus
            value={editValue}
            onChange={(event) => onEditValueChange(event.target.value)}
            onBlur={() => onCommitEditingField("branch")}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onCommitEditingField("branch");
              } else if (event.key === "Escape") {
                onCancelEditingField();
              }
            }}
            className={css({
              appearance: "none",
              WebkitAppearance: "none",
              background: "none",
              margin: "0",
              outline: "none",
              padding: "2px 8px",
              borderRadius: "999px",
              border: `1px solid ${t.borderFocus}`,
              backgroundColor: t.interactiveSubtle,
              color: t.textPrimary,
              fontSize: "11px",
              whiteSpace: "nowrap",
              fontFamily: '"IBM Plex Mono", monospace',
              minWidth: "60px",
            })}
          />
        ) : (
          <span
            title="Rename"
            onClick={() => onStartEditingField("branch", task.branch ?? "")}
            className={css({
              padding: "2px 8px",
              borderRadius: "999px",
              border: `1px solid ${t.borderMedium}`,
              backgroundColor: t.interactiveSubtle,
              color: t.textPrimary,
              fontSize: "11px",
              whiteSpace: "nowrap",
              fontFamily: '"IBM Plex Mono", monospace',
              cursor: "pointer",
              ":hover": { borderColor: t.borderFocus },
            })}
          >
            {task.branch}
          </span>
        )
      ) : null}
      <div className={css({ flex: 1 })} />
      <div
        className={css({
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 10px",
          borderRadius: "6px",
          backgroundColor: t.interactiveHover,
          border: `1px solid ${t.borderSubtle}`,
          fontSize: "11px",
          fontWeight: 500,
          lineHeight: 1,
          color: t.textSecondary,
          whiteSpace: "nowrap",
        })}
      >
        <Clock size={11} style={{ flexShrink: 0 }} />
        <span>847 min used</span>
      </div>
      {activeTab ? (
        <button
          onClick={() => onSetActiveTabUnread(!activeTab.unread)}
          className={css({
            appearance: "none",
            WebkitAppearance: "none",
            background: "none",
            border: "none",
            margin: "0",
            boxSizing: "border-box",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 500,
            lineHeight: 1,
            color: t.textSecondary,
            cursor: "pointer",
            transition: "all 200ms ease",
            ":hover": { backgroundColor: t.interactiveHover, color: t.textPrimary },
          })}
        >
          <MailOpen size={12} style={{ flexShrink: 0 }} />{" "}
          <span className={css({ "@media screen and (max-width: 768px)": { display: "none" } })}>{activeTab.unread ? "Mark read" : "Mark unread"}</span>
        </button>
      ) : null}
      {rightSidebarCollapsed && onToggleRightSidebar ? (
        <div
          className={css({
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: t.textTertiary,
            flexShrink: 0,
            ":hover": { color: t.textSecondary, backgroundColor: t.interactiveHover },
          })}
          onClick={onToggleRightSidebar}
        >
          <PanelRight size={14} />
        </div>
      ) : null}
    </PanelHeaderBar>
  );
});
