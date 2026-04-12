CREATE TABLE `media_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`host_id` integer NOT NULL,
	`service_type` text NOT NULL,
	`url` text NOT NULL,
	`api_key` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `server_hosts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`host_id` integer NOT NULL,
	`action_type` text NOT NULL,
	`details` text,
	`created_at` integer DEFAULT '"2026-02-07T09:19:51.598Z"' NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `server_hosts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_activity_log`("id", "host_id", "action_type", "details", "created_at") SELECT "id", "host_id", "action_type", "details", "created_at" FROM `activity_log`;--> statement-breakpoint
DROP TABLE `activity_log`;--> statement-breakpoint
ALTER TABLE `__new_activity_log` RENAME TO `activity_log`;--> statement-breakpoint
PRAGMA foreign_keys=ON;