import { afterEach, describe, expect, test } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyDevelopmentEnvDefaults, loadDevelopmentEnvFiles } from "../src/config/env.js";

const ENV_KEYS = [
  "NODE_ENV",
  "APP_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "GITHUB_REDIRECT_URI",
] as const;

const ORIGINAL_ENV = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

function resetEnv(): void {
  for (const key of ENV_KEYS) {
    const original = ORIGINAL_ENV.get(key);
    if (original == null) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
}

describe("development env loading", () => {
  afterEach(() => {
    resetEnv();
  });

  test("loads .env.development only in development", () => {
    const dir = mkdtempSync(join(tmpdir(), "factory-env-"));
    writeFileSync(join(dir, ".env.development"), "APP_URL=http://localhost:4999\n", "utf8");

    process.env.NODE_ENV = "development";
    delete process.env.APP_URL;

    const loaded = loadDevelopmentEnvFiles(dir);

    expect(loaded).toHaveLength(1);
    expect(process.env.APP_URL).toBe("http://localhost:4999");
  });

  test("skips dotenv files outside development", () => {
    const dir = mkdtempSync(join(tmpdir(), "factory-env-"));
    writeFileSync(join(dir, ".env.development"), "APP_URL=http://localhost:4999\n", "utf8");

    process.env.NODE_ENV = "production";
    delete process.env.APP_URL;

    const loaded = loadDevelopmentEnvFiles(dir);

    expect(loaded).toEqual([]);
    expect(process.env.APP_URL).toBeUndefined();
  });

  test("applies safe local defaults only in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.APP_URL;
    delete process.env.BETTER_AUTH_URL;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.GITHUB_REDIRECT_URI;

    applyDevelopmentEnvDefaults();

    expect(process.env.APP_URL).toBe("http://localhost:4173");
    expect(process.env.BETTER_AUTH_URL).toBe("http://localhost:4173");
    expect(process.env.BETTER_AUTH_SECRET).toBe("sandbox-agent-factory-development-only-change-me");
    expect(process.env.GITHUB_REDIRECT_URI).toBe("http://localhost:4173/api/rivet/app/auth/github/callback");
  });
});
