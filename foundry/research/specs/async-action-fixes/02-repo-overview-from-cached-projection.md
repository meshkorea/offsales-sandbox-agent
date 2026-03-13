# Repo Overview Should Read Cached State Only

## Problem

Repo overview currently forces PR sync and branch sync inline before returning data. That turns a read path into:

- repo fetch
- branch enumeration
- diff/conflict calculations
- GitHub PR listing

The frontend polls repo overview repeatedly, so this design multiplies slow work and ties normal browsing to sync latency.

## Target Contract

- `getRepoOverview` returns the latest cached repo projection immediately.
- Sync happens on a background cadence or on an explicit async refresh trigger.
- Overview responses include freshness metadata so the client can show "refreshing" or "stale" state without blocking.

## Proposed Fix

1. Remove inline `forceProjectSync()` from `getRepoOverview`.
2. Add freshness fields to the project projection, for example:
   - `branchSyncAt`
   - `prSyncAt`
   - `branchSyncStatus`
   - `prSyncStatus`
3. Let the existing polling actors own cache refresh.
4. If the client needs a manual refresh, add a non-blocking command such as `project.requestOverviewRefresh` that:
   - enqueues refresh work
   - updates sync status to `queued` or `running`
   - returns immediately
5. Keep `getRepoOverview` as a pure read over project SQLite state.

## Client Impact

- The repo overview screen should render cached rows immediately.
- If the user requests a refresh, the UI should show a background sync indicator instead of waiting for the GET call to complete.
- Polling frequency can be reduced because reads are now cheap and sync is event-driven.

## Acceptance Criteria

- `getRepoOverview` does not call `force()` on polling actors.
- Opening the repo overview page does not trigger network/git work inline.
- Slow branch sync or PR sync no longer blocks the page request.
