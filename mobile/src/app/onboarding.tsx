import LottieView from 'lottie-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '../components/Backdrop';
import { PillButton, PressableScale, Progress, TagChip } from '../components/bits';
import { RevealText } from '../components/RevealText';
import { Tagline, Wordmark } from '../components/Wordmark';
import { refreshDailyPicks } from '../lib/daily';
import { loadProfile, saveProfile } from '../lib/profile';
import { Answers, DailyPick, Tag, TAGS, TagWeights } from '../lib/types';
import { computeWeights, isValidMbti, MBTI_AXES, QUESTIONS } from '../lib/weights';
import { C, F, quoteFont, TAG_META } from '../theme';

type Step = 'intro' | 0 | 1 | 2 | 3 | 'mbti' | 'reveal';
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export default function Onboarding() {
  const params = useLocalSearchParams<{ mode?: 'edit' | 'mbti'; step?: string }>();
  const router = useRouter();
  const mode = params.mode;
  const initial: Step = mode === 'mbti' ? 'mbti' : mode === 'edit' ? 0 : parseStep(params.step);
  const [step, setStep] = useState<Step>(initial);
  const [answers, setAnswers] = useState<Answers>({});
  const [mbti, setMbti] = useState<(string | null)[]>([null, null, null, null]);
  const [picks, setPicks] = useState<DailyPick[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (mode) {
      loadProfile().then((p) => {
        if (!p) return;
        setAnswers(p.answers);
        if (isValidMbti(p.mbti)) setMbti(p.mbti.split(''));
      });
    }
  }, [mode]);

  const finish = async (withMbti: boolean) => {
    const type = withMbti && mbti.every(Boolean) ? mbti.join('') : null;
    await saveProfile(answers, type);
    const p = await refreshDailyPicks({ resetFuture: true });
    if (mode) {
      router.back();
      return;
    }
    setPicks(p);
    setStep('reveal');
  };

  const tint = useMemo<[string, string, string]>(() => {
    if (typeof step === 'number') {
      const t = ([['inspiring', 'calm', 'love'], ['historical', 'calm', 'wit'], ['love', 'calm', 'historical'], ['wit', 'inspiring', 'love']] as Tag[][])[step];
      return [TAG_META[t[0]].tint[1], TAG_META[t[1]].tint[0], TAG_META[t[2]].tint[1]];
    }
    return ['#E9D3BE', '#C9D3DC', '#E6C9CF'];
  }, [step]);

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <Backdrop colors={tint} />
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
        {step === 'intro' && <Intro onBegin={() => setStep(0)} />}
        {typeof step === 'number' && (
          <QuestionStep
            key={step}
            index={step}
            answers={answers}
            onBack={() => (step === 0 ? (mode ? router.back() : setStep('intro')) : setStep((step - 1) as Step))}
            onAnswer={(a) => {
              setAnswers(a);
              if (step < 3) setStep((step + 1) as Step);
              else setStep('mbti');
            }}
          />
        )}
        {step === 'mbti' && (
          <MbtiStep
            value={mbti}
            onChange={setMbti}
            onBack={() => (mode === 'mbti' ? router.back() : setStep(3))}
            onSkip={() => finish(false)}
            onDone={() => finish(true)}
          />
        )}
        {step === 'reveal' && <Reveal answers={answers} mbti={mbti.every(Boolean) ? mbti.join('') : null} picks={picks} onOpen={() => router.replace('/home')} />}
      </View>
    </View>
  );
}

function parseStep(s?: string): Step {
  if (s === 'mbti' || s === 'reveal') return s;
  if (s && /^[0-3]$/.test(s)) return Number(s) as Step;
  return 'intro';
}

/* ───────────────────────── Intro ───────────────────────── */

