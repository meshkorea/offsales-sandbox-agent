import { afterEach, describe, expect, it } from "vitest";
import type { DaytonaClientLike, DaytonaDriver } from "../src/driver.js";
import type { DaytonaCreateSandboxOptions } from "../src/integrations/daytona/client.js";
import { DaytonaProvider } from "../src/providers/daytona/index.js";

interface RecordedFetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  bodyText?: string;
}

class RecordingDaytonaClient implements DaytonaClientLike {
  createSandboxCalls: DaytonaCreateSandboxOptions[] = [];
  getPreviewEndpointCalls: Array<{ sandboxId: string; port: number }> = [];
  executeCommandCalls: Array<{
    sandboxId: string;
    command: string;
    env?: Record<string, string>;
    timeoutSeconds?: number;
  }> = [];

  async createSandbox(options: DaytonaCreateSandboxOptions) {
    this.createSandboxCalls.push(options);
    return {
      id: "sandbox-1",
      state: "started",
      snapshot: "snapshot-foundry",
      labels: {},
    };
  }

  async getSandbox(sandboxId: string) {
    return {
      id: sandboxId,
      state: "started",
      snapshot: "snapshot-foundry",
      labels: {},
    };
  }

  async startSandbox(_sandboxId: string, _timeoutSeconds?: number) {}

  async stopSandbox(_sandboxId: string, _timeoutSeconds?: number) {}

  async deleteSandbox(_sandboxId: string) {}

  async getPreviewEndpoint(sandboxId: string, port: number) {
    this.getPreviewEndpointCalls.push({ sandboxId, port });
    return {
      url: `https://preview.example/sandbox/${sandboxId}/port/${port}`,
      token: "preview-token",
    };
  }

  async executeCommand(sandboxId: string, command: string, env?: Record<string, string>, timeoutSeconds?: number) {
    this.executeCommandCalls.push({ sandboxId, command, env, timeoutSeconds });
    return {
      exitCode: 0,
      result: "",
    };
  }
}

function createProviderWithClient(client: DaytonaClientLike): DaytonaProvider {
  const daytonaDriver: DaytonaDriver = {
    createClient: () => client,
  };

  return new DaytonaProvider(
    {
      apiKey: "test-key",
      image: "ubuntu:24.04",
    },
    daytonaDriver,
  );
}

function withFetchStub(implementation: (call: RecordedFetchCall) => Response | Promise<Response>): () => void {
  const previous = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    const headers = new Headers(init?.headers);
    const headerRecord: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerRecord[key] = value;
    });
    const bodyText = typeof init?.body === "string" ? init.body : init?.body instanceof Uint8Array ? Buffer.from(init.body).toString("utf8") : undefined;
    return await implementation({
      url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
      method: init?.method ?? "GET",
      headers: headerRecord,
      bodyText,
    });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = previous;
  };
}

afterEach(() => {
  delete process.env.HF_SANDBOX_AGENT_ACP_REQUEST_TIMEOUT_MS;
  delete process.env.HF_DAYTONA_REQUEST_TIMEOUT_MS;
});

