import postgres from "postgres"
import type { H3Event } from "h3"
import { createError } from "h3"
import { useRuntimeConfig } from "#imports"

let client: ReturnType<typeof postgres> | null = null
let initialized: Promise<void> | null = null

export function getDatabase(event?: H3Event) {
  if (client) return client
  const databaseUrl = String(useRuntimeConfig(event).databaseUrl || "")
  if (!databaseUrl) throw createError({ statusCode: 503, statusMessage: "База данных не настроена" })
  client = postgres(databaseUrl, { max: 10, idle_timeout: 20, connect_timeout: 10 })
  return client
}

export async function ensureDatabase(event?: H3Event) {
  const sql = getDatabase(event)
  if (!initialized) initialized = sql.begin(async (tx) => {
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS cities (
      id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS suppliers (
      id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS supplier_cities (
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
      PRIMARY KEY (supplier_id, city_id))`)
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS price_lists (
      id BIGSERIAL PRIMARY KEY, supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      name TEXT NOT NULL, valid_from DATE, active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (supplier_id, name))`)
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS price_list_items (
      id BIGSERIAL PRIMARY KEY, price_list_id BIGINT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
      article TEXT NOT NULL, name TEXT NOT NULL, weight INTEGER, unit TEXT NOT NULL DEFAULT 'г' CHECK (unit IN ('г','мл')), price INTEGER NOT NULL,
      vegan BOOLEAN NOT NULL DEFAULT FALSE, hit BOOLEAN NOT NULL DEFAULT FALSE, is_new BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (price_list_id, article))`)
    await tx.unsafe("ALTER TABLE price_list_items ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT FALSE")
    await tx.unsafe("ALTER TABLE price_list_items ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'г'")
    await tx.unsafe("CREATE INDEX IF NOT EXISTS idx_supplier_cities_city ON supplier_cities(city_id, supplier_id)")
    await tx.unsafe("CREATE INDEX IF NOT EXISTS idx_price_lists_supplier_active ON price_lists(supplier_id, active, valid_from)")
    await tx.unsafe("CREATE INDEX IF NOT EXISTS idx_price_list_items_active ON price_list_items(price_list_id, active)")
    await tx.unsafe("CREATE INDEX IF NOT EXISTS idx_price_list_items_name ON price_list_items(name)")
    await tx`INSERT INTO cities(name) VALUES('Москва') ON CONFLICT(name) DO NOTHING`
  }).then(() => undefined).catch((error) => {
    initialized = null
    throw error
  })
  await initialized
  return sql
}
