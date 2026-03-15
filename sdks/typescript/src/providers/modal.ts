import { ModalClient } from "modal";
import type { SandboxProvider } from "./types.ts";
import { DEFAULT_AGENTS, SANDBOX_AGENT_INSTALL_SCRIPT, buildServerStartCommand } from "./shared.ts";

const DEFAULT_AGENT_PORT = 3000;
const DEFAULT_APP_NAME = "sandbox-agent";

export interface ModalProviderOptions {
  create?: {
    secrets?: Record<string, string>;
    appName?: string;
  };
  agentPort?: number;
}

export function modal(options: ModalProviderOptions = {}): SandboxProvider {
  const agentPort = options.agentPort ?? DEFAULT_AGENT_PORT;
  const appName = options.create?.appName ?? DEFAULT_APP_NAME;
  const client = new ModalClient();

  return {
    name: "modal",
    async create(): Promise<string> {
      const app = await client.apps.fromName(appName, { createIfMissing: true });

      const image = client.images
        .fromRegistry("node:22-slim")
        .dockerfileCommands([
          "RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*",
          `RUN curl -fsSL ${SANDBOX_AGENT_INSTALL_SCRIPT} | sh`,
        ]);

      const envVars = options.create?.secrets ?? {};
      const secrets = Object.keys(envVars).length > 0 ? [await client.secrets.fromObject(envVars)] : [];

      const sb = await client.sandboxes.create(app, image, {
        encryptedPorts: [agentPort],
        secrets,
      });

      const exec = async (cmd: string) => {
        const p = await sb.exec(["bash", "-c", cmd], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const exitCode = await p.wait();
        if (exitCode !== 0) {
          const stderr = await p.stderr.readText();
          throw new Error(`modal command failed (exit ${exitCode}): ${cmd}\n${stderr}`);
        }
      };

      for (const agent of DEFAULT_AGENTS) {
        await exec(`sandbox-agent install-agent ${agent}`);
      }

      await sb.exec(["bash", "-c", buildServerStartCommand(agentPort)]);

      return sb.sandboxId;
    },
    async destroy(sandboxId: string): Promise<void> {
      const sb = await client.sandboxes.fromId(sandboxId);
      await sb.terminate();
    },
    async getUrl(sandboxId: string): Promise<string> {
      const sb = await client.sandboxes.fromId(sandboxId);
      const tunnels = await sb.tunnels();
      const tunnel = tunnels[agentPort];
      if (!tunnel) {
        throw new Error(`modal: no tunnel found for port ${agentPort}`);
      }
      return tunnel.url;
    },
  };
}
