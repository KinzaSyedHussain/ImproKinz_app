import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const GOLD = "#F59E0B";

interface VerifiedBadgeProps {
  size?: number;
}

/**
 * Small gold verified-checkmark badge shown next to verified user names.
 * Usage: <VerifiedBadge /> or <VerifiedBadge size={18} />
 */
export function VerifiedBadge({ size = 14 }: VerifiedBadgeProps) {
  return (
    <View style={[styles.wrap, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}>
      <Ionicons name="checkmark-circle" size={size + 4} color={GOLD} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
