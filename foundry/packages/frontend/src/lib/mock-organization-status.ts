import type { FoundryOrganization } from "@sandbox-agent/foundry-shared";

export type MockOrganizationStatusTone = "info" | "warning" | "error";

export interface MockOrganizationStatus {
  key: "syncing" | "pending" | "sync_error" | "reconnect_required" | "install_required";
  label: string;
  detail: string;
  tone: MockOrganizationStatusTone;
}

export function getMockOrganizationStatus(organization: FoundryOrganization): MockOrganizationStatus | null {
  if (organization.kind === "personal") {
    return null;
  }

  if (organization.github.installationStatus === "reconnect_required") {
    return {
      key: "reconnect_required",
      label: "Connection issue",
      detail: "Reconnect GitHub",
      tone: "error",
    };
  }

  if (organization.github.installationStatus === "install_required") {
    return {
      key: "install_required",
      label: "Link GitHub",
      detail: "Install GitHub App",
      tone: "warning",
    };
  }

  if (organization.github.syncStatus === "syncing") {
    return {
      key: "syncing",
      label: "Syncing",
      detail: "Syncing repositories",
      tone: "info",
    };
  }

  if (organization.github.syncStatus === "pending") {
    return {
      key: "pending",
      label: "Needs sync",
      detail: "Waiting for first sync",
      tone: "warning",
    };
  }

  if (organization.github.syncStatus === "error") {
    return {
      key: "sync_error",
      label: "Sync failed",
      detail: "Last GitHub sync failed",
      tone: "error",
    };
  }

  return null;
}
