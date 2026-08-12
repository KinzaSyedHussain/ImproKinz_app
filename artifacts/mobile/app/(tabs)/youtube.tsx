import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

const CATEGORIES = [
  { id: "all",       label: "All",         icon: "🎓" },
  { id: "math",      label: "Math",         icon: "📐" },
  { id: "science",   label: "Science",      icon: "🔬" },
  { id: "history",   label: "History",      icon: "📜" },
  { id: "cs",        label: "CS",           icon: "💻" },
  { id: "language",  label: "Languages",    icon: "🌍" },
  { id: "general",   label: "Top Picks",    icon: "⭐" },
];

type Video = {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  url: string;
  published: string;
  viewCount?: string;
  duration?: string;
};

async function fetchVideos(subject: string, q?: string): Promise<Video[]> {
  const params = new URLSearchParams({ subject });
  if (q) params.set("q", q);
  const res = await fetch(`${API_BASE}/api/videos?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.videos ?? [];
}

function VideoCard({ item, colors }: { item: Video; colors: any }) {
  return (
    <TouchableOpacity
      style={[styles.videoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => Linking.openURL(item.url)}
      activeOpacity={0.85}
    >
      <View style={styles.thumbContainer}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
            <Icon name="youtube" size={32} color="#FF0000" />
          </View>
        )}
        {/* Play button overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playBtn}>
            <Icon name="play" size={14} color="#fff" />
          </View>
        </View>
        {/* Duration badge */}
        {!!item.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        )}
      </View>
      <View style={styles.videoInfo}>
        <Text style={[styles.videoTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.videoChannel, { color: colors.mutedForeground }]}>
          {item.channelName}
        </Text>
        {!!item.viewCount && (
          <Text style={[styles.videoStats, { color: colors.mutedForeground }]}>
            {item.viewCount}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function YouTubeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (subject: string, q?: string) => {
    setLoading(true);
    setError(false);
    try {
      const vids = await fetchVideos(subject, q);
      setVideos(vids);
    } catch (e) {
      console.error("Videos fetch error", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(activeCategory);
  }, [activeCategory]);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (text.trim()) load(activeCategory, text.trim());
      else load(activeCategory);
    }, 600);
  };

  const TAB_BAR_H = 80;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.purpleStart, colors.background]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Study Videos</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Curated YouTube lessons
            </Text>
          </View>
          <View style={[styles.ytBadge, { backgroundColor: "#FF000022" }]}>
            <Icon name="youtube" size={22} color="#FF0000" />
          </View>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search study videos…"
            placeholderTextColor={colors.mutedForeground}
            value={searchText}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {!!searchText && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Icon name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.catPill,
              {
                backgroundColor: activeCategory === cat.id ? colors.primary : colors.card,
                borderColor: activeCategory === cat.id ? colors.primary : colors.border,
              },
            ]}
            onPress={() => { setActiveCategory(cat.id); setSearchText(""); }}
          >
            <Text style={styles.catEmoji}>{cat.icon}</Text>
            <Text
              style={[
                styles.catLabel,
                { color: activeCategory === cat.id ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.mutedForeground }]}>Loading videos…</Text>
        </View>
      ) : error ? (
        <View style={styles.loader}>
          <Icon name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.loaderText, { color: colors.mutedForeground }]}>
            Couldn't load videos
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => load(activeCategory, searchText.trim() || undefined)}
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={v => v.videoId}
          renderItem={({ item }) => <VideoCard item={item} colors={colors} />}
          contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_H + insets.bottom }]}
          ListEmptyComponent={
            <View style={styles.loader}>
              <Icon name="video-off" size={40} color={colors.mutedForeground} />
              <Text style={[styles.loaderText, { color: colors.mutedForeground }]}>No videos found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  ytBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, padding: 0 },
  catRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: "center" },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  catEmoji: { fontSize: 14 },
  catLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  list: { paddingHorizontal: 12, gap: 12 },
  videoCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  thumbContainer: { position: "relative" },
  thumb: { width: "100%", height: 192 },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.78)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  videoInfo: { padding: 12, gap: 3 },
  videoTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  videoChannel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  videoStats: { fontFamily: "Inter_400Regular", fontSize: 11 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60 },
  loaderText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
