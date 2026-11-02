import React from 'react';
import { toLocalDateString } from '../../lib/dates';
import type { WidgetEntry } from '../payload';
import { NotedWidget } from './NotedWidget';

/** Today's entry; falls back to the last entry when the 7 precomputed days run out. */
export function entryForToday(entries: WidgetEntry[] | null): WidgetEntry | null {
  if (!entries?.length) return null;
  const today = toLocalDateString(new Date());
  return entries.find((e) => e.date === today) ?? [...entries].filter((e) => e.date <= today).pop() ?? entries[0];
}

export function renderNotedWidget(entries: WidgetEntry[] | null, width: number, height: number) {
  return <NotedWidget entry={entryForToday(entries)} width={width} height={height} />;
}
