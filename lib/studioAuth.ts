const PASSWORD_PREFIX = "pbkdf2-sha256";
const PASSWORD_ITERATIONS_MIN = 100_000;
const PASSWORD_ITERATIONS_MAX = 1_000_000;
export const STUDIO_SESSION_COOKIE = "studio_session";
export const STUDIO_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type StudioSession = { email: string; expiresAt: number };

export function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isAuthConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(
    env.STUDIO_OWNER_EMAIL?.trim() &&
    env.STUDIO_OWNER_PASSWORD_HASH?.trim() &&
    env.STUDIO_SESSION_SECRET &&
    new TextEncoder().encode(env.STUDIO_SESSION_SECRET).byteLength >= 32,
  );
}

export async function hashPassword(password: string, iterations = 600_000): Promise<string> {
  if (iterations < PASSWORD_ITERATIONS_MIN || iterations > PASSWORD_ITERATIONS_MAX) {
    throw new Error("Password hash iteration count is outside the supported range.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return `${PASSWORD_PREFIX}$${iterations}$${encodeBase64Url(salt)}$${encodeBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 4 || parts[0] !== PASSWORD_PREFIX) return false;
  const iterations = Number(parts[1]);
  const salt = decodeBase64Url(parts[2]);
  const expected = decodeBase64Url(parts[3]);
  if (!Number.isInteger(iterations) || iterations < PASSWORD_ITERATIONS_MIN || iterations > PASSWORD_ITERATIONS_MAX || salt?.byteLength !== 16 || expected?.byteLength !== 32) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
    return timingSafeEqual(bits, expected);
  } catch {
    return false;
  }
}

export async function createSessionToken(
  email: string,
  secret: string,
  now = Date.now(),
  ttlMs = STUDIO_SESSION_TTL_MS,
): Promise<string> {
  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify({ email: normalizedEmail(email), exp: now + ttlMs })));
  const signature = await sign(payload, secret);
  return `${payload}.${encodeBase64Url(signature)}`;
}

export async function verifySessionToken(token: string | null | undefined, secret: string | undefined, now = Date.now()): Promise<StudioSession | null> {
  if (!token || !secret || new TextEncoder().encode(secret).byteLength < 32) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const supplied = decodeBase64Url(parts[1]);
  if (!supplied) return null;
  try {
    const expected = await sign(parts[0], secret);
    if (!timingSafeEqual(expected, supplied)) return null;
    const bytes = decodeBase64Url(parts[0]);
    if (!bytes) return null;
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as { email?: unknown; exp?: unknown };
    if (typeof claims.email !== "string" || !claims.email || typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp <= now) return null;
    return { email: claims.email, expiresAt: claims.exp };
  } catch {
    return null;
  }
}

export function isPublicAuthRequest(pathname: string, method: string): boolean {
  const verb = method.toUpperCase();
  return (pathname === "/login" && verb === "GET") ||
    (pathname === "/api/auth/login" && verb === "POST") ||
    (pathname === "/api/auth/logout" && verb === "POST") ||
    (pathname === "/api/session" && verb === "GET");
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[\w-]+$/.test(value)) return null;
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function sign(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}
