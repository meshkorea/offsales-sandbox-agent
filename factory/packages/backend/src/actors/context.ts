import type { AppConfig } from "@openhandoff/shared";
import type { BackendDriver } from "../driver.js";
import type { NotificationService } from "../notifications/index.js";
import type { ProviderRegistry } from "../providers/index.js";

let runtimeConfig: AppConfig | null = null;
let providerRegistry: ProviderRegistry | null = null;
let notificationService: NotificationService | null = null;
let runtimeDriver: BackendDriver | null = null;

export function initActorRuntimeContext(config: AppConfig, providers: ProviderRegistry, notifications?: NotificationService, driver?: BackendDriver): void {
  runtimeConfig = config;
  providerRegistry = providers;
  notificationService = notifications ?? null;
  runtimeDriver = driver ?? null;
}

export function getActorRuntimeContext(): {
  config: AppConfig;
  providers: ProviderRegistry;
  notifications: NotificationService | null;
  driver: BackendDriver;
} {
  if (!runtimeConfig || !providerRegistry) {
    throw new Error("Actor runtime context not initialized");
  }

  if (!runtimeDriver) {
    throw new Error("Actor runtime context missing driver");
  }

  return {
    config: runtimeConfig,
    providers: providerRegistry,
    notifications: notificationService,
    driver: runtimeDriver,
  };
}
