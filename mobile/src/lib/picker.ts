import { addDays } from './dates';
import { hashString, seededRandom } from './random';
import { DailyPick, HistoryEntry, Item, PostItem, Profile, QuoteItem } from './types';

export const RECENT_WINDOW = 60;

export interface PickContext {
  recentIds: string[]; // most recent last
  lastSeenPostAt: string | null;
}

/** Derive the recent list and last-seen-post watermark from history strictly before `date`. */
export function contextFor(date: string, history: HistoryEntry[], catalog: Item[]): PickContext {
  const prior = history.filter((h) => h.date < date).sort((a, b) => (a.date < b.date ? -1 : 1));
  const byId = new Map(catalog.map((i) => [i.id, i]));
  let lastSeenPostAt: string | null = null;
  for (const h of prior) {
    const it = byId.get(h.id);
    if (it?.type === 'post' && (!lastSeenPostAt || it.publishedAt > lastSeenPostAt)) lastSeenPostAt = it.publishedAt;
  }
  return { recentIds: prior.slice(-RECENT_WINDOW).map((h) => h.id), lastSeenPostAt };
}

export function weightedPick<T>(pool: T[], weight: (t: T) => number, rng: () => number): T | undefined {
  if (pool.length === 0) return undefined;
  const ws = pool.map((p) => Math.max(0, weight(p)));
  const total = ws.reduce((a, b) => a + b, 0);
  if (total <= 0) return pool[Math.floor(rng() * pool.length)];
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= ws[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Deterministic pick for one local date. */
export function pickForDate(
  date: string,
  profile: Pick<Profile, 'weights' | 'matchTags' | 'installId'>,
  catalog: Item[],
  ctx: PickContext,
): Item | undefined {
  // 1. A matching, unseen 小红书 post outranks quotes (oldest unseen first).
  const post = catalog
    .filter(
      (i): i is PostItem =>
        i.type === 'post' &&
        i.tags.some((t) => profile.matchTags.includes(t)) &&
        (!ctx.lastSeenPostAt || i.publishedAt > ctx.lastSeenPostAt) &&
        !ctx.recentIds.includes(i.id),
    )
    .sort((a, b) => (a.publishedAt < b.publishedAt ? -1 : a.publishedAt > b.publishedAt ? 1 : a.id < b.id ? -1 : 1))[0];
  if (post) return post;

  // 2. Weighted quote, excluding the recent window. If the pool empties, forget the oldest half.
  const quotes = catalog
    .filter((i): i is QuoteItem => i.type === 'quote')
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  let recent = ctx.recentIds;
  let pool = quotes.filter((q) => !recent.includes(q.id));
  while (pool.length === 0 && recent.length > 0) {
    recent = recent.slice(Math.ceil(recent.length / 2));
    pool = quotes.filter((q) => !recent.includes(q.id));
  }
  const rng = seededRandom(hashString(date + '|' + profile.installId));
  return weightedPick(pool, (q) => Math.max(...q.tags.map((t) => profile.weights[t] ?? 0)), rng);
}

/**
 * Compute picks for `days` days starting at `today`. Dates already in history are kept
 * (stable across app opens); missing dates are picked and appended to history.
 */
export function precompute(
  today: string,
  days: number,
  profile: Pick<Profile, 'weights' | 'matchTags' | 'installId'>,
  catalog: Item[],
  history: HistoryEntry[],
): { picks: DailyPick[]; history: HistoryEntry[] } {
  const byId = new Map(catalog.map((i) => [i.id, i]));
  let hist = [...history];
  const picks: DailyPick[] = [];
  for (let k = 0; k < days; k++) {
    const date = addDays(today, k);
    const existing = hist.find((h) => h.date === date);
    const existingItem = existing && byId.get(existing.id);
    if (existingItem) {
      picks.push({ date, item: existingItem });
      continue;
    }
    hist = hist.filter((h) => h.date !== date);
    const item = pickForDate(date, profile, catalog, contextFor(date, hist, catalog));
    if (!item) continue;
    hist.push({ date, id: item.id });
    picks.push({ date, item });
  }
  hist.sort((a, b) => (a.date < b.date ? -1 : 1));
  // Keep history bounded.
  // Keep history bounded, but never drop post entries: they carry the last-seen-post watermark.
  const keepFrom = hist.length - (RECENT_WINDOW + days + 30);
  if (keepFrom > 0) hist = hist.filter((h, i) => i >= keepFrom || byId.get(h.id)?.type === 'post');
  return { picks, history: hist };
}

/** Drop picks for `fromDate` onwards (used when interests change). */
export function dropFrom(history: HistoryEntry[], fromDate: string): HistoryEntry[] {
  return history.filter((h) => h.date < fromDate);
}
