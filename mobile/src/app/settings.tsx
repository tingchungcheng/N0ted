import Feather from '@expo/vector-icons/Feather';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '../components/Backdrop';
import { PressableScale, TagChip } from '../components/bits';
import { loadProfile, resetOnboarding } from '../lib/profile';
import { Profile, TAGS } from '../lib/types';
import { QUESTIONS } from '../lib/weights';
import { C, F, TAG_META } from '../theme';

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  useFocusEffect(
    useCallback(() => {
      loadProfile().then(setProfile);
    }, []),
  );

  const answerSummary = profile
    ? QUESTIONS.slice(0, 3)
        .map((q) => q.options.find((o) => o.id === profile.answers[q.key])?.label)
        .filter(Boolean)
        .join(' · ')
    : '';

  const reset = () =>
    Alert.alert('Start over?', 'This clears your answers and note history on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await resetOnboarding();
          router.dismissAll();
          router.replace('/onboarding');
        },
      },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={14} style={styles.back}>
            <Feather name="chevron-left" size={22} color={C.ink} />
          </Pressable>
        </View>
        <Animated.Text entering={FadeInDown.duration(600)} style={{ fontFamily: F.display, fontSize: 44, color: C.ink, marginTop: 14 }}>
          Settings
        </Animated.Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 19, color: C.inkSoft, marginBottom: 24 }}>Tune what arrives each morning.</Text>

        <Section title="YOUR MIX" delay={80}>
          {profile &&
            [...TAGS]
              .sort((a, b) => profile.weights[b] - profile.weights[a])
              .map((t) => (
                <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 5 }}>
                  <View style={{ width: 160, alignItems: "flex-start" }}>
                    <TagChip tag={t} />
                  </View>
                  <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.hair }}>
                    <View style={{ width: `${(profile.weights[t] / Math.max(...TAGS.map((k) => profile.weights[k]))) * 100}%`, height: 6, borderRadius: 3, backgroundColor: TAG_META[t].color }} />
                  </View>
                </View>
              ))}
          <Text style={styles.note}>Posts from 小红书 appear only when they match: {profile?.matchTags.map((t) => TAG_META[t].label).join(', ')}</Text>
        </Section>

        <Section title="PERSONALISE" delay={160}>
          <Row icon="edit-3" label="Edit interests" value={answerSummary} onPress={() => router.push({ pathname: '/onboarding', params: { mode: 'edit' } })} />
          <Row icon="hash" label="MBTI" value={profile?.mbti ?? 'Not set'} onPress={() => router.push({ pathname: '/onboarding', params: { mode: 'mbti' } })} />
        </Section>

        <Section title="DATA" delay={240}>
          <Row icon="rotate-ccw" label="Reset onboarding" value="Clears answers & history" onPress={reset} destructive />
        </Section>

        <Section title="ABOUT" delay={320}>
          <Text style={{ fontFamily: F.displayItalic, fontSize: 28, color: C.ink }}>
            Nōted<Text style={{ color: '#C38A45' }}>.</Text>
          </Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 18, color: C.inkSoft }}>A little note, delivered every day.</Text>
          <Text style={styles.note}>
            Your answers, MBTI and history never leave this phone. Quotes are public-domain where possible and always shown with author and source. Version {Constants.expoConfig?.version ?? '1.0.0'}.
          </Text>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(600)} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Animated.View>
  );
}

function Row({ icon, label, value, onPress, destructive }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string; onPress: () => void; destructive?: boolean }) {
  return (
    <PressableScale onPress={onPress} style={styles.row}>
      <Feather name={icon} size={18} color={destructive ? '#B5493F' : C.ink} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.uiMedium, fontSize: 16, color: destructive ? '#B5493F' : C.ink }}>{label}</Text>
        {!!value && (
          <Text numberOfLines={1} style={{ fontFamily: F.ui, fontSize: 13, color: C.muted, marginTop: 2 }}>
            {value}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={18} color={C.muted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },
  section: { backgroundColor: 'rgba(255,255,255,0.62)', borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.hair },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 2.5, color: C.muted, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 19, color: C.muted, marginTop: 10 },
});
