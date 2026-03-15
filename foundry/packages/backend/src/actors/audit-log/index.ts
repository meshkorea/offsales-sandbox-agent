// @ts-nocheck
import { and, desc, eq } from "drizzle-orm";
import { actor, queue } from "rivetkit";
import { workflow } from "rivetkit/workflow";
import type { AuditLogEvent } from "@sandbox-agent/foundry-shared";
import { auditLogDb } from "./db/db.js";
import { events } from "./db/schema.js";
import { AUDIT_LOG_QUEUE_NAMES, runAuditLogWorkflow } from "./workflow.js";

export interface AuditLogInput {
  organizationId: string;
  repoId: string;
}

export interface AppendAuditLogCommand {
  kind: string;
  taskId?: string;
  branchName?: string;
  payload: Record<string, unknown>;
}

export interface ListAuditLogParams {
  branch?: string;
  taskId?: string;
  limit?: number;
}

export const auditLog = actor({
  db: auditLogDb,
  queues: Object.fromEntries(AUDIT_LOG_QUEUE_NAMES.map((name) => [name, queue()])),
  options: {
    name: "Audit Log",
    icon: "database",
  },
  createState: (_c, input: AuditLogInput) => ({
    organizationId: input.organizationId,
    repoId: input.repoId,
  }),
  actions: {
    async list(c, params?: ListAuditLogParams): Promise<AuditLogEvent[]> {
      const whereParts = [];
      if (params?.taskId) {
        whereParts.push(eq(events.taskId, params.taskId));
      }
      if (params?.branch) {
        whereParts.push(eq(events.branchName, params.branch));
      }

      const base = c.db
        .select({
          id: events.id,
          taskId: events.taskId,
          branchName: events.branchName,
          kind: events.kind,
          payloadJson: events.payloadJson,
          createdAt: events.createdAt,
        })
        .from(events);

      const rows = await (whereParts.length > 0 ? base.where(and(...whereParts)) : base)
        .orderBy(desc(events.createdAt))
        .limit(params?.limit ?? 100)
        .all();

      return rows.map((row) => ({
        ...row,
        organizationId: c.state.organizationId,
        repoId: c.state.repoId,
      }));
    },
  },
  run: workflow(runAuditLogWorkflow),
});
