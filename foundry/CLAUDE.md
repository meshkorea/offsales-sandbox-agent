# Project Instructions

## Breaking Changes

Do not preserve legacy compatibility. Implement the best current architecture, even if breaking.

## Language Policy

Use TypeScript for all source code.

- Never add raw JavaScript source files (`.js`, `.mjs`, `.cjs`).
- Prefer `.ts`/`.tsx` for runtime code, scripts, tests, and tooling.
- If touching old JavaScript, migrate it to TypeScript instead of extending it.

## Monorepo + Tooling

Use `pnpm` workspaces and Turborepo.

- Workspace root uses `pnpm-workspace.yaml` and `turbo.json`.
- Packages live in `packages/*`.
- `core` is renamed to `shared`.
- `packages/cli` is disabled and excluded from active workspace validation.
- Integrations and providers live under `packages/backend/src/{integrations,providers}`.

## CLI Status

- `packages/cli` is fully disabled for active development.
- Do not implement new behavior in `packages/cli` unless explicitly requested.
- Frontend is the primary product surface; prioritize `packages/frontend` + supporting `packages/client`/`packages/backend`.
- Workspace `build`, `typecheck`, and `test` intentionally exclude `@sandbox-agent/foundry-cli`.
- `pnpm-workspace.yaml` excludes `packages/cli` from workspace package resolution.

## Common Commands

- Foundry is the canonical name for this product tree. Do not introduce or preserve legacy pre-Foundry naming in code, docs, commands, or runtime paths.
- Install deps: `pnpm install`
- Full active-workspace validation: `pnpm -w typecheck`, `pnpm -w build`, `pnpm -w test`
- Start the full dev stack: `just foundry-dev`
- Start the local production-build preview stack: `just foundry-preview`
- Start only the backend locally: `just foundry-backend-start`
- Start only the frontend locally: `pnpm --filter @sandbox-agent/foundry-frontend dev`
- Start the frontend against the mock workbench client on a separate port: `FOUNDRY_FRONTEND_CLIENT_MODE=mock pnpm --filter @sandbox-agent/foundry-frontend dev -- --port 4180`
- Keep the real frontend on `4173` and the mock frontend on `4180` intentionally so both can run in parallel against the same real backend during UI testing.
- Stop the compose dev stack: `just foundry-dev-down`
- Tail compose logs: `just foundry-dev-logs`
- Stop the preview stack: `just foundry-preview-down`
- Tail preview logs: `just foundry-preview-logs`

## Frontend + Client Boundary

- Keep a browser-friendly GUI implementation aligned with the TUI interaction model wherever possible.
- Do not import `rivetkit` directly in CLI or GUI packages. RivetKit client access must stay isolated inside `packages/client`.
- All backend interaction (actor calls, metadata/health checks, backend HTTP endpoint access) must go through the dedicated client library in `packages/client`.
- Outside `packages/client`, do not call backend endpoints directly (for example `fetch(.../api/rivet...)`), except in black-box E2E tests that intentionally exercise raw transport behavior.
- GUI state should update in realtime (no manual refresh buttons). Prefer RivetKit push reactivity and actor-driven events; do not add polling/refetch for normal product flows.
- Keep the mock workbench types and mock client in `packages/shared` + `packages/client` up to date with the frontend contract. The mock is the UI testing reference implementation while backend functionality catches up.
- Keep frontend route/state coverage current in code and tests; there is no separate page-inventory doc to maintain.
- If Foundry uses a shared component from `@sandbox-agent/react`, make changes in `sdks/react` instead of copying or forking that component into Foundry.
- When changing shared React components in `sdks/react` for Foundry, verify they still work in the Sandbox Agent Inspector before finishing.
- When making UI changes, verify the live flow with `agent-browser`, take screenshots of the updated UI, and offer to open those screenshots in Preview when you finish.
- When asked for screenshots, capture all relevant affected screens and modal states, not just a single viewport. Include empty, populated, success, and blocked/error states when they are part of the changed flow.
- If a screenshot catches a transition frame, blank modal, or otherwise misleading state, retake it before reporting it.

## Runtime Policy

- Runtime is Bun-native.
- Use Bun for CLI/backend execution paths and process spawning.
- Do not add Node compatibility fallbacks for OpenTUI/runtime execution.

## Sandbox Runtime Ownership

