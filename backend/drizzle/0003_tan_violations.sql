CREATE TABLE `activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`host_id` integer NOT NULL,
	`action_type` text NOT NULL,
	`details` text,
	`created_at` integer DEFAULT '"2026-02-01T02:40:01.695Z"' NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `server_hosts`(`id`) ON UPDATE no action ON DELETE no action
);