function FloatingNote({ x, y, r, w, delay, children }: { x: number; y: number; r: number; w: number; delay: number; children?: React.ReactNode }) {
  const t = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(delay, withTiming(1, { duration: 1400 }));
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 6000 + delay, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [delay, o, t]);
  const s = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateX: x }, { translateY: y - 14 * t.value }, { rotate: `${r + 3 * t.value}deg` }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: w,
          height: w * 0.62,
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.55)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(29,27,25,0.08)',
          shadowColor: '#5b4a3a',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          padding: 12,
          justifyContent: 'space-between',
        },
        s,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function NoteLines({ zh, by }: { zh: string; by: string }) {
  return (
    <>
      <Text style={{ fontFamily: F.zh, fontSize: 13, color: C.inkSoft, lineHeight: 20 }} numberOfLines={2}>
        {zh}
      </Text>
      <Text style={{ fontFamily: F.ui, fontSize: 9, color: C.muted, letterSpacing: 0.6 }}>{by}</Text>
    </>
  );
}

function Intro({ onBegin }: { onBegin: () => void }) {
  const { width, height } = useWindowDimensions();
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withDelay(2600, withRepeat(withSequence(withTiming(1, { duration: 1600 }), withTiming(0, { duration: 1600 })), -1));
  }, [breathe]);
  const glow = useAnimatedStyle(() => ({ opacity: 0.25 + 0.35 * breathe.value, transform: [{ scale: 1 + 0.06 * breathe.value }] }));

  return (
    <View style={{ flex: 1 }}>
      <FloatingNote x={-18} y={height * 0.06} r={-8} w={width * 0.46} delay={1600}>
        <NoteLines zh="行到水穷处，坐看云起时。" by="王维 / 终南别业" />
      </FloatingNote>
      <FloatingNote x={width * 0.56} y={height * 0.12} r={7} w={width * 0.42} delay={1900}>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.inkSoft, lineHeight: 19 }} numberOfLines={2}>
          Brevity is the soul of wit.
        </Text>
        <Text style={{ fontFamily: F.ui, fontSize: 9, color: C.muted, letterSpacing: 0.6 }}>SHAKESPEARE / HAMLET</Text>
      </FloatingNote>
      <FloatingNote x={width * 0.5} y={height * 0.64} r={-5} w={width * 0.44} delay={2200}>
        <NoteLines zh="海内存知己，天涯若比邻。" by="王勃" />
      </FloatingNote>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        <Animated.Text entering={FadeIn.delay(100).duration(900)} style={styles.eyebrow}>
          EST. TODAY · 每日一笺
        </Animated.Text>
        <Wordmark size={Math.min(92, width * 0.22)} delay={200} />
        <View style={{ height: 8 }} />
        <Tagline text="A little note, delivered every day." delay={1250} />
        <Animated.Text entering={FadeIn.delay(1900).duration(900)} style={{ fontFamily: F.zh, color: C.muted, fontSize: 14, marginTop: 10, letterSpacing: 4 }}>
          每天，一张小纸条
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInUp.delay(2300).duration(800).easing(EASE)} style={{ alignItems: 'center', paddingHorizontal: 28 }}>
        <View style={{ width: '100%' }}>
          <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 30, backgroundColor: '#C38A45' }, glow]} />
          <PillButton label="Begin" onPress={onBegin} />
        </View>
        <Text style={{ fontFamily: F.ui, fontSize: 12, color: C.muted, marginTop: 14 }}>No account. Four taps. Everything stays on your phone.</Text>
      </Animated.View>
    </View>
  );
}

/* ───────────────────────── Questions ───────────────────────── */

