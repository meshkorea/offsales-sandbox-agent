import type {
  FactoryAppSnapshot,
  FactoryBillingPlanId,
  UpdateFactoryOrganizationProfileInput,
} from "@sandbox-agent/factory-shared";
import type { BackendClient } from "../backend-client.js";
import type { FactoryAppClient } from "../app-client.js";

export interface RemoteFactoryAppClientOptions {
  backend: BackendClient;
}

class RemoteFactoryAppStore implements FactoryAppClient {
  private readonly backend: BackendClient;
  private snapshot: FactoryAppSnapshot = {
    auth: { status: "signed_out", currentUserId: null },
    activeOrganizationId: null,
    users: [],
    organizations: [],
  };
  private readonly listeners = new Set<() => void>();
  private refreshPromise: Promise<void> | null = null;
  private syncPollTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: RemoteFactoryAppClientOptions) {
    this.backend = options.backend;
  }

  getSnapshot(): FactoryAppSnapshot {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    void this.refresh();
    return () => {
      this.listeners.delete(listener);
    };
  }

  async signInWithGithub(userId?: string): Promise<void> {
    void userId;
    await this.backend.signInWithGithub();
  }

  async signOut(): Promise<void> {
    this.snapshot = await this.backend.signOutApp();
    this.notify();
  }

  async selectOrganization(organizationId: string): Promise<void> {
    this.snapshot = await this.backend.selectAppOrganization(organizationId);
    this.notify();
    this.scheduleSyncPollingIfNeeded();
  }

  async updateOrganizationProfile(input: UpdateFactoryOrganizationProfileInput): Promise<void> {
    this.snapshot = await this.backend.updateAppOrganizationProfile(input);
    this.notify();
  }

  async triggerGithubSync(organizationId: string): Promise<void> {
    this.snapshot = await this.backend.triggerAppRepoImport(organizationId);
    this.notify();
    this.scheduleSyncPollingIfNeeded();
  }

  async completeHostedCheckout(organizationId: string, planId: FactoryBillingPlanId): Promise<void> {
    await this.backend.completeAppHostedCheckout(organizationId, planId);
  }

  async openBillingPortal(organizationId: string): Promise<void> {
    await this.backend.openAppBillingPortal(organizationId);
  }

  async cancelScheduledRenewal(organizationId: string): Promise<void> {
    this.snapshot = await this.backend.cancelAppScheduledRenewal(organizationId);
    this.notify();
  }

  async resumeSubscription(organizationId: string): Promise<void> {
    this.snapshot = await this.backend.resumeAppSubscription(organizationId);
    this.notify();
  }

  async reconnectGithub(organizationId: string): Promise<void> {
    await this.backend.reconnectAppGithub(organizationId);
  }

  async recordSeatUsage(workspaceId: string): Promise<void> {
    this.snapshot = await this.backend.recordAppSeatUsage(workspaceId);
    this.notify();
  }

  private scheduleSyncPollingIfNeeded(): void {
    if (this.syncPollTimeout) {
      clearTimeout(this.syncPollTimeout);
      this.syncPollTimeout = null;
    }

    if (!this.snapshot.organizations.some((organization) => organization.github.syncStatus === "syncing")) {
      return;
    }

    this.syncPollTimeout = setTimeout(() => {
      this.syncPollTimeout = null;
      void this.refresh();
    }, 500);
  }

  private async refresh(): Promise<void> {
    if (this.refreshPromise) {
      await this.refreshPromise;
      return;
    }

    this.refreshPromise = (async () => {
      this.snapshot = await this.backend.getAppSnapshot();
      this.notify();
      this.scheduleSyncPollingIfNeeded();
    })().finally(() => {
      this.refreshPromise = null;
    });

    await this.refreshPromise;
  }

  private notify(): void {
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}

export function createRemoteFactoryAppClient(
  options: RemoteFactoryAppClientOptions,
): FactoryAppClient {
  return new RemoteFactoryAppStore(options);
}
