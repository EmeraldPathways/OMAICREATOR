"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

type SessionStatus = { configured: boolean; signedIn: boolean };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const destination = safeReturnPath(new URLSearchParams(window.location.search).get("next"));
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json() as Promise<SessionStatus>)
      .then((status) => {
        setConfigured(status.configured);
        if (status.signedIn) router.replace(destination);
      })
      .catch(() => setConfigured(false));
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Email or password is incorrect.");
        return;
      }
      router.replace(safeReturnPath(new URLSearchParams(window.location.search).get("next")));
      router.refresh();
    } catch {
      setMessage("Unable to sign in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand-mark" aria-hidden="true">Ω</div>
        <p className="auth-eyebrow">OMEGA FINANCIAL MANAGEMENT</p>
        <h1 id="login-title">Content Studio</h1>
        <p className="auth-intro">Sign in with your owner email and password to continue.</p>
        {configured === false ? (
          <div className="auth-notice" role="status">
            Owner sign-in has not been configured. Add <code>STUDIO_OWNER_EMAIL</code>, <code>STUDIO_OWNER_PASSWORD_HASH</code>, and <code>STUDIO_SESSION_SECRET</code> to the Site environment.
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="owner-email">Email</label>
            <input id="owner-email" name="email" type="email" autoComplete="username" autoCapitalize="none" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
            <label htmlFor="owner-password">Password</label>
            <input id="owner-password" name="password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} />
            {message && <p className="auth-error" role="alert">{message}</p>}
            <button className="auth-submit" type="submit" disabled={busy || configured !== true}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
        <p className="auth-footnote">Owner access only · No public account registration</p>
      </section>
    </main>
  );
}

function safeReturnPath(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.startsWith("/login") || value.startsWith("/api/")) return "/";
  return value;
}
