import { getCollection } from 'astro:content';
import {
  MEMORANDUM_CATEGORIES,
  normalizeMemorandumData,
  type MemorandumCategoryId,
  type MemorandumData,
  type MemorandumEntry,
} from './memorandum';

function formatMemorandumDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCategoryIdFromEntryId(entryId: string): MemorandumCategoryId {
  const normalizedId = entryId.replace(/\\/g, '/');
  const categoryId = normalizedId.split('/')[0] as MemorandumCategoryId | undefined;

  if (!categoryId || !MEMORANDUM_CATEGORIES.some((category) => category.id === categoryId)) {
    throw new Error(`Memorandum entry "${entryId}" must live inside a valid category folder.`);
  }

  return categoryId;
}

function getSlugFromEntryId(entryId: string): string {
  const normalizedId = entryId.replace(/\\/g, '/');
  const fileName = normalizedId.split('/').pop();

  if (!fileName) {
    throw new Error(`Memorandum entry "${entryId}" is missing a filename.`);
  }

  return fileName.replace(/\.[^.]+$/, '');
}

export async function loadMemorandumData(): Promise<MemorandumData> {
  const entries = await getCollection('memorandum');

  const normalizedEntries: MemorandumEntry[] = entries.map((entry) => ({
    id: entry.id,
    slug: getSlugFromEntryId(entry.id),
    title: entry.data.title,
    categoryId: getCategoryIdFromEntryId(entry.id),
    pinned: entry.data.pinned,
    subtitle: entry.data.subtitle,
    date: formatMemorandumDate(entry.data.date),
    pages: entry.data.pages.map((page) => ({
        ...page,
        imagePosition: page.imagePosition ?? 'center',
        imageZoom: page.imageZoom ?? 1,
        imageTilt: page.imageTilt ?? 0,
      })),
  }));

  return normalizeMemorandumData(normalizedEntries);
}
