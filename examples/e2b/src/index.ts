import { Sandbox, Template, defaultBuildLogger } from "@e2b/code-interpreter";
import { SandboxAgent } from "sandbox-agent";
import {
  SANDBOX_AGENT_IMAGE,
  SANDBOX_AGENT_INSTALL_VERSION,
  buildCredentialEnv,
  buildInspectorUrl,
  detectAgent,
  getPreinstallComponents,
} from "@sandbox-agent/example-shared";

const envs = buildCredentialEnv();
const agent = detectAgent();
const components = getPreinstallComponents(agent);
const componentSuffix = components.length > 0 ? components.join("-") : "base";
const baseImage = process.env.SANDBOX_AGENT_E2B_IMAGE ?? SANDBOX_AGENT_IMAGE;
const templateName = process.env.SANDBOX_AGENT_E2B_TEMPLATE ?? `sandbox-agent-${SANDBOX_AGENT_INSTALL_VERSION.replaceAll(".", "-")}-${componentSuffix}`;

async function ensureTemplate(name: string): Promise<string> {
  if (await Template.exists(name)) {
    return name;
  }
  return buildTemplate(name);
}

async function buildTemplate(name: string): Promise<string> {
  console.log(`Building E2B template ${name} from ${baseImage}...`);

  let templateBuilder = Template().fromImage(baseImage);
  if (components.includes("codex")) {
    templateBuilder = templateBuilder.setUser("root").aptInstall("npm").setUser("user");
  }
  for (const component of components) {
    templateBuilder = templateBuilder.runCmd(`sandbox-agent install-agent ${component}`);
  }
  const template = templateBuilder;

  await Template.build(template, name, {
    onBuildLogs: defaultBuildLogger(),
  });

  return name;
}

function isMissingTemplateError(error: unknown): boolean {
  return error instanceof Error && /template '.*' not found/.test(error.message);
}

const resolvedTemplate = await ensureTemplate(templateName);

console.log(`Creating E2B sandbox from template ${resolvedTemplate}...`);
let sandbox;
try {
  sandbox = await Sandbox.create(resolvedTemplate, { allowInternetAccess: true, envs });
} catch (error) {
  if (!process.env.SANDBOX_AGENT_E2B_TEMPLATE && isMissingTemplateError(error)) {
    const fallbackTemplate = `${templateName}-${Date.now()}`;
    console.log(`Template ${resolvedTemplate} is stale; rebuilding as ${fallbackTemplate}...`);
    sandbox = await Sandbox.create(await buildTemplate(fallbackTemplate), { allowInternetAccess: true, envs });
  } else {
    throw error;
  }
}

const baseUrl = `https://${sandbox.getHost(3000)}`;
const token = sandbox.trafficAccessToken;

await sandbox.commands.run("sandbox-agent server --no-token --host 0.0.0.0 --port 3000", { background: true });

console.log("Connecting to server...");
const client = await SandboxAgent.connect({ baseUrl, token });
const session = await client.createSession({ agent, sessionInit: { cwd: "/home/user", mcpServers: [] } });
const sessionId = session.id;

console.log(`  UI: ${buildInspectorUrl({ baseUrl, token, sessionId })}`);
console.log("  Press Ctrl+C to stop.");

const keepAlive = setInterval(() => {}, 60_000);
const cleanup = async () => {
  clearInterval(keepAlive);
  await sandbox.kill();
  process.exit(0);
};
process.once("SIGINT", cleanup);
process.once("SIGTERM", cleanup);
