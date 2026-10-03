# Owner email and password authentication

## Goal

Keep the Site publicly reachable while requiring a single configured owner to sign in with email and password. Do not use ChatGPT sign-in and do not allow public registration.

## Design

- Configure `STUDIO_OWNER_EMAIL`, a PBKDF2 password hash, and a random session signing secret as server-side environment values.
- Expose a dedicated email/password login page and login/logout/session endpoints.
- Store an HMAC-signed, expiring session in an HttpOnly, Secure, SameSite=Strict cookie.
- Gate application pages and all API routes with `proxy.ts`; allow only login, session status, logout, and static assets without a session.
- Reuse the verified app session in existing owner-only server authorization checks.
- Provide a local interactive credential generator that never accepts passwords in command arguments or writes secrets to tracked files.
- Remove ChatGPT-specific account links and update setup documentation.

## Verification

- Unit tests cover password hash verification, session signing/tamper/expiry behavior, configuration failures, and public-route allowlisting.
- Run the full unit suite and production build.
- Exercise unauthenticated redirect/API denial, login success/failure, authenticated page/API access, and logout in a browser preview.
- Inspect deployment settings; preserve the existing public audience.
