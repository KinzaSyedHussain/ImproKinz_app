import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { asyncStorage as AsyncStorage } from "@/lib/asyncStorage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt: number;
  updatedAt: number;
}

const SUBJECTS = ["General", "Math", "Science", "History", "Language", "Computer Science", "Other"];
const LEVELS = ["Middle School", "High School", "University", "Professional"];

const SUBJECT_COLORS: Record<string, string> = {
  General: "#6B7280",
  Math: "#4F46E5",
  Science: "#059669",
  History: "#D97706",
  Language: "#DB2777",
  "Computer Science": "#0891B2",
  Other: "#7C3AED",
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function storageKey(uid: string) {
  return `notes_v1_${uid}`;
}

async function loadNotes(uid: string): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

async function persistNotes(uid: string, notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(uid), JSON.stringify(notes));
}

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, addXP } = useAuth();

  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // Generate form state
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("General");
  const [level, setLevel] = useState("High School");
  const [generating, setGenerating] = useState(false);

  // Editor modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubject, setEditSubject] = useState("General");
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef<TextInput>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const fetchNotes = async () => {
    if (!user) { setLoadingNotes(false); return; }
    const loaded = await loadNotes(user.uid);
    setNotes(loaded);
    setLoadingNotes(false);
  };

  useEffect(() => { fetchNotes(); }, [user?.uid]);

  const generateNotes = async () => {
    if (!topic.trim()) {
      Alert.alert("Enter a topic", "What topic should the AI write notes about?");
      return;
    }
    setGenerating(true);
    try {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const res = await fetch(`https://${domain}/api/ai/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), subject, level }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json() as { title: string; content: string };
      if (!data.content) throw new Error("Empty response");
      setEditingNote(null);
      setEditTitle(data.title || topic.trim());
      setEditContent(data.content);
      setEditSubject(subject);
      setModalVisible(true);
    } catch {
      Alert.alert("AI Error", "Could not generate notes. Check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditSubject(note.subject || "General");
    setModalVisible(true);
  };

  const saveNote = async () => {
    if (!editTitle.trim()) { Alert.alert("Title required", "Please add a title."); return; }
    if (!editContent.trim()) { Alert.alert("Content required", "Note has no content."); return; }
    if (!user) { Alert.alert("Not signed in", "Please sign in to save notes."); return; }

    setSaving(true);
    try {
      const now = Date.now();
      let updated: Note[];

      if (editingNote) {
        updated = notes.map((n) =>
          n.id === editingNote.id
            ? { ...n, title: editTitle.trim(), content: editContent.trim(), subject: editSubject, updatedAt: now }
            : n
        );
      } else {
        const newNote: Note = {
          id: `${user.uid}_${now}`,
          title: editTitle.trim(),
          content: editContent.trim(),
          subject: editSubject,
          createdAt: now,
          updatedAt: now,
        };
        updated = [newNote, ...notes];
        addXP(12).catch(() => {});
      }

      await persistNotes(user.uid, updated);
      setNotes(updated);
      setModalVisible(false);
      setTopic("");
      setActiveTab("saved");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = (note: Note) => {
    Alert.alert("Delete Note", `Delete "${note.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const updated = notes.filter((n) => n.id !== note.id);
          await persistNotes(user!.uid, updated);
          setNotes(updated);
        },
      },
    ]);
  };

  const filtered = notes.filter((n) =>
    !searchQuery.trim() ||
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={["#D97706", "#B45309"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Notes Maker</Text>
            <Text style={styles.headerSub}>AI-generated study notes</Text>
          </View>
          <View style={[styles.xpPill, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
            <Text style={styles.xpPillText}>+12 XP</Text>
          </View>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "generate" && styles.tabActive]}
            onPress={() => setActiveTab("generate")}
          >
            <Icon name="zap" size={14} color={activeTab === "generate" ? "#B45309" : "rgba(255,255,255,0.7)"} />
            <Text style={[styles.tabText, activeTab === "generate" ? styles.tabTextActive : styles.tabTextInactive]}>
              Generate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "saved" && styles.tabActive]}
            onPress={() => setActiveTab("saved")}
          >
            <Icon name="book-open" size={14} color={activeTab === "saved" ? "#B45309" : "rgba(255,255,255,0.7)"} />
            <Text style={[styles.tabText, activeTab === "saved" ? styles.tabTextActive : styles.tabTextInactive]}>
              Saved ({notes.length})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Generate tab ── */}
      {activeTab === "generate" && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.generateContent, { paddingBottom: botPad }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* AI badge */}
            <View style={[styles.aiBadge, { backgroundColor: colors.secondary }]}>
              <Text style={styles.aiBadgeEmoji}>✦</Text>
              <Text style={[styles.aiBadgeText, { color: colors.primary }]}>
                Powered by Groq AI (Llama 3.1)
              </Text>
            </View>

            {/* Topic input */}
            <Text style={[styles.label, { color: colors.foreground }]}>Topic *</Text>
            <TextInput
              style={[styles.topicInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Photosynthesis, World War II, Newton's Laws…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              returnKeyType="done"
            />

            {/* Subject */}
            <Text style={[styles.label, { color: colors.foreground }]}>Subject</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {SUBJECTS.map((s) => {
                const active = subject === s;
                const col = SUBJECT_COLORS[s] ?? "#6B7280";
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, { borderColor: col, backgroundColor: active ? col : "transparent" }]}
                    onPress={() => setSubject(s)}
                  >
                    <Text style={[styles.chipText, { color: active ? "#fff" : col }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Level */}
            <Text style={[styles.label, { color: colors.foreground }]}>Study Level</Text>
            <View style={styles.levelRow}>
              {LEVELS.map((l) => {
                const active = level === l;
                return (
                  <TouchableOpacity
                    key={l}
                    style={[
                      styles.levelChip,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setLevel(l)}
                  >
                    <Text style={[styles.levelChipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                      {l}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* What you'll get */}
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.previewTitle, { color: colors.foreground }]}>What AI will generate:</Text>
              {[
                "📌 Overview & key concepts",
                "📋 Structured headings & sections",
                "• Detailed bullet points & examples",
                "🔑 Bold key terms & definitions",
                "✅ Quick-review summary",
              ].map((item) => (
                <Text key={item} style={[styles.previewItem, { color: colors.mutedForeground }]}>{item}</Text>
              ))}
            </View>

            {/* Generate button */}
            <TouchableOpacity
              style={[styles.generateBtn, { opacity: generating ? 0.7 : 1 }]}
              onPress={generateNotes}
              disabled={generating}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#D97706", "#B45309"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateBtnInner}
              >
                {generating ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.generateBtnText}>Generating notes…</Text>
                  </>
                ) : (
                  <Text style={styles.generateBtnText}>✦  Generate Notes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {generating && (
              <Text style={[styles.generatingHint, { color: colors.mutedForeground }]}>
                AI is writing your notes — this takes 5–10 seconds…
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Saved tab ── */}
      {activeTab === "saved" && (
        <View style={{ flex: 1 }}>
          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Icon name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search saved notes…"
              placeholderTextColor={colors.mutedForeground}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Icon name="x" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {loadingNotes ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ fontSize: 48 }}>📒</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {searchQuery ? "No matches" : "No notes yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {searchQuery ? "Try a different search" : "Generate your first note with AI"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={[styles.goGenerateBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab("generate")}
                >
                  <Text style={[styles.goGenerateBtnText, { color: colors.primaryForeground }]}>
                    ✦  Generate Note
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ScrollView contentContainerStyle={[styles.list, { paddingBottom: botPad }]}>
              {filtered.map((note) => {
                const subjectColor = SUBJECT_COLORS[note.subject] ?? "#6B7280";
                return (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => openEdit(note)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.noteHeader}>
                      <View style={[styles.subjectPill, { backgroundColor: subjectColor + "22" }]}>
                        <Text style={[styles.subjectText, { color: subjectColor }]}>{note.subject}</Text>
                      </View>
                      <Text style={[styles.noteTime, { color: colors.mutedForeground }]}>
                        {timeAgo(note.updatedAt)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => deleteNote(note)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="trash-2" size={15} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.noteTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {note.title}
                    </Text>
                    <Text style={[styles.notePreview, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {note.content.replace(/#{1,3} /g, "").replace(/\*\*/g, "")}
                    </Text>
                    <Text style={[styles.noteWords, { color: colors.mutedForeground }]}>
                      {wordCount(note.content)} words
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── Editor / Viewer Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Icon name="x" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingNote ? "Edit Note" : "Review & Save"}
            </Text>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              onPress={saveNote}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                  {editingNote ? "Update" : "Save  ✦+12"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <TextInput
              style={[styles.editTitle, { color: colors.foreground, borderBottomColor: colors.border }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Note title…"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
              onSubmitEditing={() => contentRef.current?.focus()}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {SUBJECTS.map((s) => {
                const active = editSubject === s;
                const col = SUBJECT_COLORS[s] ?? "#6B7280";
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, { borderColor: col, backgroundColor: active ? col : "transparent" }]}
                    onPress={() => setEditSubject(s)}
                  >
                    <Text style={[styles.chipText, { color: active ? "#fff" : col }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              ref={contentRef}
              style={[styles.editContent, { color: colors.foreground }]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
              placeholder="Note content…"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.wordBar, { color: colors.mutedForeground }]}>
              {wordCount(editContent)} words
            </Text>

            <TouchableOpacity
              style={[styles.bigSaveBtn, { opacity: saving ? 0.6 : 1 }]}
              onPress={saveNote}
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#D97706", "#B45309"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bigSaveBtnInner}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.bigSaveBtnText}>
                    {editingNote ? "✓  Update Note" : "✦  Save Note  (+12 XP)"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { padding: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  xpPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  xpPillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#B45309" },
  tabTextInactive: { color: "rgba(255,255,255,0.8)" },

  generateContent: { padding: 20, gap: 4 },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  aiBadgeEmoji: { fontSize: 16 },
  aiBadgeText: { fontSize: 13, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  topicInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  chipRow: { gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  levelRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  levelChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  levelChipText: { fontSize: 13, fontWeight: "500" },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  previewTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  previewItem: { fontSize: 13, lineHeight: 20 },
  generateBtn: { marginTop: 16, borderRadius: 16, overflow: "hidden" },
  generateBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  generateBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  generatingHint: { textAlign: "center", fontSize: 13, marginTop: 12, lineHeight: 20 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  goGenerateBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  goGenerateBtnText: { fontSize: 15, fontWeight: "700" },
  list: { padding: 16, gap: 12 },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  noteHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  subjectPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  subjectText: { fontSize: 11, fontWeight: "700" },
  noteTime: { flex: 1, fontSize: 11 },
  noteTitle: { fontSize: 16, fontWeight: "700" },
  notePreview: { fontSize: 13, lineHeight: 19 },
  noteWords: { fontSize: 11 },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalClose: { padding: 2 },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: "700" },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: { fontSize: 14, fontWeight: "700" },
  editTitle: {
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  editContent: {
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    minHeight: 300,
  },
  wordBar: { fontSize: 12, paddingHorizontal: 20, paddingBottom: 8 },
  bigSaveBtn: { margin: 20, borderRadius: 16, overflow: "hidden" },
  bigSaveBtnInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  bigSaveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
