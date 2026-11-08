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
3. **OAuth** (`server/src/oauth.js`): Google, Apple and Discord,
   authorization code with PKCE (S256) for Google and Discord. A provider is offered only once its client id and
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
4. **Apple** differs from the other two in three ways:
   - **It answers with a cross-site form POST** (`response_mode=form_post`
     is the only mode Apple allows when the email is asked for).
     - The origin check lets exactly one request through: a POST to
       `/api/auth/oauth/apple/callback` from `https://appleid.apple.com`.
     - That POST checks nothing, sets nothing and carries no cookie (the
       state cookie is Lax). It only answers 303 to the GET callback on
       this origin, carrying `code`, `state` and the name.
     - On that top-level GET the Lax state cookie does arrive, so the state
       check and everything after it are the same as for Google.
   - **Its client secret** is a five-minute ES256 JWT (team id, key id,
     Services ID), signed per token request with the team's `.p8` key.
   - **There's no userinfo endpoint.** Who signed in is the ID token from
     the token response. It came straight from Apple over TLS, so its
     signature isn't re-checked (OIDC core 3.1.3.7). Its issuer, audience,
     expiry and nonce are checked.
     - The nonce is made at start and kept in the state cookie. It stands
       in for PKCE, which Apple doesn't document.
     - Apple sends the name only on the first sign-in, in that form post.
     - "Hide My Email" gives a relay address, which the token marks
       verified. Signing in with it the first time makes a new account
       unless Apple was connected from an existing one first; the help
       article says so.

## Consequences

- No passwords: nothing to store, reset or leak.
- Each OAuth provider needs a one-time app registration per environment
  (redirect URI `<origin>/api/auth/oauth/<provider>/callback`), and its id
  and secret set as Worker secrets.
- Removing a passkey here doesn't delete it from the device's password
  manager; the page says so.
- Apple needs a paid Apple Developer membership: an App ID with Sign in
  with Apple, a Services ID (the client id) with the domain and redirect
  URI, and a key (`.p8`). The key text goes in `APPLE_PRIVATE_KEY`.
