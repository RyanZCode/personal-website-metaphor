import gsap from 'gsap';

export interface Job {
  company: string;
  role: string;
  period: string;
  type: string;
  logo?: string;
  logoScale?: number;
  logoOffsetX?: string;
  logoOffsetY?: string;
}

export const JOBS: Job[] = [
  {
    company: 'Shopify',
    role: 'Intern Engineer (Infrastructure)',
    period: 'May 2026 - Present',
    type: 'Internship',
    logo: '/assets/experience-logos/shopify-logo.webp',
    logoScale: 0.8,
    logoOffsetX: '0%',
    logoOffsetY: '-3%',
  },
  {
    company: 'Shopify',
    role: 'Intern Engineer (Full-Stack)',
    period: 'Sept 2025 - Dec 2025',
    type: 'Internship',
    logo: '/assets/experience-logos/shopify-logo.webp',
    logoScale: 0.8,
    logoOffsetX: '0%',
    logoOffsetY: '-3%',
  },
  {
    company: 'University Health Network',
    role: 'Web Developer',
    period: 'Jan 2025 - Apr 2025',
    type: 'Internship',
    logo: '/assets/experience-logos/uhn-logo.webp',
    logoScale: 1.2,
    logoOffsetX: '0%',
    logoOffsetY: '0%',
  },
  {
    company: 'Dishon Limited',
    role: 'Developer',
    period: 'Aug 2024 - Nov 2025',
    type: 'Independent Contractor',
    logo: '/assets/experience-logos/dishon-logo.webp',
    logoScale: 0.95,
    logoOffsetX: '-0.5%',
    logoOffsetY: '2%',
  },
  {
    company: 'Dishon Limited',
    role: 'Data Analyst Intern',
    period: 'May 2024 - Aug 2024',
    type: 'Internship',
    logo: '/assets/experience-logos/dishon-logo.webp',
    logoScale: 0.95,
    logoOffsetX: '-0.5%',
    logoOffsetY: '2%',
  },
  {
    company: 'University of Waterloo',
    role: 'Bachelor of Computer Science (Co-op)',
    period: 'Sept 2023 - Present',
    type: 'Education',
    logo: '/assets/experience-logos/uwaterloo-logo.webp',
    logoScale: 1,
    logoOffsetX: '0%',
    logoOffsetY: '-0.5%',
  },
];

export const EXPERIENCE_ACCENT = 'hsl(215, 72%, 42%)';

export const EXPERIENCE_SCROLL_STEP = 132;
export const EXPERIENCE_BOTTOM_SCROLL_SPACE_REM = 5.5;

export interface ExperienceGeometry {
  leftTop: number;
  leftBottom: number;
  rightBottom: number;
  rightStartY: number;
}

export const DEFAULT_GEOMETRY: ExperienceGeometry = {
  leftTop: 65,
  leftBottom: 35,
  rightBottom: 73,
  rightStartY: 10,
};

export const COMPACT_GEOMETRY: ExperienceGeometry = {
  leftTop: 22,
  leftBottom: -8,
  rightBottom: 73,
  rightStartY: 10,
};

export const TABLET_GEOMETRY: ExperienceGeometry = {
  leftTop: 52,
  leftBottom: 28,
  rightBottom: 76,
  rightStartY: 0,
};

// Rows use the narrowest intersection of both diagonal edges so their content stays
// inside the panel. Signed border insets let separators reach each edge independently.
const ROW_PADDING_L_VW = 0.5;
export const ROW_PADDING_R_VW = 5.25;
const LOGO_OVERHANG_REM = 0.7;

// Estimated top y-positions of each row as a fraction of screen height.
// Rows are centered in 80vh and span roughly 27% to 65% of viewport height.
export interface RowLayout {
  marginLeft: string;
  width: string;
  topBorderInsetLeft: string;
  topBorderInsetRight: string;
  bottomBorderInsetLeft: string;
  bottomBorderInsetRight: string;
  contentInsetLeft: string;
}

export interface RowMeasurement {
  offsetTop: number;
  height: number;
}

export interface ExperienceLayoutMeasurement {
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  rootFontSize: number;
  rows: RowMeasurement[];
}

export function createDefaultRowLayout(): RowLayout {
  return {
    marginLeft: '0px',
    width: '35vw',
    topBorderInsetLeft: '0px',
    topBorderInsetRight: '0px',
    bottomBorderInsetLeft: '0px',
    bottomBorderInsetRight: '0px',
    contentInsetLeft: '0px',
  };
}

export function haveRowLayoutsChanged(nextLayouts: RowLayout[], currentLayouts: RowLayout[]) {
  return nextLayouts.some((layout, index) => (
    layout.marginLeft !== currentLayouts[index]?.marginLeft ||
    layout.width !== currentLayouts[index]?.width ||
    layout.topBorderInsetLeft !== currentLayouts[index]?.topBorderInsetLeft ||
    layout.topBorderInsetRight !== currentLayouts[index]?.topBorderInsetRight ||
    layout.bottomBorderInsetLeft !== currentLayouts[index]?.bottomBorderInsetLeft ||
    layout.bottomBorderInsetRight !== currentLayouts[index]?.bottomBorderInsetRight ||
    layout.contentInsetLeft !== currentLayouts[index]?.contentInsetLeft
  ));
}

