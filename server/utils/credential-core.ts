import { createHmac, timingSafeEqual } from "node:crypto"

export type Role = "partner" | "admin"
export type CredentialConfig = {
  adminLogin: string
  adminPassword: string
  partnerLogin: string
  partnerPassword: string
}

export function credentialsFor(role: Role, config: CredentialConfig) {
  return role === "admin"
    ? { login: config.adminLogin, password: config.adminPassword }
    : { login: config.partnerLogin, password: config.partnerPassword }
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

export function createSessionToken(role: Role, secret: string, now = Date.now()) {
  if (!secret) throw new Error("Не настроен секрет сессии")
  const payload = `${role}.${now + 43_200_000}`
  return `${payload}.${signature(payload, secret)}`
}

export function verifySessionToken(token: string | undefined | null, secret: string, now = Date.now()): Role | null {
  if (!token || !secret) return null
  const [role, expires, sent, extra] = token.split(".")
  if (extra !== undefined || (role !== "partner" && role !== "admin") || Number(expires) < now) return null
  const expected = signature(`${role}.${expires}`, secret)
  const expectedBuffer = Buffer.from(expected)
  const sentBuffer = Buffer.from(sent || "")
  if (expectedBuffer.length !== sentBuffer.length) return null
  return timingSafeEqual(expectedBuffer, sentBuffer) ? role : null
}
