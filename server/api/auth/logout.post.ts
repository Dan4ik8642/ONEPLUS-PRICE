import { defineEventHandler } from "h3"
import { endSession } from "../../utils/auth"

export default defineEventHandler((event) => {
  endSession(event)
  return { ok: true }
})
