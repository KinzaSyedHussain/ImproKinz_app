import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PLAYER_HEIGHT = Math.round(SCREEN_WIDTH * 9 / 16);

export default function VideoPlayerScreen() {
  const colors = useColors();
  const router = useRouter();
  const { videoId, title, channelName, viewCount, duration } = useLocalSearchParams<{
    videoId: string;
    title: string;
    channelName: string;
    viewCount?: string;
    duration?: string;
  }>();

  const [ready, setReady] = useState(false);
  const webviewRef = useRef<WebView>(null);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const embedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe
    src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
    frameborder="0"
  ></iframe>
</body>
</html>`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#000000" }]}>
      {/* Player */}
      <View style={[styles.playerWrap, { height: PLAYER_HEIGHT }]}>
        <WebView
          ref={webviewRef}
          source={{ html: embedHtml, baseUrl: "https://www.youtube.com" }}
          style={styles.webview}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          onLoad={() => setReady(true)}
          allowsFullscreenVideo
        />
        {!ready && (
          <View style={styles.playerOverlay}>
            <Text style={styles.loadingText}>Loading player…</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <LinearGradient
        colors={[colors.background, colors.background]}
        style={styles.infoPanel}
      >
        {/* Back + YouTube button row */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.secondary }]}
            onPress={() => router.back()}
          >
            <Icon name="arrow-left" size={18} color={colors.foreground} />
            <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ytBtn}
            onPress={() => Linking.openURL(youtubeUrl)}
            activeOpacity={0.8}
          >
            <Text style={styles.ytIcon}>▶</Text>
            <Text style={styles.ytBtnText}>YouTube</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={3}>
          {title}
        </Text>

        {/* Channel + meta */}
        <View style={styles.metaRow}>
          <View style={[styles.channelPill, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.channelText, { color: colors.primary }]}>
              {channelName}
            </Text>
          </View>
          {!!viewCount && (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {viewCount}
            </Text>
          )}
          {!!duration && (
            <View style={[styles.durationPill, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {duration}
              </Text>
            </View>
          )}
        </View>

        {/* Comments CTA */}
        <TouchableOpacity
          style={[styles.commentsBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => Linking.openURL(`${youtubeUrl}&lc=`)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18 }}>💬</Text>
          <View style={styles.commentsBtnText}>
            <Text style={[styles.commentsBtnTitle, { color: colors.foreground }]}>
              View comments on YouTube
            </Text>
            <Text style={[styles.commentsBtnSub, { color: colors.mutedForeground }]}>
              Opens YouTube app or browser
            </Text>
          </View>
          <Icon name="external-link" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  playerWrap: { width: "100%", backgroundColor: "#000" },
  webview: { flex: 1, backgroundColor: "#000" },
  playerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  loadingText: { color: "#ffffff99", fontSize: 14 },
  infoPanel: { flex: 1, padding: 18, gap: 14 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backText: { fontSize: 14, fontWeight: "600" },
  ytBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FF0000",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ytIcon: { color: "#FFFFFF", fontSize: 11 },
  ytBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  title: { fontSize: 17, fontWeight: "700", lineHeight: 24 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  channelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  channelText: { fontSize: 13, fontWeight: "600" },
  durationPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 13 },
  commentsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: "auto",
  },
  commentsBtnText: { flex: 1 },
  commentsBtnTitle: { fontSize: 14, fontWeight: "600" },
  commentsBtnSub: { fontSize: 12, marginTop: 2 },
});
