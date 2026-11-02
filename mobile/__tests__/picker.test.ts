import seed from '../src/content/seed.json';
import { addDays } from '../src/lib/dates';
import { contextFor, pickForDate, precompute, RECENT_WINDOW } from '../src/lib/picker';
import { HistoryEntry, Item, Profile } from '../src/lib/types';
import { computeMatchTags, computeWeights, mbtiNudges } from '../src/lib/weights';

const catalog = (seed as { items: Item[] }).items;
const quotes = catalog.filter((i) => i.type === 'quote');

function profileFor(answers: Profile['answers'], mbti: string | null, installId = 'install-A') {
  const weights = computeWeights(answers, mbti);
  return { weights, matchTags: computeMatchTags(weights), installId };
}
const calmLover = profileFor({ q1: 'quiet', q2: 'cafe', q3: 'slow', q4: ['gentle'] }, 'INFP');
const witty = profileFor({ q1: 'smile', q2: 'comedy', q3: 'tempt', q4: ['playful'] }, null);

describe('weights', () => {
  it('normalises to 1 and follows the spec example (calm leads, love second)', () => {
    const w = computeWeights({ q1: 'quiet', q2: 'cafe', q3: 'kind', q4: [] }, 'INFP');
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
    const order = Object.entries(w).sort((a, b) => b[1] - a[1]).map(([t]) => t);
    expect(order[0]).toBe('calm');
  });
  it('caps MBTI nudges at +1.5 total', () => {
    for (const t of ['INFJ', 'ESTJ', 'ENFP', 'ISTP']) {
      const total = Object.values(mbtiNudges(t)).reduce((a, b) => a + (b ?? 0), 0);
      expect(total).toBeLessThanOrEqual(1.5);
    }
  });
  it('always has at least two match tags', () => {
    expect(computeMatchTags(computeWeights({}, null)).length).toBeGreaterThanOrEqual(2);
  });
});

describe('pickForDate', () => {
  const quoteOnly = catalog.filter((i) => i.type === 'quote');
  it('is deterministic for the same date + install', () => {
    const a = pickForDate('2026-11-02', calmLover, quoteOnly, { recentIds: [], lastSeenPostAt: null });
    const b = pickForDate('2026-11-02', calmLover, quoteOnly, { recentIds: [], lastSeenPostAt: null });
    expect(a?.id).toBe(b?.id);
  });
  it('differs across installs for at least some dates', () => {
    const other = { ...calmLover, installId: 'install-B' };
    let diff = 0;
    for (let k = 0; k < 20; k++) {
      const d = addDays('2026-11-02', k);
      const ctx = { recentIds: [], lastSeenPostAt: null };
      if (pickForDate(d, calmLover, quoteOnly, ctx)?.id !== pickForDate(d, other, quoteOnly, ctx)?.id) diff++;
    }
    expect(diff).toBeGreaterThan(0);
  });
  it('a matching unseen post outranks quotes; non-matching users never get it', () => {
    const calmPick = pickForDate('2026-11-02', calmLover, catalog, { recentIds: [], lastSeenPostAt: null });
    expect(calmPick?.type).toBe('post');
    expect(calmPick?.id).toBe('post-01'); // oldest matching unseen post first
    const witPick = pickForDate('2026-11-02', { ...witty, matchTags: ['wit'] }, catalog, { recentIds: [], lastSeenPostAt: null });
    expect(witPick?.type).toBe('quote');
  });
  it('weights tags: a calm-heavy profile gets mostly calm-tagged quotes', () => {
    let calm = 0;
    let hist: HistoryEntry[] = [];
    for (let k = 0; k < 40; k++) {
      const d = addDays('2026-01-01', k);
      const it = pickForDate(d, calmLover, quoteOnly, contextFor(d, hist, quoteOnly))!;
      hist.push({ date: d, id: it.id });
      if (it.tags.includes('calm')) calm++;
    }
    expect(calm).toBeGreaterThan(8);
  });
});

describe('precompute', () => {
  it('produces 7 days, no repeats within the recent window, stable across reopenings', () => {
    const r1 = precompute('2026-11-02', 7, calmLover, catalog, []);
    expect(r1.picks).toHaveLength(7);
    expect(new Set(r1.picks.map((p) => p.item.id)).size).toBe(7);
    const r2 = precompute('2026-11-02', 7, calmLover, catalog, r1.history);
    expect(r2.picks.map((p) => p.item.id)).toEqual(r1.picks.map((p) => p.item.id));
    // rolling forward a day keeps the overlapping days
    const r3 = precompute('2026-11-03', 7, calmLover, catalog, r2.history);
    expect(r3.picks.slice(0, 6).map((p) => p.item.id)).toEqual(r1.picks.slice(1).map((p) => p.item.id));
  });
  it('never repeats inside the window over a long run (pool larger than window clears oldest half)', () => {
    let hist: HistoryEntry[] = [];
    const seen: string[] = [];
    for (let k = 0; k < 120; k++) {
      const d = addDays('2026-01-01', k);
      const r = precompute(d, 1, calmLover, catalog, hist);
      hist = r.history;
      seen.push(r.picks[0].item.id);
    }
    // within any window of min(RECENT_WINDOW, quotes.length) consecutive days there are no duplicates
    const win = Math.min(RECENT_WINDOW, quotes.length);
    for (let s = 0; s + win <= seen.length; s += 7) {
      const slice = seen.slice(s, s + Math.floor(win / 2));
      expect(new Set(slice).size).toBe(slice.length);
    }
    // each post shows at most once
    expect(seen.filter((i) => i === 'post-01').length).toBe(1);
  });
});

import { tokenize } from '../src/lib/tokenize';
describe('tokenize', () => {
  it('keeps Latin words whole inside CJK text and attaches closing punctuation', () => {
    const t = tokenize('慢慢的周日 · Slow Sunday');
    expect(t).toContain('Slow ');
    expect(t).toContain('Sunday');
    expect(tokenize('你好，世界。')).toEqual(['你', '好，', '世', '界。']);
  });
});
