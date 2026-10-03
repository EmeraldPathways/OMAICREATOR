CREATE TABLE IF NOT EXISTS `activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer,
	`actor` text,
	`detail` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `brand_facts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fact_key` text NOT NULL UNIQUE,
	`label` text NOT NULL,
	`value` text NOT NULL,
	`status` text DEFAULT 'verified' NOT NULL,
	`note` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `activity_log` ADD `brand_id` text DEFAULT 'omega-financial' NOT NULL;
--> statement-breakpoint
CREATE TABLE `brand_facts_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `brand_id` text DEFAULT 'omega-financial' NOT NULL,
  `fact_key` text NOT NULL,
  `label` text NOT NULL,
  `value` text NOT NULL,
  `status` text DEFAULT 'verified' NOT NULL,
  `note` text,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `brand_facts_new` (`id`, `brand_id`, `fact_key`, `label`, `value`, `status`, `note`, `updated_at`)
SELECT `id`, 'omega-financial', `fact_key`, `label`, `value`, `status`, `note`, `updated_at`
FROM `brand_facts`;
--> statement-breakpoint
DROP TABLE `brand_facts`;
--> statement-breakpoint
ALTER TABLE `brand_facts_new` RENAME TO `brand_facts`;
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_facts_brand_key_unique` ON `brand_facts` (`brand_id`,`fact_key`);
--> statement-breakpoint
CREATE TABLE `brand_profiles` (
	`brand_id` text PRIMARY KEY NOT NULL,
	`settings_json` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generated_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` text NOT NULL,
	`object_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`prompt` text NOT NULL,
	`model` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generated_assets_object_key_unique` ON `generated_assets` (`object_key`);
--> statement-breakpoint
ALTER TABLE `campaigns` ADD `brand_id` text DEFAULT 'omega-financial' NOT NULL;
--> statement-breakpoint
ALTER TABLE `exemplars` ADD `brand_id` text DEFAULT 'omega-financial' NOT NULL;
--> statement-breakpoint
ALTER TABLE `findings` ADD `brand_id` text DEFAULT 'omega-financial' NOT NULL;
--> statement-breakpoint
ALTER TABLE `knowledge` ADD `brand_id` text DEFAULT 'omega-financial' NOT NULL;
--> statement-breakpoint
ALTER TABLE `pieces` ADD `brand_id` text DEFAULT 'omega-financial' NOT NULL;
--> statement-breakpoint
ALTER TABLE `verified_facts` ADD `brand_id` text DEFAULT 'omega-financial' NOT NULL;
