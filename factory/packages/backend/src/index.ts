import { Hono } from "hono";
import { cors } from "hono/cors";
import { initActorRuntimeContext } from "./actors/context.js";
import { registry } from "./actors/index.js";
import { loadConfig } from "./config/backend.js";
import { createBackends, createNotificationService } from "./notifications/index.js";
import { createDefaultDriver } from "./driver.js";
import { createProviderRegistry } from "./providers/index.js";

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

  config.providers.daytona.endpoint = envFirst("HF_DAYTONA_ENDPOINT", "DAYTONA_ENDPOINT") ?? config.providers.daytona.endpoint;
  config.providers.daytona.apiKey = envFirst("HF_DAYTONA_API_KEY", "DAYTONA_API_KEY") ?? config.providers.daytona.apiKey;

  const driver = createDefaultDriver();
  const providers = createProviderRegistry(config, driver);
  const backends = await createBackends(config.notify);
  const notifications = createNotificationService(backends);
  initActorRuntimeContext(config, providers, notifications, driver);

  const inner = registry.serve();

  // Wrap in a Hono app mounted at /api/rivet to serve on the backend port.
  // Uses Bun.serve — cannot use @hono/node-server because it conflicts with
  // RivetKit's internal Bun.serve manager server (Bun bug: mixing Node HTTP
  // server and Bun.serve in the same process breaks Bun.serve's fetch handler).
  const app = new Hono();
  app.use(
    "/api/rivet/*",
    cors({
      origin: "*",
      allowHeaders: ["Content-Type", "Authorization", "x-rivet-token"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Type"],
    }),
  );
  app.use(
    "/api/rivet",
    cors({
      origin: "*",
      allowHeaders: ["Content-Type", "Authorization", "x-rivet-token"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Type"],
    }),
  );
  const forward = async (c: any) => {
    try {
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
    port: config.backend.port,
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
    port: parseEnvPort(port),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    console.error(message);
    process.exit(1);
  });
}
