# Daytona Provisioning Should Be A Staged Background Flow

## Problem

Daytona provisioning currently performs long-running setup inline:

- sandbox create/start
- package/tool installation
- repo clone/fetch/checkout
- sandbox-agent install
- agent plugin install
- sandbox-agent boot
- health wait loop

This is acceptable inside a durable background workflow, but not as part of a user-facing action response.

## Target Contract

- Requests that need Daytona resources only wait for persisted actor/job creation.
- Daytona setup progresses through durable stages with explicit status.
- Follow-up work resumes from persisted state after crashes or restarts.

## Proposed Fix

1. Introduce a provider-facing staged readiness model, for example:
   - `sandbox_allocated`
   - `repo_prepared`
   - `agent_installing`
   - `agent_starting`
   - `agent_ready`
   - `session_creating`
   - `ready`
   - `error`
2. Persist stage transitions in task or sandbox-instance state.
3. Keep provider calls inside background workflow steps only.
4. Replace synchronous health-wait loops in request paths with:
   - background step execution
   - status updates after each step
   - follow-up workflow progression once the prior stage completes
5. If sandbox-agent session creation is also slow, treat that as its own stage instead of folding it into request completion.

## Client Impact

- Users see staged progress instead of a long spinner.
- Failures point to a concrete stage, which makes retries and debugging much easier.

## Acceptance Criteria

- No user-facing request waits for Daytona package installs, repo clone, sandbox-agent installation, or health polling.
- Progress survives backend restarts because the stage is persisted.
- The system can resume from the last completed stage instead of replaying the whole provisioning path blindly.
