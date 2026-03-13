PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_branches` (
	`branch_name` text PRIMARY KEY NOT NULL,
	`commit_sha` text NOT NULL,
	`parent_branch` text,
	`tracked_in_stack` integer DEFAULT 0 NOT NULL,
	`diff_stat` text,
	`has_unpushed` integer DEFAULT 0 NOT NULL,
	`conflicts_with_main` integer DEFAULT 0 NOT NULL,
	`first_seen_at` integer,
	`last_seen_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_branches`("branch_name", "commit_sha", "parent_branch", "tracked_in_stack", "diff_stat", "has_unpushed", "conflicts_with_main", "first_seen_at", "last_seen_at", "updated_at") SELECT "branch_name", "commit_sha", "parent_branch", "tracked_in_stack", "diff_stat", "has_unpushed", "conflicts_with_main", "first_seen_at", "last_seen_at", "updated_at" FROM `branches`;--> statement-breakpoint
DROP TABLE `branches`;--> statement-breakpoint
ALTER TABLE `__new_branches` RENAME TO `branches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_pr_cache` (
	`branch_name` text PRIMARY KEY NOT NULL,
	`pr_number` integer NOT NULL,
	`state` text NOT NULL,
	`title` text NOT NULL,
	`pr_url` text,
	`pr_author` text,
	`is_draft` integer DEFAULT 0 NOT NULL,
	`ci_status` text,
	`review_status` text,
	`reviewer` text,
	`fetched_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_pr_cache`("branch_name", "pr_number", "state", "title", "pr_url", "pr_author", "is_draft", "ci_status", "review_status", "reviewer", "fetched_at", "updated_at") SELECT "branch_name", "pr_number", "state", "title", "pr_url", "pr_author", "is_draft", "ci_status", "review_status", "reviewer", "fetched_at", "updated_at" FROM `pr_cache`;--> statement-breakpoint
DROP TABLE `pr_cache`;--> statement-breakpoint
ALTER TABLE `__new_pr_cache` RENAME TO `pr_cache`;