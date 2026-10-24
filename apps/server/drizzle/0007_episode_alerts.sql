CREATE TABLE `episode_alerts` (
	`user_id` text NOT NULL,
	`series_id` integer NOT NULL,
	`season` integer NOT NULL,
	`number` integer NOT NULL,
	`sent_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `series_id`, `season`, `number`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
