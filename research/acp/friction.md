# ACP Migration Friction Log

Track every ACP migration issue that creates implementation friction, unclear behavior, or product risk.

Update this file continuously during the migration.

## Entry template

- Date:
- Commit: (SHA or `uncommitted`)
- Author:
- Implementing:
- Friction/issue:
- Attempted fix/workaround:
- Outcome:
- Status: `open` | `in_progress` | `resolved` | `deferred`
- Files:

## Entries

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Agent process availability — Amp ACP agent process
- Friction/issue: Amp does not have a confirmed official ACP agent process in current ACP docs/research. Blocks full parity if Amp is required in v1 launch scope.
- Attempted fix/workaround: Treat Amp as conditional for v1.0 and support via pinned fallback only if agent process source is validated.
- Outcome: Open.
- Status: open
- Files: `research/acp/acp-notes.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Transport — ACP streamable HTTP
- Friction/issue: ACP streamable HTTP is still draft upstream; v1 requires ACP over HTTP now. Potential divergence from upstream HTTP semantics.
- Attempted fix/workaround: Use strict JSON-RPC mapping and keep transport shim minimal/documented for later alignment.
- Outcome: Open.
- Status: open
- Files: `research/acp/spec.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: OpenCode compatibility sequencing
- Friction/issue: OpenCode compatibility must be preserved but not block ACP core rewrite. Risk of core rewrites being constrained by legacy compat behavior.
- Attempted fix/workaround: Disable/comment out `/opencode/*` during ACP core bring-up, then re-enable via dedicated bridge step after core is stable.
- Outcome: Accepted.
- Status: in_progress
- Files: `research/acp/migration-steps.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: TypeScript SDK layering
- Friction/issue: Risk of duplicating ACP protocol logic in our TS SDK instead of embedding upstream ACP SDK. Drift from ACP semantics and higher maintenance cost.
- Attempted fix/workaround: Embed `@agentclientprotocol/sdk` and keep our SDK as wrapper/convenience layer.
- Outcome: Accepted.
- Status: resolved
- Files: `research/acp/spec.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Installer behavior — lazy agent process install
- Friction/issue: Lazy agent process install can race under concurrent first-use requests. Duplicate downloads, partial installs, or bootstrap failures.
- Attempted fix/workaround: Add per-agent install lock + idempotent install path used by both explicit install and lazy install.
- Outcome: Accepted and implemented.
- Status: resolved
- Files: `research/acp/spec.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: ACP over HTTP standardization
- Friction/issue: Community is actively piloting both Streamable HTTP and WebSocket; no final single transport profile has emerged yet. Risk of rework if we overfit to one draft behavior that later shifts.
- Attempted fix/workaround: Lock v1 public contract to Streamable HTTP with ACP JSON-RPC payloads, keep implementation modular so WebSocket can be added later without breaking v1 API.
- Outcome: Accepted.
- Status: in_progress
- Files: `research/acp/acp-over-http-findings.md`, `research/acp/spec.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Session lifecycle surface
- Friction/issue: ACP stable does not include v1-equivalent methods for session listing, explicit session termination/delete, or event-log polling. Direct lift-and-shift of `/v1/sessions`, `/terminate`, and `/events` polling is not possible with ACP core only.
- Attempted fix/workaround: Define `_sandboxagent/session/*` extension methods for these control operations, while keeping core prompt flow on standard ACP methods.
- Outcome: Open.
- Status: open
- Files: `research/acp/v1-schema-to-acp-mapping.md`, `research/acp/spec.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: HITL question flow
- Friction/issue: ACP stable defines `session/request_permission` but not a generic question request/response method matching v1 `question.*` and question reply endpoints. Existing question UX cannot be represented with standard ACP methods alone.
- Attempted fix/workaround: Introduce `_sandboxagent/session/request_question` extension request/response and carry legacy shape via `_meta`.
- Outcome: Open.
- Status: open
- Files: `research/acp/v1-schema-to-acp-mapping.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Filesystem parity
- Friction/issue: ACP stable filesystem methods are text-only (`fs/read_text_file`, `fs/write_text_file`), while v1 exposes raw bytes plus directory operations. Binary file reads/writes, archive upload, and directory management cannot map directly to ACP core.
- Attempted fix/workaround: Use ACP standard methods for UTF-8 text paths; add `_sandboxagent/fs/*` extensions for binary and directory operations.
- Outcome: Open.
- Status: open
- Files: `research/acp/v1-schema-to-acp-mapping.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: v1 decommissioning
- Friction/issue: Ambiguity between "comment out v1" and "remove v1" causes rollout confusion. Risk of partial compatibility behavior and extra maintenance burden.
- Attempted fix/workaround: Hard-remove v1 behavior and return a stable HTTP 410 error for all `/v1/*` routes.
- Outcome: Accepted.
- Status: resolved
- Files: `research/acp/spec.md`, `research/acp/migration-steps.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: TypeScript ACP-over-HTTP client support
- Friction/issue: Official ACP client SDK does not currently provide the exact Streamable HTTP transport behavior required by this project. SDK cannot target `/v1/rpc` without additional transport implementation.
- Attempted fix/workaround: Embed upstream ACP SDK types/lifecycle and implement a project transport agent process for ACP-over-HTTP.
- Outcome: Accepted.
- Status: resolved
- Files: `research/acp/spec.md`, `research/acp/migration-steps.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Inspector migration
- Friction/issue: Inspector currently depends on v1 session/event surfaces. Inspector breaks after v1 removal unless migrated to ACP transport.
- Attempted fix/workaround: Keep `/ui/` route and migrate inspector runtime calls to ACP-over-HTTP; add dedicated inspector ACP tests.
- Outcome: Accepted.
- Status: resolved
- Files: `research/acp/spec.md`, `research/acp/migration-steps.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Inspector asset embedding
- Friction/issue: If `cargo build` runs before `frontend/packages/inspector/dist` exists, the build script can cache inspector-disabled embedding state. Local runs can serve `/ui/` as disabled even after inspector is built, unless Cargo reruns the build script.
- Attempted fix/workaround: Improve build-script invalidation to detect dist directory appearance/disappearance without manual rebuild nudges.
- Outcome: Implemented by watching the inspector package directory in `build.rs` so Cargo reruns when dist appears/disappears.
- Status: resolved
- Files: `server/packages/sandbox-agent/build.rs`, `research/acp/todo.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Deterministic ACP install tests
- Friction/issue: Installer and lazy-install tests were coupled to the live ACP registry, causing non-deterministic test behavior. Flaky CI and inability to reliably validate install provenance and lazy install flows.
- Attempted fix/workaround: Add `SANDBOX_AGENT_ACP_REGISTRY_URL` override and drive tests with a local one-shot registry fixture.
- Outcome: Accepted and implemented.
- Status: resolved
- Files: `server/packages/agent-management/src/agents.rs`, `server/packages/sandbox-agent/tests/v1_api.rs`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Inspector E2E tooling
- Friction/issue: `agent-browser` invocation under pnpm emits npm env warnings (`store-dir`, `recursive`) during scripted runs. No functional break, but noisy CI logs and possible future npm strictness risk.
- Attempted fix/workaround: Keep `npx -y agent-browser` script for now; revisit pinning/install strategy if warnings become hard failures.
- Outcome: Accepted.
- Status: open
- Files: `frontend/packages/inspector/tests/agent-browser.e2e.sh`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Real agent process matrix rollout
- Friction/issue: Full agent process smoke coverage requires provider credentials and installed real agent processes in CI/runtime environments. Phase-6 "full matrix green" and "install+prompt+stream per agent process" cannot be marked complete in local-only runs.
- Attempted fix/workaround: Keep deterministic agent process matrix in default CI (stub ACP agent processes for claude/codex/opencode) and run real credentialed agent processes in environment-specific jobs.
- Outcome: Accepted.
- Status: resolved
- Files: `research/acp/todo.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Inspector v1-to-v1 compatibility
- Friction/issue: Restored inspector UI expects legacy `/v1` session/event contracts that no longer exist in ACP-native v1. Full parity would block migration; inspector would otherwise fail to run against v1.
- Attempted fix/workaround: Keep the restored UI and bridge to ACP with a thin compatibility client (`src/lib/legacyClient.ts`), stubbing non-parity features with explicit `TODO` markers.
- Outcome: Accepted.
- Status: open
- Files: `frontend/packages/inspector/src/lib/legacyClient.ts`, `research/acp/inspector-unimplemented.md`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Multi-client session visibility + process sharing
- Friction/issue: Existing ACP runtime mapped one HTTP ACP connection to one dedicated agent process, which prevented global session visibility and increased process count. Clients could not discover sessions created by other clients; process utilization scaled with connection count instead of agent type.
- Attempted fix/workaround: Use one shared backend process per `AgentId`, maintain server-owned in-memory meta session registry across all connections, intercept `session/list` as a global aggregated view, and add an experimental detach extension (`_sandboxagent/session/detach`) for connection-level session detachment.
- Outcome: Accepted and implemented.
- Status: resolved
- Files: `server/packages/sandbox-agent/src/acp_runtime/mod.rs`, `server/packages/sandbox-agent/src/acp_runtime/mock.rs`, `server/packages/sandbox-agent/tests/v1_api.rs`, `server/packages/sandbox-agent/tests/v1_agent_process_matrix.rs`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: TypeScript SDK package split and ACP lifecycle
- Friction/issue: `sandbox-agent` SDK exposed ACP transport primitives directly (`createAcpClient`, raw envelope APIs, ACP type re-exports), making the public API ACP-heavy. Harder to keep a simple Sandbox-facing API while still supporting protocol-faithful ACP HTTP behavior and Sandbox metadata/extensions.
- Attempted fix/workaround: Split into `acp-http-client` (pure ACP HTTP transport/client) and `sandbox-agent` (`SandboxAgentClient`) as a thin wrapper with metadata/event conversion and extension helpers.
- Outcome: Accepted and implemented.
- Status: resolved
- Files: `research/acp/ts-client.md`, `sdks/acp-http-client/src/index.ts`, `sdks/typescript/src/client.ts`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Streamable HTTP transport contract
- Friction/issue: Ambiguity over whether `/v1/rpc` should track MCP transport negotiation (`POST` accepting SSE responses, multi-stream fanout) versus Sandbox Agent's simpler JSON-only POST contract. Without an explicit contract, clients can assume incompatible Accept/media semantics and open duplicate GET streams that receive duplicate events.
- Attempted fix/workaround: Define Sandbox Agent transport profile explicitly: `POST /v1/rpc` is JSON-only (`Content-Type` and `Accept` for `application/json`), `GET /v1/rpc` is SSE-only (`Accept: text/event-stream`), and allow only one active SSE stream per ACP connection id.
- Outcome: Accepted and implemented.
- Status: resolved
- Files: `server/packages/sandbox-agent/src/router.rs`, `server/packages/sandbox-agent/src/acp_runtime/mod.rs`, `server/packages/sandbox-agent/tests/v1_api/acp_transport.rs`, `docs/advanced/acp-http-client.mdx`

- Date: 2026-02-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: Agent selection contract for ACP bootstrap/session creation
- Friction/issue: `x-acp-agent` bound agent selection to transport bootstrap, which conflicted with Sandbox Agent meta-session goals where one client can manage sessions across multiple agents. Connections appeared agent-affine; agent selection was hidden in HTTP headers rather than explicit in ACP payload metadata.
- Attempted fix/workaround: Hard-remove `x-acp-agent`; require `params._meta["sandboxagent.dev"].agent` on `initialize` and `session/new`, and require `params.agent` for agent-routed calls that have no resolvable `sessionId`.
- Outcome: Accepted and implemented.
- Status: resolved
- Files: `server/packages/sandbox-agent/src/router.rs`, `server/packages/sandbox-agent/src/acp_runtime/helpers.rs`, `server/packages/sandbox-agent/src/acp_runtime/mod.rs`, `server/packages/sandbox-agent/src/acp_runtime/ext_meta.rs`, `server/packages/sandbox-agent/tests/v1_api/acp_transport.rs`

- Date: 2026-02-11
- Commit: uncommitted
- Author: Unassigned
- Implementing: ACP server simplification
- Friction/issue: Current `/v1/rpc` runtime includes server-managed metadata/session registry and `_sandboxagent/*` ACP extensions, while the new direction is a dumb stdio proxy keyed by client-provided ACP server id. Requires removing extension/metadata semantics and reshaping transport to `/v1/acp/{server_id}` with per-id subprocess lifecycle.
- Attempted fix/workaround: Replace `/v1/rpc` with `/v1/acp/{server_id}` (`POST`/`GET` SSE/`DELETE`), drop connection-id headers, keep replay by `server_id`, move non-ACP concerns to HTTP endpoints, and disable OpenCode routes.
- Outcome: Accepted (spec drafted).
- Status: in_progress
- Files: `research/acp/simplify-server.md`

- Date: 2026-02-11
- Commit: uncommitted
- Author: Unassigned
- Implementing: Directory-scoped config ownership
- Friction/issue: MCP/skills config previously traveled with session initialization payloads; simplified server needs standalone HTTP config scoped by directory. Requires new HTTP APIs and clear naming for per-directory/per-entry operations without ACP extension transport.
- Attempted fix/workaround: Add directory-scoped query APIs: `/v1/config/mcp?directory=...&mcpName=...` and `/v1/config/skills?directory=...&skillName=...` (name required), using v1 payload shapes for MCP/skills config values.
- Outcome: Accepted (spec updated).
- Status: in_progress
- Files: `research/acp/simplify-server.md`, `docs/mcp-config.mdx`, `docs/skills-config.mdx`

- Date: 2026-03-10
- Commit: uncommitted
- Author: Unassigned
- Implementing: ACP HTTP client transport reentrancy for human-in-the-loop requests
- Friction/issue: The TypeScript `acp-http-client` serialized the full lifetime of each POST on a single write queue. A long-running `session/prompt` request therefore blocked the client from POSTing a response to an agent-initiated `session/request_permission`, deadlocking permission approval flows.
- Attempted fix/workaround: Make the HTTP transport fire POSTs asynchronously after preserving outbound ordering at enqueue time, rather than waiting for the entire HTTP response before the next write can begin. Keep response bodies routed back into the readable stream so request promises still resolve normally.
- Outcome: Accepted and implemented in `acp-http-client`.
- Status: resolved
- Files: `sdks/acp-http-client/src/index.ts`, `sdks/acp-http-client/tests/smoke.test.ts`, `sdks/typescript/tests/integration.test.ts`
