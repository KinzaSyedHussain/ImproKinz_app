import { Icon } from "@/components/Icon";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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

interface PosterProfile {
  uid?: string;
  displayName?: string;
  photoURL?: string | null;
  bannerUrl?: string | null;
  verified?: boolean;
  isVerified?: boolean;
}

const TYPE_COLORS: Record<OpportunityType, string> = {
  Hackathon: "#7C3AED",
  Job: "#D97706",
  Internship: "#0D9488",
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "")
  : "http://localhost:3001";

function formatPostedTime(ts: any): string {
  let ms = Date.now();

  if (ts && typeof ts.toMillis === "function") {
    ms = ts.toMillis();
  } else if (ts && typeof ts === "object" && "_seconds" in ts) {
    ms = ts._seconds * 1000;
  } else if (typeof ts === "number") {
    ms = ts;
  }

  const diff = (Date.now() - ms) / 1000;

  if (diff < 60) return "just now";

  if (diff < 3600) {
    return `${Math.floor(diff / 60)} minutes ago`;
  }

  if (diff < 86400) {
    return `${Math.floor(diff / 3600)} hours ago`;
  }

  return `${Math.floor(diff / 86400)} days ago`;
}

export default function OpportunityDetailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const { getToken, userId } = useClerkAuth();

  const [opportunity, setOpportunity] =
    useState<Opportunity | null>(null);

  const [posterProfile, setPosterProfile] =
    useState<PosterProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadOpportunity = async () => {
      if (!id) {
        Alert.alert("Error", "Opportunity ID is missing.");
        router.back();
        return;
      }

      try {
        const token = await getToken();

        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(
          `${API_BASE}/api/opportunities/${encodeURIComponent(id)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(
            responseText || `HTTP ${response.status}`,
          );
        }

        const data = JSON.parse(responseText);
        const loadedOpportunity = data.opportunity as Opportunity;

        setOpportunity(loadedOpportunity);

        // ---------------------------------------------------------
        // Load the real poster profile from Firestore.
        // First try profiles/{postedBy}, then search by uid.
        // ---------------------------------------------------------
        if (loadedOpportunity?.postedBy && db) {
          try {
            const posterId = loadedOpportunity.postedBy;

            const directSnap = await getDoc(
              doc(db, "profiles", posterId),
            );

            if (directSnap.exists()) {
              setPosterProfile({
                uid: posterId,
                ...(directSnap.data() as PosterProfile),
              });
            } else {
              const uidSnap = await getDocs(
                query(
                  collection(db, "profiles"),
                  where("uid", "==", posterId),
                ),
              );

              if (!uidSnap.empty) {
                const profileDoc = uidSnap.docs[0];

                setPosterProfile({
                  uid: posterId,
                  ...(profileDoc.data() as PosterProfile),
                });
              } else {
                console.warn(
                  "Poster profile not found:",
                  posterId,
                );
                setPosterProfile(null);
              }
            }
          } catch (profileError) {
            console.warn(
              "Could not load poster profile:",
              profileError,
            );
            setPosterProfile(null);
          }
        }
      } catch (error: any) {
        console.error(
          "Opportunity details error:",
          error,
        );

        Alert.alert(
          "Could not load",
          error?.message ??
            "This opportunity could not be loaded.",
          [
            {
              text: "Go Back",
              onPress: () => router.back(),
            },
          ],
        );
      } finally {
        setLoading(false);
      }
    };

    loadOpportunity();
  }, [id]);

  const isOwner =
    !!userId &&
    !!opportunity &&
    opportunity.postedBy === userId;

  const openPosterProfile = () => {
    if (!opportunity?.postedBy) {
      Alert.alert(
        "Profile unavailable",
        "The poster profile could not be found.",
      );
      return;
    }

    router.push(
      `/profile/${encodeURIComponent(opportunity.postedBy)}` as any,
    );
  };

  const openLink = () => {
    if (!opportunity?.link) {
      return;
    }

    const url = opportunity.link.startsWith("http")
      ? opportunity.link
      : `https://${opportunity.link}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Could not open link",
        "The application link could not be opened.",
      );
    });
  };

  const handleDelete = () => {
    if (!opportunity || !isOwner) {
      return;
    }

    Alert.alert(
      "Delete Opportunity?",
      `Are you sure you want to delete "${opportunity.title}"? This cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);

            try {
              const token = await getToken();

              if (!token) {
                throw new Error("Not authenticated");
              }

              const response = await fetch(
                `${API_BASE}/api/opportunities/${encodeURIComponent(
                  opportunity.id,
                )}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              const responseText = await response.text();

              if (!response.ok) {
                throw new Error(
                  responseText ||
                    `HTTP ${response.status}`,
                );
              }

              Alert.alert(
                "Deleted",
                "The opportunity has been deleted.",
                [
                  {
                    text: "OK",
                    onPress: () =>
                      router.replace("/opportunities"),
                  },
                ],
              );
            } catch (error: any) {
              console.error(
                "Delete opportunity error:",
                error,
              );

              Alert.alert(
                "Delete failed",
                error?.message ??
                  "Could not delete this opportunity.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  if (!opportunity) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <Icon
          name="briefcase"
          size={48}
          color={colors.mutedForeground}
        />

        <Text
          style={[
            styles.errorTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          Opportunity not found
        </Text>

        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeColor =
    TYPE_COLORS[opportunity.type] ?? colors.primary;

  const posterPhoto =
    posterProfile?.photoURL ?? null;

  const posterName =
    posterProfile?.displayName ||
    opportunity.postedByName ||
    "Study User";

  const posterVerified =
    posterProfile?.verified === true ||
    posterProfile?.isVerified === true ||
    opportunity.postedByVerified === true;

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
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <Icon
            name="arrow-left"
            size={22}
            color={colors.foreground}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          Opportunity
        </Text>

        {isOwner ? (
          <TouchableOpacity
            style={[
              styles.iconButton,
              deleting && styles.disabledButton,
            ]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator
                size="small"
                color="#EF4444"
              />
            ) : (
              <Icon
                name="trash-2"
                size={20}
                color="#EF4444"
              />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 40,
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
              styles.typeText,
              {
                color: typeColor,
              },
            ]}
          >
            {opportunity.type}
          </Text>
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            {
              color: colors.foreground,
            },
          ]}
        >
          {opportunity.title}
        </Text>

        {/* Organization */}
        <View style={styles.organizationRow}>
          <Icon
            name="building-2"
            size={18}
            color={colors.mutedForeground}
          />

          <Text
            style={[
              styles.organization,
              {
                color: colors.mutedForeground,
              },
            ]}
          >
            {opportunity.organization}
          </Text>
        </View>

        {/* Deadline */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Icon
            name="calendar"
            size={20}
            color={typeColor}
          />

          <View style={styles.infoText}>
            <Text
              style={[
                styles.infoLabel,
                {
                  color: colors.mutedForeground,
                },
              ]}
            >
              Deadline
            </Text>

            <Text
              style={[
                styles.infoValue,
                {
                  color: colors.foreground,
                },
              ]}
            >
              {opportunity.deadline === "Rolling"
                ? "Rolling deadline"
                : opportunity.deadline}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          About this opportunity
        </Text>

        <View
          style={[
            styles.descriptionBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.description,
              {
                color: colors.foreground,
              },
            ]}
          >
            {opportunity.description}
          </Text>
        </View>

        {/* Posted by */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          Posted by
        </Text>

        <TouchableOpacity
          style={[
            styles.posterBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={openPosterProfile}
          activeOpacity={0.7}
        >
          <UserAvatar
            photoURL={posterPhoto}
            displayName={posterName}
            size={44}
            style={styles.realAvatar}
          />

          <View style={styles.posterInfo}>
            <View style={styles.posterNameRow}>
              <Text
                style={[
                  styles.posterName,
                  {
                    color: colors.foreground,
                  },
                ]}
                numberOfLines={1}
              >
                {posterName}
              </Text>

              {posterVerified && (
                <VerifiedBadge size={15} />
              )}
            </View>

            <Text
              style={[
                styles.postedTime,
                {
                  color: colors.mutedForeground,
                },
              ]}
            >
              Posted{" "}
              {formatPostedTime(
                opportunity.createdAt,
              )}
            </Text>
          </View>

          <Icon
            name="chevron-right"
            size={18}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        {/* Application button */}
        {!!opportunity.link && (
          <TouchableOpacity
            style={[
              styles.applyButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={openLink}
            activeOpacity={0.85}
          >
            <Icon
              name="external-link"
              size={18}
              color="#fff"
            />

            <Text style={styles.applyButtonText}>
              View Opportunity
            </Text>

            <Icon
              name="arrow-up-right"
              size={17}
              color="#fff"
            />
          </TouchableOpacity>
        )}

        {/* Owner delete button */}
        {isOwner && (
          <TouchableOpacity
            style={[
              styles.deleteFullButton,
              {
                borderColor: "#EF444455",
                backgroundColor: "#EF444411",
              },
            ]}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Icon
              name="trash-2"
              size={17}
              color="#EF4444"
            />

            <Text
              style={styles.deleteFullButtonText}
            >
              Delete Opportunity
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },

  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },

  content: {
    padding: 20,
  },

  typeBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 14,
  },

  typeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 27,
    lineHeight: 34,
    marginBottom: 10,
  },

  organizationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 22,
  },

  organization: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 1,
    borderRadius: 14,
    padding: 15,
    marginBottom: 24,
  },

  infoText: {
    flex: 1,
  },

  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 3,
  },

  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },

  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    marginBottom: 10,
  },

  descriptionBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },

  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
  },

  posterBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },

  realAvatar: {
    marginRight: 12,
  },

  posterInfo: {
    flex: 1,
  },

  posterNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  posterName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    flexShrink: 1,
  },

  postedTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 3,
  },

  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 13,
    paddingVertical: 14,
    marginBottom: 12,
  },

  applyButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },

  deleteFullButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 13,
  },

  deleteFullButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#EF4444",
  },

  backButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 18,
  },

  backButtonText: {
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    fontSize: 14,
  },

  errorTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginTop: 14,
  },
});