import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, PressableProps, StyleProp, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { dayParts } from '../lib/dates';
import { Tag } from '../lib/types';
import { C, F, TAG_META } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that squishes slightly on press with a light haptic. */
export function PressableScale({ style, children, haptic = true, onPress, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean; children?: React.ReactNode }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={() => (s.value = withSpring(0.965, { damping: 18, stiffness: 400 }))}
      onPressOut={() => (s.value = withSpring(1, { damping: 14, stiffness: 300 }))}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={[style, a]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Thin outlined square with a bold day number and spaced month — the widget's date motif. */
export function DateBox({ date, color = C.white, size = 72 }: { date: string; color?: string; size?: number }) {
  const { day, month } = dayParts(date);
  return (
    <View style={{ width: size, height: size, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.uiBold, fontSize: size * 0.44, lineHeight: size * 0.5, color }}>{day}</Text>
      <Text style={{ fontFamily: F.uiBold, fontSize: size * 0.16, letterSpacing: size * 0.04, color, marginLeft: size * 0.04 }}>{month}</Text>
    </View>
  );
}

export function TagChip({ tag, light }: { tag: Tag; light?: boolean }) {
  const m = TAG_META[tag];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: light ? 'rgba(255,255,255,0.18)' : m.color + '1A',
        borderWidth: 1,
        borderColor: light ? 'rgba(255,255,255,0.35)' : m.color + '40',
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: light ? '#fff' : m.color }} />
      <Text style={{ fontFamily: F.uiMedium, fontSize: 12, letterSpacing: 0.6, color: light ? '#fff' : m.color }}>
        {m.label.toUpperCase()} · {m.zh}
      </Text>
    </View>
  );
}

export function XhsBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.xhs, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontFamily: F.uiBold, color: '#fff', fontSize: 12 }}>小红书</Text>
    </View>
  );
}

/** Segmented progress; the active segment fills with a spring. */
export function Progress({ total, index, color = C.ink }: { total: number; index: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Seg key={i} filled={i <= index} color={color} />
      ))}
    </View>
  );
}
function Seg({ filled, color }: { filled: boolean; color: string }) {
  const p = useSharedValue(filled ? 1 : 0);
  React.useEffect(() => {
    p.value = withTiming(filled ? 1 : 0, { duration: 520 });
  }, [filled, p]);
  const a = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: C.hair, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 3, backgroundColor: color, borderRadius: 2 }, a]} />
    </View>
  );
}

export function PillButton({ label, onPress, dark = true, style }: { label: string; onPress: () => void; dark?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <PressableScale
      onPress={onPress}
      style={[
        {
          height: 56,
          borderRadius: 28,
          paddingHorizontal: 30,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dark ? C.ink : 'transparent',
          borderWidth: dark ? 0 : 1,
          borderColor: C.hair,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: F.uiMedium, fontSize: 16, letterSpacing: 0.4, color: dark ? C.paper : C.ink }}>{label}</Text>
    </PressableScale>
  );
}
