import { asc, count as sqlCount, desc } from "drizzle-orm";
import { applyJoinToRow, applyJoinToRows, buildWhere, columnFor, tableFor } from "../query-helpers.js";
import {
  createAuthRecordMutation,
  updateAuthRecordMutation,
  updateManyAuthRecordsMutation,
  deleteAuthRecordMutation,
  deleteManyAuthRecordsMutation,
} from "../workflow.js";

/**
 * Better Auth adapter actions — exposed as actions (not queue commands) so they
 * execute immediately without competing in the user workflow queue.
 *
 * The user actor's workflow queue is shared with profile upserts, session state,
 * and task state operations. When the queue is busy, auth operations would time
 * out (10s), causing Better Auth's parseState to throw a non-StateError which
 * redirects to ?error=please_restart_the_process.
 *
 * Auth operations are safe to run as actions because they are simple SQLite
 * reads/writes scoped to this actor instance with no cross-actor side effects.
 */
export const betterAuthActions = {
  // --- Mutation actions (formerly queue commands) ---

  async betterAuthCreateRecord(c: any, input: { model: string; data: Record<string, unknown> }) {
    return await createAuthRecordMutation(c, input);
  },

  async betterAuthUpdateRecord(c: any, input: { model: string; where: any[]; update: Record<string, unknown> }) {
    return await updateAuthRecordMutation(c, input);
  },

  async betterAuthUpdateManyRecords(c: any, input: { model: string; where: any[]; update: Record<string, unknown> }) {
    return await updateManyAuthRecordsMutation(c, input);
  },

  async betterAuthDeleteRecord(c: any, input: { model: string; where: any[] }) {
    await deleteAuthRecordMutation(c, input);
    return { ok: true };
  },

  async betterAuthDeleteManyRecords(c: any, input: { model: string; where: any[] }) {
    return await deleteManyAuthRecordsMutation(c, input);
  },

  // --- Read actions ---

  // Better Auth adapter action — called by the Better Auth adapter in better-auth.ts.
  // Schema and behavior are constrained by Better Auth.
  async betterAuthFindOneRecord(c, input: { model: string; where: any[]; join?: any }) {
    const table = tableFor(input.model);
    const predicate = buildWhere(table, input.where);
    const row = predicate ? await c.db.select().from(table).where(predicate).get() : await c.db.select().from(table).get();
    return await applyJoinToRow(c, input.model, row ?? null, input.join);
  },

  // Better Auth adapter action — called by the Better Auth adapter in better-auth.ts.
  // Schema and behavior are constrained by Better Auth.
  async betterAuthFindManyRecords(c, input: { model: string; where?: any[]; limit?: number; offset?: number; sortBy?: any; join?: any }) {
    const table = tableFor(input.model);
    const predicate = buildWhere(table, input.where);
    let query: any = c.db.select().from(table);
    if (predicate) {
      query = query.where(predicate);
    }
    if (input.sortBy?.field) {
      const column = columnFor(input.model, table, input.sortBy.field);
      query = query.orderBy(input.sortBy.direction === "asc" ? asc(column) : desc(column));
    }
    if (typeof input.limit === "number") {
      query = query.limit(input.limit);
    }
    if (typeof input.offset === "number") {
      query = query.offset(input.offset);
    }
    const rows = await query.all();
    return await applyJoinToRows(c, input.model, rows, input.join);
  },

  // Better Auth adapter action — called by the Better Auth adapter in better-auth.ts.
  // Schema and behavior are constrained by Better Auth.
  async betterAuthCountRecords(c, input: { model: string; where?: any[] }) {
    const table = tableFor(input.model);
    const predicate = buildWhere(table, input.where);
    const row = predicate
      ? await c.db.select({ value: sqlCount() }).from(table).where(predicate).get()
      : await c.db.select({ value: sqlCount() }).from(table).get();
    return row?.value ?? 0;
  },
};
