import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { C } from '../theme';

const GRAIN = require('../../assets/grain.png');

function Blob({ color, size, x, y, dur, dx, dy }: { color: string; size: number; x: number; y: number; dur: number; dx: number; dy: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [dur, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x + dx * t.value }, { translateY: y + dy * t.value }, { scale: 1 + 0.12 * t.value }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, overflow: 'hidden', opacity: 0.75 }, style]}>
      <LinearGradient colors={[color, 'transparent']} start={{ x: 0.3, y: 0.2 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/** Drifting, blurred colour fields over warm paper, with a film-grain overlay. */
export function Backdrop({ colors = ['#E9D3BE', '#C9D3DC', '#E6C9CF'] }: { colors?: [string, string, string] }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.paper }]} />
      <Blob color={colors[0]} size={width * 1.1} x={-width * 0.35} y={-height * 0.12} dur={9000} dx={width * 0.18} dy={height * 0.06} />
      <Blob color={colors[1]} size={width * 1.0} x={width * 0.25} y={height * 0.35} dur={11000} dx={-width * 0.2} dy={-height * 0.08} />
      <Blob color={colors[2]} size={width * 0.8} x={-width * 0.1} y={height * 0.7} dur={13000} dx={width * 0.25} dy={-height * 0.05} />
      <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
      <Grain />
    </View>
  );
}

export function Grain({ opacity = 0.09 }: { opacity?: number }) {
  return <Image source={GRAIN} style={[StyleSheet.absoluteFill, { opacity }]} contentFit="none" />;
}
