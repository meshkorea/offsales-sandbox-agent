// @ts-nocheck
import { eq } from "drizzle-orm";
import type { TaskRecord, TaskStatus } from "@sandbox-agent/foundry-shared";
import { task as taskTable, taskRuntime, taskSandboxes } from "../db/schema.js";
import { getOrCreateAuditLog } from "../../handles.js";
import { broadcastTaskUpdate } from "../workspace.js";

export const TASK_ROW_ID = 1;

export function collectErrorMessages(error: unknown): string[] {
  if (error == null) {
    return [];
  }

  const out: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current != null && !seen.has(current)) {
    seen.add(current);

    if (current instanceof Error) {
      const message = current.message?.trim();
      if (message) {
        out.push(message);
      }
      current = (current as { cause?: unknown }).cause;
      continue;
    }

    if (typeof current === "string") {
      const message = current.trim();
      if (message) {
        out.push(message);
      }
      break;
    }

    break;
  }

  return out.filter((msg, index) => out.indexOf(msg) === index);
}

export function resolveErrorDetail(error: unknown): string {
  const messages = collectErrorMessages(error);
  if (messages.length === 0) {
    return String(error);
  }

  const nonWorkflowWrapper = messages.find((msg) => !/^Step\s+"[^"]+"\s+failed\b/i.test(msg));
  return nonWorkflowWrapper ?? messages[0]!;
}

export function buildAgentPrompt(task: string): string {
  return task.trim();
}

export async function setTaskState(ctx: any, status: TaskStatus): Promise<void> {
  const now = Date.now();
  const db = ctx.db;
  await db.update(taskTable).set({ status, updatedAt: now }).where(eq(taskTable.id, TASK_ROW_ID)).run();

  await broadcastTaskUpdate(ctx);
}

export async function getCurrentRecord(ctx: any): Promise<TaskRecord> {
  const db = ctx.db;
  const row = await db
    .select({
      branchName: taskTable.branchName,
      title: taskTable.title,
      task: taskTable.task,
      sandboxProviderId: taskTable.sandboxProviderId,
      status: taskTable.status,
      activeSandboxId: taskRuntime.activeSandboxId,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt,
    })
    .from(taskTable)
    .leftJoin(taskRuntime, eq(taskTable.id, taskRuntime.id))
    .where(eq(taskTable.id, TASK_ROW_ID))
    .get();

  if (!row) {
    throw new Error(`Task not found: ${ctx.state.taskId}`);
  }

  const sandboxes = await db
    .select({
      sandboxId: taskSandboxes.sandboxId,
      sandboxProviderId: taskSandboxes.sandboxProviderId,
      sandboxActorId: taskSandboxes.sandboxActorId,
      switchTarget: taskSandboxes.switchTarget,
      cwd: taskSandboxes.cwd,
      createdAt: taskSandboxes.createdAt,
      updatedAt: taskSandboxes.updatedAt,
    })
    .from(taskSandboxes)
    .all();

  return {
    organizationId: ctx.state.organizationId,
    repoId: ctx.state.repoId,
    repoRemote: ctx.state.repoRemote,
    taskId: ctx.state.taskId,
    branchName: row.branchName,
    title: row.title,
    task: row.task,
    sandboxProviderId: row.sandboxProviderId,
    status: row.status,
    activeSandboxId: row.activeSandboxId ?? null,
    sandboxes: sandboxes.map((sb) => ({
      sandboxId: sb.sandboxId,
      sandboxProviderId: sb.sandboxProviderId,
      sandboxActorId: sb.sandboxActorId ?? null,
      switchTarget: sb.switchTarget,
      cwd: sb.cwd ?? null,
      createdAt: sb.createdAt,
      updatedAt: sb.updatedAt,
    })),
    diffStat: null,
    prUrl: null,
    prAuthor: null,
    ciStatus: null,
    reviewStatus: null,
    reviewer: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  } as TaskRecord;
}

export async function appendAuditLog(ctx: any, kind: string, payload: Record<string, unknown>): Promise<void> {
  const auditLog = await getOrCreateAuditLog(ctx, ctx.state.organizationId, ctx.state.repoId);
  await auditLog.send(
    "auditLog.command.append",
    {
      kind,
      taskId: ctx.state.taskId,
      branchName: ctx.state.branchName,
      payload,
    },
    {
      wait: false,
    },
  );

  await broadcastTaskUpdate(ctx);
}
