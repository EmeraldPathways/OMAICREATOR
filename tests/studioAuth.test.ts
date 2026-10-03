import assert from "node:assert/strict";
import test from "node:test";
import { createSessionToken, hashPassword, isAuthConfigured, isPublicAuthRequest, verifyOwnerPassword, verifyPassword, verifySessionToken } from "../lib/studioAuth.ts";

const encodedPassword = "pbkdf2-sha256$12000$YWJjZGVmZ2hpamtsbW5vcA$RkFLRS1IQVNILVZBTFVF";
const validPasswordHashShape = "pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

test("password hash verifier accepts the matching password and rejects a different one", async () => {
  const hash = await hashPassword("correct horse battery staple", 100_000);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
});

test("password verifier rejects malformed or weak encoded hashes", async () => {
  assert.equal(await verifyPassword("anything", "not-a-hash"), false);
  assert.equal(await verifyPassword("anything", encodedPassword), false);
});

test("owner sign-in supports a normal server-side password secret", async () => {
  const env = {
    STUDIO_OWNER_EMAIL: "owner@example.com",
    STUDIO_OWNER_PASSWORD: "local-only-test-password",
    STUDIO_SESSION_SECRET: "12345678901234567890123456789012",
  };
  assert.equal(isAuthConfigured(env), true);
  assert.equal(await verifyOwnerPassword("local-only-test-password", env), true);
  assert.equal(await verifyOwnerPassword("different-password", env), false);
});

test("normal password secret takes precedence over a legacy hash", async () => {
  const env = {
    STUDIO_OWNER_EMAIL: "owner@example.com",
    STUDIO_OWNER_PASSWORD: "new-local-only-password",
    STUDIO_OWNER_PASSWORD_HASH: validPasswordHashShape,
    STUDIO_SESSION_SECRET: "12345678901234567890123456789012",
  };
  assert.equal(await verifyOwnerPassword("new-local-only-password", env), true);
  assert.equal(await verifyOwnerPassword("anything", env), false);
});

test("session tokens validate, expire, and reject tampering", async () => {
  const now = 1_800_000_000_000;
  const token = await createSessionToken("owner@example.com", "secret-value-that-is-long-enough-32-bytes", now, 60_000);
  assert.deepEqual(await verifySessionToken(token, "secret-value-that-is-long-enough-32-bytes", now + 1), {
    email: "owner@example.com",
    expiresAt: now + 60_000,
  });
  assert.equal(await verifySessionToken(token, "secret-value-that-is-long-enough-32-bytes", now + 60_000), null);
  assert.equal(await verifySessionToken(`${token}x`, "secret-value-that-is-long-enough-32-bytes", now + 1), null);
  assert.equal(await verifySessionToken(token, "a-different-session-secret-value-32", now + 1), null);
});

test("auth allowlist exposes only login, logout, and session status", () => {
  assert.equal(isPublicAuthRequest("/login", "GET"), true);
  assert.equal(isPublicAuthRequest("/api/auth/login", "POST"), true);
  assert.equal(isPublicAuthRequest("/api/auth/login", "GET"), false);
  assert.equal(isPublicAuthRequest("/api/auth/logout", "POST"), true);
  assert.equal(isPublicAuthRequest("/api/session", "GET"), true);
  assert.equal(isPublicAuthRequest("/api/session", "POST"), false);
  assert.equal(isPublicAuthRequest("/api/generate", "POST"), false);
  assert.equal(isPublicAuthRequest("/", "GET"), false);
});

test("auth configuration requires all three server-side values and a strong session secret", () => {
  assert.equal(isAuthConfigured({}), false);
  assert.equal(isAuthConfigured({ STUDIO_OWNER_EMAIL: "owner@example.com", STUDIO_OWNER_PASSWORD_HASH: validPasswordHashShape, STUDIO_SESSION_SECRET: "short" }), false);
  assert.equal(isAuthConfigured({ STUDIO_OWNER_EMAIL: "owner@example.com", STUDIO_OWNER_PASSWORD_HASH: "hash", STUDIO_SESSION_SECRET: "12345678901234567890123456789012" }), false);
  assert.equal(isAuthConfigured({ STUDIO_OWNER_EMAIL: "owner@example.com", STUDIO_OWNER_PASSWORD_HASH: validPasswordHashShape, STUDIO_SESSION_SECRET: "12345678901234567890123456789012" }), true);
});
