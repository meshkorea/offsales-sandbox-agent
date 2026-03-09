import { createHash } from "node:crypto";

export function normalizeRemoteUrl(remoteUrl: string): string {
  let value = remoteUrl.trim();
  if (!value) return "";

  // Strip trailing slashes to make hashing stable.
  value = value.replace(/\/+$/, "");

  // GitHub shorthand: owner/repo -> https://github.com/owner/repo.git
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    return `https://github.com/${value}.git`;
  }

  // If a user pastes "github.com/owner/repo", treat it as HTTPS.
  if (/^(?:www\.)?github\.com\/.+/i.test(value)) {
    value = `https://${value.replace(/^www\./i, "")}`;
  }

  // Canonicalize GitHub URLs to the repo clone URL (drop /tree/*, issues, etc).
  // This makes "https://github.com/owner/repo" and ".../tree/main" map to the same repoId.
  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      const hostname = url.hostname.replace(/^www\./i, "");
      if (hostname.toLowerCase() === "github.com") {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          const owner = parts[0]!;
          const repo = parts[1]!;
          const base = `${url.protocol}//${hostname}/${owner}/${repo.replace(/\.git$/i, "")}.git`;
          return base;
        }
      }
      // Drop query/fragment for stability.
      url.search = "";
      url.hash = "";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // ignore parse failures; fall through to raw value
  }

  return value;
}

export function repoIdFromRemote(remoteUrl: string): string {
  const normalized = normalizeRemoteUrl(remoteUrl);
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}
