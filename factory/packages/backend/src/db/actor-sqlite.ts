import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { db as kvDrizzleDb } from "rivetkit/db/drizzle";

// Keep this file decoupled from RivetKit's internal type export paths.
// RivetKit consumes database providers structurally.
export interface RawAccess {
  execute: (query: string, ...args: unknown[]) => Promise<unknown[]>;
  close: () => Promise<void>;
}

export interface DatabaseProviderContext {
  actorId: string;
}

export type DatabaseProvider<DB> = {
  createClient: (ctx: DatabaseProviderContext) => Promise<DB>;
  onMigrate: (client: DB) => void | Promise<void>;
  onDestroy?: (client: DB) => void | Promise<void>;
};

export interface ActorSqliteDbOptions<TSchema extends Record<string, unknown>> {
  actorName: string;
  schema?: TSchema;
  migrations?: unknown;
  migrationsFolderUrl: URL;
  /**
   * Override base directory for per-actor SQLite files.
   *
   * Default: `<cwd>/.openhandoff/backend/sqlite`
   */
  baseDir?: string;
}

export function actorSqliteDb<TSchema extends Record<string, unknown>>(options: ActorSqliteDbOptions<TSchema>): DatabaseProvider<any & RawAccess> {
  const isBunRuntime = typeof (globalThis as any).Bun !== "undefined" && typeof (process as any)?.versions?.bun === "string";

  // Backend tests run in a Node-ish Vitest environment where `bun:sqlite` and
  // Bun's sqlite-backed Drizzle driver are not supported.
  //
  // Additionally, RivetKit's KV-backed SQLite implementation currently has stability
  // issues under Bun in this repo's setup (wa-sqlite runtime errors). Prefer Bun's
  // native SQLite driver in production backend execution.
  if (!isBunRuntime || process.env.VITEST || process.env.NODE_ENV === "test") {
    return kvDrizzleDb({
      schema: options.schema,
      migrations: options.migrations,
    }) as unknown as DatabaseProvider<any & RawAccess>;
  }

  const baseDir = options.baseDir ?? join(process.cwd(), ".openhandoff", "backend", "sqlite");
  const migrationsFolder = fileURLToPath(options.migrationsFolderUrl);

  return {
    createClient: async (ctx) => {
      // Keep Bun-only module out of Vitest/Vite's static import graph.
      const { Database } = await import(/* @vite-ignore */ "bun:sqlite");
      const { drizzle } = await import("drizzle-orm/bun-sqlite");

      const dir = join(baseDir, options.actorName);
      mkdirSync(dir, { recursive: true });

      const dbPath = join(dir, `${ctx.actorId}.sqlite`);
      const sqlite = new Database(dbPath);
      sqlite.exec("PRAGMA journal_mode = WAL;");
      sqlite.exec("PRAGMA foreign_keys = ON;");

      const client = drizzle({
        client: sqlite,
        schema: options.schema,
      });

      return Object.assign(client, {
        execute: async (query: string, ...args: unknown[]) => {
          const stmt = sqlite.query(query);
          try {
            return stmt.all(args as never) as unknown[];
          } catch {
            stmt.run(args as never);
            return [];
          }
        },
        close: async () => {
          sqlite.close();
        },
      } satisfies RawAccess);
    },

    onMigrate: async (client) => {
      const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");
      await migrate(client, {
        migrationsFolder,
      });
    },

    onDestroy: async (client) => {
      await client.close();
    },
  };
}
