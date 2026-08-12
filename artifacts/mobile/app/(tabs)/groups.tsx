import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type StudyGroup = {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  memberCount: number;
  postsPerDay: number;
  subject: string;
  joined?: boolean;
};

const ALL_GROUPS: StudyGroup[] = [
  {
    id: "general",
    name: "General Study",
    description: "Share tips, progress, and questions with all learners.",
    icon: "🎓",
    iconBg: "#7C3AED",
    memberCount: 4812,
    postsPerDay: 34,
    subject: "General",
  },
  {
    id: "math",
    name: "Math",
    description: "Algebra, calculus, geometry — solve it together.",
    icon: "📐",
    iconBg: "#2563EB",
    memberCount: 3201,
    postsPerDay: 28,
    subject: "Math",
  },
  {
    id: "biology",
    name: "Biology",
    description: "Cells, genetics, ecosystems, and beyond.",
    icon: "🧬",
    iconBg: "#16A34A",
    memberCount: 2740,
    postsPerDay: 19,
    subject: "Biology",
  },
  {
    id: "physics",
    name: "Physics",
    description: "Forces, waves, thermodynamics, and quantum magic.",
    icon: "⚛️",
    iconBg: "#0891B2",
    memberCount: 2198,
    postsPerDay: 15,
    subject: "Physics",
  },
  {
    id: "chemistry",
    name: "Chemistry",
    description: "Reactions, periodic table, organic chemistry.",
    icon: "🧪",
    iconBg: "#9333EA",
    memberCount: 1892,
    postsPerDay: 12,
    subject: "Chemistry",
  },
  {
    id: "cs",
    name: "Computer Science",
    description: "Algorithms, data structures, coding & projects.",
    icon: "💻",
    iconBg: "#1D4ED8",
    memberCount: 5103,
    postsPerDay: 47,
    subject: "CS",
  },
  {
    id: "history",
    name: "History",
    description: "Ancient to modern — learn from the past.",
    icon: "📜",
    iconBg: "#B45309",
    memberCount: 1456,
    postsPerDay: 9,
    subject: "History",
  },
  {
    id: "english",
    name: "English",
    description: "Writing, grammar, literature analysis.",
    icon: "📝",
    iconBg: "#0F766E",
    memberCount: 2311,
    postsPerDay: 21,
    subject: "English",
  },
  {
    id: "languages",
    name: "Languages",
    description: "Arabic, Spanish, French, Japanese and more.",
    icon: "🌍",
    iconBg: "#DC2626",
    memberCount: 3087,
    postsPerDay: 26,
    subject: "Languages",
  },
  {
    id: "exam-prep",
    name: "Exam Prep",
    description: "SAT, IELTS, university entrance — tackle them together.",
    icon: "📋",
    iconBg: "#F59E0B",
    memberCount: 4220,
    postsPerDay: 38,
    subject: "General",
  },
];

function formatMembers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k members`;
  return `${n} members`;
}

function GroupCard({
  group,
  colors,
  joined,
  onToggleJoin,
  onPress,
}: {
  group: StudyGroup;
  colors: any;
  joined: boolean;
  onToggleJoin: () => void;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.groupCardRow}>
        {/* Icon */}
        <View style={[styles.groupIcon, { backgroundColor: group.iconBg + "33" }]}>
          <Text style={styles.groupEmoji}>{group.icon}</Text>
        </View>

        {/* Info */}
        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: colors.foreground }]}>{group.name}</Text>
          <Text style={[styles.groupDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {group.description}
          </Text>
          <View style={styles.groupMeta}>
            <Icon name="users" size={11} color={colors.mutedForeground} />
            <Text style={[styles.groupMetaText, { color: colors.mutedForeground }]}>
              {formatMembers(group.memberCount)}
            </Text>
            <Text style={[styles.groupMetaDot, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[styles.groupMetaText, { color: colors.mutedForeground }]}>
              {group.postsPerDay} posts/day
            </Text>
          </View>
        </View>

        {/* Join button */}
        <TouchableOpacity
          onPress={onToggleJoin}
          style={[
            styles.joinBtn,
            joined
              ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }
              : { backgroundColor: colors.accent },
          ]}
        >
          <Text
            style={[
              styles.joinBtnText,
              { color: joined ? colors.mutedForeground : "#fff" },
            ]}
          >
            {joined ? "Joined" : "Join"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set(["general", "cs"]));

  const filtered = ALL_GROUPS.filter(
    g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.subject.toLowerCase().includes(search.toLowerCase())
  );

  const joinedGroups = ALL_GROUPS.filter(g => joinedIds.has(g.id));

  const toggleJoin = (id: string) => {
    setJoinedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const goToGroup = (group: StudyGroup) => {
    // Navigate to the community feed filtered by subject
    router.push(`/community/${group.id}` as any);
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
            <Text style={styles.headerTitle}>Study Groups</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Your communities, your subjects
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => {}}
          >
            <Icon name="plus" size={16} color={colors.primaryForeground} />
            <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>
              Create
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search groups…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Icon name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_H + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Your Groups */}
        {!search && joinedGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Groups</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.joinedRow}>
              {joinedGroups.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.joinedChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => goToGroup(g)}
                >
                  <Text style={styles.joinedEmoji}>{g.icon}</Text>
                  <Text style={[styles.joinedLabel, { color: colors.foreground }]}>{g.name}</Text>
                  <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Groups / Search results */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {search ? `Results for "${search}"` : "Explore Communities"}
          </Text>
          {filtered.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              colors={colors}
              joined={joinedIds.has(group.id)}
              onToggleJoin={() => toggleJoin(group.id)}
              onPress={() => goToGroup(group)}
            />
          ))}
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Icon name="search-x" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No groups found
              </Text>
            </View>
          )}
        </View>

        {/* Coming soon banner */}
        {!search && (
          <View style={[styles.comingSoon, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LinearGradient
              colors={[colors.purpleStart + "22", colors.primary + "11"]}
              style={StyleSheet.absoluteFill}
            />
            <Icon name="sparkles" size={20} color={colors.primary} />
            <Text style={[styles.comingSoonText, { color: colors.foreground }]}>
              Private groups, study rooms & live sessions coming soon
            </Text>
          </View>
        )}
      </ScrollView>
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
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
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

  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 12 },

  joinedRow: { gap: 10, paddingBottom: 4 },
  joinedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  joinedEmoji: { fontSize: 18 },
  joinedLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  activeDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },

  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  groupCardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  groupIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  groupEmoji: { fontSize: 26 },
  groupInfo: { flex: 1, gap: 3 },
  groupName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  groupDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  groupMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  groupMetaText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  groupMetaDot: { fontFamily: "Inter_400Regular", fontSize: 11 },
  joinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    flexShrink: 0,
  },
  joinBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  empty: { alignItems: "center", gap: 10, paddingTop: 40 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },

  comingSoon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
  comingSoonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
