// Visual scale for each menu item based on its distance from the selected item
// Index 0 = selected, index 1 = one away, etc
// fontSize is a CSS value; translateX is in pixels
export interface ItemScale {
  fontSize: string;
  fontWeight: number;
  selectedFontWeight: number;
  opacity: number;
  rotate: number;
  rotateY: number;
  translateX: number;
}

// Index 0 is a placeholder - selected items use item.selectedSize from menuConfig instead
// Indices 1+ define size/style for items at that distance from the selected one
// Font sizes are in vh so they scale with viewport height and fill the screen naturally
export const ITEM_SCALES: ItemScale[] = [
  { fontSize: '23vh',  fontWeight: 700, selectedFontWeight: 900, opacity: 1, rotate: 14,   rotateY: 12, translateX: 0 },
  { fontSize: '17vh',  fontWeight: 700, selectedFontWeight: 900, opacity: 1, rotate: 7,    rotateY: 12, translateX: 0 },
  { fontSize: '21vh',  fontWeight: 500, selectedFontWeight: 700, opacity: 1, rotate: -3,   rotateY: 8, translateX: 0 },
  { fontSize: '17vh',  fontWeight: 600, selectedFontWeight: 800, opacity: 1, rotate: -12,   rotateY: 12, translateX: 0 },
  { fontSize: '17vh',  fontWeight: 500, selectedFontWeight: 700, opacity: 1, rotate: -20,  rotateY: 11, translateX: 0 },
  { fontSize: '16vh',  fontWeight: 600, selectedFontWeight: 800, opacity: 1, rotate: -30,  rotateY: 12, translateX: 0 },
];

// Rightward indent per item from the selected item, indexed by distance
// Selected item (d=0) is leftmost; items further away step progressively right
export const ARC_CURVE_X = [12, 12, 0, 11, 8, 23]; // in vw units

// Color palette - all values use rgba for consistency.
// Kept here so components that share colors stay in sync.
// bgPrimary and textPrimary mirror the CSS custom properties of the same name in global.css;
// they are duplicated here for components that need them as inline style values.
export const COLORS = {
  // Backgrounds
  bgPrimary:        'rgba(10, 6, 8, 1)',
  bgTealBright:     'rgba(42, 122, 114, 1)',
  bgTealMid:        'rgba(15, 68, 64, 1)',
  bgTealDeep:       'rgba(6, 30, 28, 1)',
  bgVoid:           'rgba(2, 8, 8, 1)',
  bgCrimson:        'rgba(140, 18, 26, 0.95)',
  bgCrimsonFade:    'rgba(75, 10, 15, 0.65)',
  // Text (opacity variants of --text-primary)
  textPrimary:      'rgba(240, 232, 236, 1)',
  textPrimaryDim:   'rgba(240, 232, 236, 0.75)',
  textPrimaryMuted: 'rgba(240, 232, 236, 0.6)',
  textPrimaryFade:  'rgba(240, 232, 236, 0.5)',
  textPrimaryFaint: 'rgba(240, 232, 236, 0.4)',
  // Zero-alpha variant for SVG gradient stops -- plain 'transparent' is rgba(0,0,0,0)
  // which causes a gray cast; this preserves the hue through the fade.
  textPrimaryGhost: 'rgba(240, 232, 236, 0)',
  // Chip UI (white parallelogram elements in ControlHints + StatsPanel)
  chipBg:           'rgba(255, 255, 255, 1)',
  chipTextStrong:   'rgba(0, 0, 0, 0.85)',
  chipTextKey:      'rgba(0, 0, 0, 0.7)',
  chipTextOn:       'rgba(0, 0, 0, 0.65)',
  chipText:         'rgba(0, 0, 0, 0.5)',
  chipTextSub:      'rgba(0, 0, 0, 0.45)',
  chipTextFaint:    'rgba(0, 0, 0, 0.35)',
  chipTextOff:      'rgba(0, 0, 0, 0.3)',
  chipBorder:       'rgba(0, 0, 0, 0.25)',
  // Misc
  black:            'rgba(0, 0, 0, 1)',
  accentRed:        'rgba(205, 35, 45, 1)',
  portraitGlow:     'rgba(110, 35, 160, 0.45)',
} as const;

// Animation durations in seconds, used in Phase 3+
export const TIMING = {
  hoverTransition: 0.2,
  sectionEnter: 0.4,
  sectionExit: 0.35,
  entryTotal: 1.0,
  idleBob: 4,
  idleSplash: 3,
  idleBackground: 8,
  scanline: 4,
} as const;
