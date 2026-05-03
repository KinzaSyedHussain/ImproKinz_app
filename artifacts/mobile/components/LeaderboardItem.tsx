import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useUserPhoto } from "@/hooks/useUserPhotoCache";
import { UserAvatar } from "./UserAvatar";

interface Props {
  rank: number;
  displayName: string;
  photoURL: string;
  xp: number;
  streak: number;
  isMe: boolean;
  showStreak?: boolean;
}

const RANK_COLORS = ["#F59E0B", "#94A3B8", "#CD7C2F"];

export function LeaderboardItem({
  rank,
  displayName,
  photoURL,
  xp,
  streak,
  isMe,
  showStreak = false,
}: Props) {
  const colors = useColors();
  const livePhoto = useUserPhoto(isMe ? "" : displayName, photoURL);

  const primaryValue = showStreak ? streak : xp;
  const primaryLabel = showStreak ? "day streak" : "XP";
  const primaryIcon = showStreak ? "✦" : "★";

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
          <Text style={[styles.medal]}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </Text>
        ) : (
          <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>
            #{rank}
          </Text>
        )}
      </View>
      <UserAvatar photoURL={livePhoto ?? photoURL} displayName={displayName} size={40} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {displayName}{isMe ? " (You)" : ""}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {showStreak ? `${xp.toLocaleString()} XP total` : `${streak}d streak`}
        </Text>
      </View>
      <View style={styles.scoreWrap}>
        <Text style={[styles.score, { color: colors.xpColor }]}>
          {primaryIcon} {primaryValue.toLocaleString()}
        </Text>
        <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
          {primaryLabel}
        </Text>
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
  rankNum: { fontSize: 15 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, marginTop: 2 },
  scoreWrap: { alignItems: "flex-end" },
  score: { fontSize: 16, fontWeight: "700" },
  scoreLabel: { fontSize: 11 },
});