- For Daytona sandboxes, `ENTRYPOINT`/`CMD` does not reliably hand PID 1 to `sandbox-agent server`. Start `sandbox-agent server` after sandbox creation via Daytona's native process API, then route normal runtime commands through sandbox-agent.
- For Daytona sandboxes, use sandbox-agent process APIs (`/v1/processes/run` or the equivalent SDK surface) for clone, git, and runtime task commands after the server is up. Native Daytona process execution is only for the one-time server bootstrap plus lifecycle/control-plane calls.
- Native Daytona calls are otherwise limited to sandbox lifecycle/control-plane operations such as create/get/start/stop/delete and preview endpoint lookup.
- If a sandbox fails to start, inspect the provider API first. For Daytona, check the Daytona API/build logs and preview endpoint health before assuming the bug is in task/workbench code. Apply the same rule to any non-Daytona provider by checking the underlying sandbox API directly.
- Task UI must surface startup state clearly. While a sandbox/session is still booting, show the current task phase and status message; if startup fails, show the error directly in the task UI instead of leaving the user at a generic loading/empty state.

## Defensive Error Handling

- Write code defensively: validate assumptions at boundaries and state transitions.
- If the system reaches an unexpected state, raise an explicit error with actionable context.
- Do not fail silently, swallow errors, or auto-ignore inconsistent data.
- Prefer fail-fast behavior over hidden degradation when correctness is uncertain.

## RivetKit Dependency Policy

For all Rivet/RivetKit implementation:

1. Use SQLite + Drizzle for persistent state.
2. SQLite is **per actor instance** (per actor key), not a shared backend-global database:
   - Each actor instance gets its own SQLite DB.
   - Schema design should assume a single actor instance owns the entire DB.
   - Do not add `workspaceId`/`repoId`/`taskId` columns just to "namespace" rows for a given actor instance; use actor state and/or the actor key instead.
   - Example: the `task` actor instance already represents `(workspaceId, repoId, taskId)`, so its SQLite tables should not need those columns for primary keys.
3. Do not use backend-global SQLite singletons; database access must go through actor `db` providers (`c.db`).
4. The default dependency source for RivetKit is the published `rivetkit` package so workspace installs and CI remain self-contained.
   - Current coordinated build for this branch: `https://pkg.pr.new/rivet-dev/rivet/rivetkit@4409`
5. When working on coordinated RivetKit changes, you may temporarily relink to a local checkout instead of the published package.
   - Dedicated local checkout for this workspace: `/Users/nathan/conductor/workspaces/task/rivet-checkout`
   - Preferred local link target: `../rivet-checkout/rivetkit-typescript/packages/rivetkit`
   - Sub-packages (`@rivetkit/sqlite-vfs`, etc.) resolve transitively from the RivetKit workspace when using the local checkout.
6. Before using a local checkout, build RivetKit in the rivet repo:
   ```bash
   cd ../rivet-checkout/rivetkit-typescript
   pnpm install
   pnpm build -F rivetkit
   ```

## Inspector HTTP API (Workflow Debugging)

- The Inspector HTTP routes come from RivetKit `feat: inspector http api (#4144)` and are served from the RivetKit manager endpoint (not `/api/rivet`).
- Resolve manager endpoint from backend metadata:
  ```bash
  curl -sS http://127.0.0.1:7741/api/rivet/metadata | jq -r '.clientEndpoint'
  ```
- List actors:
  - `GET {manager}/actors?name=task`
- Inspector endpoints (path prefix: `/gateway/{actorId}/inspector`):
  - `GET /state`
  - `PATCH /state`
  - `GET /connections`
  - `GET /rpcs`
  - `POST /action/{name}`
  - `GET /queue?limit=50`
  - `GET /traces?startMs=0&endMs=<ms>&limit=1000`
  - `GET /workflow-history`
  - `GET /summary`
- Auth:
  - Production: send `Authorization: Bearer $RIVET_INSPECTOR_TOKEN`.
  - Development: auth can be skipped when no inspector token is configured.
- Task workflow quick inspect:
  ```bash
  MGR="$(curl -sS http://127.0.0.1:7741/api/rivet/metadata | jq -r '.clientEndpoint')"
  HID="7df7656e-bbd2-4b8c-bf0f-30d4df2f619a"
  AID="$(curl -sS "$MGR/actors?name=task" \
    | jq -r --arg hid "$HID" '.actors[] | select(.key | endswith("/task/\($hid)")) | .actor_id' \
    | head -n1)"
  curl -sS "$MGR/gateway/$AID/inspector/workflow-history" | jq .
  curl -sS "$MGR/gateway/$AID/inspector/summary" | jq .
  ```
