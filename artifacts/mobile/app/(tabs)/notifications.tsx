import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Video {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  url: string;
  published: string;
  viewCount?: string;
  duration?: string;
}

const SUBJECTS = [
  { key: "all", label: "All", icon: "★" },
  { key: "math", label: "Math", icon: "∑" },
  { key: "science", label: "Science", icon: "⚗" },
  { key: "history", label: "History", icon: "◫" },
  { key: "cs", label: "CS", icon: "◈" },
  { key: "language", label: "Language", icon: "✉" },
  { key: "general", label: "General", icon: "◎" },
];

function timeLabel(iso: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return `${Math.floor(diff / 604800000)}w ago`;
}

function VideoCard({ video }: { video: Video }) {
  const colors = useColors();
  const open = () => Linking.openURL(video.url).catch(() => {});
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={open}
      activeOpacity={0.85}
    >
      <View style={styles.thumbWrap}>
        <Image source={{ uri: video.thumbnail }} style={styles.thumb} resizeMode="cover" />
        <View style={styles.playOverlay}>
          <View style={styles.playBtn}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>
        {!!video.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {video.title}
        </Text>
        <View style={[styles.channelPill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.channelText, { color: colors.primary }]}>
            {video.channelName}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          {!!video.viewCount && (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {video.viewCount}
            </Text>
          )}
          {!!video.published && (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              · {timeLabel(video.published)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function StudyVideosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeSubject, setActiveSubject] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const searchRef = useRef<TextInput>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 70 + insets.bottom;

  const loadVideos = useCallback(async (subject: string, query: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(false);
    try {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const params = new URLSearchParams({ t: String(Date.now()) });
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.set("subject", subject);
      }
      const res = await fetch(`https://${domain}/api/videos?${params.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json() as { videos: Video[] };
      setVideos(data.videos ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVideos(activeSubject, searchQuery);
    }, [activeSubject, searchQuery])
  );

  const changeSubject = (key: string) => {
    setActiveSubject(key);
    setSearchText("");
    setSearchQuery("");
    loadVideos(key, "");
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadVideos(activeSubject, searchQuery, true);
  };

  const submitSearch = () => {
    const q = searchText.trim();
    setSearchQuery(q);
    loadVideos(activeSubject, q);
    searchRef.current?.blur();
  };

  const clearSearch = () => {
    setSearchText("");
    setSearchQuery("");
    loadVideos(activeSubject, "");
    searchRef.current?.blur();
  };

  const isSearchMode = !!searchQuery;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.purpleStart, colors.purpleEnd]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Study Videos</Text>
            <Text style={styles.headerSub}>
              {isSearchMode ? `Results for "${searchQuery}"` : "Handpicked educational content"}
            </Text>
          </View>
          <View style={[styles.liveBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Icon name="search" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder="Search any topic…"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            selectionColor="#F59E0B"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="x" size={14} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Subject filter — hidden when actively searching */}
        {!isSearchMode && (
          <FlatList
            data={SUBJECTS}
            keyExtractor={(item) => item.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectRow}
            renderItem={({ item }) => {
              const active = activeSubject === item.key;
              return (
                <TouchableOpacity
                  style={[
                    styles.subjectChip,
                    {
                      backgroundColor: active ? "#FFFFFF" : "rgba(255,255,255,0.15)",
                      borderColor: active ? "#FFFFFF" : "transparent",
                    },
                  ]}
                  onPress={() => changeSubject(item.key)}
                >
                  <Text style={styles.subjectIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.subjectLabel,
                      { color: active ? colors.purpleEnd : "rgba(255,255,255,0.85)" },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            {isSearchMode ? `Searching for "${searchQuery}"…` : "Fetching latest study videos…"}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>⚠</Text>
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Could not load videos</Text>
          <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
            Check your connection and try again
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => loadVideos(activeSubject, searchQuery)}
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.videoId}
          contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: botPad }}
          renderItem={({ item }) => <VideoCard video={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View style={[styles.channelNote, { backgroundColor: colors.secondary }]}>
              <Icon name="refresh-cw" size={13} color={colors.primary} />
              <Text style={[styles.channelNoteText, { color: colors.mutedForeground }]}>
                {isSearchMode
                  ? `${videos.length} result${videos.length !== 1 ? "s" : ""} · Tap to open in YouTube · Pull to refresh`
                  : "Tap any video to watch on YouTube · Pull to refresh"}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 40 }}>📺</Text>
              <Text style={[styles.errorTitle, { color: colors.foreground }]}>No videos found</Text>
              <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
                {isSearchMode ? "Try a different search term" : "Pull down to try again"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 16, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  headerTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 3 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" },
  liveText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    padding: 0,
  },
  subjectRow: { gap: 8 },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  subjectIcon: { fontSize: 13 },
  subjectLabel: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  loadingText: { fontSize: 13, marginTop: 4 },
  errorTitle: { fontSize: 17, fontWeight: "600" },
  errorSub: { fontSize: 13, textAlign: "center" },
  retryBtn: { marginTop: 6, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { fontWeight: "700", fontSize: 14 },
  channelNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  channelNoteText: { fontSize: 12, flex: 1 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbWrap: { position: "relative", width: "100%", height: 190 },
  thumb: { width: "100%", height: "100%" },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.78)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  metaText: { fontSize: 12 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  playBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { color: "#FFFFFF", fontSize: 20, marginLeft: 3 },
  cardInfo: { padding: 14, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "600", lineHeight: 21 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  channelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  channelText: { fontSize: 11, fontWeight: "600" },
});
