import { createError, defineEventHandler, readBody } from "h3"
import { checkCredentials, startSession } from "../../utils/auth"
import type { Role } from "../../utils/credential-core"

export default defineEventHandler(async (event) => {
  const body = await readBody<{ role?: Role, login?: string, password?: string }>(event)
  const role: Role = body.role === "admin" ? "admin" : "partner"
  if (!checkCredentials(event, role, String(body.login || ""), String(body.password || ""))) {
    throw createError({ statusCode: 401, statusMessage: "Неверный логин или пароль" })
  }
  startSession(event, role)
  return { ok: true, role }
})
