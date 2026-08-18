CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_name_unique` ON `suppliers` (`name`);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`article` text NOT NULL,
	`name` text NOT NULL,
	`weight` integer,
	`price` integer NOT NULL,
	`vegan` integer DEFAULT 0 NOT NULL,
	`hit` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_products_supplier_article` ON `products` (`supplier_id`,`article`);
--> statement-breakpoint
CREATE INDEX `idx_products_supplier_active` ON `products` (`supplier_id`,`active`);
--> statement-breakpoint
CREATE INDEX `idx_products_name` ON `products` (`name`);
