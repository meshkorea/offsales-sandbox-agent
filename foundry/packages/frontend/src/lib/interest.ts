import { MockInterestManager, RemoteInterestManager } from "@sandbox-agent/foundry-client";
import { backendClient } from "./backend";
import { frontendClientMode } from "./env";

export const interestManager = frontendClientMode === "mock" ? new MockInterestManager() : new RemoteInterestManager(backendClient);
