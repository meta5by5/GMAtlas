// dice3dThemes.js — the catalog of vendored @3d-dice/dice-box themes
// (assets/vendor/dice-box/assets/themes/<id>/, CC0-licensed via the
// upstream 3d-dice/dice-themes repo). Direct follow-up request: "add a
// settings tab for selecting dice type and color options" — this is the
// data the Dice settings tab's theme <select> and diceBox3d.js's own
// roll3d() both read from, so a new theme only needs vendoring its own
// folder plus one entry here, never a code change elsewhere.
//
// `supportsColor` mirrors each theme's own theme.config.json `material.type`
// (checked directly against the actual vendored files, not assumed):
// 'color'-type themes (Default/Smooth/Gemstone/Rust) visibly recolor via
// dice3dColor; 'standard'-type themes (Dice of Rolling/Wooden) are a fixed
// printed/painted texture and ignore it entirely, same as the real object
// they're modeled on would.
export const DICE_3D_THEMES = [
  { id: 'default', label: 'Default', supportsColor: true },
  { id: 'smooth', label: 'Smooth', supportsColor: true },
  { id: 'gemstone', label: 'Gemstone', supportsColor: true },
  { id: 'rust', label: 'Rust', supportsColor: true },
  { id: 'diceOfRolling', label: 'Dice of Rolling', supportsColor: false },
  { id: 'wooden', label: 'Wooden', supportsColor: false },
];

export function findDice3dTheme(id) {
  return DICE_3D_THEMES.find((t) => t.id === id) || DICE_3D_THEMES[0];
}

// Quick-pick swatches for the Dice settings tab's color option (direct
// follow-up request: "add dice color options including maroon, pink and
// dark green") — one click sets settings.dice3dColor to the hex value
// directly; the native color input alongside them still covers any other
// color a GM wants, this is just a faster path to a handful of common
// picks. Purely a data list — add a row here to offer another swatch,
// no UI/wiring changes needed elsewhere.
export const DICE_3D_COLOR_PRESETS = [
  { label: 'Maroon', hex: '#800000' },
  { label: 'Pink', hex: '#ffc0cb' },
  { label: 'Dark Green', hex: '#006400' },
  { label: 'Crimson', hex: '#b22222' },
  { label: 'Royal Blue', hex: '#1e3a8a' },
  { label: 'Purple', hex: '#6b21a8' },
  { label: 'Gold', hex: '#d4a017' },
  { label: 'Charcoal', hex: '#2b2b2b' },
  { label: 'White', hex: '#f5f5f5' },
];