- If inspector routes return `404 Not Found (RivetKit)`, the running backend is on a RivetKit build that predates `#4144`; rebuild linked RivetKit and restart backend.

## Workspace + Actor Rules

- Everything is scoped to a workspace.
- Workspace resolution order: `--workspace` flag -> config default -> `"default"`.
- `ControlPlaneActor` is replaced by `WorkspaceActor` (workspace coordinator).
- Every actor key must be prefixed with workspace namespace (`["ws", workspaceId, ...]`).
- CLI/TUI/GUI must use `@sandbox-agent/foundry-client` (`packages/client`) for backend access; `rivetkit/client` imports are only allowed inside `packages/client`.
- Do not add custom backend REST endpoints (no `/v1/*` shim layer).
- We own the sandbox-agent project; treat sandbox-agent defects as first-party bugs and fix them instead of working around them.
- Keep strict single-writer ownership: each table/row has exactly one actor writer.
- Parent actors (`workspace`, `project`, `task`, `history`, `sandbox-instance`) use command-only loops with no timeout.
- Periodic syncing lives in dedicated child actors with one timeout cadence each.
- Prefer event-driven actor coordination over synchronous actor-to-actor waiting. Inside an actor, enqueue downstream work and continue unless the current actor truly needs the finished child result to complete its own local mutation safely.
- When publishing to actor queues, prefer `wait: false`. Waiting on queue responses inside actors should be the exception, not the default.
- Coordinator actors must not block on child actor provisioning, sync, webhook fanout, or other long-running remote work. Commit local durable state first, then let child actors advance the flow asynchronously.
- Workflow handlers should be decomposed into narrow durable steps. Each mutation or externally meaningful transition should be its own step; do not hide multi-phase cross-actor flows inside one monolithic workflow step.
- Actor handle policy:
- Prefer explicit `get` or explicit `create` based on workflow intent; do not default to `getOrCreate`.
- Use `get`/`getForId` when the actor is expected to already exist; if missing, surface an explicit `Actor not found` error with recovery context.
- Use create semantics only on explicit provisioning/create paths where creating a new actor instance is intended.
- `getOrCreate` is a last resort for create paths when an explicit create API is unavailable; never use it in read/command paths.
- For long-lived cross-actor links (for example sandbox/session runtime access), persist actor identity (`actorId`) and keep a fallback lookup path by actor id.
- Docker dev: `compose.dev.yaml` mounts a named volume at `/root/.local/share/foundry/repos` to persist backend-managed git clones across restarts. Code must still work if this volume is not present (create directories as needed).
- RivetKit actor `c.state` is durable, but in Docker it is stored under `/root/.local/share/rivetkit`. If that path is not persisted, actor state-derived indexes (for example, in `project` actor state) can be lost after container recreation even when other data still exists.
- Workflow history divergence policy:
- Production: never auto-delete actor state to resolve `HistoryDivergedError`; ship explicit workflow migrations (`ctx.removed(...)`, step compatibility).
- Development: manual local state reset is allowed as an operator recovery path when migrations are not yet available.
- Storage rule of thumb:
- Put simple metadata in `c.state` (KV state): small scalars and identifiers like `{ taskId }`, `{ repoId }`, booleans, counters, timestamps, status strings.
- If it grows beyond trivial (arrays, maps, histories, query/filter needs, relational consistency), use SQLite + Drizzle in `c.db`.

## GitHub Ownership

- Foundry is multiplayer. Every signed-in user has their own GitHub account and their own app session state.
- Per-user GitHub identity/auth belongs in a dedicated user-scoped actor, not in organization state.
- Keep a single GitHub source-of-truth actor per organization. It is the only actor allowed to receive GitHub webhooks, call the GitHub API, persist GitHub repositories/members/pull requests, and dispatch GitHub-derived updates to the rest of the actor tree.
- Repository/task/history actors must consume GitHub-derived state from the organization GitHub actor; they must not maintain their own GitHub caches.
- Organization grouping is managed by the GitHub organization structure. Do not introduce a second internal grouping model that can diverge from GitHub.
- For workflow-backed actors, install a workflow `onError` hook and report failures into organization-scoped runtime issue state so the frontend can surface actor/workflow errors without querying the entire actor tree live.
- The main workspace top bar should make organization runtime errors obvious. If actor/workflow errors exist, show them there and include detailed issue state in settings.

## Testing Policy

