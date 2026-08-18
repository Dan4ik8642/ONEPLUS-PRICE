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

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS cities (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE, article TEXT NOT NULL, name TEXT NOT NULL, weight INTEGER, price INTEGER NOT NULL, vegan INTEGER NOT NULL DEFAULT 0, hit INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(supplier_id, article))`,
  `CREATE TABLE IF NOT EXISTS supplier_cities (supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE, city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE, UNIQUE(supplier_id, city_id))`,
  `CREATE INDEX IF NOT EXISTS idx_supplier_cities_city ON supplier_cities(city_id, supplier_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_supplier_active ON products(supplier_id, active)`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`,
] as const;
