import { integer, sqliteTable, text } from "rivetkit/db/drizzle";

// SQLite is per repository actor instance (organizationId+repoId).

export const repoMeta = sqliteTable("repo_meta", {
  id: integer("id").primaryKey(),
  remoteUrl: text("remote_url").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const taskIndex = sqliteTable("task_index", {
  taskId: text("task_id").notNull().primaryKey(),
  branchName: text("branch_name"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
