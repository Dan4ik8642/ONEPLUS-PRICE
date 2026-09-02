import fs from "node:fs/promises"
import path from "node:path"
import postgres from "postgres"

const databaseUrl = process.env.NUXT_DATABASE_URL
if (!databaseUrl) throw new Error("Задайте NUXT_DATABASE_URL")

const sql = postgres(databaseUrl, { max: 1 })
try {
  await sql`CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`
  const directory = path.resolve("server/database/migrations")
  const files = (await fs.readdir(directory)).filter(name => name.endsWith(".sql")).sort()
  for (const name of files) {
    const [existing] = await sql`SELECT name FROM app_migrations WHERE name=${name}`
    if (existing) continue
    const source = await fs.readFile(path.join(directory, name), "utf8")
    await sql.begin(async (tx) => {
      await tx.unsafe(source)
      await tx`INSERT INTO app_migrations(name) VALUES(${name})`
    })
    console.log(`Applied ${name}`)
  }
} finally {
  await sql.end()
}
