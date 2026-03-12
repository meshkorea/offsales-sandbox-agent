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

export const taskLookup = sqliteTable("task_lookup", {
  taskId: text("task_id").notNull().primaryKey(),
  repoId: text("repo_id").notNull(),
});

export const organizationProfile = sqliteTable("organization_profile", {
  id: text("id").notNull().primaryKey(),
  kind: text("kind").notNull(),
  githubAccountId: text("github_account_id").notNull(),
  githubLogin: text("github_login").notNull(),
  githubAccountType: text("github_account_type").notNull(),
  displayName: text("display_name").notNull(),
  slug: text("slug").notNull(),
  primaryDomain: text("primary_domain").notNull(),
  defaultModel: text("default_model").notNull(),
  autoImportRepos: integer("auto_import_repos").notNull(),
  repoImportStatus: text("repo_import_status").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  billingPlanId: text("billing_plan_id").notNull(),
  billingStatus: text("billing_status").notNull(),
  billingSeatsIncluded: integer("billing_seats_included").notNull(),
  billingTrialEndsAt: text("billing_trial_ends_at"),
  billingRenewalAt: text("billing_renewal_at"),
  billingPaymentMethodLabel: text("billing_payment_method_label").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const organizationMembers = sqliteTable("organization_members", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  state: text("state").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const seatAssignments = sqliteTable("seat_assignments", {
  email: text("email").notNull().primaryKey(),
  createdAt: integer("created_at").notNull(),
});

export const organizationActorIssues = sqliteTable("organization_actor_issues", {
  actorId: text("actor_id").notNull().primaryKey(),
  actorType: text("actor_type").notNull(),
  scopeId: text("scope_id"),
  scopeLabel: text("scope_label").notNull(),
  message: text("message").notNull(),
  workflowId: text("workflow_id"),
  stepName: text("step_name"),
  attempt: integer("attempt"),
  willRetry: integer("will_retry").notNull().default(0),
  retryDelayMs: integer("retry_delay_ms"),
  occurredAt: integer("occurred_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").notNull().primaryKey(),
  label: text("label").notNull(),
  issuedAt: text("issued_at").notNull(),
  amountUsd: integer("amount_usd").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const appSessions = sqliteTable("app_sessions", {
  id: text("id").notNull().primaryKey(),
  currentUserId: text("current_user_id"),
  activeOrganizationId: text("active_organization_id"),
  starterRepoStatus: text("starter_repo_status").notNull(),
  starterRepoStarredAt: integer("starter_repo_starred_at"),
  starterRepoSkippedAt: integer("starter_repo_skipped_at"),
  oauthState: text("oauth_state"),
  oauthStateExpiresAt: integer("oauth_state_expires_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const stripeLookup = sqliteTable("stripe_lookup", {
  lookupKey: text("lookup_key").notNull().primaryKey(),
  organizationId: text("organization_id").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
