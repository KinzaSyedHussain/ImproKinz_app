import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

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
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const webviewRef = useRef<WebView>(null);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // The YouTube IFrame API fires onError with code 150/151 when a video
  // cannot be embedded. We post a message to React Native so we can show
  // a friendly fallback instead of the grey error screen.
  const embedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; }
    #player { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    var player;
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        videoId: '${videoId}',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          fs: 1
        },
        events: {
          onReady: function() {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
          },
          onError: function(e) {
            // codes 100, 101, 150 = video unavailable / not embeddable
            if (e.data === 100 || e.data === 101 || e.data === 150 || e.data === 151 || e.data === 152) {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'blocked', code: e.data }));
            }
          }
        }
      });
    }
  </script>
</body>
</html>`;

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string };
      if (msg.type === "ready") setReady(true);
      if (msg.type === "blocked") setEmbedBlocked(true);
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#000000" }]}>
      {/* Player area */}
      <View style={[styles.playerWrap, { height: PLAYER_HEIGHT }]}>
        {embedBlocked ? (
          /* Fallback when video can't be embedded */
          <View style={styles.blockedWrap}>
            <Text style={styles.blockedIcon}>🚫</Text>
            <Text style={styles.blockedTitle}>Can't play in-app</Text>
            <Text style={styles.blockedSub}>
              This creator has disabled in-app embedding
            </Text>
            <TouchableOpacity
              style={styles.watchYtBtn}
              onPress={() => Linking.openURL(youtubeUrl)}
            >
              <Text style={styles.watchYtIcon}>▶</Text>
              <Text style={styles.watchYtText}>Watch on YouTube</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <WebView
              ref={webviewRef}
              source={{ html: embedHtml, baseUrl: "https://www.youtube.com" }}
              style={styles.webview}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              onMessage={handleMessage}
              allowsFullscreenVideo
              originWhitelist={["*"]}
            />
            {!ready && (
              <View style={styles.playerOverlay}>
                <ActivitySpinner />
              </View>
            )}
          </>
        )}
      </View>

      {/* Info panel */}
      <LinearGradient
        colors={[colors.background, colors.background]}
        style={styles.infoPanel}
      >
        {/* Back + YouTube button */}
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
          onPress={() => Linking.openURL(youtubeUrl)}
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

function ActivitySpinner() {
  return (
    <View style={spinnerStyles.wrap}>
      <Text style={spinnerStyles.text}>Loading…</Text>
    </View>
  );
}
const spinnerStyles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", gap: 8 },
  text: { color: "#ffffff88", fontSize: 14 },
});

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
  blockedWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  blockedIcon: { fontSize: 40 },
  blockedTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  blockedSub: { color: "#ffffff88", fontSize: 13, textAlign: "center" },
  watchYtBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FF0000",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 24,
    marginTop: 6,
  },
  watchYtIcon: { color: "#FFFFFF", fontSize: 13 },
  watchYtText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
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
