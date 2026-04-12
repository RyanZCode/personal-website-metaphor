export const MEMORANDUM_CATEGORIES = [
  { id: 'tech', label: 'Tech' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'misc', label: 'Misc.' },
] as const;

export type MemorandumCategoryId = (typeof MEMORANDUM_CATEGORIES)[number]['id'];

export interface MemorandumEntryPage {
  body: string[];
  imageSrc: string;
  imageAlt: string;
  imagePosition?: string;
  imageZoom?: number;
  imageTilt?: number;
}

export interface MemorandumEntry {
  id: string;
  slug: string;
  title: string;
  categoryId: MemorandumCategoryId;
  pinned: boolean;
  subtitle: string;
  date: string;
  pages: MemorandumEntryPage[];
}

export interface MemorandumColumn {
  id: MemorandumCategoryId;
  label: string;
  entries: MemorandumEntry[];
}

export interface MemorandumData {
  columns: MemorandumColumn[];
  totalEntries: number;
  defaultColumnId: MemorandumCategoryId;
}

export function normalizeMemorandumData(entries: MemorandumEntry[]): MemorandumData {
  const columns = MEMORANDUM_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    entries: entries
      .filter((entry) => entry.categoryId === category.id)
      .sort((left, right) => {
        if (left.pinned !== right.pinned) {
          return left.pinned ? -1 : 1;
        }

        const dateOrder = right.date.localeCompare(left.date);
        if (dateOrder !== 0) {
          return dateOrder;
        }

        return left.title.localeCompare(right.title);
      }),
  }));

  return {
    columns,
    totalEntries: entries.length,
    defaultColumnId: columns[0].id,
  };
}
