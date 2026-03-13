# Workbench Session Creation Must Not Trigger Inline Provisioning

## Problem

Creating a workbench tab currently provisions the whole task if no active sandbox exists. A user action that looks like "open tab" can therefore block on sandbox creation and agent setup.

## Target Contract

- Creating a tab returns quickly.
- If the task is not provisioned yet, the tab enters a pending state and becomes usable once provisioning completes.
- Provisioning remains a task workflow concern, not a workbench request concern.

## Proposed Fix

1. Split tab creation from sandbox session creation.
2. On `createWorkbenchSession`:
   - create session metadata or a placeholder tab row immediately
   - if the task is not provisioned, enqueue the required background work and return the placeholder id
   - if the task is provisioned, enqueue background session creation if that step can also be slow
3. Add a tab/session state model such as:
   - `pending_provision`
   - `pending_session_create`
   - `ready`
   - `error`
4. When provisioning or session creation finishes, update the placeholder row with the real sandbox/session identifiers and notify the workbench.

## Client Impact

- The workbench can show a disabled composer or "Preparing environment" state for a pending tab.
- The UI no longer needs to block on the mutation itself.

## Acceptance Criteria

- `createWorkbenchSession` never calls task provisioning inline.
- Opening a tab on an unprovisioned task returns promptly with a placeholder tab id.
- The tab transitions to ready through background updates only.
