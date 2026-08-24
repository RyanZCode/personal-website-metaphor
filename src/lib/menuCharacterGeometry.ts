import gsap from 'gsap';

interface CharacterTransformBasis {
  a: number;
  b: number;
  c: number;
  d: number;
  determinant: number;
}

export interface CachedMenuCharacter extends CharacterTransformBasis {
  char: HTMLElement;
  centerX: number;
  centerY: number;
  itemIndex: number;
}

interface CachedMenuItem {
  centerX: number;
  centerY: number;
  chars: CachedMenuCharacter[];
}

export interface MenuCharacterGeometry {
  chars: CachedMenuCharacter[];
  items: CachedMenuItem[];
}

const geometryCache = new WeakMap<Element, MenuCharacterGeometry>();

function getTransformScales(element: HTMLElement) {
  const transform = window.getComputedStyle(element).transform;
  if (transform === 'none') return { scaleX: 1, scaleY: 1 };

  const values = transform.slice(transform.indexOf('(') + 1, -1).split(',').map(Number);
  if (transform.startsWith('matrix3d')) {
    return {
      scaleX: Math.hypot(values[0] ?? 1, values[1] ?? 0, values[2] ?? 0),
      scaleY: Math.hypot(values[4] ?? 0, values[5] ?? 1, values[6] ?? 0),
    };
  }

  return {
    scaleX: Math.hypot(values[0] ?? 1, values[1] ?? 0),
    scaleY: Math.hypot(values[2] ?? 0, values[3] ?? 1),
  };
}

function markerCenter(marker: HTMLElement) {
  const rect = marker.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function setCacheState(container: Element, state: 'ready' | 'stale', source?: 'cache' | 'measured') {
  if (!(container instanceof HTMLElement)) return;
  container.dataset.menuGeometryCache = state;
  if (source) container.dataset.menuGeometrySource = source;
}

function readMenuCharacterGeometry(
  container: Element,
  includeReadOnlyBasis: boolean,
): MenuCharacterGeometry {
  const menuItems = Array.from(container.querySelectorAll('[data-menu-item]')) as HTMLElement[];
  const items = menuItems.map((item, itemIndex): CachedMenuItem => {
    const itemRect = item.getBoundingClientRect();
    if (!includeReadOnlyBasis) {
      const chars = (Array.from(item.querySelectorAll('[data-char]')) as HTMLElement[]).map((char) => {
        const rect = char.getBoundingClientRect();
        return {
          char,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          itemIndex,
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          determinant: 1,
        };
      });
      return {
        centerX: itemRect.left + itemRect.width / 2,
        centerY: itemRect.top + itemRect.height / 2,
        chars,
      };
    }

    const anchor = item.querySelector('[data-menu-anchor]') as HTMLElement | null;
    const trajectoryEnd = item.querySelector('[data-menu-trajectory-end]') as HTMLElement | null;
    const label = item.querySelector('[data-menu-label]') as HTMLElement | null;
    if (!anchor || !trajectoryEnd || !label) {
      return { centerX: 0, centerY: 0, chars: [] };
    }

    const start = markerCenter(anchor);
    const end = markerCenter(trajectoryEnd);
    const trajectoryX = end.x - start.x;
    const trajectoryY = end.y - start.y;
    const trajectoryLength = Math.max(Math.hypot(trajectoryX, trajectoryY), 0.001);
    const itemWidth = Math.max(item.offsetWidth, 1);
    const unitX = trajectoryX / itemWidth;
    const unitY = trajectoryY / itemWidth;
    const rotationCos = trajectoryX / trajectoryLength;
    const rotationSin = trajectoryY / trajectoryLength;
    const { scaleX: labelScaleX, scaleY: labelScaleY } = getTransformScales(label);
    const a = unitX * labelScaleX;
    const b = unitY * labelScaleX;
    const c = -rotationSin * labelScaleY;
    const d = rotationCos * labelScaleY;
    const determinant = a * d - b * c;

    const chars = (Array.from(item.querySelectorAll('[data-char]')) as HTMLElement[]).map((char) => {
      const rect = char.getBoundingClientRect();
      return {
        char,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        itemIndex,
        a,
        b,
        c,
        d,
        determinant,
      };
    });

    return {
      centerX: itemRect.left + itemRect.width / 2,
      centerY: itemRect.top + itemRect.height / 2,
      chars,
    };
  });
  return { items, chars: items.flatMap((item) => item.chars) };
}

export function measureMenuCharacterGeometry(container: Element): MenuCharacterGeometry {
  const geometry = readMenuCharacterGeometry(container, false);

  geometry.items.forEach((item, itemIndex) => {
    const probe = item.chars[0]?.char;
    const menuItem = probe?.closest('[data-menu-item]');
    if (!probe || !(menuItem instanceof HTMLElement)) return;

    gsap.set(probe, { x: 0, y: 0 });
    const base = probe.getBoundingClientRect();
    gsap.set(probe, { x: 100, y: 0 });
    const movedX = probe.getBoundingClientRect();
    gsap.set(probe, { x: 0, y: 100 });
    const movedY = probe.getBoundingClientRect();
    gsap.set(probe, { x: 0, y: 0 });

    const a = (movedX.left - base.left) / 100;
    const b = (movedX.top - base.top) / 100;
    const c = (movedY.left - base.left) / 100;
    const d = (movedY.top - base.top) / 100;
    const determinant = a * d - b * c;
    item.chars.forEach((character) => {
      Object.assign(character, { a, b, c, d, determinant });
    });
    menuItem.dataset.menuCharacterBasis = [a, b, c, d].join(',');
    geometry.items[itemIndex] = item;
  });

  geometryCache.set(container, geometry);
  if (container instanceof HTMLElement) {
    const count = Number(container.dataset.menuGeometryMeasureCount ?? 0) + 1;
    container.dataset.menuGeometryMeasureCount = String(count);
  }
  setCacheState(container, 'ready', 'measured');
  return geometry;
}

export function getMenuCharacterGeometry(container: Element): MenuCharacterGeometry {
  const cached = geometryCache.get(container);
  if (cached && cached.chars.every(({ char }) => char.isConnected)) {
    setCacheState(container, 'ready', 'cache');
    return cached;
  }

  const geometry = readMenuCharacterGeometry(container, true);
  geometryCache.set(container, geometry);
  setCacheState(container, 'ready', 'measured');
  return geometry;
}

export function invalidateMenuCharacterGeometry(container: Element): void {
  geometryCache.delete(container);
  setCacheState(container, 'stale');
}

export function toLocalCharacterOffset(
  character: CachedMenuCharacter,
  targetX: number,
  targetY: number,
) {
  const screenX = targetX - character.centerX;
  const screenY = targetY - character.centerY;
  const determinant = Math.abs(character.determinant) < 0.0001 ? 1 : character.determinant;
  return {
    x: (character.d * screenX - character.c * screenY) / determinant,
    y: (-character.b * screenX + character.a * screenY) / determinant,
  };
}
