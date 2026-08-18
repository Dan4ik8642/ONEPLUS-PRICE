CREATE TABLE IF NOT EXISTS `cities` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `cities_name_unique` ON `cities` (`name`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `supplier_cities` (
  `supplier_id` integer NOT NULL,
  `city_id` integer NOT NULL,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_supplier_cities_unique` ON `supplier_cities` (`supplier_id`,`city_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_supplier_cities_city` ON `supplier_cities` (`city_id`,`supplier_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `cities` (`name`) VALUES ('Москва');
--> statement-breakpoint
INSERT OR IGNORE INTO `supplier_cities` (`supplier_id`,`city_id`)
SELECT s.id,c.id FROM suppliers s CROSS JOIN cities c
WHERE c.name='Москва';
