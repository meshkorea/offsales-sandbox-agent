CREATE TABLE `task_workbench_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`session_name` text NOT NULL,
	`model` text NOT NULL,
	`unread` integer DEFAULT 0 NOT NULL,
	`draft_text` text DEFAULT '' NOT NULL,
	`draft_attachments_json` text DEFAULT '[]' NOT NULL,
	`draft_updated_at` integer,
	`created` integer DEFAULT 1 NOT NULL,
	`closed` integer DEFAULT 0 NOT NULL,
	`thinking_since_ms` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_task` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_name` text,
	`title` text,
	`task` text NOT NULL,
	`provider_id` text NOT NULL,
	`status` text NOT NULL,
	`agent_type` text DEFAULT 'claude',
	`pr_submitted` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "task_singleton_id_check" CHECK("__new_task"."id" = 1)
);
--> statement-breakpoint
INSERT INTO `__new_task`("id", "branch_name", "title", "task", "provider_id", "status", "agent_type", "pr_submitted", "created_at", "updated_at") SELECT "id", "branch_name", "title", "task", "provider_id", "status", "agent_type", "pr_submitted", "created_at", "updated_at" FROM `task`;--> statement-breakpoint
DROP TABLE `task`;--> statement-breakpoint
ALTER TABLE `__new_task` RENAME TO `task`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `task_sandboxes` ADD `sandbox_actor_id` text;--> statement-breakpoint
CREATE TABLE `__new_task_runtime` (
	`id` integer PRIMARY KEY NOT NULL,
	`active_sandbox_id` text,
	`active_session_id` text,
	`active_switch_target` text,
	`active_cwd` text,
	`status_message` text,
	`updated_at` integer NOT NULL,
	CONSTRAINT "task_runtime_singleton_id_check" CHECK("__new_task_runtime"."id" = 1)
);
--> statement-breakpoint
INSERT INTO `__new_task_runtime`("id", "active_sandbox_id", "active_session_id", "active_switch_target", "active_cwd", "status_message", "updated_at") SELECT "id", "active_sandbox_id", "active_session_id", "active_switch_target", "active_cwd", "status_message", "updated_at" FROM `task_runtime`;--> statement-breakpoint
DROP TABLE `task_runtime`;--> statement-breakpoint
ALTER TABLE `__new_task_runtime` RENAME TO `task_runtime`;