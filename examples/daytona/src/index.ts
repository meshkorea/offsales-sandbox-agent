import { Daytona, Image } from "@daytonaio/sdk";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SandboxAgent } from "sandbox-agent";
import {
  SANDBOX_AGENT_IMAGE,
  SANDBOX_AGENT_INSTALL_VERSION,
  buildCredentialEnv,
  buildInspectorUrl,
  detectAgent,
  generateBaseImageDockerfile,
  getPreinstallComponents,
} from "@sandbox-agent/example-shared";

const daytona = new Daytona();

const envVars = buildCredentialEnv();
const agent = detectAgent();
const components = getPreinstallComponents(agent);
const componentSuffix = components.length > 0 ? components.join("-") : "base";
const baseImage = process.env.SANDBOX_AGENT_DAYTONA_IMAGE ?? SANDBOX_AGENT_IMAGE;
const snapshotName = process.env.SANDBOX_AGENT_DAYTONA_SNAPSHOT ?? `sandbox-agent-${SANDBOX_AGENT_INSTALL_VERSION.replaceAll(".", "-")}-${componentSuffix}`;

async function ensureSnapshot(name: string) {
  try {
    return await daytona.snapshot.get(name);
  } catch {
    console.log(`Building Daytona snapshot ${name} from ${baseImage}...`);
    const dockerfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-agent-daytona-"));
    const dockerfilePath = path.join(dockerfileDir, "Dockerfile");
    fs.writeFileSync(
      dockerfilePath,
      generateBaseImageDockerfile({
        image: baseImage,
        components,
      }),
      "utf8",
    );

    const image = Image.fromDockerfile(dockerfilePath)
      .workdir("/home/sandbox")
      .entrypoint(["sandbox-agent", "server", "--no-token", "--host", "0.0.0.0", "--port", "3000"]);

    try {
      const snapshot = await daytona.snapshot.create({ name, image }, { timeout: 180, onLogs: (line) => console.log(line) });

      return await daytona.snapshot.activate(snapshot).catch(() => snapshot);
    } finally {
      fs.rmSync(dockerfileDir, { recursive: true, force: true });
    }
  }
}

const snapshot = await ensureSnapshot(snapshotName);

console.log(`Creating Daytona sandbox from snapshot ${snapshot.name}...`);
const sandbox = await daytona.create({ envVars, snapshot: snapshot.name, autoStopInterval: 0 }, { timeout: 180 });

const baseUrl = (await sandbox.getSignedPreviewUrl(3000, 4 * 60 * 60)).url;

console.log("Connecting to server...");
const client = await SandboxAgent.connect({ baseUrl });
const session = await client.createSession({ agent, sessionInit: { cwd: "/home/sandbox", mcpServers: [] } });
const sessionId = session.id;

console.log(`  UI: ${buildInspectorUrl({ baseUrl, sessionId })}`);
console.log("  Press Ctrl+C to stop.");

const keepAlive = setInterval(() => {}, 60_000);
const cleanup = async () => {
  clearInterval(keepAlive);
  await sandbox.delete(60);
  process.exit(0);
};
process.once("SIGINT", cleanup);
process.once("SIGTERM", cleanup);
