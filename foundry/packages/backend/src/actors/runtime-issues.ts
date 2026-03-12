import type { WorkflowErrorEvent } from "rivetkit/workflow";
import type { FoundryActorRuntimeIssue, FoundryActorRuntimeType } from "@sandbox-agent/foundry-shared";
import { eq, sql } from "drizzle-orm";
import { organizationActorIssues } from "./organization/db/schema.js";
import { getOrCreateOrganization } from "./handles.js";

export interface ActorRuntimeIssueRecord extends FoundryActorRuntimeIssue {}

interface NormalizedWorkflowIssue {
  workflowId: string | null;
  stepName: string | null;
  attempt: number | null;
  willRetry: boolean;
  retryDelayMs: number | null;
  message: string;
}

interface ReportWorkflowIssueInput {
  actorType: FoundryActorRuntimeType;
  scopeId?: string | null;
  scopeLabel: string;
  organizationId: string;
}

async function ensureOrganizationActorIssuesTable(c: any): Promise<void> {
  await c.db.run(sql`
    CREATE TABLE IF NOT EXISTS organization_actor_issues (
      actor_id text PRIMARY KEY NOT NULL,
      actor_type text NOT NULL,
      scope_id text,
      scope_label text NOT NULL,
      message text NOT NULL,
      workflow_id text,
      step_name text,
      attempt integer,
      will_retry integer DEFAULT 0 NOT NULL,
      retry_delay_ms integer,
      occurred_at integer NOT NULL,
      updated_at integer NOT NULL
    )
  `);
}

export async function upsertActorRuntimeIssue(c: any, issue: ActorRuntimeIssueRecord): Promise<void> {
  await ensureOrganizationActorIssuesTable(c);
  await c.db
    .insert(organizationActorIssues)
    .values({
      actorId: issue.actorId,
      actorType: issue.actorType,
      scopeId: issue.scopeId,
      scopeLabel: issue.scopeLabel,
      message: issue.message,
      workflowId: issue.workflowId,
      stepName: issue.stepName,
      attempt: issue.attempt,
      willRetry: issue.willRetry ? 1 : 0,
      retryDelayMs: issue.retryDelayMs,
      occurredAt: issue.occurredAt,
      updatedAt: issue.occurredAt,
    })
    .onConflictDoUpdate({
      target: organizationActorIssues.actorId,
      set: {
        actorType: issue.actorType,
        scopeId: issue.scopeId,
        scopeLabel: issue.scopeLabel,
        message: issue.message,
        workflowId: issue.workflowId,
        stepName: issue.stepName,
        attempt: issue.attempt,
        willRetry: issue.willRetry ? 1 : 0,
        retryDelayMs: issue.retryDelayMs,
        occurredAt: issue.occurredAt,
        updatedAt: issue.occurredAt,
      },
    })
    .run();
}

export async function listActorRuntimeIssues(c: any): Promise<ActorRuntimeIssueRecord[]> {
  await ensureOrganizationActorIssuesTable(c);
  const rows = await c.db.select().from(organizationActorIssues).orderBy(organizationActorIssues.occurredAt).all();
  return rows
    .map((row) => ({
      actorId: row.actorId,
      actorType: row.actorType as FoundryActorRuntimeType,
      scopeId: row.scopeId ?? null,
      scopeLabel: row.scopeLabel,
      message: row.message,
      workflowId: row.workflowId ?? null,
      stepName: row.stepName ?? null,
      attempt: row.attempt ?? null,
      willRetry: Boolean(row.willRetry),
      retryDelayMs: row.retryDelayMs ?? null,
      occurredAt: row.occurredAt,
    }))
    .sort((left, right) => right.occurredAt - left.occurredAt);
}

export async function clearActorRuntimeIssues(c: any, input?: { actorId?: string | null }): Promise<void> {
  await ensureOrganizationActorIssuesTable(c);
  const actorId = input?.actorId?.trim();
  if (actorId) {
    await c.db.delete(organizationActorIssues).where(eq(organizationActorIssues.actorId, actorId)).run();
    return;
  }

  await c.db.delete(organizationActorIssues).run();
}

function normalizeWorkflowIssue(event: WorkflowErrorEvent): NormalizedWorkflowIssue {
  if ("step" in event) {
    const error = event.step.error;
    return {
      workflowId: event.step.workflowId,
      stepName: event.step.stepName,
      attempt: event.step.attempt,
      willRetry: event.step.willRetry,
      retryDelayMs: event.step.retryDelay ?? null,
      message: `${error.name}: ${error.message}`,
    };
  }

  if ("rollback" in event) {
    const error = event.rollback.error;
    return {
      workflowId: event.rollback.workflowId,
      stepName: event.rollback.stepName,
      attempt: null,
      willRetry: false,
      retryDelayMs: null,
      message: `${error.name}: ${error.message}`,
    };
  }

  const error = event.workflow.error;
  return {
    workflowId: event.workflow.workflowId,
    stepName: null,
    attempt: null,
    willRetry: false,
    retryDelayMs: null,
    message: `${error.name}: ${error.message}`,
  };
}

export async function reportWorkflowIssueToOrganization(c: any, event: WorkflowErrorEvent, input: ReportWorkflowIssueInput): Promise<void> {
  const normalized = normalizeWorkflowIssue(event);
  const issue: ActorRuntimeIssueRecord = {
    actorId: c.actorId,
    actorType: input.actorType,
    scopeId: input.scopeId ?? null,
    scopeLabel: input.scopeLabel,
    message: normalized.message,
    workflowId: normalized.workflowId,
    stepName: normalized.stepName,
    attempt: normalized.attempt,
    willRetry: normalized.willRetry,
    retryDelayMs: normalized.retryDelayMs,
    occurredAt: Date.now(),
  };

  if (input.actorType === "organization" && input.organizationId === c.state.workspaceId) {
    await upsertActorRuntimeIssue(c, issue);
    return;
  }

  const organization = await getOrCreateOrganization(c, input.organizationId);
  await organization.recordActorRuntimeIssue(issue);
}
