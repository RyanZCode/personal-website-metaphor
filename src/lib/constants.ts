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
