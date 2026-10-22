CREATE TABLE `watchlist_token` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_token_token_unique` ON `watchlist_token` (`token`);