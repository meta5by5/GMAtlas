# Sign-in methods: passkeys and OAuth beside the email code

**Status:** Accepted (Phase S1 item 1, `server` branch).

## Context

The roadmap (section 3.1) wants three passwordless ways in: the email code
(the universal fallback and recovery anchor), passkeys offered after the
first sign-in, and "Continue with Google / Apple / Discord". The service
has no dependencies beyond WebCrypto, and its sessions are an HttpOnly,
SameSite=Strict refresh cookie plus a 15-minute access token.

## Decision

1. **One way to finish signing in.** Email code, passkey and OAuth all end
   in `startSession()` (`server/src/auth.js`): this browser's device record
   (reused when its id is known), a session, and the refresh cookie. A
   disabled account can't start one by any method.
2. **Passkeys** (`server/src/passkeys.js`, `server/src/webauthn.js`):
   - Discoverable credentials, so signing in needs no email. Added from
     Account › Sign-in, or the "Sign in faster next time" offer on Profile
     and Sync (until the account has one, or "Not now" on this device).
   - Verified with WebCrypto only: a small CBOR decoder; the client data
     (type, challenge, origin, not cross-origin); the authenticator data
     (relying-party hash, user present); ES256 and RS256 keys. Attestation
     is "none": the key is trusted, the authenticator isn't vouched for.
   - Challenges are single-use and last five minutes. A signature counter
     that doesn't go up (when the authenticator keeps one) is refused as a
     cloned key. The relying party is the site's own host, so dev and
     production passkeys are separate.
3. **OAuth** (`server/src/oauth.js`): Google and Discord, authorization code
   with PKCE (S256). A provider is offered only once its client id and
   secret are set. The flow's state (CSRF state, verifier, device) rides in
   a ten-minute signed cookie, SameSite=Lax because the provider sends the
   browser back from its own site.
   - A new identity joins the account for its email, or creates one, only
     if the provider says the address is verified. The email identity is
     always kept, so the code still works.
   - Connecting a provider from Account › Sign-in uses a two-minute link
     ticket, because a top-level navigation can't carry the access token.
     One provider account can't join two GMAtlas accounts.
   - The callback redirects into the app: `#/account/oauth/new|back` (the
     app picks up the session cookie and continues the usual sign-in
     steps), or `#/account/sign-in/error/<reason>` with the reason in words.
4. **Apple waits.** It posts its answer back cross-site, which this
   service's origin check refuses for every state-changing request, and it
   needs a client secret signed with an Apple key. Both are solvable (a
   GET-only response mode isn't offered with email scope), but separately.

## Consequences

- No passwords: nothing to store, reset or leak.
- Each OAuth provider needs a one-time app registration per environment
  (redirect URI `<origin>/api/auth/oauth/<provider>/callback`), and its id
  and secret set as Worker secrets.
- Removing a passkey here doesn't delete it from the device's password
  manager; the page says so.
- Not built: Apple sign-in; device key pairs signing the refresh (section
  3.2), which would stop a stolen cookie being used elsewhere.
