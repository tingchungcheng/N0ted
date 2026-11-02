import { DailyPick, Tag } from '../lib/types';

export type BgKey = Tag;
export interface WidgetEntry {
  date: string; // YYYY-MM-DD local
  id: string;
  type: 'quote' | 'post';
  text: string;
  attribution: string; // "作者 / 作品" or "小红书 · @handle"
  bg: BgKey;
  url: string; // deep link opened on tap
}

export function attributionFor(p: DailyPick): string {
  const it = p.item;
  if (it.type === 'post') return `${it.attribution.platform} · ${it.attribution.handle}`;
  return it.source ? `${it.author} / ${it.source}` : it.author;
}

export function toWidgetEntries(picks: DailyPick[]): WidgetEntry[] {
  return picks.map((p) => ({
    date: p.date,
    id: p.item.id,
    type: p.item.type,
    text: p.item.type === 'post' ? p.item.title : p.item.text,
    attribution: attributionFor(p),
    bg: p.item.tags[0],
    url: p.item.type === 'post' ? p.item.xhsUrl : `noted://home?date=${p.date}`,
  }));
}
