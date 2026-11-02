import React, { useMemo } from 'react';
import { StyleProp, TextStyle, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { tokenize } from '../lib/tokenize';
import { isCJK } from '../theme';

export { tokenize };

export function RevealText({
  text,
  style,
  delay = 0,
  stagger,
  replayKey,
}: {
  text: string;
  style: StyleProp<TextStyle>;
  delay?: number;
  stagger?: number;
  replayKey?: string | number;
}) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const cjk = isCJK(text);
  const step = stagger ?? Math.max(18, Math.min(cjk ? 55 : 70, 1400 / tokens.length));
  return (
    <View key={replayKey} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {tokens.map((t, i) => (
        <Animated.Text
          key={`${replayKey}-${i}`}
          entering={FadeInDown.delay(delay + i * step).duration(650).easing(Easing.bezier(0.16, 1, 0.3, 1)).withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })}
          style={[style, !cjk && { marginRight: 7 }]}
        >
          {t}
        </Animated.Text>
      ))}
    </View>
  );
}