function QuestionStep({ index, answers, onAnswer, onBack }: { index: number; answers: Answers; onAnswer: (a: Answers) => void; onBack: () => void }) {
  const q = QUESTIONS[index];
  const { width } = useWindowDimensions();
  const prev = answers[q.key];
  const [sel, setSel] = useState<string[]>(Array.isArray(prev) ? prev : prev ? [prev] : []);
  const advancing = useRef(false);

  const tap = (id: string) => {
    if (q.multi) {
      setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= q.multi! ? [...s.slice(1), id] : [...s, id]));
      return;
    }
    if (advancing.current) return;
    advancing.current = true;
    setSel([id]);
    setTimeout(() => onAnswer({ ...answers, [q.key]: id }), 420);
  };

  return (
    <Animated.View entering={FadeInRight.duration(520).easing(EASE)} exiting={FadeOutLeft.duration(260)} style={{ flex: 1, paddingHorizontal: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 26 }}>
        <Pressable onPress={onBack} hitSlop={16}>
          <Text style={{ fontFamily: F.ui, fontSize: 22, color: C.ink }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Progress total={4} index={index} />
        </View>
        <Text style={{ fontFamily: F.uiMedium, fontSize: 12, color: C.muted, letterSpacing: 1 }}>
          {String(index + 1).padStart(2, '0')} / 04
        </Text>
      </View>

      <Animated.Text
        entering={FadeIn.duration(1200)}
        style={{ position: 'absolute', right: -10, top: 40, fontFamily: F.displayItalic, fontSize: width * 0.62, color: 'rgba(29,27,25,0.045)', lineHeight: width * 0.7 }}
      >
        {index + 1}
      </Animated.Text>

      <Animated.Text entering={FadeInDown.delay(80).duration(600).easing(EASE)} style={styles.kicker}>
        {q.kicker.toUpperCase()}
      </Animated.Text>
      <RevealText text={q.title} delay={120} style={{ fontFamily: F.display, fontSize: 36, lineHeight: 44, color: C.ink, letterSpacing: -0.5 }} />
      {q.multi && (
        <Animated.Text entering={FadeIn.delay(500)} style={{ fontFamily: F.ui, color: C.muted, fontSize: 13, marginTop: 8 }}>
          Optional · pick up to {q.multi}
        </Animated.Text>
      )}

      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
        {q.options.map((o, i) => (
          <OptionCard key={o.id} index={i} label={o.label} sub={o.sub} selected={sel.includes(o.id)} onPress={() => tap(o.id)} compact={q.options.length > 4} />
        ))}
        {q.multi && (
          <Animated.View entering={FadeInUp.delay(600)} style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <PillButton label="Skip" dark={false} style={{ flex: 1 }} onPress={() => onAnswer({ ...answers, [q.key]: [] })} />
            <PillButton label="Continue" style={{ flex: 2 }} onPress={() => onAnswer({ ...answers, [q.key]: sel })} />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

function OptionCard({ label, sub, selected, onPress, index, compact }: { label: string; sub?: string; selected: boolean; onPress: () => void; index: number; compact?: boolean }) {
  const p = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(selected ? 1 : 0, { damping: 16, stiffness: 180 });
  }, [selected, p]);
  const fill = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scaleX: 0.92 + 0.08 * p.value }] }));
  const check = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.4 + 0.6 * p.value }, { rotate: `${(1 - p.value) * -90}deg` }] }));
  const textColor = useAnimatedStyle(() => ({ color: p.value > 0.5 ? C.paper : C.ink }));
  return (
    <Animated.View entering={FadeInDown.delay(260 + index * 90).duration(620).easing(EASE)}>
      <PressableScale onPress={onPress} style={[styles.card, compact && { paddingVertical: 14 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.ink, borderRadius: 20 }, fill]} />
        <View style={{ flex: 1 }}>
          <Animated.Text style={[{ fontFamily: F.serifBold, fontSize: compact ? 20 : 22, lineHeight: compact ? 24 : 27 }, textColor]}>{label}</Animated.Text>
          {sub && <Animated.Text style={[{ fontFamily: F.zh, fontSize: 12, marginTop: 2, opacity: 0.6 }, textColor]}>{sub}</Animated.Text>}
        </View>
        <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: selected ? 'rgba(244,240,232,0.5)' : C.hair, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.Text style={[{ color: C.paper, fontSize: 14, fontFamily: F.uiBold }, check]}>✓</Animated.Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/* ───────────────────────── MBTI ───────────────────────── */

const AXIS_LABELS: Record<string, string> = { E: 'Extravert', I: 'Introvert', S: 'Sensing', N: 'Intuition', T: 'Thinking', F: 'Feeling', J: 'Judging', P: 'Perceiving' };

function MbtiStep({ value, onChange, onBack, onSkip, onDone }: { value: (string | null)[]; onChange: (v: (string | null)[]) => void; onBack: () => void; onSkip: () => void; onDone: () => void }) {
  const complete = value.every(Boolean);
  return (
    <Animated.View entering={FadeInRight.duration(520).easing(EASE)} exiting={FadeOutLeft.duration(260)} style={{ flex: 1, paddingHorizontal: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <Pressable onPress={onBack} hitSlop={16}>
          <Text style={{ fontFamily: F.ui, fontSize: 22, color: C.ink }}>←</Text>
        </Pressable>
        <Pressable onPress={onSkip} hitSlop={16}>
          <Text style={{ fontFamily: F.uiMedium, fontSize: 14, color: C.muted, letterSpacing: 0.5 }}>Skip</Text>
        </Pressable>
      </View>
      <Animated.Text entering={FadeInDown.delay(60)} style={styles.kicker}>
        OPTIONAL · MBTI
      </Animated.Text>
      <RevealText text="Know your type?" delay={100} style={{ fontFamily: F.display, fontSize: 38, lineHeight: 46, color: C.ink }} />
      <Animated.Text entering={FadeIn.delay(500)} style={{ fontFamily: F.serifItalic, fontSize: 19, color: C.inkSoft, marginTop: 6 }}>
        A gentle nudge to your notes — never the boss of them.
      </Animated.Text>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 28 }}>
        {value.map((v, i) => (
          <TypeLetter key={i} letter={v} index={i} />
        ))}
      </View>

      <View style={{ gap: 12 }}>
        {MBTI_AXES.map((pair, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(300 + i * 90).duration(600).easing(EASE)}>
            <AxisToggle
              pair={pair as unknown as [string, string]}
              value={value[i]}
              onChange={(l) => {
                const n = [...value];
                n[i] = l;
                onChange(n);
              }}
            />
          </Animated.View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <PillButton label={complete ? `Continue as ${value.join('')}` : 'Choose all four, or skip'} onPress={() => (complete ? onDone() : onSkip())} dark={complete} />
    </Animated.View>
  );
}

function TypeLetter({ letter, index }: { letter: string | null; index: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withSpring(1, { damping: 12, stiffness: 160 });
  }, [letter, p]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 14 }, { scale: 0.85 + 0.15 * p.value }], opacity: 0.3 + 0.7 * p.value }));
  return (
    <View style={{ width: 62, height: 78, borderRadius: 16, borderWidth: 1, borderColor: letter ? C.ink : C.hair, alignItems: 'center', justifyContent: 'center', backgroundColor: letter ? 'rgba(255,255,255,0.6)' : 'transparent' }}>
      <Animated.Text style={[{ fontFamily: F.displayBold, fontSize: 40, color: letter ? C.ink : C.hair }, s]}>{letter ?? '·'}</Animated.Text>
      <Text style={{ position: 'absolute', bottom: 6, fontFamily: F.ui, fontSize: 8, color: C.muted }}>{index + 1}</Text>
    </View>
  );
}

