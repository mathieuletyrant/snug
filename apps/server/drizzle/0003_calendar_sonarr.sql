CREATE TABLE `feed_token` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feed_token_token_unique` ON `feed_token` (`token`);--> statement-breakpoint
ALTER TABLE `series` ADD `tvdb_id` integer;