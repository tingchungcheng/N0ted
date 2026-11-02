import { Platform } from 'react-native';
import { setJSON, KEYS } from '../lib/storage';
import { DailyPick } from '../lib/types';
import { toWidgetEntries } from './payload';

export const APP_GROUP = 'group.com.tingcc.noted';
export const IOS_WIDGET_KIND = 'NotedDailyWidget';
export const ANDROID_WIDGET_NAME = 'NotedDaily';

/** Write the precomputed 7 days where each platform's widget can read them, then ask for a reload. */
export async function writeWidgetPicks(picks: DailyPick[]): Promise<void> {
  const entries = toWidgetEntries(picks);
  if (Platform.OS === 'ios') {
    // Native module shipped by @bacons/apple-targets (UserDefaults(suiteName:)).
    const { ExtensionStorage } = require('@bacons/apple-targets') as typeof import('@bacons/apple-targets');
    const storage = new ExtensionStorage(APP_GROUP);
    storage.set('picks', JSON.stringify(entries));
    ExtensionStorage.reloadWidget(IOS_WIDGET_KIND);
  } else if (Platform.OS === 'android') {
    await setJSON(KEYS.widgetPicks, entries);
    const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { renderNotedWidget } = require('./android/render') as typeof import('./android/render');
    await requestWidgetUpdate({
      widgetName: ANDROID_WIDGET_NAME,
      renderWidget: (info) => renderNotedWidget(entries, info.width, info.height),
    });
  }
}
