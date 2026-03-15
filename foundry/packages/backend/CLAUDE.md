# Backend Notes

## Actor Hierarchy

Keep the backend actor tree aligned with this shape unless we explicitly decide to change it:

```text
OrganizationActor
├─ HistoryActor(organization-scoped global feed)
├─ GithubDataActor
├─ RepositoryActor(repo)
│  └─ TaskActor(task)
│     ├─ TaskSessionActor(session) × N
│     │  └─ SessionStatusSyncActor(session) × 0..1
│     └─ Task-local workbench state
└─ SandboxInstanceActor(sandboxProviderId, sandboxId) × N
```

## Ownership Rules

- `OrganizationActor` is the organization coordinator and lookup/index owner.
- `HistoryActor` is organization-scoped. There is one organization-level history feed.
- `RepositoryActor` is the repo coordinator and owns repo-local caches/indexes.
- `TaskActor` is one branch. Treat `1 task = 1 branch` once branch assignment is finalized.
- `TaskActor` can have many sessions.
- `TaskActor` can reference many sandbox instances historically, but should have only one active sandbox/session at a time.
- Session unread state and draft prompts are backend-owned workbench state, not frontend-local state.
- Branch rename is a real git operation, not just metadata.
- `SandboxInstanceActor` stays separate from `TaskActor`; tasks/sessions reference it by identity.
- The backend stores no local git state. No clones, no refs, no working trees, and no git-spice. Repository metadata comes from GitHub API data and webhook events. Any working-tree git operation runs inside a sandbox via `executeInSandbox()`.
- When a backend request path must aggregate multiple independent actor calls or reads, prefer bounded parallelism over sequential fan-out when correctness permits. Do not serialize independent work by default.

## Maintenance

- Keep this file up to date whenever actor ownership, hierarchy, or lifecycle responsibilities change.
- If the real actor tree diverges from this document, update this document in the same change.
