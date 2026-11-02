import AsyncStorage from '@react-native-async-storage/async-storage';

/** Tiny typed JSON wrapper so the backend (AsyncStorage today, MMKV later) is swappable. */
export const KEYS = {
  profile: 'noted.profile.v1',
  installId: 'noted.installId',
  history: 'noted.history.v1',
  catalog: 'noted.catalog.v1',
  widgetPicks: 'noted.widgetPicks.v1', // read by the Android widget task handler
} as const;

export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export async function setJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
export async function remove(...keys: string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys);
}
