import { Icon } from "@/components/Icon";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  xp: number;
  streak: number;
  compact?: boolean;
}

export function XPStreakBadge({ xp, streak, compact = false }: Props) {
  const colors = useColors();

  if (compact) {
    return (
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.badgeIcon, { color: colors.xpColor }]}>★</Text>
          <Text style={[styles.badgeText, { color: colors.xpColor }]}>
            {xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
          <Icon name="zap" size={12} color={colors.streakColor} />
          <Text style={[styles.badgeText, { color: colors.streakColor }]}>
            {streak}d
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullRow}>
      <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.statIcon, { color: colors.xpColor }]}>★</Text>
        <Text style={[styles.statValue, { color: colors.foreground }]}>
          {xp.toLocaleString()}
        </Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
          XP Points
        </Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Icon name="zap" size={22} color={colors.streakColor} />
        <Text style={[styles.statValue, { color: colors.foreground }]}>
          {streak}
        </Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
          Day Streak
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 3,
  },
  badgeIcon: { fontSize: 11 },
  badgeText: { fontSize: 12, fontFamily: undefined },
  fullRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16 },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontFamily: undefined },
  statLabel: { fontSize: 12, fontFamily: undefined },
});
