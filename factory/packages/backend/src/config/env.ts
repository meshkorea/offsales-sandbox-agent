import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEVELOPMENT_ENV_FILES = [".env.development.local", ".env.development"] as const;
const LOCAL_DEV_BETTER_AUTH_SECRET = "sandbox-agent-factory-development-only-change-me";
const LOCAL_DEV_APP_URL = "http://localhost:4173";

function loadEnvFile(path: string): void {
  const source = readFileSync(path, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    if (!key || process.env[key] != null) {
      continue;
    }

    let value = normalized.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function isDevelopmentEnv(): boolean {
  return process.env.NODE_ENV === "development";
}

export function loadDevelopmentEnvFiles(cwd = process.cwd()): string[] {
  if (!isDevelopmentEnv()) {
    return [];
  }

  const loaded: string[] = [];
  for (const fileName of DEVELOPMENT_ENV_FILES) {
    const path = resolve(cwd, fileName);
    if (!existsSync(path)) {
      continue;
    }
    loadEnvFile(path);
    loaded.push(path);
  }
  return loaded;
}

export function applyDevelopmentEnvDefaults(): void {
  if (!isDevelopmentEnv()) {
    return;
  }

  if (!process.env.APP_URL) {
    process.env.APP_URL = LOCAL_DEV_APP_URL;
  }

  if (!process.env.BETTER_AUTH_URL) {
    process.env.BETTER_AUTH_URL = process.env.APP_URL;
  }

  if (!process.env.BETTER_AUTH_SECRET) {
    process.env.BETTER_AUTH_SECRET = LOCAL_DEV_BETTER_AUTH_SECRET;
  }

  if (!process.env.GITHUB_REDIRECT_URI && process.env.APP_URL) {
    process.env.GITHUB_REDIRECT_URI = `${process.env.APP_URL.replace(/\/$/, "")}/api/rivet/app/auth/github/callback`;
  }
}
