# Repo Sync And Stack Actions Should Run In Background Workflows

## Problem

Repo stack actions currently run inside a synchronous action and surround the action with forced sync before and after. Branch-backed task creation also forces repo sync inline before it can proceed.

These flows depend on repo/network state and can take minutes. They should not hold an action open.

## Target Contract

- Repo-affecting actions are accepted quickly and run in the background.
- The project actor owns a durable action record with progress and final result.
- Clients observe status via project/task state instead of waiting for a single response.

## Proposed Fix

1. Introduce a project-level workflow/job model for repo actions, for example:
   - `sync_repo`
   - `restack_repo`
   - `restack_subtree`
   - `rebase_branch`
   - `reparent_branch`
   - `register_existing_branch`
2. Persist a job row with:
   - job id
   - action kind
   - target branch fields
   - status
   - message
   - timestamps
3. Change `runRepoStackAction` to:
   - validate cheap local inputs only
   - create a job row
   - enqueue the workflow with `wait: false`
   - return the job id and accepted status immediately
4. Move pre/post sync into the background workflow.
5. For branch-backed task creation:
   - use the cached branch projection if present
   - if branch data is stale or missing, enqueue branch registration/refresh work and surface pending state instead of blocking create

## Client Impact

- Repo action buttons should show queued/running/completed/error job state.
- Task creation from an existing branch may produce a task in a pending branch-attach state rather than blocking on repo sync.

## Acceptance Criteria

- No repo stack action waits for full git-spice execution inside the request.
- No action forces branch sync or PR sync inline.
- Action result state survives retries and backend restarts because the workflow status is persisted.
