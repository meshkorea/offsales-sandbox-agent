import { createMockBackendClient } from "../mock/backend-client.js";
import { RemoteInterestManager } from "./remote-manager.js";

/**
 * Mock implementation shares the same interest-manager harness as the remote
 * path, but uses the in-memory mock backend that synthesizes actor events.
 */
export class MockInterestManager extends RemoteInterestManager {
  constructor() {
    super(createMockBackendClient());
  }
}
