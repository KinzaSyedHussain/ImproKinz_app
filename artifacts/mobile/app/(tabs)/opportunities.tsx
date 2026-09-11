import { Icon } from "@/components/Icon";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VerificationPaywallSheet } from "@/app/verification-paywall";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type OpportunityType = "Hackathon" | "Job" | "Internship";

interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  organization: string;
  deadline: string;
  link: string;
  description: string;
  postedBy: string;
  postedByName: string;
  postedByVerified: boolean;
  createdAt: any;
}

type FilterKey = "All" | OpportunityType;

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<OpportunityType, string> = {
  Hackathon: "#7C3AED",
  Job: "#D97706",
  Internship: "#0D9488",
};

const FILTERS: FilterKey[] = ["All", "Hackathon", "Job", "Internship"];

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

function timeAgo(ts: any): string {
  let ms = Date.now();
  if (ts && typeof ts.toMillis === "function") ms = ts.toMillis();
  else if (ts && typeof ts === "object" && "_seconds" in ts) ms = ts._seconds * 1000;
  else if (typeof ts === "number") ms = ts;
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Opportunity Card ─────────────────────────────────────────────────────────

function OpportunityCard({
  opportunity,
  colors,
}: {
  opportunity: Opportunity;
  colors: any;
}) {
  const typeColor = TYPE_COLORS[opportunity.type] ?? colors.primary;

  const openLink = () => {
    if (opportunity.link) {
      Linking.openURL(
        opportunity.link.startsWith("http")
          ? opportunity.link
          : `https://${opportunity.link}`,
      ).catch(() => {});
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.typeBadge, { backgroundColor: typeColor + "22", borderColor: typeColor + "55" }]}>
        <Text style={[styles.typeBadgeText, { color: typeColor }]}>{opportunity.type}</Text>
      </View>

      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{opportunity.title}</Text>
      <Text style={[styles.cardOrg, { color: colors.mutedForeground }]}>{opportunity.organization}</Text>

      <View style={styles.cardMeta}>
        <Icon name="calendar" size={13} color={colors.mutedForeground} />
        <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
          {opportunity.deadline === "Rolling" ? "Rolling deadline" : `Due: ${opportunity.deadline}`}
        </Text>
      </View>

      {!!opportunity.description && (
        <Text style={[styles.cardDesc, { color: colors.foreground }]} numberOfLines={3}>
          {opportunity.description}
        </Text>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.cardPoster}>
          <Text style={[styles.cardPosterText, { color: colors.mutedForeground }]}>
            by {opportunity.postedByName}
          </Text>
          {opportunity.postedByVerified && <VerifiedBadge size={12} />}
          <Text style={[styles.cardPosterText, { color: colors.mutedForeground }]}>
            {" · "}
            {timeAgo(opportunity.createdAt)}
          </Text>
        </View>

        {!!opportunity.link && (
          <TouchableOpacity
            style={[styles.viewBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}
            onPress={openLink}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewBtnText, { color: colors.primary }]}>View →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OpportunitiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useClerkAuth();
  const { isVerified } = useSubscription();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("All");
  const [showPaywall, setShowPaywall] = useState(false);

  // Use a ref to prevent race conditions
  const isMounted = useRef(true);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Fetch from server ───────────────────────────────────────────────────────
  const fetchOpportunities = useCallback(async (silent = false) => {
    if (!silent && isMounted.current) {
      setLoading(true);
    }

    try {
      const token = await getToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${API_BASE}/api/opportunities`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (isMounted.current) {
        setOpportunities(data.opportunities ?? []);
        hasLoadedOnce.current = true;
      }
    } catch (e) {
      console.warn("opportunities fetch error:", e);
      if (isMounted.current && !hasLoadedOnce.current) {
        setOpportunities([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [getToken]);

  // Load once on mount - no dependencies to prevent re-renders
  useEffect(() => {
    fetchOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOpportunities(true);
  };

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered =
    filter === "All"
      ? opportunities
      : opportunities.filter((o) => o.type === filter);

  // ── Post button handler ─────────────────────────────────────────────────────
  const handlePost = () => {
    if (!isVerified) {
      setShowPaywall(true);
    } else {
      router.push("/create-opportunity");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[colors.purpleStart, colors.background]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Opportunities</Text>
          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: colors.primary }]}
            onPress={handlePost}
            activeOpacity={0.85}
          >
            <Icon name="plus" size={16} color="#fff" />
            <Text style={styles.postBtnText}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            const accent = f === "All" ? colors.primary : TYPE_COLORS[f as OpportunityType];
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterPill,
                  { backgroundColor: active ? accent + "22" : colors.card, borderColor: active ? accent : colors.border },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, { color: active ? accent : colors.mutedForeground }]}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* ── Feed ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 80,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <OpportunityCard opportunity={item} colors={colors} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="briefcase" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {filter === "All" ? "No opportunities yet" : `No ${filter} opportunities`}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Be the first to post a{filter !== "All" ? ` ${filter.toLowerCase()}` : "n opportunity"}!
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={handlePost}
                activeOpacity={0.85}
              >
                <Icon name="plus" size={15} color="#fff" />
                <Text style={styles.emptyBtnText}>Post Opportunity</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── Verification Paywall ── */}
      <VerificationPaywallSheet
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onVerified={() => {
          setShowPaywall(false);
          router.push("/create-opportunity");
        }}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24 },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Card
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  typeBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  typeBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 4 },
  cardOrg: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 8 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  cardMetaText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  cardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 12 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardPoster: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, flexWrap: "wrap" },
  cardPosterText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  viewBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  viewBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 4,
  },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});