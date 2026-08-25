import { defineEventHandler } from "h3"
import { getDatabase } from "../utils/database"

export default defineEventHandler(async (event) => {
  const sql = getDatabase(event)
  await sql`SELECT 1`
  return { status: "ok", service: "oneplus-price", timestamp: new Date().toISOString() }
})
