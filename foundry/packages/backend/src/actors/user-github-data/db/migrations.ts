const journal = {
  entries: [
    {
      idx: 0,
      when: 1773355200000,
      tag: "0000_user_github_data",
      breakpoints: true,
    },
  ],
} as const;

export default {
  journal,
  migrations: {
    m0000: `CREATE TABLE \`user_github_data\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`github_user_id\` text NOT NULL,
	\`github_login\` text NOT NULL,
	\`display_name\` text NOT NULL,
	\`email\` text NOT NULL,
	\`access_token\` text NOT NULL,
	\`scopes_json\` text NOT NULL,
	\`eligible_organization_ids_json\` text NOT NULL,
	\`updated_at\` integer NOT NULL
);
`,
  } as const,
};
