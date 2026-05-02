import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  photoURL?: string | null;
  displayName?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle & ViewStyle>;
}

export function UserAvatar({ photoURL, displayName, size = 40, style }: Props) {
  const colors = useColors();
  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2, borderColor: colors.border },
          style as StyleProp<ImageStyle>,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary },
        style as StyleProp<ViewStyle>,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36, color: colors.primaryForeground }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderWidth: 1 },
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: undefined },
});
