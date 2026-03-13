import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Bug, RefreshCw, Wifi } from "lucide-react";
import { useFoundryTokens } from "../app/theme";
import { isMockFrontendClient } from "../lib/env";
import { activeMockOrganization, activeMockUser, eligibleOrganizations, useMockAppClient, useMockAppSnapshot } from "../lib/mock-app";

const DEV_PANEL_STORAGE_KEY = "sandbox-agent-foundry:dev-panel-visible";

function readStoredVisibility(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const stored = window.localStorage.getItem(DEV_PANEL_STORAGE_KEY);
    return stored == null ? true : stored === "true";
  } catch {
    return true;
  }
}

function writeStoredVisibility(value: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(DEV_PANEL_STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}

function sectionStyle(borderColor: string, background: string) {
  return {
    display: "grid",
    gap: "10px",
    padding: "12px",
    borderRadius: "12px",
    border: `1px solid ${borderColor}`,
    background,
  } as const;
}

function labelStyle(color: string) {
  return {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    color,
  };
}

function mergedRouteParams(matches: Array<{ params: Record<string, unknown> }>): Record<string, string> {
  return matches.reduce<Record<string, string>>((acc, match) => {
    for (const [key, value] of Object.entries(match.params)) {
      if (typeof value === "string" && value.length > 0) {
        acc[key] = value;
      }
    }
    return acc;
  }, {});
}

export function DevPanel() {
  if (!import.meta.env.DEV) {
    return null;
  }

  const client = useMockAppClient();
  const snapshot = useMockAppSnapshot();
  const organization = activeMockOrganization(snapshot);
  const user = activeMockUser(snapshot);
  const organizations = eligibleOrganizations(snapshot);
  const t = useFoundryTokens();
  const routeContext = useRouterState({
    select: (state) => ({
      location: state.location,
      params: mergedRouteParams(state.matches as Array<{ params: Record<string, unknown> }>),
    }),
  });
  const [visible, setVisible] = useState<boolean>(() => readStoredVisibility());

  useEffect(() => {
    writeStoredVisibility(visible);
  }, [visible]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setVisible((current) => !current);
      }
      if (event.key === "Escape") {
        setVisible(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const modeLabel = isMockFrontendClient ? "Mock" : "Live";
  const selectedWorkspaceId = routeContext.params.workspaceId ?? null;
  const selectedTaskId = routeContext.params.taskId ?? null;
  const selectedRepoId = routeContext.params.repoId ?? null;
  const selectedSessionId =
    routeContext.location.search && typeof routeContext.location.search === "object" && "sessionId" in routeContext.location.search
      ? (((routeContext.location.search as Record<string, unknown>).sessionId as string | undefined) ?? null)
      : null;
  const contextOrganization =
    (routeContext.params.organizationId ? (snapshot.organizations.find((candidate) => candidate.id === routeContext.params.organizationId) ?? null) : null) ??
    (selectedWorkspaceId ? (snapshot.organizations.find((candidate) => candidate.workspaceId === selectedWorkspaceId) ?? null) : null) ??
    organization;
  const github = contextOrganization?.github ?? null;

  const pillButtonStyle = useCallback(
    (active = false) =>
      ({
        border: `1px solid ${active ? t.accent : t.borderDefault}`,
        background: active ? t.surfacePrimary : t.surfaceSecondary,
        color: t.textPrimary,
        borderRadius: "999px",
        padding: "6px 10px",
        fontSize: "11px",
        fontWeight: 600,
        cursor: "pointer",
      }) as const,
    [t],
  );

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        style={{
          position: "fixed",
          right: "16px",
          bottom: "16px",
          zIndex: 1000,
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          border: `1px solid ${t.borderDefault}`,
          background: "rgba(9, 9, 11, 0.78)",
          color: t.textPrimary,
          borderRadius: "999px",
          padding: "9px 12px",
          boxShadow: "0 18px 40px rgba(0, 0, 0, 0.22)",
          cursor: "pointer",
        }}
      >
        <Bug size={14} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", lineHeight: 1 }}>
          <span style={{ color: t.textSecondary }}>Show Dev Panel</span>
          <span
            style={{
              padding: "4px 7px",
              borderRadius: "999px",
              border: `1px solid ${t.borderDefault}`,
              background: "rgba(255, 255, 255, 0.04)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.03em",
            }}
          >
            Shift+D
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        right: "16px",
        bottom: "16px",
        width: "360px",
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        zIndex: 1000,
        borderRadius: "18px",
        border: `1px solid ${t.borderDefault}`,
        background: t.surfacePrimary,
        color: t.textPrimary,
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: `1px solid ${t.borderDefault}`,
          background: t.surfacePrimary,
        }}
      >
        <div style={{ display: "grid", gap: "2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bug size={14} />
            <strong style={{ fontSize: "13px" }}>Dev Panel</strong>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: t.textMuted,
              }}
            >
              {modeLabel}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: t.textMuted }}>{routeContext.location.pathname}</div>
        </div>
        <button type="button" onClick={() => setVisible(false)} style={pillButtonStyle()}>
          Hide
        </button>
      </div>

      <div style={{ display: "grid", gap: "12px", padding: "14px" }}>
        <div style={sectionStyle(t.borderSubtle, t.surfaceSecondary)}>
          <div style={labelStyle(t.textMuted)}>Context</div>
          <div style={{ display: "grid", gap: "4px", fontSize: "12px" }}>
            <div>Organization: {contextOrganization?.settings.displayName ?? "None selected"}</div>
            <div>Workspace: {selectedWorkspaceId ?? "None selected"}</div>
            <div>Task: {selectedTaskId ?? "None selected"}</div>
            <div>Repo: {selectedRepoId ?? "None selected"}</div>
            <div>Session: {selectedSessionId ?? "None selected"}</div>
          </div>
        </div>

        <div style={sectionStyle(t.borderSubtle, t.surfaceSecondary)}>
          <div style={labelStyle(t.textMuted)}>Session</div>
          <div style={{ display: "grid", gap: "4px", fontSize: "12px" }}>
            <div>Auth: {snapshot.auth.status}</div>
            <div>User: {user ? `${user.name} (@${user.githubLogin})` : "None"}</div>
            <div>Active org: {organization?.settings.displayName ?? "None selected"}</div>
          </div>
          {isMockFrontendClient ? (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {snapshot.auth.status === "signed_in" ? (
                <button type="button" onClick={() => void client.signOut()} style={pillButtonStyle()}>
                  Sign out
                </button>
              ) : (
                snapshot.users.map((candidate) => (
                  <button key={candidate.id} type="button" onClick={() => void client.signInWithGithub(candidate.id)} style={pillButtonStyle()}>
                    Sign in as {candidate.githubLogin}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div style={sectionStyle(t.borderSubtle, t.surfaceSecondary)}>
          <div style={labelStyle(t.textMuted)}>GitHub</div>
          <div style={{ display: "grid", gap: "4px", fontSize: "12px" }}>
            <div>Installation: {github?.installationStatus ?? "n/a"}</div>
            <div>Sync: {github?.syncStatus ?? "n/a"}</div>
            <div>Repos: {github?.importedRepoCount ?? 0}</div>
            <div>Last sync: {github?.lastSyncLabel ?? "n/a"}</div>
          </div>
          {contextOrganization ? (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => void client.triggerGithubSync(contextOrganization.id)} style={pillButtonStyle()}>
                <RefreshCw size={12} style={{ marginRight: "6px", verticalAlign: "text-bottom" }} />
                Sync
              </button>
              <button type="button" onClick={() => void client.reconnectGithub(contextOrganization.id)} style={pillButtonStyle()}>
                <Wifi size={12} style={{ marginRight: "6px", verticalAlign: "text-bottom" }} />
                Reconnect
              </button>
            </div>
          ) : null}
        </div>

        {isMockFrontendClient && organizations.length > 0 ? (
          <div style={sectionStyle(t.borderSubtle, t.surfaceSecondary)}>
            <div style={labelStyle(t.textMuted)}>Mock Organization</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {organizations.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => void client.selectOrganization(candidate.id)}
                  style={pillButtonStyle(contextOrganization?.id === candidate.id)}
                >
                  {candidate.settings.displayName}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
