import type { MemorandumData } from './memorandum';

const BLOCKING_PAGE_IMAGE_SOURCES = [
  '/assets/coby-main.webp',
  '/assets/ryan-zhou-profile-pic.webp',
  '/assets/coby-left.webp',
  '/assets/coby-wistful.webp',
  '/assets/coby-stare.webp',
  '/assets/coby-sleep.webp',
  '/assets/experience-logos/shopify-logo.webp',
  '/assets/experience-logos/uhn-logo.webp',
  '/assets/experience-logos/dishon-logo.webp',
  '/assets/experience-logos/uwaterloo-logo.webp',
  '/assets/contact-icons/github-logo.webp',
  '/assets/contact-icons/linkedin-logo.webp',
  '/assets/contact-icons/email-symbol.webp',
  '/assets/contact-icons/leetcode-logo.webp',
] as const;

const DEFERRED_PAGE_IMAGE_SOURCES = [
] as const;

const MAX_BLOCKING_MEMORANDUM_IMAGES = 6;

export interface AssetPreloadManifest {
  blockingImageSrcs: string[];
  deferredImageSrcs: string[];
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

export function createAssetPreloadManifest(memorandumData: MemorandumData): AssetPreloadManifest {
  const memorandumImageSources = getMemorandumImageSources(memorandumData);
  const blockingImageSrcs = getUniqueSources([
    ...BLOCKING_PAGE_IMAGE_SOURCES,
    ...memorandumImageSources.slice(0, MAX_BLOCKING_MEMORANDUM_IMAGES),
  ]);
  const blockingImageSet = new Set(blockingImageSrcs);
  const deferredImageSrcs = getUniqueSources([
    ...DEFERRED_PAGE_IMAGE_SOURCES,
    ...memorandumImageSources.slice(MAX_BLOCKING_MEMORANDUM_IMAGES),
  ]).filter((src) => !blockingImageSet.has(src));

  return {
    blockingImageSrcs,
    deferredImageSrcs,
  };
}

function preloadImage(src: string, options?: { decode?: boolean }) {
  if (typeof Image === 'undefined') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

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
