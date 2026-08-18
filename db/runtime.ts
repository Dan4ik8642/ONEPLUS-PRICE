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
  })();
  return initialized;
}
