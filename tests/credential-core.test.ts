import { describe, expect, it } from "vitest"
import { createSessionToken, credentialsFor, roleRequiresCredentials, verifySessionToken } from "../server/utils/credential-core"

const config = { adminLogin: "root", adminPassword: "secret-a", partnerLogin: "shop", partnerPassword: "secret-p" }

describe("credentials", () => {
  it("selects credentials by role", () => {
    expect(credentialsFor("admin", config)).toEqual({ login: "root", password: "secret-a" })
    expect(credentialsFor("partner", config)).toEqual({ login: "shop", password: "secret-p" })
  })

  it("requires credentials only for administrators", () => {
    expect(roleRequiresCredentials("partner")).toBe(false)
    expect(roleRequiresCredentials("admin")).toBe(true)
  })

  it("creates and validates a signed session", () => {
    const token = createSessionToken("partner", "a-secure-session-secret", 1_000)
    expect(verifySessionToken(token, "a-secure-session-secret", 2_000)).toBe("partner")
    expect(verifySessionToken(token, "wrong-secret", 2_000)).toBeNull()
    expect(verifySessionToken(`${token}x`, "a-secure-session-secret", 2_000)).toBeNull()
  })

  it("rejects missing, malformed and expired sessions", () => {
    expect(verifySessionToken(null, "secret")).toBeNull()
    expect(verifySessionToken("manager.999.signature", "secret", 1)).toBeNull()
    const expired = createSessionToken("admin", "secret", 1)
    expect(verifySessionToken(expired, "secret", 50_000_000)).toBeNull()
    expect(() => createSessionToken("admin", "")).toThrow("Не настроен секрет сессии")
  })
})
