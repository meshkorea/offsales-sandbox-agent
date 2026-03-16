// @ts-nocheck
import { logActorWarning, resolveErrorMessage } from "../logging.js";
import { events } from "./db/schema.js";
import type { AppendAuditLogCommand } from "./index.js";

export const AUDIT_LOG_QUEUE_NAMES = ["auditLog.command.append"] as const;

async function appendAuditLogRow(c: any, body: AppendAuditLogCommand): Promise<void> {
  const now = Date.now();
  await c.db
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

export async function runAuditLogCommandLoop(c: any): Promise<void> {
  for await (const msg of c.queue.iter({ names: [...AUDIT_LOG_QUEUE_NAMES], completable: true })) {
    try {
      if (msg.name === "auditLog.command.append") {
        await appendAuditLogRow(c, msg.body as AppendAuditLogCommand);
        await msg.complete({ ok: true });
        continue;
      }
      await msg.complete({ error: `Unknown command: ${msg.name}` });
    } catch (error) {
      const message = resolveErrorMessage(error);
      logActorWarning("auditLog", "audit-log command failed", { queueName: msg.name, error: message });
      await msg.complete({ error: message }).catch(() => {});
    }
  }
}
