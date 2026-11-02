import seed from './seed.json';
import { Item } from '../lib/types';

/** Anything that can supply the published catalog. Swap SeedContentSource for a Supabase one later. */
export interface ContentSource {
  /** Full catalog, or a delta when `since` is given. */
  fetchItems(since?: string | null): Promise<{ items: Item[]; removedIds: string[]; serverTime: string }>;
}

export class SeedContentSource implements ContentSource {
  async fetchItems() {
    return { items: (seed as { items: Item[] }).items, removedIds: [], serverTime: new Date().toISOString() };
  }
}

// e.g. export class SupabaseContentSource implements ContentSource { ... select * from items where status='published' and updated_at > since }

export const contentSource: ContentSource = new SeedContentSource();
