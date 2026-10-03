"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StudioSession {
  signedIn: boolean;
  isOwner: boolean;
  displayName: string | null;
  signInHref: string;
}

const fallbackSession: StudioSession = {
  signedIn: false,
  isOwner: false,
  displayName: null,
  signInHref: "/login",
};

export default function StudioAccount() {
  const router = useRouter();
  const [session, setSession] = useState(fallbackSession);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data) setSession({ ...fallbackSession, ...data }); })
      .catch(() => { /* Sign-in link remains available if session status cannot load. */ });
    return () => { active = false; };
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="studio-account" aria-label="Account">
      {session.isOwner ? (
        <>
          <span className="studio-account-name">{session.displayName || "Studio owner"}</span>
          <button className="btn btn-secondary" type="button" onClick={signOut} disabled={busy}>Sign out</button>
        </>
      ) : (
        <a className="btn btn-secondary" href={session.signInHref}>Sign in</a>
      )}
    </div>
  );
}
