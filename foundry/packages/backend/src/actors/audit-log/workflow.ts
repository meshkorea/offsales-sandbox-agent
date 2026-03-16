// @ts-nocheck
import { Loop } from "rivetkit/workflow";
import { events } from "./db/schema.js";
import type { AppendAuditLogCommand } from "./index.js";

export const AUDIT_LOG_QUEUE_NAMES = ["auditLog.command.append"] as const;

async function appendAuditLogRow(loopCtx: any, body: AppendAuditLogCommand): Promise<void> {
  const now = Date.now();
  await loopCtx.db
    .insert(events)
    .values({
      repoId: body.repoId ?? null,
      taskId: body.taskId ?? null,
      branchName: body.branchName ?? null,
      kind: body.kind,
      payloadJson: JSON.stringify(body.payload),
      createdAt: now,
    })
    .run();
}

export async function runAuditLogWorkflow(ctx: any): Promise<void> {
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
