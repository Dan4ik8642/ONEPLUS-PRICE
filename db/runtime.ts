import { env } from "cloudflare:workers";
import { schemaStatements } from "./schema";

let initialized: Promise<void> | null = null;
export function getD1(): D1Database {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) throw new Error("База данных временно недоступна");
  return db;
}
export async function ensureDatabase() {
  if (!initialized) initialized = (async () => {
    const db = getD1();
    await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
    await db.prepare("INSERT OR IGNORE INTO cities(name) VALUES('Москва')").run();
    await db.prepare("INSERT OR IGNORE INTO supplier_cities(supplier_id, city_id) SELECT s.id, c.id FROM suppliers s CROSS JOIN cities c WHERE c.name='Москва' AND NOT EXISTS (SELECT 1 FROM supplier_cities sc WHERE sc.supplier_id=s.id)").run();
    await db.prepare("INSERT OR IGNORE INTO price_lists(supplier_id,name) SELECT id,'Текущие цены' FROM suppliers").run();
    await db.prepare("INSERT OR IGNORE INTO price_list_items(price_list_id,article,name,weight,price,vegan,hit,active,updated_at) SELECT pl.id,p.article,p.name,p.weight,p.price,p.vegan,p.hit,p.active,p.updated_at FROM products p JOIN price_lists pl ON pl.supplier_id=p.supplier_id AND pl.name='Текущие цены'").run();
  })();
  return initialized;
}
