const journal = {
  entries: [
    {
      idx: 0,
      when: 1773273600000,
      tag: "0000_github_state",
      breakpoints: true,
    },
    {
      idx: 1,
      when: 1773340800000,
      tag: "0001_github_state_sync_progress",
      breakpoints: true,
    },
  ],
} as const;

export default {
  journal,
  migrations: {
    m0000: `CREATE TABLE \`github_meta\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`connected_account\` text NOT NULL,
	\`installation_status\` text NOT NULL,
	\`sync_status\` text NOT NULL,
	\`installation_id\` integer,
	\`last_sync_label\` text NOT NULL,
	\`last_sync_at\` integer,
	\`updated_at\` integer NOT NULL
);
CREATE TABLE \`github_repositories\` (
	\`repo_id\` text PRIMARY KEY NOT NULL,
	\`full_name\` text NOT NULL,
	\`clone_url\` text NOT NULL,
	\`private\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
CREATE TABLE \`github_members\` (
	\`member_id\` text PRIMARY KEY NOT NULL,
	\`login\` text NOT NULL,
	\`display_name\` text NOT NULL,
	\`email\` text,
	\`role\` text,
	\`state\` text NOT NULL,
	\`updated_at\` integer NOT NULL
);
CREATE TABLE \`github_pull_requests\` (
	\`pr_id\` text PRIMARY KEY NOT NULL,
	\`repo_id\` text NOT NULL,
	\`repo_full_name\` text NOT NULL,
	\`number\` integer NOT NULL,
	\`title\` text NOT NULL,
	\`body\` text,
	\`state\` text NOT NULL,
	\`url\` text NOT NULL,
	\`head_ref_name\` text NOT NULL,
	\`base_ref_name\` text NOT NULL,
	\`author_login\` text,
	\`is_draft\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
`,
    m0001: `ALTER TABLE \`github_meta\` ADD \`sync_phase\` text;
ALTER TABLE \`github_meta\` ADD \`sync_run_started_at\` integer;
ALTER TABLE \`github_meta\` ADD \`sync_repositories_total\` integer;
ALTER TABLE \`github_meta\` ADD \`sync_repositories_completed\` integer;
ALTER TABLE \`github_meta\` ADD \`sync_pull_request_repositories_completed\` integer;
`,
  } as const,
};
