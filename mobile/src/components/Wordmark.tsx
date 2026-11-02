import LottieView from 'lottie-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, withDelay, withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { C, F } from '../theme';

const LETTERS = ['N', 'ō', 't', 'e', 'd'];

/** Staggered letter reveal: each glyph rises from a soft blur-like scale and settles. */
export function Wordmark({ size = 84, delay = 0, swoosh = true }: { size?: number; delay?: number; swoosh?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {LETTERS.map((l, i) => (
          <Letter key={i} ch={l} size={size} delay={delay + 120 + i * 110} italic={i === 0} />
        ))}
        <Animated.Text
          entering={FadeIn.delay(delay + 900).duration(500)}
          style={{ fontFamily: F.display, fontSize: size * 0.9, color: '#C38A45', lineHeight: size * 1.25 }}
        >
          .
        </Animated.Text>
      </View>
      {swoosh && (
        <Animated.View entering={FadeIn.delay(delay + 820)} style={{ width: size * 3.4, height: size * 0.62, marginTop: -size * 0.28 }}>
          <LottieView source={require('../../assets/lottie/swoosh.json')} autoPlay loop={false} speed={0.9} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
    </View>
  );
}

function Letter({ ch, size, delay, italic }: { ch: string; size: number; delay: number; italic?: boolean }) {
  const p = useSharedValue(0);
  React.useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [delay, p]);
  const s = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * size * 0.45 }, { scale: 1.25 - 0.25 * p.value }, { rotate: `${(1 - p.value) * -8}deg` }],
  }));
  return (
    <Animated.Text style={[{ fontFamily: italic ? F.displayItalic : F.display, fontSize: size, color: C.ink, lineHeight: size * 1.25, letterSpacing: -1 }, s]}>
      {ch}
    </Animated.Text>
  );
}

/** Word-by-word tagline. */
export function Tagline({ text, delay = 0, style }: { text: string; delay?: number; style?: object }) {
  const words = text.split(' ');
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {words.map((w, i) => (
        <Animated.View key={i} entering={FadeInDown.delay(delay + i * 90).duration(700).easing(Easing.bezier(0.16, 1, 0.3, 1))}>
          <Text style={[{ fontFamily: F.serifItalic, fontSize: 22, color: C.inkSoft }, style]}>{w}{i < words.length - 1 ? ' ' : ''}</Text>
        </Animated.View>
      ))}
    </View>
  );
}
