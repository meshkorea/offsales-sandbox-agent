import { _ as u } from "./index-D0-B2Qgl.js";
var P = {};
function S() {
  return typeof process?.versions?.bun == "string" ? !0 : (P?.npm_config_user_agent || "").includes("bun/");
}
var I = new Set(["EACCES", "EPERM", "ENOEXEC"]);
function A(n) {
  if (!n || typeof n != "object") return !1;
  const e = n.code;
  return typeof e == "string" && I.has(e);
}
function R(n, e) {
  if (process.platform === "win32") return !0;
  try {
    return e.accessSync(n, e.constants.X_OK), !0;
  } catch {}
  try {
    return e.chmodSync(n, 493), !0;
  } catch (o) {
    if (A(o)) return !1;
    throw o;
  }
}
function T(n) {
  const { binPath: e, trustPackages: o, bunInstallBlocks: s, genericInstallCommands: r, binaryName: a } = n,
    t = [`${a ?? "sandbox-agent"} binary is not executable: ${e}`];
  if (S()) {
    t.push("Allow Bun to run postinstall scripts for native binaries and reinstall:");
    for (const c of s) {
      t.push(`${c.label}:`);
      for (const d of c.commands) t.push(`  ${d}`);
    }
    return (
      t.push(`Or run: chmod +x "${e}"`),
      t.join(`
`)
    );
  }
  if ((t.push("Postinstall scripts for native packages did not run, so the binary was left non-executable."), r && r.length > 0)) {
    t.push("Reinstall with scripts enabled:");
    for (const c of r) t.push(`  ${c}`);
  } else t.push("Reinstall with scripts enabled for:"), t.push(`  ${o}`);
  return (
    t.push(`Or run: chmod +x "${e}"`),
    t.join(`
`)
  );
}
var x = {},
  $ = {
    "darwin-arm64": "@sandbox-agent/cli-darwin-arm64",
    "darwin-x64": "@sandbox-agent/cli-darwin-x64",
    "linux-x64": "@sandbox-agent/cli-linux-x64",
    "linux-arm64": "@sandbox-agent/cli-linux-arm64",
    "win32-x64": "@sandbox-agent/cli-win32-x64",
  },
  b = "@sandbox-agent/cli-linux-x64 @sandbox-agent/cli-linux-arm64 @sandbox-agent/cli-darwin-arm64 @sandbox-agent/cli-darwin-x64 @sandbox-agent/cli-win32-x64";
function k() {
  return typeof process < "u" && !!process.versions?.node;
}
async function V(n, e) {
  if (!k()) throw new Error("Autospawn requires a Node.js runtime.");
  const { spawn: o } = await u(async () => {
      const { spawn: p } = await import("./__vite-browser-external-BIHI7g3E.js");
      return { spawn: p };
    }, []),
    s = await u(() => import("./__vite-browser-external-BIHI7g3E.js"), []),
    r = await u(() => import("./__vite-browser-external-BIHI7g3E.js"), []),
    a = await u(() => import("./__vite-browser-external-BIHI7g3E.js"), []),
    i = await u(() => import("./__vite-browser-external-BIHI7g3E.js"), []),
    { createRequire: t } = await u(async () => {
      const { createRequire: p } = await import("./__vite-browser-external-BIHI7g3E.js");
      return { createRequire: p };
    }, []),
    c = n.host ?? "127.0.0.1",
    d = n.port ?? (await C(i, c)),
    _ = c === "0.0.0.0" || c === "::" ? "127.0.0.1" : c,
    m = n.token ?? s.randomBytes(24).toString("hex"),
    E = n.timeoutMs ?? 15e3,
    w = n.log ?? "inherit",
    f = n.binaryPath ?? B(r, a) ?? O(t(import.meta.url), a, r) ?? N(r, a);
  if (!f) throw new Error("sandbox-agent binary not found. Install @sandbox-agent/cli or set SANDBOX_AGENT_BIN.");
  if (!R(f, r))
    throw new Error(
      T({
        binPath: f,
        trustPackages: b,
        bunInstallBlocks: [
          { label: "Project install", commands: [`bun pm trust ${b}`, "bun add sandbox-agent"] },
          { label: "Global install", commands: [`bun pm -g trust ${b}`, "bun add -g sandbox-agent"] },
        ],
      }),
    );
  const v = w === "inherit" ? "inherit" : w === "silent" ? "ignore" : "pipe",
    y = ["server", "--host", c, "--port", String(d), "--token", m],
    l = o(f, y, { stdio: v, env: { ...x, ...(n.env ?? {}) } }),
    h = D(l),
    g = `http://${_}:${d}`;
  return (
    await G(g, e ?? globalThis.fetch, E, l, m),
    {
      baseUrl: g,
      token: m,
      child: l,
      dispose: async () => {
        if (l.exitCode !== null) {
          h.dispose();
          return;
        }
        l.kill("SIGTERM"), (await M(l, 5e3)) || l.kill("SIGKILL"), h.dispose();
      },
    }
  );
}
function B(n, e) {
  const o = x.SANDBOX_AGENT_BIN;
  if (!o) return null;
  const s = e.resolve(o);
  return n.existsSync(s) ? s : null;
}
function O(n, e, o) {
  const s = `${process.platform}-${process.arch}`,
    r = $[s];
  if (!r) return null;
  try {
    const a = n.resolve(`${r}/package.json`),
      i = process.platform === "win32" ? "sandbox-agent.exe" : "sandbox-agent",
      t = e.join(e.dirname(a), "bin", i);
    return o.existsSync(t) ? t : null;
  } catch {
    return null;
  }
}
function N(n, e) {
  const o = x.PATH ?? "",
    s = process.platform === "win32" ? ";" : ":",
    r = o.split(s).filter(Boolean),
    a = process.platform === "win32" ? "sandbox-agent.exe" : "sandbox-agent";
  for (const i of r) {
    const t = e.join(i, a);
    if (n.existsSync(t)) return t;
  }
  return null;
}
async function C(n, e) {
  return new Promise((o, s) => {
    const r = n.createServer();
    r.unref(),
      r.on("error", s),
      r.listen(0, e, () => {
        const a = r.address();
        r.close(() => o(a.port));
      });
  });
}
async function G(n, e, o, s, r) {
  if (!e) throw new Error("Fetch API is not available; provide a fetch implementation.");
  const a = Date.now();
  let i;
  for (; Date.now() - a < o; ) {
    if (s.exitCode !== null) throw new Error("sandbox-agent exited before becoming healthy.");
    try {
      const t = await e(`${n}/v1/health`, { headers: { Authorization: `Bearer ${r}` } });
      if (t.ok) return;
      i = `status ${t.status}`;
    } catch (t) {
      i = t instanceof Error ? t.message : String(t);
    }
    await new Promise((t) => setTimeout(t, 200));
  }
  throw new Error(`Timed out waiting for sandbox-agent health (${i ?? "unknown error"}).`);
}
async function M(n, e) {
  return n.exitCode !== null
    ? !0
    : new Promise((o) => {
        const s = setTimeout(() => o(!1), e);
        n.once("exit", () => {
          clearTimeout(s), o(!0);
        });
      });
}
function D(n) {
  const e = () => {
    n.exitCode === null && n.kill("SIGTERM");
  };
  return (
    process.once("exit", e),
    process.once("SIGINT", e),
    process.once("SIGTERM", e),
    {
      dispose: () => {
        process.off("exit", e), process.off("SIGINT", e), process.off("SIGTERM", e);
      },
    }
  );
}
export { k as isNodeRuntime, V as spawnSandboxAgent };
