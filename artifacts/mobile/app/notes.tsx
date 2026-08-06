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
import { useCredits } from "@/context/CreditContext";
import { ToolCreditPill } from "@/components/CreditUI";

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

function storageKey(uid: string) { return `notes_v1_${uid}`; }

async function loadNotes(uid: string): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(uid));
    if (!raw) return [];
    return (JSON.parse(raw) as Note[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch { return []; }
}

async function persistNotes(uid: string, notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(uid), JSON.stringify(notes));
}

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, addXP } = useAuth();
  const { consumeTool, refundCredits } = useCredits();

  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("General");
  const [level, setLevel] = useState("High School");
  const [generating, setGenerating] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubject, setEditSubject] = useState("General");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef<TextInput>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + 24;

  const fetchNotes = async () => {
    if (!user) { setLoadingNotes(false); return; }
    setNotes(await loadNotes(user.uid));
    setLoadingNotes(false);
  };

  useEffect(() => { fetchNotes(); }, [user?.uid]);

  const generateNotes = async () => {
    if (!topic.trim()) { Alert.alert("Enter a topic", "What topic should AI write notes about?"); return; }
    if (!(await consumeTool("notes"))) return;
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
      await refundCredits(12);
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
        updated = [{ id: `${user.uid}_${now}`, title: editTitle.trim(), content: editContent.trim(), subject: editSubject, createdAt: now, updatedAt: now }, ...notes];
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
      { text: "Delete", style: "destructive", onPress: async () => {
        const updated = notes.filter((n) => n.id !== note.id);
        await persistNotes(user!.uid, updated);
        setNotes(updated);
      }},
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
      {/* ── Header ──────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={21} color={colors.foreground} />
          </TouchableOpacity>
          <View style={[styles.toolIconWrap, { backgroundColor: colors.primary + "20" }]}>
            <Icon name="file-text" size={17} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notes</Text>
          <View style={[styles.xpPill, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.xpText, { color: colors.primary }]}>+12 XP</Text>
          </View>
          <View style={{ flex: 1 }} />
          <ToolCreditPill tool="notes" />
        </View>

        {/* Tab bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.background }]}>
          {(["generate", "saved"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setActiveTab(t)}
              style={[styles.tabBtn, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Icon
                name={t === "generate" ? "zap" : "book-open"}
                size={15}
                color={activeTab === t ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
                {t === "generate" ? "Generate" : `Saved (${notes.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Generate tab ─────────────────────────── */}
      {activeTab === "generate" && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* AI badge */}
            <View style={[styles.aiBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Icon name="zap" size={14} color={colors.primary} />
              <Text style={[styles.aiBadgeText, { color: colors.primary }]}>Powered by Groq AI (Llama 3.1)</Text>
            </View>

            {/* Topic */}
            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Topic *</Text>
              <TextInput
                style={[styles.topicInput, { color: colors.foreground }]}
                value={topic}
                onChangeText={setTopic}
                placeholder="e.g. Photosynthesis, World War II, Newton's Laws…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                returnKeyType="done"
              />
            </View>

            {/* Subject */}
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {SUBJECTS.map((s) => {
                const active = subject === s;
                const col = SUBJECT_COLORS[s] ?? "#6B7280";
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, { borderColor: active ? col : colors.border, backgroundColor: active ? col + "18" : "transparent" }]}
                    onPress={() => setSubject(s)}
                  >
                    <Text style={[styles.chipText, { color: active ? col : colors.mutedForeground, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium" }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Level */}
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Study level</Text>
            <View style={styles.levelRow}>
              {LEVELS.map((l) => {
                const active = level === l;
                return (
                  <TouchableOpacity
                    key={l}
                    style={[styles.levelChip, {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    }]}
                    onPress={() => setLevel(l)}
                  >
                    <Text style={[styles.levelChipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* What you'll get */}
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.previewHeader}>
                <Icon name="file-text" size={15} color={colors.primary} />
                <Text style={[styles.previewTitle, { color: colors.foreground }]}>AI will generate</Text>
              </View>
              {[
                ["check-circle", "Overview & key concepts"],
                ["check-circle", "Structured headings & sections"],
                ["check-circle", "Detailed bullet points & examples"],
                ["check-circle", "Bold key terms & definitions"],
                ["check-circle", "Quick-review summary"],
              ].map(([icon, text]) => (
                <View key={text} style={styles.previewRow}>
                  <Icon name={icon} size={13} color={colors.primary} />
                  <Text style={[styles.previewItem, { color: colors.mutedForeground }]}>{text}</Text>
                </View>
              ))}
            </View>

            {/* Generate button */}
            <TouchableOpacity
              onPress={generateNotes}
              disabled={generating || !topic.trim()}
              activeOpacity={0.85}
              style={{ opacity: generating || !topic.trim() ? 0.55 : 1 }}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.generateBtn}
              >
                {generating ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.generateBtnText}>Generating notes…</Text>
                  </>
                ) : (
                  <>
                    <Icon name="zap" size={18} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate Notes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {generating && (
              <Text style={[styles.generatingHint, { color: colors.mutedForeground }]}>
                AI is writing your notes — this usually takes 5–10 seconds…
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Saved tab ─────────────────────────────── */}
      {activeTab === "saved" && (
        <View style={{ flex: 1 }}>
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
            <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
          ) : filtered.length === 0 ? (
            <View style={styles.center}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Icon name="file-text" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {searchQuery ? "No matches" : "No notes yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {searchQuery ? "Try a different search term" : "Generate your first AI-powered study note"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={[styles.goGenerateBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab("generate")}
                >
                  <Icon name="zap" size={15} color={colors.primaryForeground} />
                  <Text style={[styles.goGenerateBtnText, { color: colors.primaryForeground }]}>Generate Note</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ScrollView contentContainerStyle={[styles.list, { paddingBottom: botPad }]} showsVerticalScrollIndicator={false}>
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
                      <View style={[styles.subjectPill, { backgroundColor: subjectColor + "18" }]}>
                        <Text style={[styles.subjectText, { color: subjectColor }]}>{note.subject}</Text>
                      </View>
                      <Text style={[styles.noteTime, { color: colors.mutedForeground }]}>{timeAgo(note.updatedAt)}</Text>
                      <TouchableOpacity onPress={() => deleteNote(note)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="trash-2" size={15} color={colors.destructive ?? "#EF4444"} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.noteTitle, { color: colors.foreground }]} numberOfLines={1}>{note.title}</Text>
                    <Text style={[styles.notePreview, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {note.content.replace(/#{1,3} /g, "").replace(/\*\*/g, "")}
                    </Text>
                    <Text style={[styles.noteWords, { color: colors.mutedForeground }]}>{wordCount(note.content)} words</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── Editor Modal ──────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
              {saving
                ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                : <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{editingNote ? "Update" : "Save +12 XP"}</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput
              style={[styles.editTitle, { color: colors.foreground, borderBottomColor: colors.border }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Note title…"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
              onSubmitEditing={() => contentRef.current?.focus()}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, { paddingHorizontal: 16, paddingVertical: 8 }]}>
              {SUBJECTS.map((s) => {
                const active = editSubject === s;
                const col = SUBJECT_COLORS[s] ?? "#6B7280";
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, { borderColor: active ? col : colors.border, backgroundColor: active ? col + "18" : "transparent" }]}
                    onPress={() => setEditSubject(s)}
                  >
                    <Text style={[styles.chipText, { color: active ? col : colors.mutedForeground }]}>{s}</Text>
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
            <Text style={[styles.wordBar, { color: colors.mutedForeground }]}>{wordCount(editContent)} words</Text>

            <TouchableOpacity
              onPress={saveNote}
              disabled={saving}
              activeOpacity={0.85}
              style={[styles.bigSaveBtnWrap, { opacity: saving ? 0.6 : 1 }]}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.bigSaveBtn}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.bigSaveBtnText}>{editingNote ? "Update Note" : "Save Note (+12 XP)"}</Text>
                }
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

  // Header
  header: { borderBottomWidth: 1, paddingBottom: 0 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  toolIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  xpPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  xpText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  tabBar: { flexDirection: "row", paddingHorizontal: 14 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  // Generate scroll
  scrollContent: { padding: 14, gap: 12 },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, borderWidth: 1,
  },
  aiBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  inputCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  inputLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  topicInput: {
    fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22,
    minHeight: 70, textAlignVertical: "top",
  },

  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, paddingHorizontal: 2, marginTop: 4, marginBottom: 4 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12 },

  levelRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  levelChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  levelChipText: { fontFamily: "Inter_500Medium", fontSize: 12 },

  previewCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  previewTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  previewItem: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 },

  generateBtn: { borderRadius: 13, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  generateBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  generatingHint: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", marginTop: 4 },

  // Saved tab
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14 },

  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  goGenerateBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 11, marginTop: 4 },
  goGenerateBtnText: { fontFamily: "Inter_700Bold", fontSize: 14 },

  list: { padding: 14, gap: 11 },
  noteCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  noteHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  subjectPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  subjectText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  noteTime: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 11 },
  noteTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  notePreview: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  noteWords: { fontFamily: "Inter_400Regular", fontSize: 11 },

  // Editor modal
  modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, gap: 12 },
  modalClose: { padding: 2 },
  modalTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 17 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 13 },

  editTitle: { fontFamily: "Inter_700Bold", fontSize: 20, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  editContent: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 24, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, minHeight: 300 },
  wordBar: { fontFamily: "Inter_400Regular", fontSize: 12, paddingHorizontal: 20, paddingBottom: 8 },
  bigSaveBtnWrap: { margin: 20, borderRadius: 13, overflow: "hidden" },
  bigSaveBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 15, flexDirection: "row", gap: 10 },
  bigSaveBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});
