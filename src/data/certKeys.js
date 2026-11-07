// certKeys.js — the public halves of the keys that sign entitlement
// certificates (design/ACCOUNTS-SYNC-ROADMAP.md 4.3). The browser verifies a
// certificate offline against these, so a forged or edited certificate
// can't unlock anything. Copied from server/keys/cert-<kid>.public.json.
//
// Rotating: add the new key here beside the old one, deploy, and drop the
// old one only after its last certificates have expired (30 days).
export const CERT_PUBLIC_KEYS = [
  {
    kid: 'k1',
    kty: 'EC',
    crv: 'P-256',
    x: 'eZCumLVcYuMGxCMkFngbMiej3niMB5optHPdblM0yes',
    y: 'rtFm8vx6RbhXxCe5gMTVTkKYSN4EaHfHI_Mf4WePBIk',
  },
];
