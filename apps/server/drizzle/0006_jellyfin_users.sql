CREATE TABLE `jellyfin_users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`jellyfin_user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