function AxisToggle({ pair, value, onChange }: { pair: [string, string]; value: string | null; onChange: (l: string) => void }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    if (value) {
      x.value = withSpring(value === pair[0] ? 0 : w / 2, { damping: 18, stiffness: 220 });
      o.value = withTiming(1, { duration: 200 });
    }
  }, [value, w, pair, x, o]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], opacity: o.value }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: C.hair, padding: 4 }}>
      <Animated.View style={[{ position: 'absolute', top: 4, left: 4, bottom: 4, width: w / 2 - 4, borderRadius: 14, backgroundColor: C.ink }, knob]} />
      {pair.map((l) => (
        <Pressable key={l} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }} onPress={() => onChange(l)}>
          <Text style={{ fontFamily: F.displayBold, fontSize: 20, color: value === l ? C.paper : C.ink }}>{l}</Text>
          <Text style={{ fontFamily: F.ui, fontSize: 13, color: value === l ? 'rgba(244,240,232,0.75)' : C.muted }}>{AXIS_LABELS[l]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ───────────────────────── Reveal ───────────────────────── */

function Reveal({ answers, mbti, picks, onOpen }: { answers: Answers; mbti: string | null; picks: DailyPick[]; onOpen: () => void }) {
  const weights: TagWeights = useMemo(() => computeWeights(answers, mbti), [answers, mbti]);
  const sorted = [...TAGS].sort((a, b) => weights[b] - weights[a]);
  const today = picks[0];
  const flip = useSharedValue(0);
  useEffect(() => {
    flip.value = withDelay(1500, withTiming(1, { duration: 1100, easing: EASE }));
  }, [flip]);
  const card = useAnimatedStyle(() => ({
    opacity: flip.value,
    transform: [{ perspective: 900 }, { rotateX: `${(1 - flip.value) * 70}deg` }, { translateY: (1 - flip.value) * 40 }],
  }));
  return (
    <Animated.View entering={FadeIn.duration(600)} exiting={FadeOut} style={{ flex: 1, paddingHorizontal: 24 }}>
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <View style={{ width: 160, height: 160, position: 'absolute', top: -40 }}>
          <LottieView source={require('../../assets/lottie/sparkle.json')} autoPlay loop={false} style={StyleSheet.absoluteFill} />
        </View>
        <Animated.Text entering={FadeInDown.delay(100)} style={styles.kicker}>
          ALL SET
        </Animated.Text>
        <RevealText text="Your notes are ready." delay={200} style={{ fontFamily: F.display, fontSize: 36, lineHeight: 44, color: C.ink }} />
      </View>

      <View style={{ marginTop: 22, gap: 9 }}>
        {sorted.map((t, i) => (
          <WeightBar key={t} tag={t} value={weights[t]} max={weights[sorted[0]]} delay={500 + i * 110} />
        ))}
      </View>

      <Animated.View style={[styles.preview, card]}>
        {today ? (
          <>
            <Text style={{ fontFamily: F.uiMedium, fontSize: 11, letterSpacing: 2, color: C.muted, marginBottom: 10 }}>TODAY’S NOTE</Text>
            <Text numberOfLines={4} style={{ fontFamily: quoteFont(today.item.type === 'post' ? today.item.title : today.item.text), fontSize: 20, lineHeight: 30, color: C.ink }}>
              {today.item.type === 'post' ? today.item.title : today.item.text}
            </Text>
            <Text style={{ fontFamily: F.ui, fontSize: 13, color: C.muted, marginTop: 10 }}>
              {today.item.type === 'post' ? `小红书 · ${today.item.attribution.handle}` : `— ${today.item.author}${today.item.source ? ', ' + today.item.source : ''}`}
            </Text>
          </>
        ) : (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 20, color: C.inkSoft }}>Preparing your first note…</Text>
        )}
      </Animated.View>
      <View style={{ flex: 1 }} />
      <Animated.View entering={FadeInUp.delay(2200).duration(700)}>
        <PillButton label="Open today’s note" onPress={onOpen} />
      </Animated.View>
    </Animated.View>
  );
}

function WeightBar({ tag, value, max, delay }: { tag: Tag; value: number; max: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(value / max, { duration: 900, easing: EASE }));
  }, [delay, max, p, value]);
  const s = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  const m = TAG_META[tag];
  return (
    <Animated.View entering={FadeInRight.delay(delay - 100).duration(500)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 120 }}>
        <TagChip tag={tag} />
      </View>
      <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: C.hair, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: m.color }, s]} />
      </View>
      <Text style={{ width: 38, textAlign: 'right', fontFamily: F.uiMedium, fontSize: 12, color: C.muted }}>{Math.round(value * 100)}%</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 3, color: C.muted, marginBottom: 18 },
  kicker: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 3, color: C.muted, marginBottom: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(29,27,25,0.14)',
    overflow: 'hidden',
  },
  preview: {
    marginTop: 26,
    padding: 22,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hair,
    shadowColor: '#5b4a3a',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
});
