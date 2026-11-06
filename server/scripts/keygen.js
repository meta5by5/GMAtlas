// keygen.js — makes a new entitlement-certificate signing key pair.
// The private JWK becomes the CERT_SIGNING_JWK secret; the public JWK is
// pinned in the browser app (with its key id) so devices can verify
// certificates offline. Prints both; writes nothing to disk.
import { generateSigningKeyPair } from '../src/crypto.js';

const { privateJwk, publicJwk } = await generateSigningKeyPair();
console.log('CERT_SIGNING_JWK (secret — `npx wrangler secret put CERT_SIGNING_JWK`, paste this line):');
console.log(JSON.stringify(privateJwk));
console.log('\nPublic JWK (pin in the app with its key id):');
console.log(JSON.stringify({ kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y }));
