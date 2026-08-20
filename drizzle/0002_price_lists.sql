CREATE TABLE IF NOT EXISTS `price_lists` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `supplier_id` integer NOT NULL,
  `name` text NOT NULL,
  `valid_from` text,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_price_lists_supplier_name` ON `price_lists` (`supplier_id`,`name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_price_lists_supplier_active` ON `price_lists` (`supplier_id`,`active`,`valid_from`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `price_list_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `price_list_id` integer NOT NULL,
  `article` text NOT NULL,
  `name` text NOT NULL,
  `weight` integer,
  `price` integer NOT NULL,
  `vegan` integer DEFAULT 0 NOT NULL,
  `hit` integer DEFAULT 0 NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`price_list_id`) REFERENCES `price_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_price_list_items_article` ON `price_list_items` (`price_list_id`,`article`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_price_list_items_active` ON `price_list_items` (`price_list_id`,`active`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_price_list_items_name` ON `price_list_items` (`name`);
--> statement-breakpoint
INSERT OR IGNORE INTO `price_lists` (`supplier_id`,`name`)
SELECT `id`,'Текущие цены' FROM `suppliers`;
--> statement-breakpoint
INSERT OR IGNORE INTO `price_list_items` (`price_list_id`,`article`,`name`,`weight`,`price`,`vegan`,`hit`,`active`,`updated_at`)
SELECT pl.id,p.article,p.name,p.weight,p.price,p.vegan,p.hit,p.active,p.updated_at
FROM products p
JOIN price_lists pl ON pl.supplier_id=p.supplier_id AND pl.name='Текущие цены';
