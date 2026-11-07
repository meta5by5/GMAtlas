// certKeys.js — the public halves of the keys that sign entitlement
// certificates (design/ACCOUNTS-SYNC-ROADMAP.md 4.3). The browser verifies a
// certificate offline against these, so a forged or edited certificate
// can't unlock anything. Copied from server/keys/cert-<kid>.public.json.
//
// Production's key only (p1, https://gmatlas.online, the default service
// URL). A dev build (server/scripts/site.js) swaps in the dev key instead,
// so a certificate from one environment never verifies in the other.
//
// Rotating: add the new key here beside the old one, deploy, and drop the
// old one only after its last certificates have expired (30 days).
export const CERT_PUBLIC_KEYS = [
  {
    kid: 'p1',
    kty: 'EC',
    crv: 'P-256',
    x: '2uoMNJAM01jG0pWfXjpWQeMJKyFvOdwyNNNWxe8E0cg',
    y: '5-pyx5L5pTV3zdbrj9tnqOGRWAUUiMHzA4j46X6g12g',
  },
];
