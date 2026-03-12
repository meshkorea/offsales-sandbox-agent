import { setTimeout as delay } from "node:timers/promises";
import type {
  AgentEndpoint,
  AttachTarget,
  AttachTargetRequest,
  CreateSandboxRequest,
  DestroySandboxRequest,
  EnsureAgentRequest,
  ExecuteSandboxCommandRequest,
  ExecuteSandboxCommandResult,
  ProviderCapabilities,
  ReleaseSandboxRequest,
  ResumeSandboxRequest,
  SandboxHandle,
  SandboxHealth,
  SandboxHealthRequest,
  SandboxProvider,
} from "../provider-api/index.js";
import type { DaytonaDriver } from "../../driver.js";
import { Image } from "@daytonaio/sdk";

export interface DaytonaProviderConfig {
  endpoint?: string;
  apiKey?: string;
  image: string;
  target?: string;
  /**
   * Auto-stop interval in minutes. If omitted, Daytona's default applies.
   * Set to `0` to disable auto-stop.
   */
  autoStopInterval?: number;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export class DaytonaProvider implements SandboxProvider {
  constructor(
    private readonly config: DaytonaProviderConfig,
    private readonly daytona?: DaytonaDriver,
  ) {}

  private static readonly SANDBOX_AGENT_PORT = 2468;
  private static readonly SANDBOX_AGENT_VERSION = "0.3.0";
  private static readonly DEFAULT_ACP_REQUEST_TIMEOUT_MS = 120_000;
  private static readonly AGENT_IDS = ["codex", "claude"] as const;
  private static readonly PASSTHROUGH_ENV_KEYS = [
    "ANTHROPIC_API_KEY",
    "CLAUDE_API_KEY",
    "OPENAI_API_KEY",
    "CODEX_API_KEY",
    "OPENCODE_API_KEY",
    "CEREBRAS_API_KEY",
    "GITHUB_TOKEN",
  ] as const;

  private getRequestTimeoutMs(): number {
    const parsed = Number(process.env.HF_DAYTONA_REQUEST_TIMEOUT_MS ?? "120000");
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 120_000;
    }
    return Math.floor(parsed);
  }

