import React, { useState } from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  photoURL?: string | null;
  displayName?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle & ViewStyle>;
}

function isRenderableUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  if (url.startsWith("file://")) return true;
  return false;
}

export function UserAvatar({ photoURL, displayName, size = 40, style }: Props) {
  const colors = useColors();
  const [imgError, setImgError] = useState(false);

  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const showImage = isRenderableUrl(photoURL) && !imgError;

  if (showImage) {
    return (
      <Image
        source={{ uri: photoURL! }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2, borderColor: colors.border },
          style as StyleProp<ImageStyle>,
        ]}
        onError={() => setImgError(true)}
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
      <Text style={[styles.initials, { fontSize: size * 0.38, color: colors.primaryForeground }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderWidth: 1 },
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontWeight: "700" },
});
