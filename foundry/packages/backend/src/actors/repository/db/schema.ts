import { check, integer, sqliteTable, text } from "rivetkit/db/drizzle";
import { sql } from "drizzle-orm";

// SQLite is per repository actor instance (organizationId+repoId).

export const repoMeta = sqliteTable(
  "repo_meta",
  {
    id: integer("id").primaryKey(),
    remoteUrl: text("remote_url").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [check("repo_meta_singleton_id_check", sql`${table.id} = 1`)],
);

/**
 * Coordinator index of TaskActor instances.
 * The repository actor is the coordinator for tasks. Each row maps a
 * taskId to its immutable branch name. Used for branch conflict checking
 * and task-by-branch lookups. Rows are inserted at task creation.
 */
export const taskIndex = sqliteTable("task_index", {
  taskId: text("task_id").notNull().primaryKey(),
  branchName: text("branch_name"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/**
 * Repository-owned materialized task summary projection.
 * Task actors push summary updates to their direct repository coordinator,
 * which keeps this table local for fast list/lookups without fan-out.
 */
export const tasks = sqliteTable("tasks", {
  taskId: text("task_id").notNull().primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  repoName: text("repo_name").notNull(),
  updatedAtMs: integer("updated_at_ms").notNull(),
  branch: text("branch"),
  pullRequestJson: text("pull_request_json"),
  sessionsSummaryJson: text("sessions_summary_json").notNull().default("[]"),
});

/**
 * Materialized task summary projection owned by the repository coordinator.
 * Task actors push updates here; organization reads fan in through repositories.
 */
export const tasks = sqliteTable("tasks", {
  taskId: text("task_id").notNull().primaryKey(),
  repoId: text("repo_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  repoName: text("repo_name").notNull(),
  updatedAtMs: integer("updated_at_ms").notNull(),
  branch: text("branch"),
  pullRequestJson: text("pull_request_json"),
  sessionsSummaryJson: text("sessions_summary_json").notNull().default("[]"),
});
