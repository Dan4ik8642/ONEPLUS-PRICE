import { defineEventHandler } from "h3"
import { useRuntimeConfig } from "#imports"
import { getDatabase } from "../utils/database"

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.demoMode) {
    const sql = getDatabase(event)
    await sql`SELECT 1`
  }

  return {
    status: "ok",
    service: "oneplus-price",
    mode: config.demoMode ? "demo" : "database",
    timestamp: new Date().toISOString(),
  }
})
