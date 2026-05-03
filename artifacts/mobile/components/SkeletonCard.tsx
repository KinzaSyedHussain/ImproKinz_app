import React, { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
  opacity,
  baseColor,
  highlightColor,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  opacity: Animated.SharedValue<number>;
  baseColor: string;
  highlightColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: baseColor },
        animatedStyle,
      ]}
    />
  );
}

export function SkeletonCard() {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32;

  const baseColor = colors.secondary;
  const highlightColor = colors.border;

  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750 }),
        withTiming(0.4, { duration: 750 })
      ),
      -1,
      false
    );
  }, []);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, width: cardWidth },
      ]}
    >
      {/* Header row */}
      <View style={styles.header}>
        <SkeletonBlock width={40} height={40} borderRadius={20} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
        <View style={styles.headerText}>
          <SkeletonBlock width={140} height={13} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
          <View style={{ height: 5 }} />
          <SkeletonBlock width={80} height={11} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
        </View>
        <SkeletonBlock width={50} height={22} borderRadius={12} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
      </View>

      {/* Content lines */}
      <View style={styles.content}>
        <SkeletonBlock width="100%" height={13} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
        <View style={{ height: 6 }} />
        <SkeletonBlock width="90%" height={13} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
        <View style={{ height: 6 }} />
        <SkeletonBlock width="60%" height={13} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
        <View style={{ height: 10 }} />
        <SkeletonBlock width={70} height={13} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Action row */}
      <View style={styles.actions}>
        <SkeletonBlock width={55} height={22} borderRadius={8} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
        <SkeletonBlock width={55} height={22} borderRadius={8} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
        <SkeletonBlock width={55} height={22} borderRadius={8} opacity={opacity} baseColor={baseColor} highlightColor={highlightColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingBottom: 10,
    gap: 10,
  },
  headerText: { flex: 1 },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  divider: { height: 1, marginHorizontal: 14, marginTop: 6 },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 24,
  },
});
