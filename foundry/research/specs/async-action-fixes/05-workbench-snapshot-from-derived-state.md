# Workbench Snapshots Should Read Derived State, Not Recompute It

## Problem

Workbench snapshot reads currently execute expensive sandbox commands and transcript reads inline:

- `git status`
- `git diff --numstat`
- one diff per changed file
- file tree enumeration
- transcript reads for each session
- session status lookups

The remote workbench client refreshes after each action and on update events, so this synchronous snapshot work is amplified.

## Target Contract

- `getWorkbench` reads a cached projection only.
- Expensive sandbox- or session-derived data is updated asynchronously and stored in actor-owned tables.
- Detail-heavy payloads are fetched separately when the user actually opens that view.

## Proposed Fix

1. Split the current monolithic workbench snapshot into:
   - lightweight task/workbench summary
   - session transcript endpoint
   - file diff endpoint
   - file tree endpoint
2. Cache derived git state in SQLite, updated by background jobs or targeted invalidation after mutating actions.
3. Cache transcript/session metadata incrementally from sandbox events instead of reading full transcripts on every snapshot.
4. Keep `getWorkbench` limited to summary fields needed for the main screen.
5. Update the remote workbench client to rely more on push updates and less on immediate full refresh after every mutation.

## Client Impact

- Main workbench loads faster and remains responsive with many tasks/files/sessions.
- Heavy panes can show their own loading states when opened.

## Acceptance Criteria

- `getWorkbench` does not run per-file diff commands inline.
- `getWorkbench` does not read full transcripts for every tab inline.
- Full workbench refresh cost stays roughly proportional to task count, not task count times changed files times sessions.
