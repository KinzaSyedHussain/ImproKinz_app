import { Icon } from "@/components/Icon";
import { Post, PostCard, normalizePost } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { XPStreakBadge } from "@/components/XPStreakBadge";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import { LinearGradient } from "expo-linear-gradient";
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
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PublicProfile = {
  uid?: string;
  displayName?: string;
  email?: string;
  photoURL?: string | null;

  // Support the existing banner field plus possible legacy names.
  bannerUrl?: string | null;
  bannerURL?: string | null;
  banner?: string | null;
  coverUrl?: string | null;
  coverPhotoURL?: string | null;

  bio?: string;
  subjects?: string[];
  studyGoal?: string;
  following?: string[];
  followers?: string[];
  xp?: number;
  streak?: number;
  verified?: boolean;
  isVerified?: boolean;
};

export default function PublicProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const rawProfileId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  // Decode the ID because opportunity-details encodes it before routing.
  const profileId = rawProfileId
    ? decodeURIComponent(rawProfileId)
    : undefined;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [tab, setTab] = useState<"posts" | "photos" | "videos">(
    "posts",
  );

  const [followerCount, setFollowerCount] = useState(0);

  const SCREEN_WIDTH = Dimensions.get("window").width;
  const GRID_COL = 3;
  const GRID_ITEM = (SCREEN_WIDTH - 4) / GRID_COL;

  useEffect(() => {
    if (!profileId || !db) {
      setLoadingProfile(false);
      setLoadingPosts(false);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        setLoadingProfile(true);

        let foundProfile: PublicProfile | null = null;

        // First: profiles/{id}
        const directSnap = await getDoc(
          doc(db, "profiles", profileId),
        );

        if (directSnap.exists()) {
          foundProfile = {
            uid: profileId,
            ...(directSnap.data() as PublicProfile),
          };
        } else {
          // Second: find profile where uid == id
          const uidSnap = await getDocs(
            query(
              collection(db, "profiles"),
              where("uid", "==", profileId),
            ),
          );

          if (!uidSnap.empty) {
            const profileDoc = uidSnap.docs[0];

            foundProfile = {
              uid: profileId,
              ...(profileDoc.data() as PublicProfile),
            };
          }
        }

        if (cancelled) return;

        if (foundProfile) {
          console.log(
            "PUBLIC PROFILE FOUND:",
            foundProfile,
          );

          console.log(
            "PUBLIC PROFILE PHOTO:",
            foundProfile.photoURL,
          );

          console.log(
            "PUBLIC PROFILE BANNER:",
            foundProfile.bannerUrl,
          );

          console.log(
            "PUBLIC PROFILE KEYS:",
            Object.keys(foundProfile),
          );

          setProfile(foundProfile);
        } else {
          console.warn(
            "PUBLIC PROFILE NOT FOUND:",
            profileId,
          );

          setProfile(null);
        }
      } catch (error) {
        console.warn(
          "Public profile error:",
          error,
        );

        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    async function loadPosts() {
      try {
        setLoadingPosts(true);

        const [postsSnap, followersSnap] =
          await Promise.all([
            getDocs(
              query(
                collection(db, "community_posts"),
                where(
                  "authorId",
                  "==",
                  profileId,
                ),
              ),
            ),

            getDocs(
              query(
                collection(db, "profiles"),
                where(
                  "following",
                  "array-contains",
                  profileId,
                ),
              ),
            ),
          ]);

        if (cancelled) return;

        const mappedPosts = postsSnap.docs
          .map((d) => {
            try {
              return normalizePost(
                d.id,
                d.data(),
              );
            } catch {
              return null;
            }
          })
          .filter(
            (p): p is Post => p !== null,
          );

        mappedPosts.sort(
          (a, b) =>
            b.createdAt - a.createdAt,
        );

        setPosts(mappedPosts);
        setFollowerCount(
          followersSnap.size,
        );
      } catch (error) {
        console.warn(
          "Public profile posts error:",
          error,
        );

        if (!cancelled) {
          setPosts([]);
          setFollowerCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoadingPosts(false);
        }
      }
    }

    loadProfile();
    loadPosts();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const topPad = insets.top;
  const botPad = 70 + insets.bottom;
  const BANNER_HEIGHT = 160;

  const photoPosts = posts.filter(
    (p) =>
      p.imageUrl ||
      p.mediaType === "image",
  );

  const videoPosts = posts.filter(
    (p) =>
      p.videoUrl ||
      p.mediaType === "video",
  );

  const isGrid =
    tab === "photos" ||
    tab === "videos";

  const gridItems =
    tab === "photos"
      ? photoPosts
      : videoPosts;

  const subjects = profile?.subjects || [];
  const goal = profile?.studyGoal || "";

  const followingCount =
    profile?.following?.length ?? 0;

  const isVerified =
    profile?.verified === true ||
    profile?.isVerified === true;

  // Supports multiple possible banner field names.
  const profileBanner =
    profile?.bannerUrl ||
    profile?.bannerURL ||
    profile?.banner ||
    profile?.coverUrl ||
    profile?.coverPhotoURL ||
    null;

  const TAB_CONFIG = [
    {
      key: "posts",
      icon: "grid",
      label: "Posts",
    },
    {
      key: "photos",
      icon: "image",
      label: "Photos",
    },
    {
      key: "videos",
      icon: "play-circle",
      label: "Videos",
    },
  ] as const;

  if (loadingProfile) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colors.mutedForeground,
            },
          ]}
        >
          Loading profile...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <Icon
          name="user"
          size={42}
          color={colors.mutedForeground}
        />

        <Text
          style={[
            styles.notFoundTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          Profile not found
        </Text>

        <Text
          style={[
            styles.notFoundText,
            {
              color:
                colors.mutedForeground,
            },
          ]}
        >
          This profile is no longer available.
        </Text>

        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          onPress={() => router.back()}
        >
          <Text
            style={styles.backButtonText}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <FlatList
        key={isGrid ? "grid" : "list"}
        data={isGrid ? [] : posts}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: botPad,
        }}
        ListHeaderComponent={
          <View>
            {/* Banner */}
            <View
              style={{
                height:
                  BANNER_HEIGHT +
                  topPad,
                position: "relative",
              }}
            >
              <View
                style={{
                  height:
                    BANNER_HEIGHT +
                    topPad,
                  overflow: "hidden",
                }}
              >
                {profileBanner ? (
                  <Image
                    source={{
                      uri: profileBanner,
                    }}
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        marginTop: topPad,
                      },
                    ]}
                    resizeMode="cover"
                    onError={() =>
                      console.warn(
                        "PUBLIC BANNER IMAGE FAILED:",
                        profileBanner,
                      )
                    }
                  />
                ) : (
                  <LinearGradient
                    colors={[
                      colors.purpleStart,
                      colors.purpleEnd,
                    ]}
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        marginTop: topPad,
                      },
                    ]}
                  />
                )}
              </View>

              {/* Back */}
              <TouchableOpacity
                style={[
                  styles.cornerBtn,
                  {
                    top: topPad + 10,
                    left: 12,
                  },
                ]}
                onPress={() =>
                  router.back()
                }
                activeOpacity={0.8}
              >
                <Icon
                  name="arrow-left"
                  size={17}
                  color="#fff"
                />
              </TouchableOpacity>

              {/* Avatar */}
              <View
                style={styles.avatarWrap}
              >
                <View
                  style={[
                    styles.avatarRing,
                    {
                      borderColor:
                        colors.card,
                    },
                  ]}
                >
                  <UserAvatar
                    photoURL={
                      profile.photoURL
                    }
                    displayName={
                      profile.displayName
                    }
                    size={80}
                  />
                </View>
              </View>
            </View>

            {/* Info */}
            <View
              style={[
                styles.infoBlock,
                {
                  backgroundColor:
                    colors.card,
                  borderBottomColor:
                    colors.border,
                },
              ]}
            >
              <View
                style={styles.nameRow}
              >
                <Text
                  style={[
                    styles.name,
                    {
                      color:
                        colors.foreground,
                    },
                  ]}
                >
                  {profile.displayName ||
                    "Study User"}
                </Text>

                {isVerified && (
                  <VerifiedBadge
                    size={16}
                  />
                )}
              </View>

              {profile.bio ? (
                <Text
                  style={[
                    styles.bio,
                    {
                      color:
                        colors.foreground,
                    },
                  ]}
                >
                  {profile.bio}
                </Text>
              ) : null}

              {subjects.length > 0 && (
                <View
                  style={styles.tagsRow}
                >
                  {subjects
                    .slice(0, 4)
                    .map((s) => (
                      <View
                        key={s}
                        style={[
                          styles.tag,
                          {
                            backgroundColor:
                              colors.muted,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            {
                              color:
                                colors.mutedForeground,
                            },
                          ]}
                        >
                          {s}
                        </Text>
                      </View>
                    ))}

                  {subjects.length > 4 && (
                    <View
                      style={[
                        styles.tag,
                        {
                          backgroundColor:
                            colors.muted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          {
                            color:
                              colors.mutedForeground,
                          },
                        ]}
                      >
                        +{subjects.length - 4}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {goal ? (
                <View
                  style={[
                    styles.goalBadge,
                    {
                      backgroundColor:
                        colors.accent +
                        "22",
                      borderColor:
                        colors.accent,
                    },
                  ]}
                >
                  <Icon
                    name="target"
                    size={12}
                    color={colors.accent}
                  />

                  <Text
                    style={[
                      styles.goalText,
                      {
                        color:
                          colors.accent,
                      },
                    ]}
                  >
                    {goal}
                  </Text>
                </View>
              ) : null}

              {/* Stats */}
              <View
                style={styles.statsRow}
              >
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() =>
                    router.push(
                      `/followers/${encodeURIComponent(
                        profileId!,
                      )}?tab=followers`,
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.statNum,
                      {
                        color:
                          colors.foreground,
                      },
                    ]}
                  >
                    {followerCount}
                  </Text>

                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          colors.mutedForeground,
                      },
                    ]}
                  >
                    Followers
                  </Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.statDivider,
                    {
                      backgroundColor:
                        colors.border,
                    },
                  ]}
                />

                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() =>
                    router.push(
                      `/followers/${encodeURIComponent(
                        profileId!,
                      )}?tab=following`,
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.statNum,
                      {
                        color:
                          colors.foreground,
                      },
                    ]}
                  >
                    {followingCount}
                  </Text>

                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          colors.mutedForeground,
                      },
                    ]}
                  >
                    Following
                  </Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.statDivider,
                    {
                      backgroundColor:
                        colors.border,
                    },
                  ]}
                />

                <View
                  style={styles.statItem}
                >
                  <Text
                    style={[
                      styles.statNum,
                      {
                        color:
                          colors.foreground,
                      },
                    ]}
                  >
                    {posts.length}
                  </Text>

                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          colors.mutedForeground,
                      },
                    ]}
                  >
                    Posts
                  </Text>
                </View>
              </View>
            </View>

            {/* XP / Streak */}
            <View
              style={{
                paddingVertical: 12,
              }}
            >
              <XPStreakBadge
                xp={profile.xp}
                streak={profile.streak}
              />
            </View>

            {/* Tabs */}
            <View
              style={[
                styles.tabBar,
                {
                  borderBottomColor:
                    colors.border,
                  backgroundColor:
                    colors.card,
                },
              ]}
            >
              {TAB_CONFIG.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.tabBtn,
                    tab === t.key && {
                      borderBottomColor:
                        colors.primary,
                      borderBottomWidth: 2.5,
                    },
                  ]}
                  onPress={() =>
                    setTab(t.key)
                  }
                >
                  <Icon
                    name={t.icon}
                    size={18}
                    color={
                      tab === t.key
                        ? colors.primary
                        : colors.mutedForeground
                    }
                  />

                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color:
                          tab === t.key
                            ? colors.primary
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingPosts && (
              <ActivityIndicator
                color={colors.primary}
                style={{
                  marginTop: 32,
                }}
              />
            )}

            {/* Grid */}
            {!loadingPosts &&
              isGrid &&
              (gridItems.length === 0 ? (
                <View
                  style={styles.empty}
                >
                  <Icon
                    name={
                      tab === "photos"
                        ? "image"
                        : "play-circle"
                    }
                    size={40}
                    color={
                      colors.mutedForeground
                    }
                  />

                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color:
                          colors.mutedForeground,
                      },
                    ]}
                  >
                    {tab === "photos"
                      ? "No photos yet"
                      : "No videos yet"}
                  </Text>
                </View>
              ) : (
                <View
                  style={styles.grid}
                >
                  {gridItems.map(
                    (post, i) => {
                      const imgSrc =
                        post.imageUrl ||
                        post.mediaUrl;

                      const vidSrc =
                        post.videoUrl ||
                        (post.mediaType ===
                        "video"
                          ? post.mediaUrl
                          : undefined);

                      const thumbSrc =
                        tab === "videos" &&
                        vidSrc
                          ? vidSrc.replace(
                              /\.(mp4|mov|webm)(\?.*)?$/i,
                              ".jpg",
                            )
                          : imgSrc;

                      return (
                        <TouchableOpacity
                          key={post.id}
                          onPress={() =>
                            router.push(
                              `/post/${post.id}`,
                            )
                          }
                          style={[
                            styles.gridCell,
                            {
                              width:
                                GRID_ITEM,
                              height:
                                GRID_ITEM,
                              marginRight:
                                i %
                                  GRID_COL ===
                                GRID_COL - 1
                                  ? 0
                                  : 2,
                              marginBottom: 2,
                              backgroundColor:
                                colors.muted,
                            },
                          ]}
                          activeOpacity={0.85}
                        >
                          {thumbSrc ? (
                            <Image
                              source={{
                                uri: thumbSrc,
                              }}
                              style={
                                StyleSheet.absoluteFill
                              }
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={[
                                StyleSheet.absoluteFill,
                                styles.gridPlaceholder,
                              ]}
                            >
                              <Icon
                                name={
                                  tab ===
                                  "videos"
                                    ? "play-circle"
                                    : "image"
                                }
                                size={28}
                                color={
                                  colors.mutedForeground
                                }
                              />
                            </View>
                          )}

                          {tab === "videos" && (
                            <View
                              style={
                                styles.videoOverlay
                              }
                            >
                              <Icon
                                name="play-solid"
                                size={20}
                                color="#fff"
                              />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>
              ))}
          </View>
        }
        renderItem={({ item }) => (
          <PostCard post={item} />
        )}
        ListEmptyComponent={
          !loadingPosts && !isGrid ? (
            <View
              style={styles.empty}
            >
              <Icon
                name="file-text"
                size={36}
                color={
                  colors.mutedForeground
                }
              />

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      colors.mutedForeground,
                  },
                ]}
              >
                No posts yet
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },

  notFoundTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 14,
  },

  notFoundText: {
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },

  backButton: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },

  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  cornerBtn: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor:
      "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarWrap: {
    position: "absolute",
    bottom: -40,
    left: 16,
  },

  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    overflow: "hidden",
  },

  infoBlock: {
    marginTop: 48,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
  },

  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },

  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  tagText: {
    fontSize: 12,
  },

  goalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 2,
  },

  goalText: {
    fontSize: 12,
    fontWeight: "500",
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statNum: {
    fontSize: 17,
    fontWeight: "700",
  },

  statLabel: {
    fontSize: 12,
    marginTop: 1,
  },

  statDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 4,
  },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginTop: 8,
    marginBottom: 0,
  },

  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 3,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },

  tabLabel: {
    fontSize: 11,
  },

  empty: {
    alignItems: "center",
    paddingTop: 40,
    gap: 10,
  },

  emptyText: {
    fontSize: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: 2,
  },

  gridCell: {
    overflow: "hidden",
    position: "relative",
  },

  gridPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  videoOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor:
      "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});