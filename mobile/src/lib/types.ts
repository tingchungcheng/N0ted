export const TAGS = ['historical', 'inspiring', 'calm', 'love', 'wit'] as const;
export type Tag = (typeof TAGS)[number];
export type TagWeights = Record<Tag, number>;

export interface BaseItem {
  id: string;
  tags: Tag[];
  text: string;
  publishedAt: string; // ISO
  imageUrl?: string | null;
}
export interface QuoteItem extends BaseItem {
  type: 'quote';
  author: string;
  source?: string | null;
  sourceUrl?: string | null;
}
export interface PostItem extends BaseItem {
  type: 'post';
  title: string;
  xhsUrl: string;
  attribution: { platform: '小红书'; handle: string };
}
export type Item = QuoteItem | PostItem;

export interface Answers {
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string[];
}

export interface Profile {
  answers: Answers;
  mbti?: string | null;
  weights: TagWeights;
  matchTags: Tag[];
  installId: string;
  onboardedAt: string;
}

/** One persisted pick per local date. History is the source of truth for "recent" + "last seen post". */
export interface HistoryEntry {
  date: string; // YYYY-MM-DD
  id: string;
}

export interface DailyPick {
  date: string;
  item: Item;
}
