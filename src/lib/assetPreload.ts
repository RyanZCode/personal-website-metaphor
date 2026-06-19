import type { MemorandumData } from './memorandum';
import type { AppPageId } from './routes';

const MENU_CRITICAL_IMAGE_SOURCES = [
  '/assets/coby-main.webp',
] as const;

const PAGE_IMAGE_SOURCES: Record<AppPageId, readonly string[]> = {
  about: [
  '/assets/ryan-zhou-profile-pic.webp',
  ],
  skills: [
  '/assets/coby-left.webp',
  ],
  experience: [
  '/assets/coby-wistful.webp',
  '/assets/experience-logos/shopify-logo.webp',
  '/assets/experience-logos/uhn-logo.webp',
  '/assets/experience-logos/dishon-logo.webp',
  '/assets/experience-logos/uwaterloo-logo.webp',
  ],
  contact: [
  '/assets/coby-stare.webp',
  '/assets/contact-icons/github-logo.webp',
  '/assets/contact-icons/linkedin-logo.webp',
  '/assets/contact-icons/email-symbol.webp',
  '/assets/contact-icons/leetcode-logo.webp',
  ],
  memorandum: [],
  system: [
  '/assets/coby-sleep.webp',
  ],
};

const DEFERRED_PAGE_IMAGE_SOURCES = [
] as const;

const MAX_BLOCKING_MEMORANDUM_IMAGES = 6;

export interface AssetPreloadManifest {
  blockingImageSrcs: string[];
  deferredImageSrcs: string[];
}

interface AssetPreloadOptions {
  initialPageId?: AppPageId | null;
}

function getUniqueSources(sources: readonly string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  sources.forEach((source) => {
    if (!source || seen.has(source)) return;
    seen.add(source);
    unique.push(source);
  });

  return unique;
}

function getMemorandumImageSources(memorandumData: MemorandumData) {
  return getUniqueSources(
    memorandumData.columns.flatMap((column) =>
      column.entries.flatMap((entry) => entry.pages.map((page) => page.imageSrc))
    )
  );
}

export function createAssetPreloadManifest(
  memorandumData: MemorandumData,
  options: AssetPreloadOptions = {},
): AssetPreloadManifest {
  const memorandumImageSources = getMemorandumImageSources(memorandumData);
  const routeImageSources = options.initialPageId
    ? PAGE_IMAGE_SOURCES[options.initialPageId]
    : [];
  const allPageImageSources = Object.values(PAGE_IMAGE_SOURCES).flat();
  const blockingImageSrcs = getUniqueSources([
    ...MENU_CRITICAL_IMAGE_SOURCES,
    ...routeImageSources,
    ...(options.initialPageId === 'memorandum'
      ? memorandumImageSources.slice(0, MAX_BLOCKING_MEMORANDUM_IMAGES)
      : []),
  ]);
  const blockingImageSet = new Set(blockingImageSrcs);
  const deferredImageSrcs = getUniqueSources([
    ...allPageImageSources,
    ...DEFERRED_PAGE_IMAGE_SOURCES,
    ...memorandumImageSources,
  ]).filter((src) => !blockingImageSet.has(src));

  return {
    blockingImageSrcs,
    deferredImageSrcs,
  };
}

function preloadImage(src: string, options?: { decode?: boolean; timeoutMs?: number }) {
  if (typeof Image === 'undefined') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;
    let timeoutId: number | null = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      resolve();
    };
    timeoutId = window.setTimeout(finish, options?.timeoutMs ?? 5000);

    const decodeImage = () => {
      if (options?.decode === false) {
        finish();
        return;
      }

      if (typeof image.decode !== 'function') {
        finish();
        return;
      }

      image.decode().catch(() => {}).finally(finish);
    };

    image.onload = decodeImage;
    image.onerror = finish;
    image.src = src;

    if (image.complete) {
      decodeImage();
    }
  });
}

export async function preloadImages(
  sources: readonly string[],
  options?: { concurrency?: number; decode?: boolean; signal?: AbortSignal }
) {
  const queue = getUniqueSources(sources);
  const signal = options?.signal;

  if (!queue.length || signal?.aborted) {
    return;
  }

  const workerCount = Math.max(1, Math.min(options?.concurrency ?? queue.length, queue.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (!signal?.aborted) {
        const nextSource = queue.shift();
        if (!nextSource) return;
        await preloadImage(nextSource, { decode: options?.decode });
      }
    })
  );
}
