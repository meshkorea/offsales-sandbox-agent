const journal = {
  entries: [
    {
      idx: 0,
      when: 1773356100000,
      tag: "0000_organization_state",
      breakpoints: true,
    },
  ],
} as const;

export default {
  journal,
  migrations: {
    m0000: `CREATE TABLE \`provider_profiles\` (
	\`provider_id\` text PRIMARY KEY NOT NULL,
	\`profile_json\` text NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`repos\` (
	\`repo_id\` text PRIMARY KEY NOT NULL,
	\`remote_url\` text NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`task_lookup\` (
	\`task_id\` text PRIMARY KEY NOT NULL,
	\`repo_id\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`organization_profile\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`kind\` text NOT NULL,
	\`github_account_id\` text NOT NULL,
	\`github_login\` text NOT NULL,
	\`github_account_type\` text NOT NULL,
	\`display_name\` text NOT NULL,
	\`slug\` text NOT NULL,
	\`primary_domain\` text NOT NULL,
	\`default_model\` text NOT NULL,
	\`auto_import_repos\` integer NOT NULL,
	\`repo_import_status\` text NOT NULL,
	\`stripe_customer_id\` text,
	\`stripe_subscription_id\` text,
	\`stripe_price_id\` text,
	\`billing_plan_id\` text NOT NULL,
	\`billing_status\` text NOT NULL,
	\`billing_seats_included\` integer NOT NULL,
	\`billing_trial_ends_at\` text,
	\`billing_renewal_at\` text,
	\`billing_payment_method_label\` text NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`organization_members\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`email\` text NOT NULL,
	\`role\` text NOT NULL,
	\`state\` text NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`seat_assignments\` (
	\`email\` text PRIMARY KEY NOT NULL,
	\`created_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`organization_actor_issues\` (
	\`actor_id\` text PRIMARY KEY NOT NULL,
	\`actor_type\` text NOT NULL,
	\`scope_id\` text,
	\`scope_label\` text NOT NULL,
	\`message\` text NOT NULL,
	\`workflow_id\` text,
	\`step_name\` text,
	\`attempt\` integer,
	\`will_retry\` integer DEFAULT 0 NOT NULL,
	\`retry_delay_ms\` integer,
	\`occurred_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`invoices\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`label\` text NOT NULL,
	\`issued_at\` text NOT NULL,
	\`amount_usd\` integer NOT NULL,
	\`status\` text NOT NULL,
	\`created_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`app_sessions\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`current_user_id\` text,
	\`active_organization_id\` text,
	\`starter_repo_status\` text NOT NULL,
	\`starter_repo_starred_at\` integer,
	\`starter_repo_skipped_at\` integer,
	\`oauth_state\` text,
	\`oauth_state_expires_at\` integer,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`stripe_lookup\` (
	\`lookup_key\` text PRIMARY KEY NOT NULL,
	\`organization_id\` text NOT NULL,
	\`updated_at\` integer NOT NULL
);
`,
  } as const,
};
