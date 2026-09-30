import { Icon } from "@/components/Icon";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VerificationPaywallSheet } from "@/app/verification-paywall";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const TYPE_COLORS: Record<OpportunityType, string> = {
  Hackathon: "#7C3AED",
  Job: "#D97706",
  Internship: "#0D9488",
};

const FILTERS: FilterKey[] = [
  "All",
  "Hackathon",
  "Job",
  "Internship",
];

const API_BASE = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "")
  : "http://localhost:3001";

function timeAgo(ts: any): string {
  let ms = Date.now();

  if (ts && typeof ts.toMillis === "function") {
    ms = ts.toMillis();
  } else if (
    ts &&
    typeof ts === "object" &&
    "_seconds" in ts
  ) {
    ms = ts._seconds * 1000;
  } else if (typeof ts === "number") {
    ms = ts;
  }

  const diff = (Date.now() - ms) / 1000;

  if (diff < 60) {
    return "just now";
  }

  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`;
  }

  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`;
  }

  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Opportunity Card ────────────────────────────────────────────────────────

function OpportunityCard({
  opportunity,
  colors,
  currentUserId,
  deleting,
  onDelete,
}: {
  opportunity: Opportunity;
  colors: any;
  currentUserId: string | null | undefined;
  deleting: boolean;
  onDelete: (opportunity: Opportunity) => void;
}) {
  const router = useRouter();

  const typeColor =
    TYPE_COLORS[opportunity.type] ?? colors.primary;

  const isOwner =
    !!currentUserId &&
    opportunity.postedBy === currentUserId;

  const openExternalLink = () => {
    if (!opportunity.link) {
      return;
    }

    const url = opportunity.link.startsWith("http")
      ? opportunity.link
      : `https://${opportunity.link}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Could not open link",
        "The application link could not be opened."
      );
    });
  };

  const openDetails = () => {
    router.push({
      pathname: "/opportunity-details",
      params: {
        id: opportunity.id,
      },
    });
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Type */}
      <View
        style={[
          styles.typeBadge,
          {
            backgroundColor: typeColor + "22",
            borderColor: typeColor + "55",
          },
        ]}
      >
        <Text
          style={[
            styles.typeBadgeText,
            { color: typeColor },
          ]}
        >
          {opportunity.type}
        </Text>
      </View>

      {/* Title */}
      <Text
        style={[
          styles.cardTitle,
          { color: colors.foreground },
        ]}
      >
        {opportunity.title}
      </Text>

      {/* Organization */}
      <Text
        style={[
          styles.cardOrg,
          { color: colors.mutedForeground },
        ]}
      >
        {opportunity.organization}
      </Text>

      {/* Deadline */}
      <View style={styles.cardMeta}>
        <Icon
          name="calendar"
          size={13}
          color={colors.mutedForeground}
        />

        <Text
          style={[
            styles.cardMetaText,
            { color: colors.mutedForeground },
          ]}
        >
          {opportunity.deadline === "Rolling"
            ? "Rolling deadline"
            : `Due: ${opportunity.deadline}`}
        </Text>
      </View>

      {/* Description */}
      {!!opportunity.description && (
        <Text
          style={[
            styles.cardDesc,
            { color: colors.foreground },
          ]}
          numberOfLines={3}
        >
          {opportunity.description}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.cardPoster}>
          <Text
            style={[
              styles.cardPosterText,
              { color: colors.mutedForeground },
            ]}
          >
            by {opportunity.postedByName}
          </Text>

          {opportunity.postedByVerified && (
            <VerifiedBadge size={12} />
          )}

          <Text
            style={[
              styles.cardPosterText,
              { color: colors.mutedForeground },
            ]}
          >
            {" · "}
            {timeAgo(opportunity.createdAt)}
          </Text>
        </View>

        <View style={styles.cardActions}>
          {/* Delete */}
          {isOwner && (
            <TouchableOpacity
              style={[
                styles.deleteBtn,
                {
                  backgroundColor: deleting
                    ? "#EF444411"
                    : "#EF444422",
                  borderColor: "#EF444455",
                  opacity: deleting ? 0.6 : 1,
                },
              ]}
              onPress={() => {
                console.log(
                  "[opportunities] DELETE BUTTON PRESSED:",
                  opportunity.id,
                  "owner:",
                  isOwner,
                  "userId:",
                  currentUserId,
                  "postedBy:",
                  opportunity.postedBy
                );

                if (!deleting) {
                  onDelete(opportunity);
                }
              }}
              disabled={deleting}
              activeOpacity={0.75}
            >
              {deleting ? (
                <ActivityIndicator
                  size="small"
                  color="#EF4444"
                />
              ) : (
                <Icon
                  name="trash-2"
                  size={14}
                  color="#EF4444"
                />
              )}
            </TouchableOpacity>
          )}

          {/* Details */}
          <TouchableOpacity
            style={[
              styles.viewBtn,
              {
                backgroundColor:
                  colors.primary + "22",
                borderColor:
                  colors.primary + "44",
              },
            ]}
            onPress={openDetails}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.viewBtnText,
                { color: colors.primary },
              ]}
            >
              Details →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Application link */}
      {!!opportunity.link && (
        <TouchableOpacity
          onPress={openExternalLink}
          activeOpacity={0.75}
          style={styles.applyRow}
        >
          <Icon
            name="external-link"
            size={13}
            color={colors.primary}
          />

          <Text
            style={[
              styles.applyText,
              { color: colors.primary },
            ]}
          >
            Open application link
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function OpportunitiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { getToken, userId } = useClerkAuth();
  const { isVerified } = useSubscription();

  const [opportunities, setOpportunities] =
    useState<Opportunity[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [filter, setFilter] =
    useState<FilterKey>("All");

  const [showPaywall, setShowPaywall] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  // ─── Custom Delete Modal ──────────────────────────────────────────────────

  const [deleteTarget, setDeleteTarget] =
    useState<Opportunity | null>(null);

  const isMounted = useRef(true);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ─── Fetch opportunities ──────────────────────────────────────────────────

  const fetchOpportunities = useCallback(
    async (silent = false) => {
      if (!silent && isMounted.current) {
        setLoading(true);
      }

      let controller: AbortController | null = null;

      let timeoutId: ReturnType<typeof setTimeout> | null =
        null;

      try {
        const token = await getToken();

        if (!token) {
          throw new Error("Not authenticated");
        }

        controller = new AbortController();

        timeoutId = setTimeout(() => {
          controller?.abort();
        }, 8000);

        const response = await fetch(
          `${API_BASE}/api/opportunities`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        const responseText = await response.text();

        if (!response.ok) {
          let message = `HTTP ${response.status}`;

          try {
            const parsed = JSON.parse(responseText);

            message =
              parsed.error ??
              message;
          } catch {
            if (responseText) {
              message = responseText;
            }
          }

          throw new Error(message);
        }

        let data: {
          opportunities?: Opportunity[];
        } = {};

        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            "Server returned invalid JSON."
          );
        }

        if (isMounted.current) {
          setOpportunities(
            Array.isArray(data.opportunities)
              ? data.opportunities
              : []
          );

          hasLoadedOnce.current = true;
        }
      } catch (error: any) {
        console.warn(
          "Opportunities fetch error:",
          error
        );

        if (
          isMounted.current &&
          !hasLoadedOnce.current
        ) {
          setOpportunities([]);
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [getToken]
  );

  useEffect(() => {
    fetchOpportunities();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Refresh ──────────────────────────────────────────────────────────────

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOpportunities(true);
  }, [fetchOpportunities]);

  // ─── Open Delete Confirmation ─────────────────────────────────────────────

  const handleDelete = useCallback(
    (opportunity: Opportunity) => {
      console.log(
        "[opportunities] handleDelete called:",
        opportunity.id,
        opportunity.title
      );

      if (deletingId) {
        console.log(
          "[opportunities] Already deleting:",
          deletingId
        );
        return;
      }

      // Open our custom modal instead of Alert.alert()
      setDeleteTarget(opportunity);
    },
    [deletingId]
  );

  // ─── Actually Delete ──────────────────────────────────────────────────────

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    if (deletingId) {
      return;
    }

    const opportunity = deleteTarget;

    console.log(
      "[opportunities] CONFIRMED DELETE:",
      opportunity.id
    );

    // Close confirmation modal immediately
    setDeleteTarget(null);

    setDeletingId(opportunity.id);

    try {
      const token = await getToken();

      console.log(
        "[opportunities] Token available:",
        !!token
      );

      if (!token) {
        throw new Error(
          "Not authenticated. Please log in again."
        );
      }

      const deleteUrl =
        `${API_BASE}/api/opportunities/` +
        encodeURIComponent(opportunity.id);

      console.log(
        "[opportunities] DELETE URL:",
        deleteUrl
      );

      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const responseText = await response.text();

      console.log(
        "[opportunities] DELETE response:",
        response.status,
        responseText
      );

      if (!response.ok) {
        let message = `HTTP ${response.status}`;

        try {
          const parsed = JSON.parse(responseText);

          message =
            parsed.error ??
            message;
        } catch {
          if (responseText) {
            message = responseText;
          }
        }

        throw new Error(message);
      }

      // Remove from UI after server confirms deletion
      setOpportunities((current) =>
        current.filter(
          (item) => item.id !== opportunity.id
        )
      );

      Alert.alert(
        "Deleted",
        "The opportunity has been deleted."
      );
    } catch (error: any) {
      console.error(
        "[opportunities] Delete error:",
        error
      );

      Alert.alert(
        "Delete failed",
        error?.message ??
          "Could not delete this opportunity."
      );
    } finally {
      if (isMounted.current) {
        setDeletingId(null);
      }
    }
  }, [deleteTarget, deletingId, getToken]);

  // ─── Filter ───────────────────────────────────────────────────────────────

  const filtered =
    filter === "All"
      ? opportunities
      : opportunities.filter(
          (opportunity) =>
            opportunity.type === filter
        );

  // ─── Post ─────────────────────────────────────────────────────────────────

  const handlePost = () => {
    if (!isVerified) {
      setShowPaywall(true);
    } else {
      router.push("/create-opportunity");
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Header */}

      <LinearGradient
        colors={[
          colors.purpleStart,
          colors.background,
        ]}
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.foreground },
            ]}
          >
            Opportunities
          </Text>

          <TouchableOpacity
            style={[
              styles.postBtn,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}
            onPress={handlePost}
            activeOpacity={0.85}
          >
            <Icon
              name="plus"
              size={16}
              color="#fff"
            />

            <Text style={styles.postBtnText}>
              Post
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterRow
          }
        >
          {FILTERS.map((item) => {
            const active = filter === item;

            const accent =
              item === "All"
                ? colors.primary
                : TYPE_COLORS[
                    item as OpportunityType
                  ];

            return (
              <TouchableOpacity
                key={item}
                onPress={() => setFilter(item)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active
                      ? accent + "22"
                      : colors.card,

                    borderColor: active
                      ? accent
                      : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: active
                        ? accent
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Feed */}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            color={colors.primary}
            size="large"
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom:
              insets.bottom + 80,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <OpportunityCard
              opportunity={item}
              colors={colors}
              currentUserId={userId}
              deleting={deletingId === item.id}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon
                name="briefcase"
                size={48}
                color={colors.mutedForeground}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.foreground },
                ]}
              >
                {filter === "All"
                  ? "No opportunities yet"
                  : `No ${filter} opportunities`}
              </Text>

              <Text
                style={[
                  styles.emptySub,
                  {
                    color:
                      colors.mutedForeground,
                  },
                ]}
              >
                Be the first to post a
                {filter !== "All"
                  ? ` ${filter.toLowerCase()}`
                  : "n opportunity"}
                !
              </Text>

              <TouchableOpacity
                style={[
                  styles.emptyBtn,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                ]}
                onPress={handlePost}
                activeOpacity={0.85}
              >
                <Icon
                  name="plus"
                  size={15}
                  color="#fff"
                />

                <Text
                  style={styles.emptyBtnText}
                >
                  Post Opportunity
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ─── Custom Delete Confirmation Modal ─────────────────────────────── */}

      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDeleteTarget(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.deleteModal,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Icon */}

            <View
              style={[
                styles.deleteIconCircle,
                {
                  backgroundColor:
                    "#EF444422",
                  borderColor:
                    "#EF444455",
                },
              ]}
            >
              <Icon
                name="trash-2"
                size={23}
                color="#EF4444"
              />
            </View>

            {/* Title */}

            <Text
              style={[
                styles.deleteModalTitle,
                {
                  color: colors.foreground,
                },
              ]}
            >
              Delete Opportunity?
            </Text>

            {/* Description */}

            <Text
              style={[
                styles.deleteModalDescription,
                {
                  color:
                    colors.mutedForeground,
                },
              ]}
            >
              Are you sure you want to delete this
              opportunity?
            </Text>

            {/* Opportunity name */}

            {deleteTarget && (
              <View
                style={[
                  styles.deleteTargetBox,
                  {
                    backgroundColor:
                      colors.background,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.deleteTargetText,
                    {
                      color:
                        colors.foreground,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {deleteTarget.title}
                </Text>

                <Text
                  style={[
                    styles.deleteTargetOrg,
                    {
                      color:
                        colors.mutedForeground,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {deleteTarget.organization}
                </Text>
              </View>
            )}

            {/* Warning */}

            <Text
              style={[
                styles.deleteWarning,
                {
                  color:
                    colors.mutedForeground,
                },
              ]}
            >
              This action cannot be undone.
            </Text>

            {/* Buttons */}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.cancelDeleteBtn,
                  {
                    backgroundColor:
                      colors.background,
                    borderColor:
                      colors.border,
                  },
                ]}
                onPress={() =>
                  setDeleteTarget(null)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.cancelDeleteText,
                    {
                      color:
                        colors.foreground,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={confirmDelete}
                activeOpacity={0.8}
              >
                <Icon
                  name="trash-2"
                  size={15}
                  color="#fff"
                />

                <Text
                  style={styles.confirmDeleteText}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verification Paywall */}

      <VerificationPaywallSheet
        visible={showPaywall}
        onClose={() =>
          setShowPaywall(false)
        }
        onVerified={() => {
          setShowPaywall(false);

          router.push(
            "/create-opportunity"
          );
        }}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },

  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  postBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },

  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },

  filterPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },

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

  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginBottom: 4,
  },

  cardOrg: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
  },

  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },

  cardMetaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },

  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  cardPoster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    flexWrap: "wrap",
  },

  cardPosterText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  viewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },

  viewBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  applyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor:
      "rgba(128,128,128,0.15)",
  },

  applyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },

  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textAlign: "center",
  },

  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 4,
  },

  emptyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },

  // ─── Delete Modal ────────────────────────────────────────────────────────

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  deleteModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
  },

  deleteIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  deleteModalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 8,
  },

  deleteModalDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },

  deleteTargetBox: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },

  deleteTargetText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },

  deleteTargetOrg: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 3,
  },

  deleteWarning: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 18,
  },

  modalButtons: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },

  cancelDeleteBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelDeleteText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  confirmDeleteBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  confirmDeleteText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});