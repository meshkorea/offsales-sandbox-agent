# Task Creation Should Return After Actor Bootstrap

## Problem

Task creation currently waits for full provisioning: naming, repo checks, sandbox creation/resume, sandbox-agent install/start, sandbox-instance wiring, and session creation.

That makes a user-facing action depend on queue-backed and provider-backed work that can take minutes. The client only needs the task actor to exist so it can navigate to the task and observe progress.

## Target Contract

- `createTask` returns once the task actor exists and initial task metadata is persisted.
- The response includes the task identity the client needs for follow-up reads and subscriptions.
- Provisioning continues in the background through the task workflow.
- Progress and failure are surfaced through task state, history events, and workbench updates.

## Proposed Fix

1. Restore the async split between `initialize` and `provision`.
2. Keep `task.command.initialize` responsible for:
   - creating the task actor
   - bootstrapping DB rows
   - persisting any immediately-known metadata
   - returning the current task record
3. After initialize completes, enqueue `task.command.provision` with `wait: false`.
4. Change `workspace.createTask` to:
   - create or resolve the project
   - create the task actor
   - call `task.initialize(...)`
   - stop awaiting `task.provision(...)`
   - broadcast a workbench/task update
   - return the task record immediately
5. Persist a clear queued/running state for provisioning so the frontend can distinguish:
   - `init_enqueue_provision`
   - `init_ensure_name`
   - `init_create_sandbox`
   - `init_ensure_agent`
   - `init_create_session`
   - `running`
   - `error`

## Client Impact

- Task creation UI should navigate immediately to the task page.
- The page should render a provisioning state from task status instead of treating create as an all-or-nothing spinner.
- Any tab/session creation that depends on provisioning should observe task state and wait for readiness asynchronously.

## Acceptance Criteria

- Creating a task never waits on sandbox creation or session creation.
- A timeout in provider setup does not make the original create request fail after several minutes.
- After a backend restart, the task workflow can resume provisioning from durable state without requiring the client to retry create.