export function buildRowLayouts(
  measurement: ExperienceLayoutMeasurement,
  scrollOffset: number,
  viewportWidth: number,
  viewportHeight: number,
  geometry: ExperienceGeometry,
): RowLayout[] {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return JOBS.map(() => createDefaultRowLayout());
  }

  const rowPaddingLeftPx = (ROW_PADDING_L_VW / 100) * viewportWidth;
  const logoOverhangPx = LOGO_OVERHANG_REM * measurement.rootFontSize;
  const contentLeft = measurement.contentLeft;
  const contentRight = contentLeft + measurement.contentWidth;

  return measurement.rows.map((row) => {
    if (row.height <= 0) {
      return createDefaultRowLayout();
    }

    const rowTopY = measurement.contentTop + row.offsetTop - scrollOffset;
    const rowBottomY = rowTopY + row.height;
    const rowTopLeftBorderPx = Math.max(
      contentLeft,
      getLeftStripX(rowTopY, viewportWidth, viewportHeight, geometry)
    );
    const rowTopRightBorderPx = Math.min(
      contentRight,
      getRightStripX(rowTopY, viewportWidth, viewportHeight, geometry)
    );
    const bottomBorderLeftPx = Math.max(
      contentLeft,
      getLeftStripX(rowBottomY, viewportWidth, viewportHeight, geometry)
    );
    const bottomBorderRightPx = Math.min(
      contentRight,
      getRightStripX(rowBottomY, viewportWidth, viewportHeight, geometry)
    );
    const rowLeftBorderPx = Math.max(rowTopLeftBorderPx, bottomBorderLeftPx);
    const rowRightBorderPx = Math.min(rowTopRightBorderPx, bottomBorderRightPx);
    const rowLeftPx = Math.max(
      rowLeftBorderPx,
      rowLeftBorderPx + logoOverhangPx - rowPaddingLeftPx
    );

    return {
      marginLeft: `${Math.max(0, rowLeftBorderPx - contentLeft)}px`,
      width: `${Math.max(0, rowRightBorderPx - rowLeftBorderPx)}px`,
      topBorderInsetLeft: `${rowTopLeftBorderPx - rowLeftBorderPx}px`,
      topBorderInsetRight: `${rowRightBorderPx - rowTopRightBorderPx}px`,
      bottomBorderInsetLeft: `${bottomBorderLeftPx - rowLeftBorderPx}px`,
      bottomBorderInsetRight: `${rowRightBorderPx - bottomBorderRightPx}px`,
      contentInsetLeft: `${Math.max(0, rowLeftPx - rowLeftBorderPx)}px`,
    };
  });
}

function getLeftStripX(
  yPx: number,
  viewportWidth: number,
  viewportHeight: number,
  geometry: ExperienceGeometry,
): number {
  const progress = yPx / viewportHeight;
  return ((geometry.leftTop + (geometry.leftBottom - geometry.leftTop) * progress) / 100) * viewportWidth;
}

function getRightStripX(
  yPx: number,
  viewportWidth: number,
  viewportHeight: number,
  geometry: ExperienceGeometry,
): number {
  const rightStartPx = (geometry.rightStartY / 100) * viewportHeight;

  if (yPx <= rightStartPx) {
    return viewportWidth;
  }

  const progress = (yPx - rightStartPx) / (viewportHeight - rightStartPx);
  return viewportWidth + ((((geometry.rightBottom / 100) * viewportWidth) - viewportWidth) * progress);
}

export function getElementTranslate(target: Element | null): { x: number; y: number } {
  if (!target) {
    return { x: 0, y: 0 };
  }

  return {
    x: Number(gsap.getProperty(target, 'x')) || 0,
    y: Number(gsap.getProperty(target, 'y')) || 0,
  };
}

// Dark strip right diagonal vector: (-27vw, 90vh). In pixels: angle from vertical = atan2(27W, 90H).
// Diagonal line equation in % coords: x_vw + 0.3*y_vh = 103.
//
// Goal: rotate so the left edge is parallel to the diagonal.
// and the container covers the full screen height (no gaps above or below).
//
// Optimal center y eliminates both gaps simultaneously.
// From the top-left-on-diagonal constraint.
// right_vw = 100 - x_c_vw - W2 = 12 - W2 * (1 + cos(theta))
// bottom_vh = 50 - W2 * ar * (1 + sin(theta))
//
// Min W2 covers the full height, plus a margin of 8.
export function computeRippleLayout(): { angleDeg: number; rightVw: number; bottomVh: number; sideVw: number } {
  const rad = Math.atan2(27 * window.innerWidth, 90 * window.innerHeight);
  const ar  = window.innerWidth / window.innerHeight;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const W2  = Math.ceil(50 / (ar * cos)) + 8;
  return {
    angleDeg: rad * 180 / Math.PI,
    rightVw:  12 - W2 * (1 + cos),
    bottomVh: 50 - W2 * ar * (1 + sin),
    sideVw:   W2 * 2,
  };
}
