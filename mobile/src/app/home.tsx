import Feather from '@expo/vector-icons/Feather';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  scrollTo,
  runOnUI,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateBox, PressableScale, TagChip, XhsBadge } from '../components/bits';
import { Grain } from '../components/Backdrop';
import { RevealText } from '../components/RevealText';
import { refreshDailyPicks } from '../lib/daily';
import { dayParts } from '../lib/dates';
import { loadProfile, saveProfile } from '../lib/profile';
import { DailyPick } from '../lib/types';
import { BG_IMAGES, C, F, isCJK, quoteFont } from '../theme';

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; open?: string; id?: string; demo?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [picks, setPicks] = useState<DailyPick[]>([]);
  const [active, setActive] = useState(0);
  const x = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const handled = useRef<string | null>(null);

  const load = useCallback(async () => {
    let profile = await loadProfile();
    if (!profile && __DEV__ && params.demo) profile = await saveProfile({ q1: 'quiet', q2: 'cafe', q3: 'slow', q4: ['gentle', 'romantic'] }, 'INFP');
    if (!profile) {
      router.replace('/onboarding');
      return;
    }
    setPicks(await refreshDailyPicks());
  }, [params.demo, router]);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && load());
    return () => sub.remove();
  }, [load]);

  // Deep links from the widget: noted://home?date=YYYY-MM-DD or ?open=xhs&id=...
  useEffect(() => {
    if (!picks.length) return;
    const key = `${params.date}|${params.open}|${params.id}`;
    if (handled.current === key) return;
    handled.current = key;
    if (params.open === 'xhs' && params.id) {
      const p = picks.find((k) => k.item.id === params.id);
      if (p?.item.type === 'post') Linking.openURL(p.item.xhsUrl).catch(() => {});
    }
    if (params.date) {
      const i = picks.findIndex((p) => p.date === params.date);
      if (i > 0) goTo(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, params.date, params.open, params.id]);

  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => (x.value = e.contentOffset.x) });

  const goTo = (i: number) => {
    const target = i * width;
    runOnUI(() => {
      'worklet';
      scrollTo(scrollRef, target, 0, true);
    })();
    setActive(i);
  };

  const current = picks[active];

  const copy = async () => {
    if (!current) return;
    const it = current.item;
    const s = it.type === 'post' ? `${it.title}\n${it.xhsUrl}` : `${it.text}\n— ${it.author}${it.source ? ', ' + it.source : ''}`;
    await Clipboard.setStringAsync(s);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setToast('Copied');
  };
  const share = async () => {
    if (!current) return;
    const it = current.item;
    const message = it.type === 'post' ? `${it.title}\n${it.xhsUrl}` : `“${it.text}”\n— ${it.author}${it.source ? ', ' + it.source : ''}\n\nvia Nōted`;
    Share.share({ message }).catch(() => {});
  };
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <View style={{ flex: 1, backgroundColor: '#3E4852' }}>
      <StatusBar style="light" />
      {/* Cross-fading, parallax photo backgrounds */}
      {picks.map((p, i) => (
        <BgLayer key={p.date} index={i} x={x} width={width} height={height} source={BG_IMAGES[p.item.tags[0]]} />
      ))}
      <LinearGradient colors={['rgba(24,28,34,0.42)', 'rgba(24,28,34,0.08)', 'rgba(24,28,34,0.18)', 'rgba(16,18,22,0.6)']} locations={[0, 0.35, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <Grain opacity={0.07} />

      {/* Top bar */}
      <Animated.View entering={FadeIn.duration(800)} style={[styles.topBar, { top: insets.top + 6 }]}>
        <Text style={{ fontFamily: F.displayItalic, fontSize: 26, color: '#fff' }}>
          Nōted<Text style={{ color: '#E7B676' }}>.</Text>
        </Text>
        <Pressable hitSlop={14} onPress={() => router.push('/settings')} style={styles.iconBtn}>
          <Feather name="sliders" size={18} color="#fff" />
        </Pressable>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {picks.map((p, i) => (
          <Page key={p.date} pick={p} index={i} x={x} width={width} active={i === active} topInset={insets.top} />
        ))}
      </Animated.ScrollView>

      {/* Bottom: week strip + actions */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
        {picks.length > 0 && (
          <Animated.View entering={FadeInUp.delay(900).duration(700).easing(EASE)} style={styles.glassWrap}>
            <BlurView intensity={40} tint="dark" style={styles.glass}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1 }}>
                {picks.map((p, i) => (
                  <DayDot key={p.date} pick={p} index={i} x={x} width={width} onPress={() => goTo(i)} />
                ))}
              </View>
            </BlurView>
          </Animated.View>
        )}
        <Animated.View entering={FadeInUp.delay(1100).duration(700).easing(EASE)} style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          {current?.item.type === 'post' ? (
            <PressableScale onPress={() => Linking.openURL((current.item as { xhsUrl: string }).xhsUrl)} style={[styles.action, { flex: 1, backgroundColor: C.xhs }]}>
              <Text style={styles.actionText}>Open in 小红书</Text>
              <Feather name="arrow-up-right" size={16} color="#fff" />
            </PressableScale>
          ) : (
            <PressableScale onPress={copy} style={[styles.action, { flex: 1 }]}>
              <Feather name="copy" size={16} color="#fff" />
              <Text style={styles.actionText}>Copy</Text>
            </PressableScale>
          )}
          <PressableScale onPress={share} style={[styles.action, { flex: 1 }]}>
            <Feather name="share" size={16} color="#fff" />
            <Text style={styles.actionText}>Share</Text>
          </PressableScale>
        </Animated.View>
      </View>

      {toast && (
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.toast, { top: insets.top + 60 }]}>
          <Text style={{ fontFamily: F.uiMedium, color: C.ink }}>{toast}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function BgLayer({ index, x, width, height, source }: { index: number; x: SharedValue<number>; width: number; height: number; source: number }) {
  const kb = useSharedValue(0);
  useEffect(() => {
    kb.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [kb]);
  const s = useAnimatedStyle(() => {
    const pos = x.value / width - index;
    return {
      opacity: interpolate(pos, [-1, 0, 1], [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: -pos * width * 0.25 }, { scale: 1.12 + 0.06 * kb.value }, { translateY: -10 * kb.value }],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, s]}>
      <Image source={source} style={{ width, height }} contentFit="cover" />
    </Animated.View>
  );
}

function quoteSize(text: string) {
  const n = text.length;
  if (isCJK(text)) return n <= 14 ? 38 : n <= 24 ? 33 : n <= 40 ? 28 : 24;
  return n <= 40 ? 40 : n <= 90 ? 33 : n <= 150 ? 28 : 24;
}

function Page({ pick, index, x, width, active, topInset }: { pick: DailyPick; index: number; x: SharedValue<number>; width: number; active: boolean; topInset: number }) {
  const it = pick.item;
  const { weekday } = dayParts(pick.date);
  const text = it.type === 'post' ? it.title : it.text;
  const size = quoteSize(text);
  const cjk = isCJK(text);
  const para = useAnimatedStyle(() => {
    const pos = x.value / width - index;
    return { opacity: interpolate(Math.abs(pos), [0, 0.7], [1, 0], Extrapolation.CLAMP), transform: [{ translateX: pos * width * 0.35 }] };
  });
  const boxPara = useAnimatedStyle(() => {
    const pos = x.value / width - index;
    return {
      opacity: interpolate(Math.abs(pos), [0, 0.5], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: pos * width * 0.2 }, { rotate: `${pos * 10}deg` }, { scale: interpolate(Math.abs(pos), [0, 0.5], [1, 0.85], Extrapolation.CLAMP) }],
    };
  });
  const quoteStyle = { fontFamily: quoteFont(text), fontSize: size, lineHeight: size * (cjk ? 1.62 : 1.22), color: '#fff', letterSpacing: cjk ? 1.5 : -0.2 };
  return (
    <View style={{ width, flex: 1, paddingTop: topInset + 76, paddingHorizontal: 28 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Animated.View style={para}>
          <Text style={styles.eyebrow}>{index === 0 ? 'TODAY' : index === 1 ? 'TOMORROW' : weekday.toUpperCase()}</Text>
          <View style={{ marginTop: 10 }}>
            <TagChip tag={it.tags[0]} light />
          </View>
        </Animated.View>
        <Animated.View style={boxPara} entering={FadeIn.delay(300).duration(900)}>
          <DateBox date={pick.date} size={78} />
        </Animated.View>
      </View>

      <Animated.View style={[{ flex: 1, justifyContent: 'center', paddingBottom: 170 }, para]}>
        {it.type === 'post' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <XhsBadge />
            <Text style={{ fontFamily: F.uiMedium, color: '#fff', fontSize: 14 }}>{it.attribution.handle}</Text>
          </View>
        )}
        {!cjk && <Text style={{ fontFamily: F.serif, fontSize: 96, lineHeight: 96, height: 60, color: 'rgba(255,255,255,0.45)', marginLeft: -4 }}>“</Text>}
        {active ? (
          <RevealText text={text} replayKey={pick.date} delay={250} style={quoteStyle} />
        ) : (
          <Text style={quoteStyle}>{text}</Text>
        )}
        {it.type === 'post' ? (
          <Pressable onPress={() => Linking.openURL(it.xhsUrl)}>
            <Animated.Text entering={FadeIn.delay(900)} numberOfLines={4} style={{ fontFamily: F.zh, color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 26, marginTop: 16 }}>
              {it.text}
            </Animated.Text>
            <Text style={{ fontFamily: F.uiMedium, color: '#fff', fontSize: 13, marginTop: 14, letterSpacing: 0.4 }}>小红书 · {it.attribution.handle}  ↗</Text>
          </Pressable>
        ) : (
          <Animated.View key={`${pick.date}-${active}`} entering={FadeInDown.delay(active ? 1100 : 0).duration(800).easing(EASE)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22, gap: 12 }}>
            <View style={{ width: 28, height: 1, backgroundColor: 'rgba(255,255,255,0.7)' }} />
            <Text style={{ fontFamily: isCJK(it.author) ? F.zh : F.serifItalic, fontSize: isCJK(it.author) ? 15 : 19, color: 'rgba(255,255,255,0.92)', flexShrink: 1 }} numberOfLines={2}>
              {it.author}
              {it.source ? `, ${it.source}` : ''}
            </Text>
          </Animated.View>
        )}
        {index === 0 && active && (
          <Animated.Text entering={FadeIn.delay(2600).duration(900)} style={{ fontFamily: F.ui, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 34, letterSpacing: 0.5 }}>
            Swipe for the week ahead  →
          </Animated.Text>
        )}
      </Animated.View>
    </View>
  );
}

function DayDot({ pick, index, x, width, onPress }: { pick: DailyPick; index: number; x: SharedValue<number>; width: number; onPress: () => void }) {
  const { day, weekday } = dayParts(pick.date);
  const s = useAnimatedStyle(() => {
    const d = Math.abs(x.value / width - index);
    const a = interpolate(d, [0, 1], [1, 0], Extrapolation.CLAMP);
    return { borderColor: `rgba(255,255,255,${0.9 * a})`, backgroundColor: `rgba(255,255,255,${0.12 * a})` };
  });
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={[{ width: 40, height: 52, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }, s]}>
        <Text style={{ fontFamily: F.ui, fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 }}>{weekday.slice(0, 2).toUpperCase()}</Text>
        <Text style={{ fontFamily: F.uiBold, fontSize: 17, color: '#fff' }}>{day}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', left: 24, right: 24, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.35)' },
  eyebrow: { fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)', fontSize: 11, letterSpacing: 3 },
  bottom: { position: 'absolute', left: 20, right: 20, bottom: 0 },
  glassWrap: { borderRadius: 22, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)' },
  glass: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row' },
  action: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.35)' },
  actionText: { fontFamily: 'Inter_500Medium', color: '#fff', fontSize: 15 },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: C.paper, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
});
