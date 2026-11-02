import { contentSource } from '../content/contentSource';
import { writeWidgetPicks } from '../widget/bridge';
import { toLocalDateString } from './dates';
import { dropFrom, precompute } from './picker';
import { loadProfile } from './profile';
import { getJSON, KEYS, setJSON } from './storage';
import { DailyPick, HistoryEntry, Item } from './types';

export const PRECOMPUTE_DAYS = 7;

async function loadCatalog(): Promise<Item[]> {
  try {
    const { items } = await contentSource.fetchItems(null);
    await setJSON(KEYS.catalog, items);
    return items;
  } catch {
    return (await getJSON<Item[]>(KEYS.catalog)) ?? [];
  }
}

/** Recompute today + next 6 days, persist history, push to widgets. */
export async function refreshDailyPicks(opts: { resetFuture?: boolean } = {}): Promise<DailyPick[]> {
  const profile = await loadProfile();
  if (!profile) return [];
  const catalog = await loadCatalog();
  const today = toLocalDateString(new Date());
  let history = (await getJSON<HistoryEntry[]>(KEYS.history)) ?? [];
  if (opts.resetFuture) history = dropFrom(history, today);
  const res = precompute(today, PRECOMPUTE_DAYS, profile, catalog, history);
  await setJSON(KEYS.history, res.history);
  await writeWidgetPicks(res.picks).catch((e) => console.warn('widget bridge', e));
  return res.picks;
}
