import { env } from "cloudflare:workers";
export type Role = "partner" | "admin";
const encoder = new TextEncoder();
const bindings = () => env as unknown as Record<string, string | undefined>;
function toBase64Url(bytes: Uint8Array) { let binary=""; for (const byte of bytes) binary+=String.fromCharCode(byte); return btoa(binary).replaceAll("+","-").replaceAll("/","_").replaceAll("=",""); }
async function signature(payload: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(bindings().SESSION_SECRET || "one-price-local-preview-secret"), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}
export async function createSession(role: Role) { const payload=`${role}.${Date.now()+43200000}`; return `${payload}.${await signature(payload)}`; }
export async function verifySession(token?: string | null): Promise<Role | null> {
  if (!token) return null; const parts=token.split("."); if (parts.length!==3) return null;
  const [role,expires,sent]=parts; if ((role!=="partner"&&role!=="admin")||Number(expires)<Date.now()) return null;
  const expected=await signature(`${role}.${expires}`); if (expected.length!==sent.length) return null;
  let mismatch=0; for(let i=0;i<expected.length;i+=1) mismatch|=expected.charCodeAt(i)^sent.charCodeAt(i);
  return mismatch===0 ? role : null;
}
export function credentialsFor(role: Role) { const value=bindings(); return role==="admin" ? {login:value.ADMIN_LOGIN||"admin",password:value.ADMIN_PASSWORD||"admin-demo"} : {login:value.PARTNER_LOGIN||"partner",password:value.PARTNER_PASSWORD||"partner-demo"}; }
export function sessionCookie(request: Request) { const match=request.headers.get("cookie")?.match(/(?:^|;\s*)op_session=([^;]+)/); return match?.[1] ? decodeURIComponent(match[1]) : null; }
