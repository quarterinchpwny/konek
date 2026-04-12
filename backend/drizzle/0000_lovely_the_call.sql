CREATE TABLE `server_hosts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`alias` text NOT NULL,
	`hostname` text NOT NULL,
	`port` integer DEFAULT 22,
	`username` text NOT NULL,
	`password` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `server_hosts_hostname_unique` ON `server_hosts` (`hostname`);