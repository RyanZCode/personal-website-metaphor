import type { MemorandumData } from './memorandum';

const BLOCKING_PAGE_IMAGE_SOURCES = [
  '/assets/coby-main.png',
  '/assets/ryan-zhou-profile-pic.jpg',
  '/assets/coby-left.jpg',
  '/assets/coby-wistful.jpg',
  '/assets/coby-stare.jpg',
  '/assets/coby-sleep.jpg',
] as const;

const DEFERRED_PAGE_IMAGE_SOURCES = [
  '/assets/experience-logos/shopify-logo.jpg',
  '/assets/experience-logos/uhn-logo.png',
  '/assets/experience-logos/dishon-logo.jpg',
  '/assets/experience-logos/uwaterloo-logo.png',
  '/assets/contact-icons/github-logo.png',
  '/assets/contact-icons/linkedin-logo.png',
  '/assets/contact-icons/email-symbol.jpg',
  '/assets/contact-icons/leetcode-logo.png',
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

  return {
    blockingImageSrcs: getUniqueSources([
      ...BLOCKING_PAGE_IMAGE_SOURCES,
      ...memorandumImageSources.slice(0, MAX_BLOCKING_MEMORANDUM_IMAGES),
    ]),
    deferredImageSrcs: getUniqueSources([
      ...DEFERRED_PAGE_IMAGE_SOURCES,
      ...memorandumImageSources.slice(MAX_BLOCKING_MEMORANDUM_IMAGES),
    ]),
  };
}

function preloadImage(src: string) {
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
  options?: { concurrency?: number; signal?: AbortSignal }
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
        await preloadImage(nextSource);
      }
    })
  );
}
