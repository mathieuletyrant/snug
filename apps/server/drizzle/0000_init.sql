CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`series_id` integer NOT NULL,
	`season` integer NOT NULL,
	`number` integer NOT NULL,
	`name` text NOT NULL,
	`air_date` text,
	PRIMARY KEY(`series_id`, `season`, `number`),
	FOREIGN KEY (`series_id`) REFERENCES `series`(`tmdb_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `series` (
	`tmdb_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`year` integer,
	`overview` text DEFAULT '' NOT NULL,
	`poster_path` text,
	`backdrop_path` text,
	`ended` integer NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `webhook_token` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_token_token_unique` ON `webhook_token` (`token`);--> statement-breakpoint
CREATE TABLE `tracked_series` (
	`user_id` text NOT NULL,
	`series_id` integer NOT NULL,
	`status` text NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `series_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `watches` (
	`user_id` text NOT NULL,
	`series_id` integer NOT NULL,
	`season` integer NOT NULL,
	`number` integer NOT NULL,
	`watched_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `series_id`, `season`, `number`)
);
--> statement-breakpoint
CREATE TABLE `jellyfin_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`received_at` integer NOT NULL,
	`summary` text NOT NULL,
	`outcome` text NOT NULL,
	`message` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jellyfin_series` (
	`jellyfin_series_id` text PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL
);
