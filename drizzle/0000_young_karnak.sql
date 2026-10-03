CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`profession` text NOT NULL,
	`objective` text,
	`theme` text,
	`layer` text DEFAULT 'hard' NOT NULL,
	`starts_on` text,
	`ends_on` text,
	`brief` text,
	`created_by` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE TABLE `estate_findings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`page_title` text,
	`fact_id` text NOT NULL,
	`kind` text NOT NULL,
	`excerpt` text,
	`found_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE TABLE `exemplars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel` text NOT NULL,
	`label` text NOT NULL,
	`note` text,
	`body` text NOT NULL,
	`added_by` text NOT NULL,
	`added_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `findings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`piece_id` integer,
	`channel` text,
	`profession` text,
	`kind` text NOT NULL,
	`rule` text NOT NULL,
	`detail` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`advisor` text NOT NULL,
	`profession` text NOT NULL,
	`stage` text,
	`topic` text NOT NULL,
	`transcript` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE TABLE `knowledge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profession` text NOT NULL,
	`topic` text NOT NULL,
	`body` text NOT NULL,
	`source_url` text,
	`added_by` text NOT NULL,
	`added_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`expires_at` text,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`piece_id` integer,
	`scope` text DEFAULT 'all' NOT NULL,
	`category` text NOT NULL,
	`lesson` text NOT NULL,
	`evidence` text,
	`times_seen` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `performance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`piece_id` integer,
	`channel` text NOT NULL,
	`metric` text NOT NULL,
	`value` integer NOT NULL,
	`sample_size` integer,
	`measured_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`external_id` text
);
--> statement-breakpoint
CREATE TABLE `pieces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel` text NOT NULL,
	`format` text NOT NULL,
	`profession` text NOT NULL,
	`topic` text NOT NULL,
	`tone` text,
	`direction` text,
	`ai_draft` text NOT NULL,
	`final_text` text NOT NULL,
	`was_edited` integer DEFAULT 0 NOT NULL,
	`verdict` text,
	`sources` text DEFAULT '[]' NOT NULL,
	`approved_by` text NOT NULL,
	`approved_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`retired_at` text,
	`campaign_id` integer,
	`status` text DEFAULT 'approved' NOT NULL,
	`risk_score` integer,
	`approver_role` text,
	`derived_from` integer,
	`due_on` text,
	`external_ref` text,
	`career_stage` text,
	`framework` text,
	`interview_id` integer,
	`embedding` text
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profession` text NOT NULL,
	`stage` text,
	`kind` text DEFAULT 'question' NOT NULL,
	`text` text NOT NULL,
	`context` text,
	`heard_from` text,
	`times_heard` integer DEFAULT 1 NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`added_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verified_facts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`claim` text NOT NULL,
	`value` text NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text,
	`verified_by` text NOT NULL,
	`verified_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`expires_at` text NOT NULL,
	`superseded` integer DEFAULT 0 NOT NULL,
	`embedding` text
);
--> statement-breakpoint
CREATE TABLE `versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`piece_id` integer NOT NULL,
	`version_no` integer NOT NULL,
	`body` text NOT NULL,
	`action` text NOT NULL,
	`actor` text NOT NULL,
	`actor_role` text NOT NULL,
	`risk_score` integer,
	`audit` text,
	`sources` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
