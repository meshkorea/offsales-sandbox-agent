export interface SandboxProvider {
  /** Provider name. Must match the prefix in sandbox IDs (for example "e2b"). */
  name: string;

  /** Provision a new sandbox and return the provider-specific ID. */
  create(): Promise<string>;

  /** Permanently tear down a sandbox. */
  destroy(sandboxId: string): Promise<void>;

  /**
   * Return the sandbox-agent base URL for this sandbox.
   * Providers that cannot expose a URL should implement `getFetch()` instead.
   */
  getUrl?(sandboxId: string): Promise<string>;

  /**
   * Return a fetch implementation that routes requests to the sandbox.
   * Providers that expose a URL can implement `getUrl()` instead.
   */
  getFetch?(sandboxId: string): Promise<typeof globalThis.fetch>;

  /**
   * Optional hook invoked before reconnecting to an existing sandbox.
   * Useful for providers where the sandbox-agent process may need to be restarted.
   */
  wake?(sandboxId: string): Promise<void>;
}
