import type { H3Event } from "h3"
import { createError, deleteCookie, getCookie, setCookie } from "h3"
import { useRuntimeConfig } from "#imports"
import { createSessionToken, credentialsFor, verifySessionToken, type Role } from "./credential-core"

function authConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  return {
    adminLogin: String(config.adminLogin || "admin"),
    adminPassword: String(config.adminPassword || ""),
    partnerLogin: String(config.partnerLogin || "partner"),
    partnerPassword: String(config.partnerPassword || ""),
    sessionSecret: String(config.sessionSecret || ""),
  }
}

export function checkCredentials(event: H3Event, role: Role, login: string, password: string) {
  const config = authConfig(event)
  const expected = credentialsFor(role, config)
  return Boolean(expected.password) && login === expected.login && password === expected.password
}

export function startSession(event: H3Event, role: Role) {
  const token = createSessionToken(role, authConfig(event).sessionSecret)
  setCookie(event, "op_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 43_200,
  })
}

export function endSession(event: H3Event) {
  deleteCookie(event, "op_session", { path: "/" })
}

export function sessionRole(event: H3Event): Role | null {
  return verifySessionToken(getCookie(event, "op_session"), authConfig(event).sessionSecret)
}

export function requireRole(event: H3Event, required?: Role): Role {
  const role = sessionRole(event)
  if (!role) throw createError({ statusCode: 401, statusMessage: "Требуется вход" })
  if (required && role !== required) throw createError({ statusCode: 403, statusMessage: "Нет доступа" })
  return role
}