describe("daytona provider snapshot image behavior", () => {
  it("creates sandboxes using a snapshot-capable image recipe and clones via sandbox-agent process api", async () => {
    const client = new RecordingDaytonaClient();
    const provider = createProviderWithClient(client);
    const fetchCalls: RecordedFetchCall[] = [];
    const restoreFetch = withFetchStub(async (call) => {
      fetchCalls.push(call);

      if (call.url.endsWith("/v1/health")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (call.url.endsWith("/v1/processes/run")) {
        return new Response(JSON.stringify({ exitCode: 0, stdout: "", stderr: "" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`unexpected fetch: ${call.method} ${call.url}`);
    });

    try {
      const handle = await provider.createSandbox({
        workspaceId: "default",
        repoId: "repo-1",
        repoRemote: "https://github.com/acme/repo.git",
        branchName: "feature/test",
        taskId: "task-1",
        githubToken: "github-token",
      });

      expect(client.createSandboxCalls).toHaveLength(1);
      const createCall = client.createSandboxCalls[0];
      if (!createCall) {
        throw new Error("expected create sandbox call");
      }

      expect(typeof createCall.image).not.toBe("string");
      if (typeof createCall.image === "string") {
        throw new Error("expected daytona image recipe object");
      }

      const dockerfile = createCall.image.dockerfile;
      expect(dockerfile).toContain("apt-get install -y curl ca-certificates git openssh-client");
      expect(dockerfile).toContain("deb.nodesource.com/setup_20.x");
      expect(dockerfile).toContain("apt-get install -y nodejs");
      expect(dockerfile).toContain("sandbox-agent/0.3.0/install.sh");
      expect(dockerfile).toContain("sandbox-agent install-agent codex; sandbox-agent install-agent claude");
      expect(dockerfile).not.toContain("|| true");
      expect(dockerfile).not.toContain("ENTRYPOINT [");

      expect(client.getPreviewEndpointCalls).toEqual([{ sandboxId: "sandbox-1", port: 2468 }]);
      expect(client.executeCommandCalls).toHaveLength(1);
      expect(client.executeCommandCalls[0]?.sandboxId).toBe("sandbox-1");
      expect(client.executeCommandCalls[0]?.command).toContain("nohup sandbox-agent server --no-token --host 0.0.0.0 --port 2468");
      expect(fetchCalls.map((call) => `${call.method} ${call.url}`)).toEqual([
        "GET https://preview.example/sandbox/sandbox-1/port/2468/v1/health",
        "POST https://preview.example/sandbox/sandbox-1/port/2468/v1/processes/run",
      ]);

      const runCall = fetchCalls[1];
      if (!runCall?.bodyText) {
        throw new Error("expected process run request body");
      }
      const runBody = JSON.parse(runCall.bodyText) as {
        command: string;
        args: string[];
        env?: Record<string, string>;
      };
      expect(runBody.command).toBe("bash");
      expect(runBody.args).toHaveLength(2);
      expect(runBody.args[0]).toBe("-lc");
      expect(runBody.env).toEqual({
        GITHUB_TOKEN: "github-token",
      });
      expect(runBody.args[1]).toContain("GIT_TERMINAL_PROMPT=0");
      expect(runBody.args[1]).toContain('AUTH_REMOTE="$REMOTE"');
      expect(runBody.args[1]).toContain('git clone "$AUTH_REMOTE"');
      expect(runBody.args[1]).toContain('AUTH_HEADER="$(printf');

      expect(handle.metadata.snapshot).toBe("snapshot-foundry");
      expect(handle.metadata.image).toBe("ubuntu:24.04");
      expect(handle.metadata.cwd).toBe("/home/daytona/foundry/default/repo-1/task-1/repo");
    } finally {
      restoreFetch();
    }
  });

  it("ensures sandbox-agent by checking health through the preview endpoint", async () => {
    process.env.HF_SANDBOX_AGENT_ACP_REQUEST_TIMEOUT_MS = "240000";

    const client = new RecordingDaytonaClient();
    const provider = createProviderWithClient(client);
    const fetchCalls: RecordedFetchCall[] = [];
    const restoreFetch = withFetchStub(async (call) => {
      fetchCalls.push(call);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    try {
      const endpoint = await provider.ensureSandboxAgent({
        workspaceId: "default",
        sandboxId: "sandbox-1",
      });

      expect(endpoint).toEqual({
        endpoint: "https://preview.example/sandbox/sandbox-1/port/2468",
        token: "preview-token",
      });
      expect(client.executeCommandCalls).toHaveLength(1);
      expect(client.executeCommandCalls[0]?.command).toContain("nohup sandbox-agent server --no-token --host 0.0.0.0 --port 2468");
      expect(client.getPreviewEndpointCalls).toEqual([{ sandboxId: "sandbox-1", port: 2468 }]);
      expect(fetchCalls.map((call) => `${call.method} ${call.url}`)).toEqual(["GET https://preview.example/sandbox/sandbox-1/port/2468/v1/health"]);
    } finally {
      restoreFetch();
    }
  });

  it("fails with explicit timeout when daytona createSandbox hangs", async () => {
    process.env.HF_DAYTONA_REQUEST_TIMEOUT_MS = "120";

    const hangingClient: DaytonaClientLike = {
      createSandbox: async () => await new Promise(() => {}),
      getSandbox: async (sandboxId) => ({ id: sandboxId, state: "started" }),
      startSandbox: async () => {},
      stopSandbox: async () => {},
      deleteSandbox: async () => {},
      getPreviewEndpoint: async (sandboxId, port) => ({
        url: `https://preview.example/sandbox/${sandboxId}/port/${port}`,
        token: "preview-token",
      }),
      executeCommand: async () => ({
        exitCode: 0,
        result: "",
      }),
    };

    const restoreFetch = withFetchStub(async () => {
      throw new Error("unexpected fetch");
    });

    try {
      const provider = createProviderWithClient(hangingClient);
      await expect(
        provider.createSandbox({
          workspaceId: "default",
          repoId: "repo-1",
          repoRemote: "https://github.com/acme/repo.git",
          branchName: "feature/test",
          taskId: "task-timeout",
        }),
      ).rejects.toThrow("daytona create sandbox timed out after 120ms");
    } finally {
      restoreFetch();
    }
  });

  it("executes backend-managed sandbox commands through sandbox-agent process api", async () => {
    const client = new RecordingDaytonaClient();
    const provider = createProviderWithClient(client);
    const fetchCalls: RecordedFetchCall[] = [];
    const restoreFetch = withFetchStub(async (call) => {
      fetchCalls.push(call);

      if (call.url.endsWith("/v1/health")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (call.url.endsWith("/v1/processes/run")) {
        return new Response(JSON.stringify({ exitCode: 0, stdout: "backend-push\n", stderr: "" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`unexpected fetch: ${call.method} ${call.url}`);
    });

    try {
      const result = await provider.executeCommand({
        workspaceId: "default",
        sandboxId: "sandbox-1",
        command: "echo backend-push",
        env: { GITHUB_TOKEN: "user-token" },
        label: "manual push",
      });

      expect(result.exitCode).toBe(0);
      expect(result.result).toBe("backend-push\n");
      expect(fetchCalls.map((call) => `${call.method} ${call.url}`)).toEqual([
        "GET https://preview.example/sandbox/sandbox-1/port/2468/v1/health",
        "POST https://preview.example/sandbox/sandbox-1/port/2468/v1/processes/run",
      ]);

      const runCall = fetchCalls[1];
      if (!runCall?.bodyText) {
        throw new Error("expected process run body");
      }
      const runBody = JSON.parse(runCall.bodyText) as {
        command: string;
        args: string[];
        env?: Record<string, string>;
      };
      expect(runBody.command).toBe("bash");
      expect(runBody.args).toEqual(["-lc", "echo backend-push"]);
      expect(runBody.env).toEqual({ GITHUB_TOKEN: "user-token" });
    } finally {
      restoreFetch();
    }
  });
});
