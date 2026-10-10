CREATE TABLE `login_attempts` (
	`bucket` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`start_day` text NOT NULL,
	`end_day` text,
	`reserved` integer NOT NULL,
	`cost` integer,
	`state` text NOT NULL,
	`result` text,
	`created_at` integer NOT NULL
);
