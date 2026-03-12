# Backend Notes

## Actor Hierarchy

Keep the backend actor tree aligned with this shape unless we explicitly decide to change it:

```text
OrganizationActor
├─ GitHubStateActor(org-scoped GitHub source of truth)
├─ RepositoryActor(repo)
│  └─ TaskActor(task)
│     ├─ TaskSessionActor(session) × N
│     │  └─ SessionStatusSyncActor(session) × 0..1
│     └─ Task-local workbench state
└─ SandboxInstanceActor(providerId, sandboxId) × N

AppShellOrganization("app")
└─ UserGitHubDataActor(user-scoped GitHub auth/identity) × N
```

## Ownership Rules

- `OrganizationActor` is the organization coordinator and lookup/index owner.
- `HistoryActor` is repository-scoped.
- `RepositoryActor` is the repo coordinator and owns repo-local indexes.
- `TaskActor` is one branch. Treat `1 task = 1 branch` once branch assignment is finalized.
- `TaskActor` can have many sessions.
- `TaskActor` can reference many sandbox instances historically, but should have only one active sandbox/session at a time.
- Session unread state and draft prompts are backend-owned workbench state, not frontend-local state.
- Branch rename is a real git operation, not just metadata.
- `SandboxInstanceActor` stays separate from `TaskActor`; tasks/sessions reference it by identity.
- `GitHubStateActor` is the only actor allowed to receive GitHub webhooks, call the GitHub API, persist GitHub repository/member/pull-request data, and dispatch GitHub-derived updates to the rest of the actor tree.
- `UserGitHubDataActor` is user-scoped, not organization-scoped. Store per-user GitHub identity and auth there, not in organization state.
- Foundry is multiplayer. Each signed-in user has their own GitHub account, their own app session, and their own `UserGitHubDataActor`.
- Organization grouping comes from GitHub organizations. Do not invent a parallel non-GitHub organization grouping model inside Foundry state.
- Do not add repo-level GitHub caches such as `pr_cache`; repositories must read remote pull-request state from `GitHubStateActor`.
- Prefer event-driven actor coordination. If an actor is telling another actor to do work, default to enqueueing that work and continuing rather than waiting synchronously for the child actor to finish.
- Queue publishes inside actors should usually use `wait: false`. Only wait for a queue response when the current actor cannot safely commit its own local mutation without the completed child result.
- Coordinator actors must not block on downstream provisioning, sync, or other long-running child actor work.
- Workflow handlers should be decomposed into small durable steps. Each local mutation or externally meaningful transition gets its own step; avoid monolithic workflow steps that bundle an entire cross-actor flow together.
- Every actor that uses `workflow(...)` must install an `onError` hook and report normalized workflow failures into organization-scoped runtime issue state.
- Organization runtime issue state is the backend source of truth for actor/workflow error badges in the frontend top bar and settings screens.

## Maintenance

- Keep this file up to date whenever actor ownership, hierarchy, or lifecycle responsibilities change.
- If the real actor tree diverges from this document, update this document in the same change.

## Daytona Provider Rules

- Daytona sandbox lifecycle uses native Daytona control-plane operations only: create, get, start, stop, delete, and preview endpoint lookup.
- Once a Daytona sandbox exists, the backend must treat sandbox-agent as the runtime surface. Run in-sandbox commands through sandbox-agent process APIs, not Daytona native process execution.
- The Daytona snapshot image must fail fast if `sandbox-agent` or agent installation fails. Do not hide install failures with `|| true`.
- Daytona does not reliably replace PID 1 with the image `ENTRYPOINT`/`CMD`. Start `sandbox-agent server` after sandbox creation via Daytona's native process API, then use sandbox-agent for all normal runtime commands.
- If sandbox startup fails, inspect the provider API and image/build logs first. For Daytona, confirm the snapshot image builds, the preview endpoint comes up, and `/v1/health` responds before chasing task/workbench code paths.
- Task/workbench payloads must include enough startup detail for the frontend to show the current provisioning phase and any startup error message.
