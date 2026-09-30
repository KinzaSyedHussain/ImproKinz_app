import { Icon } from "@/components/Icon";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";

import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
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
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  photoUrl?: string | null;
  avatarUrl?: string | null;
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

function timeAgo(ts: any): string {
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
    return `${Math.floor(diff / 60)}m ago`;
  }

  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`;
  }

  return `${Math.floor(diff / 86400)}d ago`;
}

export default function OpportunityDetailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useClerkAuth();

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const opportunityId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [opportunity, setOpportunity] =
    useState<Opportunity | null>(null);

  const [posterProfile, setPosterProfile] =
    useState<PosterProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingPoster, setLoadingPoster] = useState(false);

  /*
   * Load the poster's Firestore profile.
   *
   * We first try:
   * profiles/{postedBy}
   *
   * If that doesn't exist, we also try:
   * profiles where uid == postedBy
   *
   * This matches the lookup logic used by profile/[id].tsx.
   */
  const loadPosterProfile = async (posterId: string) => {
    try {
      setLoadingPoster(true);

      let foundProfile: PosterProfile | null = null;

      // First: profiles/{id}
      const directSnap = await getDoc(
        doc(db, "profiles", posterId)
      );

      if (directSnap.exists()) {
        foundProfile = {
          uid: posterId,
          ...(directSnap.data() as PosterProfile),
        };
      } else {
        // Second: find profile where uid == id
        const uidSnap = await getDocs(
          query(
            collection(db, "profiles"),
            where("uid", "==", posterId)
          )
        );

        if (!uidSnap.empty) {
          const profileDoc = uidSnap.docs[0];

          foundProfile = {
            uid: posterId,
            ...(profileDoc.data() as PosterProfile),
          };
        }
      }

      if (foundProfile) {
        console.log(
          "OPPORTUNITY POSTER PROFILE FOUND:",
          foundProfile
        );

        console.log(
          "OPPORTUNITY POSTER PHOTO:",
          foundProfile.photoURL
        );

        setPosterProfile(foundProfile);
      } else {
        console.warn(
          "OPPORTUNITY POSTER PROFILE NOT FOUND:",
          posterId
        );

        setPosterProfile(null);
      }
    } catch (error) {
      console.warn(
        "Opportunity poster profile error:",
        error
      );

      setPosterProfile(null);
    } finally {
      setLoadingPoster(false);
    }
  };

  useEffect(() => {
    const loadOpportunity = async () => {
      try {
        if (!opportunityId) {
          throw new Error("Opportunity ID is missing.");
        }

        const token = await getToken();

        if (!token) {
          throw new Error("Not authenticated.");
        }

        const response = await fetch(
          `${API_BASE}/api/opportunities/${encodeURIComponent(
            opportunityId
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ?? `HTTP ${response.status}`
          );
        }

        const loadedOpportunity =
          data.opportunity as Opportunity;

        setOpportunity(loadedOpportunity);

        /*
         * Load the profile separately.
         * If the profile cannot be loaded, the opportunity itself
         * still works.
         */
        if (loadedOpportunity?.postedBy) {
          await loadPosterProfile(
            loadedOpportunity.postedBy
          );
        }
      } catch (error: any) {
        console.error(
          "Opportunity details error:",
          error
        );

        Alert.alert(
          "Could not load opportunity",
          error?.message ?? "Something went wrong.",
          [
            {
              text: "Go back",
              onPress: () => router.back(),
            },
          ]
        );
      } finally {
        setLoading(false);
      }
    };

    loadOpportunity();
  }, [opportunityId, getToken, router]);

  const openApplication = () => {
    if (!opportunity?.link) return;

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

  const openPosterProfile = () => {
    if (!opportunity?.postedBy) {
      Alert.alert(
        "Profile unavailable",
        "The poster profile could not be found."
      );
      return;
    }

    router.push(
      `/profile/${encodeURIComponent(
        opportunity.postedBy
      )}` as any
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
        <Text
          style={[
            styles.errorText,
            {
              color: colors.foreground,
            },
          ]}
        >
          Opportunity not found.
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeColor =
    TYPE_COLORS[opportunity.type] ??
    colors.primary;

  /*
   * Use photoURL first, but also support the alternate field names
   * in case an older profile document uses one of them.
   */
  const posterPhoto =
    posterProfile?.photoURL ??
    posterProfile?.photoUrl ??
    posterProfile?.avatarUrl ??
    null;

  const posterName =
    posterProfile?.displayName ||
    opportunity.postedByName ||
    "Study User";

  const posterVerified =
    opportunity.postedByVerified ||
    posterProfile?.verified === true ||
    posterProfile?.isVerified === true;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backIcon}
          activeOpacity={0.7}
        >
          <Icon
            name="arrow-left"
            size={21}
            color={colors.foreground}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.topTitle,
            {
              color: colors.foreground,
            },
          ]}
          numberOfLines={1}
        >
          Opportunity
        </Text>

        <View style={styles.topSpacer} />
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
              backgroundColor:
                typeColor + "22",
              borderColor:
                typeColor + "55",
            },
          ]}
        >
          <Text
            style={[
              styles.typeBadgeText,
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
        <Text
          style={[
            styles.organization,
            {
              color:
                colors.mutedForeground,
            },
          ]}
        >
          {opportunity.organization}
        </Text>

        {/* Info */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Deadline */}
          <View style={styles.infoRow}>
            <View
              style={[
                styles.infoIcon,
                {
                  backgroundColor:
                    colors.primary + "18",
                },
              ]}
            >
              <Icon
                name="calendar"
                size={17}
                color={colors.primary}
              />
            </View>

            <View style={styles.infoText}>
              <Text
                style={[
                  styles.infoLabel,
                  {
                    color:
                      colors.mutedForeground,
                  },
                ]}
              >
                Deadline
              </Text>

              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      colors.foreground,
                  },
                ]}
              >
                {opportunity.deadline ===
                "Rolling"
                  ? "Rolling deadline"
                  : opportunity.deadline}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.infoDivider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          {/* Posted by */}
          <View style={styles.infoRow}>
            <View
              style={[
                styles.posterAvatarContainer,
                {
                  borderColor: colors.border,
                },
              ]}
            >
              <UserAvatar
                photoURL={posterPhoto}
                displayName={posterName}
                size={42}
              />
            </View>

            <TouchableOpacity
              style={styles.infoText}
              onPress={openPosterProfile}
              activeOpacity={0.65}
            >
              <Text
                style={[
                  styles.infoLabel,
                  {
                    color:
                      colors.mutedForeground,
                  },
                ]}
              >
                Posted by
              </Text>

              <View style={styles.posterRow}>
                <Text
                  style={[
                    styles.infoValue,
                    styles.posterName,
                    {
                      color:
                        colors.foreground,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {posterName}
                </Text>

                {posterVerified && (
                  <VerifiedBadge size={15} />
                )}

                <Icon
                  name="chevron-right"
                  size={15}
                  color={
                    colors.mutedForeground
                  }
                />
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.infoDivider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          {/* Posted time */}
          <View style={styles.infoRow}>
            <View
              style={[
                styles.infoIcon,
                {
                  backgroundColor:
                    colors.primary + "18",
                },
              ]}
            >
              <Icon
                name="clock"
                size={17}
                color={colors.primary}
              />
            </View>

            <View style={styles.infoText}>
              <Text
                style={[
                  styles.infoLabel,
                  {
                    color:
                      colors.mutedForeground,
                  },
                ]}
              >
                Posted
              </Text>

              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      colors.foreground,
                  },
                ]}
              >
                {timeAgo(
                  opportunity.createdAt
                )}
              </Text>
            </View>
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
            styles.descriptionCard,
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
            {opportunity.description ||
              "No description provided."}
          </Text>
        </View>

        {/* Application */}
        {!!opportunity.link && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.foreground,
                },
              ]}
            >
              Application
            </Text>

            <TouchableOpacity
              onPress={openApplication}
              activeOpacity={0.85}
              style={[
                styles.applyButton,
                {
                  backgroundColor:
                    colors.primary,
                },
              ]}
            >
              <Icon
                name="external-link"
                size={18}
                color="#fff"
              />

              <Text
                style={
                  styles.applyButtonText
                }
              >
                Open application link
              </Text>
            </TouchableOpacity>
          </>
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

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },

  backIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  topTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },

  topSpacer: {
    width: 40,
  },

  content: {
    padding: 16,
  },

  typeBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },

  typeBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    lineHeight: 33,
    marginBottom: 6,
  },

  organization: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginBottom: 20,
  },

  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  posterAvatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },

  infoText: {
    flex: 1,
  },

  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginBottom: 2,
  },

  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  posterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  posterName: {
    flexShrink: 1,
  },

  infoDivider: {
    height: 1,
    marginVertical: 13,
  },

  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 10,
  },

  descriptionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },

  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
  },

  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },

  applyButtonText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },

  errorText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },

  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 20,
  },

  backButtonText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});