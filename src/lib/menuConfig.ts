export interface MenuItemConfig {
  id: string;
  label: string;
  index: string;
  subtitle: string;
  selectedSize: string;
  marginBottom: string;
  marginTop?: string;
  accentH: number;
  accentS: string;
  accentL: string;
  splashHeightVh: number;   // height of the paint splash as % of viewport height
  splashOffsetY: number;    // vertical fine-tune in vh (positive = down)
  splashTipXPct: number;    // x% where the right edge comes to a point (default 60)
  splashTaperYPct: number;  // y% inset of shoulder points from top/bottom - higher = sharper taper (default 12)
}

export const MENU_ITEMS: MenuItemConfig[] = [
  {
    id: 'about',
    label: 'About',
    index: '01',
    subtitle: 'Gain Insight',
    selectedSize: '24vh',
    marginBottom: '-3vh',
    accentH: 4,
    accentS: '88%',
    accentL: '45%',
    splashHeightVh: 49,
    splashOffsetY: -4,
    splashTipXPct: 60,
    splashTaperYPct: 36,
  },
  {
    id: 'skills',
    label: 'Skills',
    index: '02',
    subtitle: 'Wield Power',
    selectedSize: '18vh',
    marginBottom: '-1vh',
    accentH: 335,
    accentS: '75%',
    accentL: '50%',
    splashHeightVh: 45,
    splashOffsetY: -1,
    splashTipXPct: 60,
    splashTaperYPct: 36,
  },
  {
    id: 'experience',
    label: 'Experience',
    index: '03',
    subtitle: 'Look Back',
    selectedSize: '22vh',
    marginBottom: '-3vh',
    accentH: 215,
    accentS: '72%',
    accentL: '42%',
    splashHeightVh: 49,
    splashOffsetY: -1.5,
    splashTipXPct: 60,
    splashTaperYPct: 36,
  },
  {
    id: 'contact',
    label: 'Contact',
    index: '04',
    subtitle: 'Forge Bonds',
    selectedSize: '18vh',
    marginBottom: '1vh',
    accentH: 25,
    accentS: '80%',
    accentL: '50%',
    splashHeightVh: 46,
    splashOffsetY: 2,
    splashTipXPct: 60,
    splashTaperYPct: 36,
  },
  {
    id: 'memorandum',
    label: 'Memorandum',
    index: '05',
    subtitle: 'Study Notes',
    selectedSize: '18vh',
    marginBottom: '-11vh',
    accentH: 120,
    accentS: '50%',
    accentL: '40%',
    splashHeightVh: 49,
    splashOffsetY: 6,
    splashTipXPct: 60,
    splashTaperYPct: 36,
  },
  {
    id: 'system',
    label: 'System',
    index: '06',
    subtitle: 'Change The Site',
    selectedSize: '17vh',
    marginBottom: '0',
    accentH: 175,
    accentS: '55%',
    accentL: '45%',
    splashHeightVh: 44,
    splashOffsetY: 7,
    splashTipXPct: 60,
    splashTaperYPct: 36,
  },
];