- Never use vitest mocks (`vi.mock`, `vi.spyOn`, `vi.fn`). Instead, define driver interfaces for external I/O and pass test implementations via the actor runtime context.
- All external service calls (git CLI, GitHub CLI, sandbox-agent HTTP, tmux) must go through the `BackendDriver` interface on the runtime context.
- Integration tests use `setupTest()` from `rivetkit/test` and are gated behind `HF_ENABLE_ACTOR_INTEGRATION_TESTS=1`.
- The canonical "main user flow" for large Foundry changes must be exercised in the live product with `agent-browser`, and screenshots from the full flow should be returned to the user.
  - Sign in.
  - Create a task.
  - Prompt the agent to make a change.
  - Create a pull request for the change.
  - Prompt another change.
  - Push that change.
  - Merge the PR.
  - Confirm the task is finished and its status is updated correctly.
  - During this flow, verify that remote GitHub state updates correctly and that Foundry receives and applies the resulting webhook-driven state updates.
- End-to-end testing must run against the dev backend started via `docker compose -f compose.dev.yaml up` (host -> container). Do not run E2E against an in-process test runtime.
  - E2E tests should talk to the backend over HTTP (default `http://127.0.0.1:7741/api/rivet`) and use real GitHub repos/PRs.
  - For Foundry live verification, use `rivet-dev/sandbox-agent-testing` as the default testing repo unless the task explicitly says otherwise.
  - Secrets (e.g. `OPENAI_API_KEY`, `GITHUB_TOKEN`/`GH_TOKEN`) must be provided via environment variables, never hardcoded in the repo.
  - `~/misc/env.txt` and `~/misc/the-foundry.env` contain the expected local OpenAI + GitHub OAuth/App config for dev.
  - Do not assume `gh auth token` is sufficient for Foundry task provisioning against private repos. Sandbox/bootstrap git clone, push, and PR flows require a repo-capable `GITHUB_TOKEN`/`GH_TOKEN` in the backend container.
  - If browser GitHub OAuth suddenly fails with symptoms like `GitHub OAuth is not configured` while other GitHub flows seem to work, first check whether the backend is relying on a `GITHUB_TOKEN` override instead of the OAuth/App env from `~/misc/env.txt` and `~/misc/the-foundry.env`. In local dev, clear `GITHUB_TOKEN`/`GH_TOKEN`, source those env files, and recreate the backend container; `docker restart` is not enough.
  - Preferred product behavior for org workspaces is to mint a GitHub App installation token from the workspace installation and inject it into backend/sandbox git operations. Do not rely on an operator's ambient CLI auth as the long-term solution.
- Treat client E2E tests in `packages/client/test` as the primary end-to-end source of truth for product behavior.
- Keep backend tests small and targeted. Only retain backend-only tests for invariants or persistence rules that are not well-covered through client E2E.
- Do not keep large browser E2E suites around in a broken state. If a frontend browser E2E is not maintained and producing signal, remove it until it can be replaced with a reliable test.

## Config

- Keep config path at `~/.config/foundry/config.toml`.
- Evolve properties in place; do not move config location.

## Project Guidance

Project-specific guidance lives in `README.md`, `CONTRIBUTING.md`, and the relevant files under `research/`.

Keep those updated when:

- Commands change
- Configuration options change
- Architecture changes
- Plugins/providers change
- Actor ownership changes

## Friction Logs

Track friction at:

- `research/friction/rivet.mdx`
- `research/friction/sandbox-agent.mdx`
- `research/friction/sandboxes.mdx`
- `research/friction/general.mdx`

Category mapping:

- `rivet`: Rivet/RivetKit runtime, actor model, queues, keys
- `sandbox-agent`: sandbox-agent SDK/API behavior
- `sandboxes`: provider implementations (worktree/daytona/etc)
- `general`: everything else

Each entry must include:

- Date (`YYYY-MM-DD`)
- Commit SHA (or `uncommitted`)
- What you were implementing
- Friction/issue
- Attempted fix/workaround and outcome

## History Events

Log notable workflow changes to `events` so `hf history` remains complete:

- create
- attach
- push/sync/merge
- archive/kill
- status transitions
- PR state transitions

## Validation After Changes

Always run and fix failures:

```bash
pnpm -w typecheck
pnpm -w build
pnpm -w test
```

After making code changes, always update the dev server before declaring the work complete. If the dev stack is running through Docker Compose, restart or recreate the relevant dev services so the running app reflects the latest code.
