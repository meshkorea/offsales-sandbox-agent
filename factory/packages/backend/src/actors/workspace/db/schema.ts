import { integer, sqliteTable, text } from "rivetkit/db/drizzle";

// SQLite is per workspace actor instance, so no workspaceId column needed.
export const providerProfiles = sqliteTable("provider_profiles", {
  providerId: text("provider_id").notNull().primaryKey(),
  profileJson: text("profile_json").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const repos = sqliteTable("repos", {
  repoId: text("repo_id").notNull().primaryKey(),
  remoteUrl: text("remote_url").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const handoffLookup = sqliteTable("handoff_lookup", {
  handoffId: text("handoff_id").notNull().primaryKey(),
  repoId: text("repo_id").notNull(),
});
