import * as Crypto from 'expo-crypto';
import { getJSON, KEYS, remove, setJSON } from './storage';
import { Answers, Profile } from './types';
import { computeMatchTags, computeWeights } from './weights';

export async function getInstallId(): Promise<string> {
  const existing = await getJSON<string>(KEYS.installId);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await setJSON(KEYS.installId, id);
  return id;
}

export async function loadProfile(): Promise<Profile | null> {
  return getJSON<Profile>(KEYS.profile);
}

export async function saveProfile(answers: Answers, mbti?: string | null): Promise<Profile> {
  const weights = computeWeights(answers, mbti);
  const prev = await loadProfile();
  const profile: Profile = {
    answers,
    mbti: mbti ?? null,
    weights,
    matchTags: computeMatchTags(weights),
    installId: await getInstallId(),
    onboardedAt: prev?.onboardedAt ?? new Date().toISOString(),
  };
  await setJSON(KEYS.profile, profile);
  return profile;
}

export async function resetOnboarding(): Promise<void> {
  await remove(KEYS.profile, KEYS.history, KEYS.widgetPicks);
}
