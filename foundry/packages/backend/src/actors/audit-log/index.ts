// @ts-nocheck
import { and, desc, eq } from "drizzle-orm";
import { actor, queue } from "rivetkit";
import { Loop, workflow } from "rivetkit/workflow";
import type { AuditLogEvent } from "@sandbox-agent/foundry-shared";
import { auditLogDb } from "./db/db.js";
import { events } from "./db/schema.js";

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

export const AUDIT_LOG_QUEUE_NAMES = ["auditLog.command.append"] as const;

async function appendAuditLogRow(loopCtx: any, body: AppendAuditLogCommand): Promise<void> {
  const now = Date.now();
  await loopCtx.db
    .insert(events)
    .values({
      taskId: body.taskId ?? null,
      branchName: body.branchName ?? null,
      kind: body.kind,
      payloadJson: JSON.stringify(body.payload),
      createdAt: now,
    })
    .run();
}

async function runAuditLogWorkflow(ctx: any): Promise<void> {
  await ctx.loop("audit-log-command-loop", async (loopCtx: any) => {
    const msg = await loopCtx.queue.next("next-audit-log-command", {
      names: [...AUDIT_LOG_QUEUE_NAMES],
      completable: true,
    });
    if (!msg) {
      return Loop.continue(undefined);
    }

    if (msg.name === "auditLog.command.append") {
      await loopCtx.step("append-audit-log-row", async () => appendAuditLogRow(loopCtx, msg.body as AppendAuditLogCommand));
      await msg.complete({ ok: true });
    }

    return Loop.continue(undefined);
  });
}

export const auditLog = actor({
  db: auditLogDb,
  queues: {
    "auditLog.command.append": queue(),
  },
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
