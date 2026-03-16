/**
 * Simple shared utilities for sandbox-agent examples.
 * Provides minimal helpers for connecting to and interacting with sandbox-agent servers.
 */

export const SANDBOX_AGENT_INSTALL_VERSION = "0.3.1";
export const SANDBOX_AGENT_IMAGE = `rivetdev/sandbox-agent:${SANDBOX_AGENT_INSTALL_VERSION}`;

export type SandboxAgentComponent = "claude" | "codex" | "opencode" | "amp";

const DIRECT_CREDENTIAL_KEYS = [
  "ANTHROPIC_API_KEY",
  "CLAUDE_API_KEY",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "ANTHROPIC_AUTH_TOKEN",
  "OPENAI_API_KEY",
  "CODEX_API_KEY",
  "CEREBRAS_API_KEY",
  "OPENCODE_API_KEY",
] as const;

export function generateInstallCommand({
  version = SANDBOX_AGENT_INSTALL_VERSION,
  components = [],
}: {
  version?: string;
  components?: SandboxAgentComponent[];
} = {}): string {
  const uniqueComponents = [...new Set(components)];

  return [
    `curl -fsSL https://releases.rivet.dev/sandbox-agent/${version}/install.sh | sh`,
    ...uniqueComponents.map((component) => `sandbox-agent install-agent ${component}`),
  ].join(" && ");
}

export function getPreinstallComponents(agent: string): SandboxAgentComponent[] {
  return ["claude", "codex", "opencode", "amp"].includes(agent) ? [agent as SandboxAgentComponent] : [];
}

export function generateBaseImageDockerfile({
  image = SANDBOX_AGENT_IMAGE,
  components = [],
}: {
  image?: string;
  components?: SandboxAgentComponent[];
} = {}): string {
  const uniqueComponents = [...new Set(components)];
  const lines = [`FROM ${image}`];

  if (uniqueComponents.includes("codex")) {
    lines.push("USER root");
    lines.push("RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y npm && rm -rf /var/lib/apt/lists/*");
    lines.push("USER sandbox");
  }

  lines.push("WORKDIR /home/sandbox");
  for (const component of uniqueComponents) {
    lines.push(`RUN sandbox-agent install-agent ${component}`);
  }

  return `${lines.join("\n")}\n`;
}

export function buildCredentialEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of DIRECT_CREDENTIAL_KEYS) {
    const value = process.env[key];
    if (value) {
      env[key] = value;
    }
  }
  return env;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function ensureUrl(rawUrl: string): string {
  if (!rawUrl) {
    throw new Error("Missing sandbox URL");
  }
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }
  return `https://${rawUrl}`;
}

export function buildInspectorUrl({
  baseUrl,
  token,
  headers,
  sessionId,
}: {
  baseUrl: string;
  token?: string;
  headers?: Record<string, string>;
  sessionId?: string;
}): string {
  const normalized = normalizeBaseUrl(ensureUrl(baseUrl));
  const params = new URLSearchParams();
  if (token) {
    params.set("token", token);
  }
  if (headers && Object.keys(headers).length > 0) {
    params.set("headers", JSON.stringify(headers));
  }
  const queryString = params.toString();
  const sessionPath = sessionId ? `sessions/${sessionId}` : "";
  return `${normalized}/ui/${sessionPath}${queryString ? `?${queryString}` : ""}`;
}

export function logInspectorUrl({ baseUrl, token, headers }: { baseUrl: string; token?: string; headers?: Record<string, string> }): void {
  console.log(`Inspector: ${buildInspectorUrl({ baseUrl, token, headers })}`);
}

export function buildHeaders({
  token,
  extraHeaders,
  contentType = false,
}: {
  token?: string;
  extraHeaders?: Record<string, string>;
  contentType?: boolean;
}): HeadersInit {
  const headers: Record<string, string> = { ...(extraHeaders || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (contentType) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export function generateSessionId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "session-";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function detectAgent(): string {
  if (process.env.SANDBOX_AGENT) return process.env.SANDBOX_AGENT;
  const hasClaude = Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN,
  );
  const openAiLikeKey = process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY || "";
  const hasCodexApiKey = openAiLikeKey.startsWith("sk-");
  if (hasCodexApiKey && hasClaude) {
    console.log("Both Claude and Codex API keys detected; defaulting to codex. Set SANDBOX_AGENT to override.");
    return "codex";
  }
  if (!hasCodexApiKey && openAiLikeKey) {
    console.log("OpenAI/Codex credential is not an API key (expected sk-...), skipping codex auto-select.");
  }
  if (hasCodexApiKey) return "codex";
  if (hasClaude) {
    if (openAiLikeKey && !hasCodexApiKey) {
      console.log("Using claude by default.");
    }
    return "claude";
  }
  return "claude";
}
