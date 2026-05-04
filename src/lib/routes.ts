import type { MemorandumCategoryId, MemorandumData } from './memorandum';

export const APP_PAGE_IDS = [
  'about',
  'skills',
  'experience',
  'contact',
  'memorandum',
  'system',
] as const;

export type AppPageId = (typeof APP_PAGE_IDS)[number];

export interface MemorandumRoute {
  pageId: 'memorandum';
  pathname: string;
  columnIndex: number;
  columnId: MemorandumCategoryId;
  entrySlug: string | null;
  pageNumber: number | null;
  hasExplicitCategory: boolean;
}

export type AppRoute =
  | {
      pageId: null;
      pathname: '/';
    }
  | {
      pageId: Exclude<AppPageId, 'memorandum'>;
      pathname: string;
    }
  | MemorandumRoute;

function normalizeRouteToken(value: string) {
  try {
    return decodeURIComponent(value).trim().toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

export function normalizePathname(pathname: string) {
  const rawPath = pathname.split(/[?#]/, 1)[0] ?? '';
  const withLeadingSlash = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const collapsedSlashes = withLeadingSlash.replace(/\/{2,}/g, '/');

  if (collapsedSlashes === '/') return '/';

  const trimmedTrailingSlash = collapsedSlashes.replace(/\/+$/, '');
  return trimmedTrailingSlash || '/';
}

export function getCurrentPathname() {
  return normalizePathname(window.location.pathname);
}

export function replacePathname(pathname: string) {
  const url = new URL(window.location.href);
  const nextPathname = normalizePathname(pathname);
  window.history.replaceState(window.history.state, '', `${nextPathname}${url.search}`);
}

export function pushPathname(pathname: string) {
  const url = new URL(window.location.href);
  const nextPathname = normalizePathname(pathname);
  window.history.pushState(window.history.state, '', `${nextPathname}${url.search}`);
}

export function buildPagePath(pageId: AppPageId) {
  return pageId === 'memorandum' ? '/memorandum' : `/${pageId}`;
}

export function buildMemorandumPath(
  columnId?: MemorandumCategoryId | null,
  entrySlug?: string | null,
  pageNumber?: number | null,
) {
  let pathname = '/memorandum';

  if (!columnId) {
    return pathname;
  }

  pathname += `/${columnId}`;

  if (!entrySlug) {
    return pathname;
  }

  const resolvedPageNumber = Math.max(1, pageNumber ?? 1);
  pathname += `/${encodeURIComponent(entrySlug)}/${resolvedPageNumber}`;
  return pathname;
}

export function parseMemorandumRoute(
  pathname: string,
  memorandumData: MemorandumData,
): MemorandumRoute | null {
  const normalizedPathname = normalizePathname(pathname);
  const segments = normalizedPathname.split('/').filter(Boolean).map(normalizeRouteToken);

  if (segments[0] !== 'memorandum') return null;

  if (segments.length === 1) {
    return {
      pageId: 'memorandum',
      pathname: '/memorandum',
      columnIndex: memorandumData.columns.findIndex(
        (candidate) => candidate.id === memorandumData.defaultColumnId
      ),
      columnId: memorandumData.defaultColumnId,
      entrySlug: null,
      pageNumber: null,
      hasExplicitCategory: false,
    };
  }

  const column = memorandumData.columns.find((candidate) => candidate.id === segments[1]);
  if (!column) return null;
  const columnIndex = memorandumData.columns.findIndex((candidate) => candidate.id === column.id);

  if (segments.length === 2) {
    return {
      pageId: 'memorandum',
      pathname: buildMemorandumPath(column.id),
      columnIndex,
      columnId: column.id,
      entrySlug: null,
      pageNumber: null,
      hasExplicitCategory: true,
    };
  }

  if (segments.length !== 4) return null;

  const entrySlug = segments[2];
  const entry = column.entries.find((candidate) => normalizeRouteToken(candidate.slug) === entrySlug);
  if (!entry) return null;

  const pageNumber = Number(segments[3]);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > entry.pages.length) {
    return null;
  }

  return {
    pageId: 'memorandum',
    pathname: buildMemorandumPath(column.id, entry.slug, pageNumber),
    columnIndex,
    columnId: column.id,
    entrySlug: entry.slug,
    pageNumber,
    hasExplicitCategory: true,
  };
}

export function parseAppRoute(pathname: string, memorandumData: MemorandumData): AppRoute | null {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === '/') {
    return {
      pageId: null,
      pathname: '/',
    };
  }

  const segments = normalizedPathname.split('/').filter(Boolean).map(normalizeRouteToken);
  const pageId = segments[0];

  if (!APP_PAGE_IDS.includes(pageId as AppPageId)) {
    return null;
  }

  if (pageId === 'memorandum') {
    return parseMemorandumRoute(normalizedPathname, memorandumData);
  }

  if (segments.length !== 1) {
    return null;
  }

  return {
    pageId: pageId as Exclude<AppPageId, 'memorandum'>,
    pathname: buildPagePath(pageId as Exclude<AppPageId, 'memorandum'>),
  };
}

export function resolveAppRoute(pathname: string, memorandumData: MemorandumData): AppRoute {
  const parsedRoute = parseAppRoute(pathname, memorandumData);
  if (parsedRoute) return parsedRoute;

  const normalizedPathname = normalizePathname(pathname);
  if (normalizedPathname === '/') {
    return {
      pageId: null,
      pathname: '/',
    };
  }

  const [firstSegment] = normalizedPathname.split('/').filter(Boolean).map(normalizeRouteToken);
  if (firstSegment === 'memorandum') {
    return parseMemorandumRoute('/memorandum', memorandumData) ?? {
      pageId: 'memorandum',
      pathname: '/memorandum',
      columnIndex: 0,
      columnId: memorandumData.defaultColumnId,
      entrySlug: null,
      pageNumber: null,
      hasExplicitCategory: false,
    };
  }

  return {
    pageId: null,
    pathname: '/',
  };
}

export function getStaticAppPathnames(memorandumData: MemorandumData) {
  const pathnames = new Set<string>([
    buildPagePath('about'),
    buildPagePath('skills'),
    buildPagePath('experience'),
    buildPagePath('contact'),
    buildPagePath('memorandum'),
    buildPagePath('system'),
  ]);

  memorandumData.columns.forEach((column) => {
    pathnames.add(buildMemorandumPath(column.id));

    column.entries.forEach((entry) => {
      entry.pages.forEach((_, pageIndex) => {
        pathnames.add(buildMemorandumPath(column.id, entry.slug, pageIndex + 1));
      });
    });
  });

  return [...pathnames];
}
