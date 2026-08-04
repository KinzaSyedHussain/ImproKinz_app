import { Icon } from "@/components/Icon";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
  const [circles, setCircles] = useState<Circle[]>([]);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [rooms, setRooms] = useState<FocusRoom[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [modal, setModal] = useState<"circle" | "resource" | "room" | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");

  const request = async (path: string, options?: RequestInit) => {
    const token = await getToken().catch(() => null);
    if (!token) throw new Error("Please sign in to use the Study Hub.");
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
      Alert.alert("Study Hub", error?.message || "Could not load the Study Hub.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const closeModal = () => {
    setModal(null);
    setName("");
    setSubject("");
    setDescription("");
    setUrl("");
  };

  const submitModal = async () => {
    try {
      if (modal === "circle") {
        await request("/study/circles", { method: "POST", body: JSON.stringify({ name, subject, description }) });
      } else if (modal === "resource") {
        await request("/study/resources", { method: "POST", body: JSON.stringify({ title: name, subject, description, url }) });
      } else if (modal === "room") {
        await request("/study/focus-rooms", { method: "POST", body: JSON.stringify({ subject: subject || "Open study" }) });
      }
      closeModal();
      await load();
    } catch (error: any) {
      Alert.alert("Could not save", error?.message || "Try again.");
    }
  };

  const joinCircle = async (circle: Circle) => {
    try {
      await request(`/study/circles/${circle.id}/join`, { method: "POST" });
      await load();
    } catch (error: any) { Alert.alert("Circle", error?.message || "Could not update membership."); }
  };

  const joinRoom = async (room: FocusRoom) => {
    try {
      await request(`/study/focus-rooms/${room.id}/join`, { method: "POST" });
      router.push("/pomodoro");
    } catch (error: any) { Alert.alert("Focus room", error?.message || "Could not join this room."); }
  };

  const connectBuddy = async (buddy: Buddy) => {
    try {
      await request("/study/connect", { method: "POST", body: JSON.stringify({ targetId: buddy.uid }) });
      Alert.alert("Request sent", `You can now study with ${buddy.displayName}.`);
    } catch (error: any) {
      Alert.alert("Connection request", error?.message || "Could not send the request.");
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const title = tab === "overview" ? "Study Hub" : tab === "focus" ? "Focus rooms" : tab[0].toUpperCase() + tab.slice(1);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={21} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Learn together, stay focused</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.backButton}>
          <Icon name="refresh-cw" size={19} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {([
            ["overview", "Overview", "grid"],
            ["circles", "Circles", "users"],
            ["buddies", "Buddies", "user-plus"],
            ["resources", "Resources", "book-open"],
            ["focus", "Focus rooms", "target"],
            ["activity", "Activity", "bell"],
          ] as const).map(([value, label, icon]) => (
            <TouchableOpacity key={value} onPress={() => setTab(value)} style={[styles.tab, { backgroundColor: tab === value ? colors.primary : colors.muted, borderColor: tab === value ? colors.primary : colors.border }]}>
              <Icon name={icon} size={15} color={tab === value ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.tabText, { color: tab === value ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View> : (
          <>
            {tab === "overview" && (
              <>
                <View style={[styles.hero, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heroEyebrow, { color: colors.primary }]}>YOUR STUDY COMMUNITY</Text>
                    <Text style={[styles.heroTitle, { color: colors.foreground }]}>Make progress together.</Text>
                    <Text style={[styles.heroBody, { color: colors.mutedForeground }]}>Find people who study what you study, share useful resources, and focus without the noise.</Text>
                  </View>
                  <Text style={styles.heroEmoji}>📚</Text>
                </View>
                <View style={styles.quickGrid}>
                  {[
                    ["circles", "Study circles", `${circles.length} available`, "users", () => setTab("circles")],
                    ["buddies", "Study buddies", `${buddies.length} matches`, "user-plus", () => setTab("buddies")],
                    ["focus", "Focus rooms", `${rooms.length} open now`, "target", () => setTab("focus")],
                    ["resources", "Resources", `${resources.length} shared`, "book-open", () => setTab("resources")],
                  ].map(([key, label, sub, icon, onPress]) => (
                    <TouchableOpacity key={key as string} onPress={onPress as () => void} style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={[styles.quickIcon, { backgroundColor: colors.primary + "18" }]}><Icon name={icon as string} size={21} color={colors.primary} /></View>
                      <Text style={[styles.quickTitle, { color: colors.foreground }]}>{label as string}</Text>
                      <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>{sub as string}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <SectionTitle title="Keep your momentum" color={colors} />
                <TouchableOpacity onPress={() => router.push("/progress")} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Icon name="target" size={21} color={colors.primary} />
                  <View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Study goals</Text><Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Track exams, assignments, and weekly targets</Text></View>
                  <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/pomodoro")} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Icon name="play" size={21} color="#38BDF8" />
                  <View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Pomodoro focus</Text><Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Start a private session or join a shared room</Text></View>
                  <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
                <SectionTitle title="Saved collections" color={colors} />
                <View style={styles.collectionRow}>
                  {["Exam revision", "Important formulas", "Read later"].map((item, index) => (
                    <TouchableOpacity key={item} onPress={() => router.push("/(tabs)/profile")} style={[styles.collection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={styles.collectionEmoji}>{["📝", "🧮", "🔖"][index]}</Text>
                      <Text style={[styles.collectionTitle, { color: colors.foreground }]}>{item}</Text>
                      <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Saved posts</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <SectionTitle title="Recent activity" color={colors} />
                <ActivitySection activity={activity.slice(0, 3)} colors={colors} />
              </>
            )}
            {tab === "circles" && <CircleSection circles={circles} colors={colors} onCreate={() => setModal("circle")} onJoin={joinCircle} />}
            {tab === "buddies" && <BuddySection buddies={buddies} colors={colors} onConnect={connectBuddy} />}
            {tab === "resources" && <ResourceSection resources={resources} colors={colors} onCreate={() => setModal("resource")} />}
            {tab === "focus" && <FocusSection rooms={rooms} colors={colors} onCreate={() => setModal("room")} onJoin={joinRoom} />}
            {tab === "activity" && <ActivitySection activity={activity} colors={colors} />}
          </>
        )}
      </ScrollView>

      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.foreground }]}>{modal === "circle" ? "Create a study circle" : modal === "resource" ? "Share a resource" : "Open a focus room"}</Text><TouchableOpacity onPress={closeModal}><Icon name="x" size={21} color={colors.mutedForeground} /></TouchableOpacity></View>
            {modal !== "room" && <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} placeholder={modal === "circle" ? "Circle name" : "Resource title"} placeholderTextColor={colors.mutedForeground} value={name} onChangeText={setName} />}
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} placeholder="Subject" placeholderTextColor={colors.mutedForeground} value={subject} onChangeText={setSubject} />
            {modal === "resource" && <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} placeholder="https://resource-link.com" placeholderTextColor={colors.mutedForeground} value={url} onChangeText={setUrl} autoCapitalize="none" />}
            {modal !== "room" && <TextInput style={[styles.input, styles.multiline, { color: colors.foreground, borderColor: colors.border }]} placeholder="Short description (optional)" placeholderTextColor={colors.mutedForeground} value={description} onChangeText={setDescription} multiline />}
            <TouchableOpacity onPress={submitModal} style={[styles.submitButton, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>{modal === "circle" ? "Create circle" : modal === "resource" ? "Share resource" : "Open room"}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionTitle({ title, color }: { title: string; color: ReturnType<typeof useColors> }) {
  return <Text style={[styles.sectionTitle, { color: color.foreground }]}>{title}</Text>;
}

function CircleSection({ circles, colors, onCreate, onJoin }: { circles: Circle[]; colors: ReturnType<typeof useColors>; onCreate: () => void; onJoin: (circle: Circle) => void }) {
  return <View style={styles.sectionWrap}><HeaderAction title="Study circles" sub="Small communities for focused subjects" button="Create circle" onPress={onCreate} colors={colors} />{circles.length === 0 ? <Empty text="No circles yet. Start the first one for your subject." colors={colors} /> : circles.map((circle) => <View key={circle.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.circleIcon, { backgroundColor: colors.primary + "18" }]}><Text style={{ fontSize: 20 }}>👥</Text></View><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{circle.name}</Text><Text style={[styles.cardSub, { color: colors.primary }]}>{circle.subject} · {circle.memberIds?.length || 0} members</Text>{!!circle.description && <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>{circle.description}</Text>}</View><TouchableOpacity onPress={() => onJoin(circle)} style={[styles.smallButton, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: "700" }}>Join</Text></TouchableOpacity></View>)}</View>;
}

function BuddySection({ buddies, colors, onConnect }: { buddies: Buddy[]; colors: ReturnType<typeof useColors>; onConnect: (buddy: Buddy) => void }) {
  return <View style={styles.sectionWrap}><SectionTitle title="Study buddies" color={colors} /><Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Matched by subjects in your profile.</Text>{buddies.length === 0 ? <Empty text="Add subjects to your profile to find study buddies." colors={colors} /> : buddies.map((buddy) => <View key={buddy.uid} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}><UserAvatar photoURL={buddy.photoURL} displayName={buddy.displayName} size={42} /><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{buddy.displayName}</Text><Text style={[styles.cardSub, { color: colors.primary }]}>{buddy.overlap?.length || 0} shared subject{buddy.overlap?.length === 1 ? "" : "s"}</Text><Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>{(buddy.subjects || []).join(" · ") || "Student"}</Text></View><TouchableOpacity onPress={() => onConnect(buddy)} style={[styles.smallButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>Connect</Text></TouchableOpacity></View>)}</View>;
}

function ActivitySection({ activity, colors }: { activity: ActivityItem[]; colors: ReturnType<typeof useColors> }) {
  if (!activity.length) return <Empty text="Your study activity will appear here as people react, connect, and answer your posts." colors={colors} />;
  return <View style={styles.sectionWrap}>{activity.map((item) => <View key={item.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Icon name={item.type === "study_buddy_request" ? "user-plus" : item.type === "best_answer" ? "check-circle" : "bell"} size={20} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.message || "New study activity"}</Text><Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{item.read ? "Seen" : "New"}</Text></View></View>)}</View>;
}

function ResourceSection({ resources, colors, onCreate }: { resources: Resource[]; colors: ReturnType<typeof useColors>; onCreate: () => void }) {
  return <View style={styles.sectionWrap}><HeaderAction title="Study resources" sub="Useful links shared by learners" button="Share link" onPress={onCreate} colors={colors} />{resources.length === 0 ? <Empty text="Share the first useful resource with your community." colors={colors} /> : resources.map((resource) => <TouchableOpacity key={resource.id} onPress={() => Linking.openURL(resource.url)} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Icon name="external-link" size={21} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{resource.title}</Text><Text style={[styles.cardSub, { color: colors.primary }]}>{resource.subject}</Text>{!!resource.description && <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>{resource.description}</Text>}</View><Icon name="chevron-right" size={18} color={colors.mutedForeground} /></TouchableOpacity>)}</View>;
}

function FocusSection({ rooms, colors, onCreate, onJoin }: { rooms: FocusRoom[]; colors: ReturnType<typeof useColors>; onCreate: () => void; onJoin: (room: FocusRoom) => void }) {
  return <View style={styles.sectionWrap}><HeaderAction title="Focus rooms" sub="Study quietly with other learners" button="Open room" onPress={onCreate} colors={colors} />{rooms.length === 0 ? <Empty text="No active rooms. Open one and invite your study buddies." colors={colors} /> : rooms.map((room) => <View key={room.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.circleIcon, { backgroundColor: "#38BDF818" }]}><Text style={{ fontSize: 20 }}>⏱️</Text></View><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{room.subject}</Text><Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{room.participantIds?.length || 0} studying now · Pomodoro room</Text></View><TouchableOpacity onPress={() => onJoin(room)} style={[styles.smallButton, { backgroundColor: "#38BDF8" }]}><Text style={{ color: "#082F49", fontSize: 11, fontWeight: "700" }}>Join</Text></TouchableOpacity></View>)}</View>;
}

function HeaderAction({ title, sub, button, onPress, colors }: { title: string; sub: string; button: string; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.sectionHeader}><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{sub}</Text></View><TouchableOpacity onPress={onPress} style={[styles.smallButton, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: "700" }}>{button}</Text></TouchableOpacity></View>;
}

function Empty({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={{ fontSize: 28 }}>📖</Text><Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 13, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },
  tabRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  tabText: { fontSize: 12, fontWeight: "600" },
  hero: { marginHorizontal: 14, marginBottom: 12, padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center" },
  heroEyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  heroTitle: { fontSize: 22, fontWeight: "700", marginTop: 6 },
  heroBody: { fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 290 },
  heroEmoji: { fontSize: 42, marginLeft: 6 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 14 },
  quickCard: { width: "48%", padding: 12, borderRadius: 14, borderWidth: 1 },
  quickIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 11, marginBottom: 8 },
  quickTitle: { fontSize: 13, fontWeight: "700" },
  quickSub: { fontSize: 11, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionSub: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, marginTop: 18, marginBottom: 10 },
  sectionWrap: { paddingBottom: 24 },
  listCard: { marginHorizontal: 14, marginTop: 9, padding: 12, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 11 },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  cardSub: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  circleIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  smallButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: "transparent" },
  loading: { paddingTop: 60, alignItems: "center" },
  empty: { margin: 14, padding: 24, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 10 },
  collectionRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14 },
  collection: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1 },
  collectionEmoji: { fontSize: 22 },
  collectionTitle: { fontSize: 12, fontWeight: "700", marginTop: 8 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalCard: { padding: 18, paddingBottom: 28, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, gap: 10 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14 },
  multiline: { minHeight: 76, textAlignVertical: "top" },
  submitButton: { alignItems: "center", paddingVertical: 13, borderRadius: 11, marginTop: 4 },
});