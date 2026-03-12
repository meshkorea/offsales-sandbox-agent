const journal = {
  entries: [
    {
      idx: 0,
      when: 1773356100001,
      tag: "0000_repository_state",
      breakpoints: true,
    },
  ],
} as const;

export default {
  journal,
  migrations: {
    m0000: `CREATE TABLE \`branches\` (
	\`branch_name\` text PRIMARY KEY NOT NULL,
	\`commit_sha\` text NOT NULL,
	\`parent_branch\` text,
	\`tracked_in_stack\` integer,
	\`diff_stat\` text,
	\`has_unpushed\` integer,
	\`conflicts_with_main\` integer,
	\`first_seen_at\` integer,
	\`last_seen_at\` integer,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`repo_meta\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`remote_url\` text NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`task_index\` (
	\`task_id\` text PRIMARY KEY NOT NULL,
	\`branch_name\` text,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
`,
  } as const,
};
