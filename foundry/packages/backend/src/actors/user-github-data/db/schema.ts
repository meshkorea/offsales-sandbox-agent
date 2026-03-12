import { integer, sqliteTable, text } from "rivetkit/db/drizzle";

export const userGithubData = sqliteTable("user_github_data", {
  id: integer("id").primaryKey(),
  githubUserId: text("github_user_id").notNull(),
  githubLogin: text("github_login").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  accessToken: text("access_token").notNull(),
  scopesJson: text("scopes_json").notNull(),
  eligibleOrganizationIdsJson: text("eligible_organization_ids_json").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
