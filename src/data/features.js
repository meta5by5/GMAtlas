// features.js — the feature-flag catalog (design/ACCOUNTS-SYNC-ROADMAP.md
// sections 4.2 and 9). Pure data, shared by the app and server/. A feature
// is a capability of the online service, not a book (that's a license,
// data/licenses.js) or a campaign panel (a module, core/schema.js's
// GATEABLE_MODULES). The admin panel can only flag or grant ids listed
// here, so a typo can't create a ghost feature.
//
//   default   whether it's on for everyone, before any flag
//   phase     the roadmap phase that builds it (off until then)

export const FEATURES = [
  {
    id: 'sync.devices',
    label: 'Sync across your devices',
    description: 'End-to-end encrypted campaign and settings sync between one account’s devices.',
    default: true,
    phase: 'S2',
  },
  {
    id: 'p2p.transfer',
    label: 'Device-to-device document transfer',
    description: 'Sending sourcebooks and images directly between your devices, never through the server.',
    default: false,
    phase: 'S3',
  },
  {
    id: 'tables',
    label: 'Multiplayer tables',
    description: 'Inviting players into a campaign, with reveal-to-table.',
    default: false,
    phase: 'S5',
  },
];

export const FEATURE_IDS = FEATURES.map((f) => f.id);
