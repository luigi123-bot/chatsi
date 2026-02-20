-- SQL Schema for SQLite (ChatApp)

-- User table
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`avatar_url` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);

-- Unique index for emails
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);

-- Conversations (Direct Messages or Groups)
CREATE TABLE IF NOT EXISTS `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`is_group` integer DEFAULT 0, -- 0 for false, 1 for true
	`last_message_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);

-- Messages
CREATE TABLE IF NOT EXISTS `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text,
	`sender_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`type` text DEFAULT 'text',
	`file_url` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`),
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`)
);

-- Participants (Links users to conversations)
CREATE TABLE IF NOT EXISTS `participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text DEFAULT 'member', -- 'admin' or 'member'
	`joined_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`)
);
