import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const cities = sqliteTable("cities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  article: text("article").notNull(),
  name: text("name").notNull(),
  weight: integer("weight"),
  price: integer("price").notNull(),
  vegan: integer("vegan").notNull().default(0),
  hit: integer("hit").notNull().default(0),
  active: integer("active").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_products_supplier_article").on(table.supplierId, table.article),
  index("idx_products_supplier_active").on(table.supplierId, table.active),
  index("idx_products_name").on(table.name),
]);

export const supplierCities = sqliteTable("supplier_cities", {
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  cityId: integer("city_id").notNull().references(() => cities.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("idx_supplier_cities_unique").on(table.supplierId, table.cityId),
  index("idx_supplier_cities_city").on(table.cityId, table.supplierId),
]);

export const priceLists = sqliteTable("price_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  validFrom: text("valid_from"),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_price_lists_supplier_name").on(table.supplierId, table.name),
  index("idx_price_lists_supplier_active").on(table.supplierId, table.active, table.validFrom),
]);

export const priceListItems = sqliteTable("price_list_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  priceListId: integer("price_list_id").notNull().references(() => priceLists.id, { onDelete: "cascade" }),
  article: text("article").notNull(),
  name: text("name").notNull(),
  weight: integer("weight"),
  price: integer("price").notNull(),
  vegan: integer("vegan").notNull().default(0),
  hit: integer("hit").notNull().default(0),
  active: integer("active").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_price_list_items_article").on(table.priceListId, table.article),
  index("idx_price_list_items_active").on(table.priceListId, table.active),
  index("idx_price_list_items_name").on(table.name),
]);

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS cities (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE, article TEXT NOT NULL, name TEXT NOT NULL, weight INTEGER, price INTEGER NOT NULL, vegan INTEGER NOT NULL DEFAULT 0, hit INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(supplier_id, article))`,
  `CREATE TABLE IF NOT EXISTS supplier_cities (supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE, city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE, UNIQUE(supplier_id, city_id))`,
  `CREATE TABLE IF NOT EXISTS price_lists (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE, name TEXT NOT NULL, valid_from TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(supplier_id, name))`,
  `CREATE TABLE IF NOT EXISTS price_list_items (id INTEGER PRIMARY KEY AUTOINCREMENT, price_list_id INTEGER NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE, article TEXT NOT NULL, name TEXT NOT NULL, weight INTEGER, price INTEGER NOT NULL, vegan INTEGER NOT NULL DEFAULT 0, hit INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(price_list_id, article))`,
  `CREATE INDEX IF NOT EXISTS idx_supplier_cities_city ON supplier_cities(city_id, supplier_id)`,
  `CREATE INDEX IF NOT EXISTS idx_price_lists_supplier_active ON price_lists(supplier_id, active, valid_from)`,
  `CREATE INDEX IF NOT EXISTS idx_price_list_items_active ON price_list_items(price_list_id, active)`,
  `CREATE INDEX IF NOT EXISTS idx_price_list_items_name ON price_list_items(name)`,
  `CREATE INDEX IF NOT EXISTS idx_products_supplier_active ON products(supplier_id, active)`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`,
] as const;