  private getAcpRequestTimeoutMs(): number {
    const parsed = Number(process.env.HF_SANDBOX_AGENT_ACP_REQUEST_TIMEOUT_MS ?? DaytonaProvider.DEFAULT_ACP_REQUEST_TIMEOUT_MS.toString());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DaytonaProvider.DEFAULT_ACP_REQUEST_TIMEOUT_MS;
    }
    return Math.floor(parsed);
  }

  private async withTimeout<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const timeoutMs = this.getRequestTimeoutMs();
    let timer: ReturnType<typeof setTimeout> | null = null;

    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`daytona ${label} timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private getClient() {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) {
      return undefined;
    }
    const endpoint = this.config.endpoint?.trim();

    return this.daytona?.createClient({
      ...(endpoint ? { apiUrl: endpoint } : {}),
      apiKey,
      target: this.config.target,
    });
  }

  private requireClient() {
    const client = this.getClient();
    if (client) {
      return client;
    }

    if (!this.daytona) {
      throw new Error("daytona provider requires backend daytona driver");
    }

    throw new Error(
      "daytona provider is not configured: missing apiKey. " +
        "Set HF_DAYTONA_API_KEY (or DAYTONA_API_KEY). " +
        "Optionally set HF_DAYTONA_ENDPOINT (or DAYTONA_ENDPOINT).",
    );
  }

  private async ensureStarted(sandboxId: string): Promise<void> {
    const client = this.requireClient();

    const sandbox = await this.withTimeout("get sandbox", () => client.getSandbox(sandboxId));
    const state = String(sandbox.state ?? "unknown").toLowerCase();
    if (state === "started" || state === "running") {
      return;
    }

    // If the sandbox is stopped (or any non-started state), try starting it.
    // Daytona preserves the filesystem across stop/start, which is what we rely on for faster git setup.
    await this.withTimeout("start sandbox", () => client.startSandbox(sandboxId, 60));
  }

  private buildEnvVars(): Record<string, string> {
    const envVars: Record<string, string> = {};

    for (const key of DaytonaProvider.PASSTHROUGH_ENV_KEYS) {
      const value = process.env[key];
      if (value) {
        envVars[key] = value;
      }
    }

    return envVars;
  }

  private wrapBashScript(script: string): string {
    const compact = script
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("; ");
    return `bash -lc ${shellQuote(compact)}`;
  }

  private buildSnapshotImage() {
    // Use Daytona image build + snapshot caching so base tooling (git + sandbox-agent)
    // is prepared once and reused for subsequent sandboxes.
    // Daytona keeps its own wrapper as PID 1, so sandbox-agent must be started
    // after sandbox creation via the native process API rather than image entrypoint/CMD.
    return Image.base(this.config.image)
      .runCommands(
        "apt-get update && apt-get install -y curl ca-certificates git openssh-client",
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        `curl -fsSL https://releases.rivet.dev/sandbox-agent/${DaytonaProvider.SANDBOX_AGENT_VERSION}/install.sh | sh`,
        `bash -lc 'export PATH="$HOME/.local/bin:$PATH"; sandbox-agent install-agent codex; sandbox-agent install-agent claude'`,
      )
      .env({
        SANDBOX_AGENT_ACP_REQUEST_TIMEOUT_MS: this.getAcpRequestTimeoutMs().toString(),
      });
  }

  private async startSandboxAgent(sandboxId: string): Promise<void> {
    const client = this.requireClient();
    const startScript = [
      "set -euo pipefail",
      'export PATH="$HOME/.local/bin:$PATH"',
      `if ps -ef | grep -F "sandbox-agent server --no-token --host 0.0.0.0 --port ${DaytonaProvider.SANDBOX_AGENT_PORT}" | grep -v grep >/dev/null 2>&1; then exit 0; fi`,
      'rm -f "$HOME/.codex/auth.json" "$HOME/.config/codex/auth.json" /tmp/sandbox-agent.log',
      `nohup sandbox-agent server --no-token --host 0.0.0.0 --port ${DaytonaProvider.SANDBOX_AGENT_PORT} >/tmp/sandbox-agent.log 2>&1 &`,
    ].join("\n");
    const result = await this.withTimeout("start sandbox-agent", () =>
      client.executeCommand(sandboxId, this.wrapBashScript(startScript), undefined, Math.ceil(this.getRequestTimeoutMs() / 1000)),
    );

    if ((result.exitCode ?? 1) !== 0) {
      throw new Error(`daytona start sandbox-agent failed (${result.exitCode ?? "unknown"}): ${result.result ?? ""}`);
    }
  }

  private async getSandboxAgentEndpoint(sandboxId: string, label: string): Promise<AgentEndpoint> {
    const client = this.requireClient();
    const preview = await this.withTimeout(`get preview endpoint (${label})`, () => client.getPreviewEndpoint(sandboxId, DaytonaProvider.SANDBOX_AGENT_PORT));
    return preview.token ? { endpoint: preview.url, token: preview.token } : { endpoint: preview.url };
  }

  private async waitForSandboxAgentHealth(sandboxId: string, label: string): Promise<AgentEndpoint> {
    const deadline = Date.now() + this.getRequestTimeoutMs();
    let lastDetail = "sandbox-agent health unavailable";

    while (Date.now() < deadline) {
      try {
        const endpoint = await this.getSandboxAgentEndpoint(sandboxId, label);
        const response = await fetch(`${endpoint.endpoint.replace(/\/$/, "")}/v1/health`, {
          headers: {
            ...(endpoint.token ? { Authorization: `Bearer ${endpoint.token}` } : {}),
          },
        });
        if (response.ok) {
          return endpoint;
        }
        lastDetail = `${response.status} ${response.statusText}`;
      } catch (error) {
        lastDetail = error instanceof Error ? error.message : String(error);
      }

      await delay(1_000);
    }

    throw new Error(`daytona sandbox-agent ${label} failed health check: ${lastDetail}`);
  }

  private async runViaSandboxAgent(
    endpoint: AgentEndpoint,
    command: string,
    env: Record<string, string> | undefined,
    label: string,
  ): Promise<ExecuteSandboxCommandResult> {
    const response = await this.withTimeout(`execute via sandbox-agent (${label})`, async () => {
      return await fetch(`${endpoint.endpoint.replace(/\/$/, "")}/v1/processes/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(endpoint.token ? { Authorization: `Bearer ${endpoint.token}` } : {}),
        },
        body: JSON.stringify({
          command: "bash",
          args: ["-lc", command],
          ...(env && Object.keys(env).length > 0 ? { env } : {}),
          timeoutMs: this.getRequestTimeoutMs(),
          maxOutputBytes: 1024 * 1024 * 4,
        }),
      });
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`daytona sandbox-agent ${label} failed (${response.status}): ${detail || response.statusText}`);
    }

    const body = (await response.json()) as {
      exitCode?: number | null;
      stdout?: string;
      stderr?: string;
      timedOut?: boolean;
    };

    return {
      exitCode: typeof body.exitCode === "number" ? body.exitCode : body.timedOut ? 124 : 1,
      result: [body.stdout ?? "", body.stderr ?? ""].filter(Boolean).join(""),
    };
  }

  id() {
    return "daytona" as const;
  }

  capabilities(): ProviderCapabilities {
    return {
      remote: true,
      supportsSessionReuse: true,
    };
  }

  async validateConfig(input: unknown): Promise<Record<string, unknown>> {
    return (input as Record<string, unknown> | undefined) ?? {};
  }

  async createSandbox(req: CreateSandboxRequest): Promise<SandboxHandle> {
    const client = this.requireClient();
    const emitDebug = req.debug ?? (() => {});

    emitDebug("daytona.createSandbox.start", {
      workspaceId: req.workspaceId,
      repoId: req.repoId,
      taskId: req.taskId,
      branchName: req.branchName,
    });

    const createStartedAt = Date.now();
    const sandbox = await this.withTimeout("create sandbox", () =>
      client.createSandbox({
        image: this.buildSnapshotImage(),
        envVars: this.buildEnvVars(),
        labels: {
          "foundry.workspace": req.workspaceId,
          "foundry.task": req.taskId,
          "foundry.repo_id": req.repoId,
          "foundry.repo_remote": req.repoRemote,
          "foundry.branch": req.branchName,
        },
        autoStopInterval: this.config.autoStopInterval,
      }),
    );
    emitDebug("daytona.createSandbox.created", {
      sandboxId: sandbox.id,
      durationMs: Date.now() - createStartedAt,
      state: sandbox.state ?? null,
    });

    const repoDir = `/home/daytona/foundry/${req.workspaceId}/${req.repoId}/${req.taskId}/repo`;
    const agent = await this.ensureSandboxAgent({
      workspaceId: req.workspaceId,
      sandboxId: sandbox.id,
    });

    const cloneStartedAt = Date.now();
    const commandEnv: Record<string, string> = {};
    if (req.githubToken && req.githubToken.trim().length > 0) {
      commandEnv.GITHUB_TOKEN = req.githubToken;
    }
    const cloneScript = [
      "set -euo pipefail",
      "export GIT_TERMINAL_PROMPT=0",
      `REMOTE=${shellQuote(req.repoRemote)}`,
      `BRANCH_NAME=${shellQuote(req.branchName)}`,
      'TOKEN="${GITHUB_TOKEN:-}"',
      'AUTH_REMOTE="$REMOTE"',
      'AUTH_HEADER=""',
      'if [ -n "$TOKEN" ] && [[ "$REMOTE" == https://github.com/* ]]; then AUTH_REMOTE="https://x-access-token:${TOKEN}@${REMOTE#https://}"; AUTH_HEADER="$(printf \'x-access-token:%s\' \"$TOKEN\" | base64 | tr -d \'\\n\')"; fi',
      `rm -rf "${repoDir}"`,
      `mkdir -p "${repoDir}"`,
      `rmdir "${repoDir}"`,
      // Foundry test repos can be private, so clone/fetch must use the sandbox's GitHub token when available.
      `git clone "$AUTH_REMOTE" "${repoDir}"`,
      `cd "${repoDir}"`,
      'git remote set-url origin "$REMOTE"',
      'if [ -n "$AUTH_HEADER" ]; then git config --local credential.helper ""; git config --local http.https://github.com/.extraheader "AUTHORIZATION: basic $AUTH_HEADER"; fi',
      `git fetch origin --prune`,
      // The task branch may not exist remotely yet (agent push creates it). Base off current branch (default branch).
      'if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then git checkout -B "$BRANCH_NAME" "origin/$BRANCH_NAME"; else git checkout -B "$BRANCH_NAME" "$(git branch --show-current 2>/dev/null || echo main)"; fi',
      `git config user.email "foundry@local" >/dev/null 2>&1 || true`,
      `git config user.name "Foundry" >/dev/null 2>&1 || true`,
    ].join("\n");
    const cloneResult = await this.runViaSandboxAgent(agent, this.wrapBashScript(cloneScript), commandEnv, "clone repo");
    if (cloneResult.exitCode !== 0) {
      throw new Error(`daytona clone repo failed (${cloneResult.exitCode}): ${cloneResult.result}`);
    }
    emitDebug("daytona.createSandbox.clone_repo.done", {
      sandboxId: sandbox.id,
      durationMs: Date.now() - cloneStartedAt,
    });

    return {
      sandboxId: sandbox.id,
      switchTarget: `daytona://${sandbox.id}`,
      metadata: {
        endpoint: this.config.endpoint ?? null,
        image: this.config.image,
        snapshot: sandbox.snapshot ?? null,
        remote: true,
        state: sandbox.state ?? null,
        cwd: repoDir,
      },
    };
  }

  async resumeSandbox(req: ResumeSandboxRequest): Promise<SandboxHandle> {
    const client = this.requireClient();

    await this.ensureStarted(req.sandboxId);

    // Reconstruct cwd from sandbox labels written at create time.
    const info = await this.withTimeout("resume get sandbox", () => client.getSandbox(req.sandboxId));
    const labels = info.labels ?? {};
    const workspaceId = labels["foundry.workspace"] ?? req.workspaceId;
    const repoId = labels["foundry.repo_id"] ?? "";
    const taskId = labels["foundry.task"] ?? "";
    const cwd = repoId && taskId ? `/home/daytona/foundry/${workspaceId}/${repoId}/${taskId}/repo` : null;

    return {
      sandboxId: req.sandboxId,
      switchTarget: `daytona://${req.sandboxId}`,
      metadata: {
        resumed: true,
        endpoint: this.config.endpoint ?? null,
        ...(cwd ? { cwd } : {}),
      },
    };
  }

  async destroySandbox(_req: DestroySandboxRequest): Promise<void> {
    const client = this.getClient();
    if (!client) {
      return;
    }

    try {
      await this.withTimeout("delete sandbox", () => client.deleteSandbox(_req.sandboxId));
    } catch (error) {
      // Ignore not-found style cleanup failures.
      const text = error instanceof Error ? error.message : String(error);
      if (text.toLowerCase().includes("not found")) {
        return;
      }
      throw error;
    }
  }

  async releaseSandbox(req: ReleaseSandboxRequest): Promise<void> {
    const client = this.getClient();
    if (!client) {
      return;
    }

    try {
      await this.withTimeout("stop sandbox", () => client.stopSandbox(req.sandboxId, 60));
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      if (text.toLowerCase().includes("not found")) {
        return;
      }
      throw error;
    }
  }

  async ensureSandboxAgent(req: EnsureAgentRequest): Promise<AgentEndpoint> {
    await this.ensureStarted(req.sandboxId);
    await this.startSandboxAgent(req.sandboxId);
    return await this.waitForSandboxAgentHealth(req.sandboxId, "ensure sandbox-agent");
  }

  async health(req: SandboxHealthRequest): Promise<SandboxHealth> {
    const client = this.getClient();
    if (!client) {
      return {
        status: "degraded",
        message: "daytona driver not configured",
      };
    }

    try {
      const sandbox = await this.withTimeout("health get sandbox", () => client.getSandbox(req.sandboxId));
      const state = String(sandbox.state ?? "unknown");
      if (state.toLowerCase().includes("error")) {
        return {
          status: "down",
          message: `daytona sandbox in error state: ${state}`,
        };
      }
      return {
        status: "healthy",
        message: `daytona sandbox state: ${state}`,
      };
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      return {
        status: "down",
        message: `daytona sandbox health check failed: ${text}`,
      };
    }
  }

  async attachTarget(req: AttachTargetRequest): Promise<AttachTarget> {
    return {
      target: `daytona://${req.sandboxId}`,
    };
  }

  async executeCommand(req: ExecuteSandboxCommandRequest): Promise<ExecuteSandboxCommandResult> {
    const endpoint = await this.ensureSandboxAgent({
      workspaceId: req.workspaceId,
      sandboxId: req.sandboxId,
    });
    return await this.runViaSandboxAgent(endpoint, req.command, req.env, req.label ?? "command");
  }
}
