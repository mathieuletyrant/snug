CREATE TABLE `seasons` (
	`series_id` integer NOT NULL,
	`number` integer NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`series_id`, `number`),
	FOREIGN KEY (`series_id`) REFERENCES `series`(`tmdb_id`) ON UPDATE no action ON DELETE cascade
);
