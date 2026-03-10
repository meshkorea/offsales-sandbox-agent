import { Hono } from "hono";
import { cors } from "hono/cors";
import { initActorRuntimeContext } from "./actors/context.js";
import { registry, resolveManagerPort } from "./actors/index.js";
import { workspaceKey } from "./actors/keys.js";
import { loadConfig } from "./config/backend.js";
import { createBackends, createNotificationService } from "./notifications/index.js";
import { createDefaultDriver } from "./driver.js";
import { createProviderRegistry } from "./providers/index.js";
import { createClient } from "rivetkit/client";
import { FactoryAppStore } from "./services/app-state.js";
import type { FactoryBillingPlanId, FactoryOrganization } from "@sandbox-agent/factory-shared";

export interface BackendStartOptions {
  host?: string;
  port?: number;
}

export async function startBackend(options: BackendStartOptions = {}): Promise<void> {
  // sandbox-agent agent plugins vary on which env var they read for OpenAI/Codex auth.
  // Normalize to keep local dev + docker-compose simple.
  if (!process.env.CODEX_API_KEY && process.env.OPENAI_API_KEY) {
    process.env.CODEX_API_KEY = process.env.OPENAI_API_KEY;
  }

  const config = loadConfig();
  config.backend.host = options.host ?? config.backend.host;
  config.backend.port = options.port ?? config.backend.port;

  // Allow docker-compose/dev environments to supply provider config via env vars
  // instead of writing into the container's config.toml.
  const envFirst = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const raw = process.env[key];
      if (raw && raw.trim().length > 0) return raw.trim();
    }
    return undefined;
  };

  config.providers.daytona.endpoint =
    envFirst("HF_DAYTONA_ENDPOINT", "DAYTONA_ENDPOINT") ?? config.providers.daytona.endpoint;
  config.providers.daytona.apiKey =
    envFirst("HF_DAYTONA_API_KEY", "DAYTONA_API_KEY") ?? config.providers.daytona.apiKey;

  const driver = createDefaultDriver();
  const providers = createProviderRegistry(config, driver);
  const backends = await createBackends(config.notify);
  const notifications = createNotificationService(backends);
  initActorRuntimeContext(config, providers, notifications, driver);

  const inner = registry.serve();
  const actorClient = createClient({
    endpoint: `http://127.0.0.1:${resolveManagerPort()}`,
    disableMetadataLookup: true,
  }) as any;

  const syncOrganizationRepos = async (organization: FactoryOrganization): Promise<void> => {
    const workspace = await actorClient.workspace.getOrCreate(workspaceKey(organization.workspaceId), {
      createWithInput: organization.workspaceId,
    });
    const existing = await workspace.listRepos({ workspaceId: organization.workspaceId });
    const existingRemotes = new Set(existing.map((repo: { remoteUrl: string }) => repo.remoteUrl));

    for (const repo of organization.repoCatalog) {
      const remoteUrl = `mockgithub://${repo}`;
      if (existingRemotes.has(remoteUrl)) {
        continue;
      }
      await workspace.addRepo({
        workspaceId: organization.workspaceId,
        remoteUrl,
      });
    }
  };

  const appStore = new FactoryAppStore({
    onOrganizationReposReady: syncOrganizationRepos,
  });
  const managerOrigin = `http://127.0.0.1:${resolveManagerPort()}`;

  // Wrap in a Hono app mounted at /api/rivet to serve on the backend port.
  // Uses Bun.serve — cannot use @hono/node-server because it conflicts with
  // RivetKit's internal Bun.serve manager server (Bun bug: mixing Node HTTP
  // server and Bun.serve in the same process breaks Bun.serve's fetch handler).
  const app = new Hono();
  app.use(
    "/api/rivet/*",
    cors({
      origin: (origin) => origin ?? "*",
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "x-rivet-token", "x-factory-session"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Type", "x-factory-session"],
    })
  );
  app.use(
    "/api/rivet",
    cors({
      origin: (origin) => origin ?? "*",
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "x-rivet-token", "x-factory-session"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Type", "x-factory-session"],
    })
  );
  const resolveSessionId = (c: any): string => {
    const requested = c.req.header("x-factory-session");
    const sessionId = appStore.ensureSession(requested);
    c.header("x-factory-session", sessionId);
    return sessionId;
  };

  app.get("/api/rivet/app/snapshot", (c) => {
    const sessionId = resolveSessionId(c);
    return c.json(appStore.getSnapshot(sessionId));
  });

  app.post("/api/rivet/app/sign-in", async (c) => {
    const sessionId = resolveSessionId(c);
    const body = await c.req.json().catch(() => ({}));
    const userId = typeof body?.userId === "string" ? body.userId : undefined;
    return c.json(appStore.signInWithGithub(sessionId, userId));
  });

  app.post("/api/rivet/app/sign-out", (c) => {
    const sessionId = resolveSessionId(c);
    return c.json(appStore.signOut(sessionId));
  });

  app.post("/api/rivet/app/organizations/:organizationId/select", async (c) => {
    const sessionId = resolveSessionId(c);
    return c.json(await appStore.selectOrganization(sessionId, c.req.param("organizationId")));
  });

  app.patch("/api/rivet/app/organizations/:organizationId/profile", async (c) => {
    const body = await c.req.json();
    return c.json(
      appStore.updateOrganizationProfile({
        organizationId: c.req.param("organizationId"),
        displayName: typeof body?.displayName === "string" ? body.displayName : "",
        slug: typeof body?.slug === "string" ? body.slug : "",
        primaryDomain: typeof body?.primaryDomain === "string" ? body.primaryDomain : "",
      }),
    );
  });

  app.post("/api/rivet/app/organizations/:organizationId/import", async (c) => {
    return c.json(await appStore.triggerRepoImport(c.req.param("organizationId")));
  });

  app.post("/api/rivet/app/organizations/:organizationId/reconnect", (c) => {
    return c.json(appStore.reconnectGithub(c.req.param("organizationId")));
  });

  app.post("/api/rivet/app/organizations/:organizationId/billing/checkout", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const planId =
      body?.planId === "free" || body?.planId === "team" || body?.planId === "enterprise"
        ? (body.planId as FactoryBillingPlanId)
        : "team";
    return c.json(appStore.completeHostedCheckout(c.req.param("organizationId"), planId));
  });

  app.post("/api/rivet/app/organizations/:organizationId/billing/cancel", (c) => {
    return c.json(appStore.cancelScheduledRenewal(c.req.param("organizationId")));
  });

  app.post("/api/rivet/app/organizations/:organizationId/billing/resume", (c) => {
    return c.json(appStore.resumeSubscription(c.req.param("organizationId")));
  });

  app.post("/api/rivet/app/workspaces/:workspaceId/seat-usage", (c) => {
    const sessionId = resolveSessionId(c);
    const workspaceId = c.req.param("workspaceId");
    const userEmail = appStore.findUserEmailForWorkspace(workspaceId, sessionId);
    if (userEmail) {
      appStore.recordSeatUsage(workspaceId, userEmail);
    }
    return c.json(appStore.getSnapshot(sessionId));
  });

  const proxyManagerRequest = async (c: any) => {
    const source = new URL(c.req.url);
    const target = new URL(source.pathname.replace(/^\/api\/rivet/, "") + source.search, managerOrigin);
    return await fetch(new Request(target.toString(), c.req.raw));
  };

  const forward = async (c: any) => {
    try {
      const pathname = new URL(c.req.url).pathname;
      if (
        pathname === "/api/rivet/actors" ||
        pathname.startsWith("/api/rivet/actors/") ||
        pathname.startsWith("/api/rivet/gateway/")
      ) {
        return await proxyManagerRequest(c);
      }
      // RivetKit serverless handler is configured with basePath `/api/rivet` by default.
      return await inner.fetch(c.req.raw);
    } catch (err) {
      if (err instanceof URIError) {
        return c.text("Bad Request: Malformed URI", 400);
      }
      throw err;
    }
  };
  app.all("/api/rivet", forward);
  app.all("/api/rivet/*", forward);

  const server = Bun.serve({
    fetch: app.fetch,
    hostname: config.backend.host,
    port: config.backend.port
  });

  process.on("SIGINT", async () => {
    server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    server.stop();
    process.exit(0);
  });

  // Keep process alive.
  await new Promise<void>(() => undefined);
}

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function parseEnvPort(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return undefined;
  }
  return port;
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "start";
  if (cmd !== "start") {
    throw new Error(`Unsupported backend command: ${cmd}`);
  }

  const host = parseArg("--host") ?? process.env.HOST ?? process.env.HF_BACKEND_HOST;
  const port = parseArg("--port") ?? process.env.PORT ?? process.env.HF_BACKEND_PORT;
  await startBackend({
    host,
    port: parseEnvPort(port)
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(message);
    process.exit(1);
  });
}
