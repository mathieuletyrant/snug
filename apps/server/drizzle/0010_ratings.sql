CREATE TABLE `ratings` (
	`user_id` text NOT NULL,
	`series_id` integer NOT NULL,
	`season` integer NOT NULL,
	`episode` integer DEFAULT 0 NOT NULL,
	`rating` integer NOT NULL,
	PRIMARY KEY(`user_id`, `series_id`, `season`, `episode`)
);
