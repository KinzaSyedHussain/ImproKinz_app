import { Icon } from "@/components/Icon";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

type HubTab = "overview" | "circles" | "buddies" | "resources" | "focus" | "activity";

interface Circle { id: string; name: string; subject: string; description?: string; memberIds?: string[]; }
interface Buddy { uid: string; displayName: string; photoURL?: string; subjects?: string[]; overlap?: string[]; }
interface Resource { id: string; title: string; subject: string; url: string; description?: string; }
interface FocusRoom { id: string; subject: string; participantIds?: string[]; }
interface ActivityItem { id: string; message?: string; type?: string; createdAt?: { seconds?: number } | number; read?: boolean; }

export default function StudyHubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useClerkAuth();
  const { profile } = useAuth();
  const [tab, setTab] = useState<HubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [rooms, setRooms] = useState<FocusRoom[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [modal, setModal] = useState<"circle" | "resource" | "room" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");

  // Use ref so request/load don't cause dependency-loop re-renders
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const request = async (path: string, options?: RequestInit) => {
    const token = await getTokenRef.current().catch(() => null);
    if (!token) throw Object.assign(new Error("Please sign in to use the Study Hub."), { authError: true });
    const response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options?.headers || {}) },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
    return result;
  };

  const load = async () => {
    setLoading(true);
    setAuthError(false);
    try {
      const [circleData, buddyData, resourceData, roomData, activityData] = await Promise.all([
        request("/study/circles"),
        request("/study/buddies"),
        request("/study/resources"),
        request("/study/focus-rooms"),
        request("/study/activity"),
      ]);
      setCircles(circleData.circles || []);
      setBuddies(buddyData.buddies || []);
      setResources(resourceData.resources || []);
      setRooms(roomData.rooms || []);
      setActivity(activityData.activity || []);
    } catch (error: any) {
      if (error?.authError) { setAuthError(true); } else {
        Alert.alert("Study Hub", error?.message || "Could not load the Study Hub.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Run once on mount — pass load as a stable ref to avoid re-render loops
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current(); }, []);

  const closeModal = () => {
    setModal(null);
    setName(""); setSubject(""); setDescription(""); setUrl("");
  };

  const submitModal = async () => {
    setSubmitting(true);
    try {
      if (modal === "circle") {
        if (!name.trim()) { Alert.alert("Required", "Enter a circle name."); return; }
        await request("/study/circles", { method: "POST", body: JSON.stringify({ name, subject, description }) });
      } else if (modal === "resource") {
        if (!name.trim() || !url.trim()) { Alert.alert("Required", "Enter a title and URL."); return; }
        await request("/study/resources", { method: "POST", body: JSON.stringify({ title: name, subject, description, url }) });
      } else if (modal === "room") {
        await request("/study/focus-rooms", { method: "POST", body: JSON.stringify({ subject: subject.trim() || "Open study" }) });
      }
      closeModal();
      await load();
    } catch (error: any) {
      Alert.alert("Could not save", error?.message || "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const joinCircle = async (circle: Circle) => {
    try {
      await request(`/study/circles/${circle.id}/join`, { method: "POST" });
      await load();
    } catch (e: any) { Alert.alert("Circle", e?.message || "Could not join."); }
  };

  const joinRoom = async (room: FocusRoom) => {
    try {
      await request(`/study/focus-rooms/${room.id}/join`, { method: "POST" });
      router.push("/pomodoro");
    } catch (e: any) { Alert.alert("Focus room", e?.message || "Could not join."); }
  };

  const connectBuddy = async (buddy: Buddy) => {
    try {
      await request("/study/connect", { method: "POST", body: JSON.stringify({ targetId: buddy.uid }) });
      Alert.alert("Request sent", `Connection request sent to ${buddy.displayName}.`);
    } catch (e: any) { Alert.alert("Connection", e?.message || "Could not send request."); }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const title = tab === "overview" ? "Study Hub" : tab === "focus" ? "Focus rooms" : tab === "activity" ? "Activity" : tab[0].toUpperCase() + tab.slice(1);

  const TABS: Array<[HubTab, string, string]> = [
    ["overview", "Overview", "grid"],
    ["circles", "Circles", "users"],
    ["buddies", "Buddies", "user-plus"],
    ["resources", "Resources", "book-open"],
    ["focus", "Focus rooms", "target"],
    ["activity", "Activity", "bell"],
  ];

  if (!loading && authError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Icon name="arrow-left" size={21} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Study Hub</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.authPrompt}>
          <View style={[styles.authIcon, { backgroundColor: colors.primary + "18" }]}>
            <Icon name="users" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.authTitle, { color: colors.foreground }]}>Sign in to access Study Hub</Text>
          <Text style={[styles.authBody, { color: colors.mutedForeground }]}>
            Connect with study partners, join circles, share resources, and track your progress together.
          </Text>
          <TouchableOpacity onPress={() => router.push("/auth" as any)} style={[styles.authBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.authBtnText, { color: colors.primaryForeground }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="arrow-left" size={21} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Learn together, stay focused</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.iconBtn}>
          <Icon name="refresh-cw" size={19} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map(([value, label, icon]) => (
            <TouchableOpacity
              key={value}
              onPress={() => setTab(value)}
              style={[styles.tab, { backgroundColor: tab === value ? colors.primary : colors.muted, borderColor: tab === value ? colors.primary : colors.border }]}
            >
              <Icon name={icon} size={14} color={tab === value ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.tabText, { color: tab === value ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <>
            {/* ── Overview ─────────────────────────────────── */}
            {tab === "overview" && (
              <>
                {/* Hero banner */}
                <View style={[styles.heroBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <View style={[styles.heroIconWrap, { backgroundColor: colors.primary + "20" }]}>
                    <Icon name="users" size={28} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heroEyebrow, { color: colors.primary }]}>YOUR STUDY COMMUNITY</Text>
                    <Text style={[styles.heroTitle, { color: colors.foreground }]}>Make progress together.</Text>
                    <Text style={[styles.heroBody, { color: colors.mutedForeground }]}>
                      Find people studying the same subjects, share useful links, and focus in shared rooms.
                    </Text>
                  </View>
                </View>

                {/* Quick access grid */}
                <View style={styles.quickGrid}>
                  {([
                    ["circles", "Study circles", `${circles.length} available`, "users", colors.primary],
                    ["buddies", "Study buddies", `${buddies.length} matches`, "user-plus", "#10B981"],
                    ["focus", "Focus rooms", `${rooms.length} open now`, "target", "#38BDF8"],
                    ["resources", "Resources", `${resources.length} shared`, "book-open", "#F59E0B"],
                  ] as const).map(([key, label, sub, icon, color]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setTab(key as HubTab)}
                      style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <View style={[styles.quickIcon, { backgroundColor: color + "18" }]}>
                        <Icon name={icon} size={20} color={color} />
                      </View>
                      <Text style={[styles.quickTitle, { color: colors.foreground }]}>{label}</Text>
                      <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Momentum section */}
                <SectionLabel title="Keep your momentum" colors={colors} />
                <NavCard
                  icon="target" iconColor={colors.primary}
                  title="Study goals" sub="Track exams, assignments, and weekly targets"
                  onPress={() => router.push("/progress")} colors={colors}
                />
                <NavCard
                  icon="play" iconColor="#38BDF8"
                  title="Pomodoro focus" sub="Start a private session or join a shared room"
                  onPress={() => router.push("/pomodoro")} colors={colors}
                />

                {/* Activity preview */}
                {activity.length > 0 && (
                  <>
                    <SectionLabel title="Recent activity" colors={colors} />
                    {activity.slice(0, 3).map((item) => (
                      <ActivityRow key={item.id} item={item} colors={colors} />
                    ))}
                    <TouchableOpacity onPress={() => setTab("activity")} style={styles.seeAll}>
                      <Text style={[styles.seeAllText, { color: colors.primary }]}>See all activity</Text>
                      <Icon name="chevron-right" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            {/* ── Circles ──────────────────────────────────── */}
            {tab === "circles" && (
              <SectionWithAction
                title="Study circles"
                sub="Small communities for focused subjects"
                buttonLabel="Create circle"
                onAction={() => setModal("circle")}
                colors={colors}
              >
                {circles.length === 0 ? (
                  <EmptyState icon="users" text="No circles yet. Start the first one for your subject." colors={colors} />
                ) : circles.map((circle) => (
                  <View key={circle.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.cardIcon, { backgroundColor: colors.primary + "18" }]}>
                      <Icon name="users" size={19} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{circle.name}</Text>
                      <Text style={[styles.cardMeta, { color: colors.primary }]}>{circle.subject} · {circle.memberIds?.length || 0} members</Text>
                      {!!circle.description && <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>{circle.description}</Text>}
                    </View>
                    <TouchableOpacity onPress={() => joinCircle(circle)} style={[styles.pill, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.pillText, { color: colors.primaryForeground }]}>Join</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </SectionWithAction>
            )}

            {/* ── Buddies ──────────────────────────────────── */}
            {tab === "buddies" && (
              <View style={styles.sectionWrap}>
                <SectionLabel title="Study buddies" colors={colors} />
                <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                  Matched by subjects in your profile.
                </Text>
                {buddies.length === 0 ? (
                  <EmptyState icon="user-plus" text="Add subjects to your profile to find study buddies." colors={colors} />
                ) : buddies.map((buddy) => (
                  <View key={buddy.uid} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <UserAvatar photoURL={buddy.photoURL} displayName={buddy.displayName} size={42} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{buddy.displayName}</Text>
                      <Text style={[styles.cardMeta, { color: colors.primary }]}>
                        {buddy.overlap?.length || 0} shared subject{buddy.overlap?.length === 1 ? "" : "s"}
                      </Text>
                      <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {(buddy.subjects || []).join(" · ") || "Student"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => connectBuddy(buddy)}
                      style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 }]}
                    >
                      <Icon name="user-plus" size={13} color={colors.primary} />
                      <Text style={[styles.pillText, { color: colors.primary }]}>Connect</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── Resources ────────────────────────────────── */}
            {tab === "resources" && (
              <SectionWithAction
                title="Study resources"
                sub="Useful links shared by learners"
                buttonLabel="Share link"
                onAction={() => setModal("resource")}
                colors={colors}
              >
                {resources.length === 0 ? (
                  <EmptyState icon="book-open" text="Share the first useful resource with your community." colors={colors} />
                ) : resources.map((resource) => (
                  <TouchableOpacity
                    key={resource.id}
                    onPress={() => Linking.openURL(resource.url).catch(() => Alert.alert("Cannot open link", "The URL may be invalid."))}
                    style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.cardIcon, { backgroundColor: "#F59E0B18" }]}>
                      <Icon name="external-link" size={19} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{resource.title}</Text>
                      <Text style={[styles.cardMeta, { color: colors.primary }]}>{resource.subject}</Text>
                      {!!resource.description && <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>{resource.description}</Text>}
                    </View>
                    <Icon name="chevron-right" size={17} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </SectionWithAction>
            )}

            {/* ── Focus rooms ──────────────────────────────── */}
            {tab === "focus" && (
              <SectionWithAction
                title="Focus rooms"
                sub="Study quietly alongside other learners"
                buttonLabel="Open room"
                onAction={() => setModal("room")}
                colors={colors}
              >
                {rooms.length === 0 ? (
                  <EmptyState icon="target" text="No active rooms. Open one and invite your study buddies." colors={colors} />
                ) : rooms.map((room) => (
                  <View key={room.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.cardIcon, { backgroundColor: "#38BDF818" }]}>
                      <Icon name="clock" size={19} color="#38BDF8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{room.subject}</Text>
                      <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                        {room.participantIds?.length || 0} studying now · Pomodoro room
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => joinRoom(room)}
                      style={[styles.pill, { backgroundColor: "#38BDF8" }]}
                    >
                      <Text style={[styles.pillText, { color: "#082F49" }]}>Join</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </SectionWithAction>
            )}

            {/* ── Activity ─────────────────────────────────── */}
            {tab === "activity" && (
              <View style={styles.sectionWrap}>
                <SectionLabel title="Recent activity" colors={colors} />
                {activity.length === 0 ? (
                  <EmptyState icon="bell" text="No recent activity. Reactions, best answers, and buddy requests will appear here." colors={colors} />
                ) : activity.map((item) => (
                  <ActivityRow key={item.id} item={item} colors={colors} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Create modal ─────────────────────────────── */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {modal === "circle" ? "Create a study circle" : modal === "resource" ? "Share a resource" : "Open a focus room"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Icon name="x" size={21} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {modal !== "room" && (
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder={modal === "circle" ? "Circle name" : "Resource title"}
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
              />
            )}
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Subject (e.g. Physics, Maths)"
              placeholderTextColor={colors.mutedForeground}
              value={subject}
              onChangeText={setSubject}
            />
            {modal === "resource" && (
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="https://resource-link.com"
                placeholderTextColor={colors.mutedForeground}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            )}
            {modal !== "room" && (
              <TextInput
                style={[styles.input, styles.multiline, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="Short description (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            )}
            <TouchableOpacity
              onPress={submitModal}
              disabled={submitting}
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
            >
              {submitting
                ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                : <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                    {modal === "circle" ? "Create circle" : modal === "resource" ? "Share resource" : "Open room"}
                  </Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function SectionLabel({ title, colors }: { title: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <Text style={[sectionLabelStyle.text, { color: colors.foreground }]}>{title}</Text>
  );
}
const sectionLabelStyle = StyleSheet.create({ text: { fontSize: 15, fontWeight: "700", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 } });

function SectionWithAction({
  title, sub, buttonLabel, onAction, colors, children,
}: {
  title: string; sub: string; buttonLabel: string; onAction: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>; children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionActionRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionActionTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{sub}</Text>
        </View>
        <TouchableOpacity onPress={onAction} style={[styles.pill, { backgroundColor: colors.primary }]}>
          <Text style={[styles.pillText, { color: colors.primaryForeground }]}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

function NavCard({
  icon, iconColor, title, sub, onPress, colors,
}: {
  icon: string; iconColor: string; title: string; sub: string; onPress: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.cardIcon, { backgroundColor: iconColor + "18" }]}>
        <Icon name={icon} size={19} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{sub}</Text>
      </View>
      <Icon name="chevron-right" size={17} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function EmptyState({
  icon, text, colors,
}: {
  icon: string; text: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Icon name={icon} size={28} color={colors.mutedForeground} />
      <Text style={[styles.cardSub, { color: colors.mutedForeground, textAlign: "center" }]}>{text}</Text>
    </View>
  );
}

function ActivityRow({
  item, colors,
}: {
  item: ActivityItem; colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const iconName = item.type === "reaction" ? "heart" : item.type === "best_answer" ? "check-circle" : "bell";
  const iconColor = item.type === "reaction" ? "#A855F7" : item.type === "best_answer" ? "#10B981" : colors.primary;
  const ts = typeof item.createdAt === "number" ? item.createdAt : (item.createdAt?.seconds ?? 0) * 1000;
  const diff = Date.now() - ts;
  const ago = diff < 60000 ? "just now" : diff < 3600000 ? `${Math.floor(diff / 60000)}m ago` : diff < 86400000 ? `${Math.floor(diff / 3600000)}h ago` : `${Math.floor(diff / 86400000)}d ago`;

  return (
    <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardIcon, { backgroundColor: iconColor + "18" }]}>
        <Icon name={iconName} size={17} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardSub, { color: colors.foreground }]}>{item.message || "New activity"}</Text>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground, marginTop: 2 }]}>{ago}</Text>
      </View>
      {!item.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 13, borderBottomWidth: 1 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 19, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },

  loadingWrap: { paddingTop: 64, alignItems: "center" },

  authPrompt: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 },
  authIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  authTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  authBody: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  authBtn: { paddingHorizontal: 32, paddingVertical: 13, borderRadius: 11, marginTop: 6 },
  authBtnText: { fontSize: 15, fontWeight: "700" },

  tabRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  tabText: { fontSize: 12, fontWeight: "600" },

  heroBanner: {
    marginHorizontal: 14, marginTop: 4, marginBottom: 16, padding: 16,
    borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "flex-start", gap: 14,
  },
  heroIconWrap: { width: 48, height: 48, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  heroEyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 3 },
  heroTitle: { fontSize: 18, fontWeight: "700" },
  heroBody: { fontSize: 13, lineHeight: 19, marginTop: 4 },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 14 },
  quickCard: { width: "47%", padding: 13, borderRadius: 13, borderWidth: 1 },
  quickIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, marginBottom: 10 },
  quickTitle: { fontSize: 13, fontWeight: "700" },
  quickSub: { fontSize: 11, marginTop: 3 },

  sectionWrap: { paddingBottom: 16 },
  sectionActionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  sectionActionTitle: { fontSize: 15, fontWeight: "700" },
  sectionSub: { fontSize: 13, paddingHorizontal: 16, marginBottom: 8, lineHeight: 19 },

  listCard: {
    marginHorizontal: 14, marginTop: 8, padding: 13,
    borderRadius: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12,
  },
  cardIcon: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "600" },
  cardMeta: { fontSize: 12, marginTop: 2 },
  cardSub: { fontSize: 12, lineHeight: 17, marginTop: 2 },

  pill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8,
  },
  pillText: { fontSize: 12, fontWeight: "700" },

  emptyCard: {
    margin: 14, padding: 28, borderRadius: 13, borderWidth: 1,
    alignItems: "center", gap: 12,
  },

  seeAll: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 16, paddingVertical: 10, alignSelf: "flex-start",
  },
  seeAllText: { fontSize: 13, fontWeight: "600" },

  unreadDot: { width: 8, height: 8, borderRadius: 4 },

  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  modalCard: {
    padding: 20, paddingBottom: 32,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, gap: 11,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14 },
  multiline: { minHeight: 76, textAlignVertical: "top" },
  submitBtn: { alignItems: "center", paddingVertical: 13, borderRadius: 11, marginTop: 4 },
  submitBtnText: { fontSize: 15, fontWeight: "700" },
});
