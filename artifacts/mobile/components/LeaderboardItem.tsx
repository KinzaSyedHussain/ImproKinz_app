import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "./UserAvatar";

interface Props {
  rank: number;
  displayName: string;
  photoURL: string;
  xp: number;
  streak: number;
  isMe: boolean;
}

const RANK_COLORS = ["#F59E0B", "#94A3B8", "#CD7C2F"];

export function LeaderboardItem({
  rank,
  displayName,
  photoURL,
  xp,
  streak,
  isMe,
}: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor: isMe ? colors.secondary : colors.card,
          borderColor: isMe ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.rankWrap}>
        {rank <= 3 ? (
          <Text style={[styles.medal, { color: RANK_COLORS[rank - 1] }]}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </Text>
        ) : (
          <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>
            #{rank}
          </Text>
        )}
      </View>
      <UserAvatar photoURL={photoURL} displayName={displayName} size={40} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {displayName}
          {isMe ? " (You)" : ""}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {streak}d streak
        </Text>
      </View>
      <View style={styles.xpWrap}>
        <Text style={[styles.xp, { color: colors.xpColor }]}>
          ★ {xp.toLocaleString()}
        </Text>
        <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  rankWrap: { width: 32, alignItems: "center" },
  medal: { fontSize: 22 },
  rankNum: { fontFamily: undefined, fontSize: 15 },
  info: { flex: 1 },
  name: { fontFamily: undefined, fontSize: 15 },
  sub: { fontFamily: undefined, fontSize: 12, marginTop: 2 },
  xpWrap: { alignItems: "flex-end" },
  xp: { fontFamily: undefined, fontSize: 16 },
  xpLabel: { fontFamily: undefined, fontSize: 11 },
});
