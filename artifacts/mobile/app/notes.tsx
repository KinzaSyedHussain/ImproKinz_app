import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
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
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt: number;
  updatedAt: number;
}

const SUBJECTS = ["General", "Math", "Science", "History", "Language", "CS", "Other"];

const SUBJECT_COLORS: Record<string, string> = {
  General: "#6B7280",
  Math: "#4F46E5",
  Science: "#059669",
  History: "#D97706",
  Language: "#DB2777",
  CS: "#0891B2",
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

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, addXP } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("General");
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const contentRef = useRef<TextInput>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const notesCol = user ? collection(db, "users", user.uid, "notes") : null;

  const fetchNotes = async () => {
    if (!notesCol) return;
    try {
      const snap = await getDocs(query(notesCol, orderBy("updatedAt", "desc")));
      setNotes(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Note, "id">),
          createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
          updatedAt: d.data()["updatedAt"]?.toMillis?.() ?? Date.now(),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, [user]);

  const openNew = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setSubject("General");
    setModalVisible(true);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSubject(note.subject || "General");
    setModalVisible(true);
  };

  const saveNote = async () => {
    if (!title.trim()) { Alert.alert("Title required", "Please add a title for your note."); return; }
    if (!content.trim()) { Alert.alert("Content required", "Your note has no content yet."); return; }
    if (!notesCol) return;
    setSaving(true);
    try {
      if (editingNote) {
        await updateDoc(doc(db, "users", user!.uid, "notes", editingNote.id), {
          title: title.trim(),
          content: content.trim(),
          subject,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(notesCol, {
          title: title.trim(),
          content: content.trim(),
          subject,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await addXP(8);
      }
      setModalVisible(false);
      fetchNotes();
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
          await deleteDoc(doc(db, "users", user!.uid, "notes", note.id));
          setNotes((prev) => prev.filter((n) => n.id !== note.id));
        },
      },
    ]);
  };

  const enhanceWithAI = async () => {
    if (!content.trim()) { Alert.alert("No content", "Write something first, then enhance it."); return; }
    setEnhancing(true);
    try {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const res = await fetch(`https://${domain}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Improve and organize the following study note. Make it clearer, add structure with headings (##), bullet points where helpful, and fix any grammar. Keep all factual content intact. Return only the improved note text.\n\n${content}`,
        }),
      });
      if (!res.ok) throw new Error("AI failed");
      const data = await res.json() as { summary: string };
      if (data.summary) {
        setContent(data.summary);
        await addXP(5);
      }
    } catch {
      Alert.alert("AI Error", "Could not enhance the note. Check your connection.");
    } finally {
      setEnhancing(false);
    }
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
            <Text style={styles.headerSub}>{notes.length} note{notes.length !== 1 ? "s" : ""} saved</Text>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={openNew}
          >
            <Icon name="plus" size={18} color="#B45309" />
            <Text style={styles.newBtnText}>New Note</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Icon name="search" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes…"
            placeholderTextColor="rgba(255,255,255,0.6)"
          />
        </View>
      </LinearGradient>

      {/* Notes list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>📒</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {searchQuery ? "No matches found" : "No notes yet"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {searchQuery ? "Try a different search term" : "Tap 'New Note' to start writing"}
          </Text>
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
                  {note.content}
                </Text>
                <Text style={[styles.noteWords, { color: colors.mutedForeground }]}>
                  {wordCount(note.content)} words
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Editor Modal */}
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
          {/* Modal header */}
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Icon name="x" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingNote ? "Edit Note" : "New Note"}
            </Text>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              onPress={saveNote}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <TextInput
              style={[styles.titleInput, { color: colors.foreground, borderBottomColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Note title…"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
              onSubmitEditing={() => contentRef.current?.focus()}
            />

            {/* Subject picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subjectRow}
            >
              {SUBJECTS.map((s) => {
                const active = subject === s;
                const col = SUBJECT_COLORS[s] ?? "#6B7280";
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.subjectChip,
                      { borderColor: col, backgroundColor: active ? col : "transparent" },
                    ]}
                    onPress={() => setSubject(s)}
                  >
                    <Text style={[styles.subjectChipText, { color: active ? "#fff" : col }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* AI enhance bar */}
            <View style={[styles.aiBar, { backgroundColor: colors.secondary }]}>
              <Icon name="zap" size={14} color={colors.primary} />
              <Text style={[styles.aiBarText, { color: colors.mutedForeground }]}>
                AI can polish your note structure &amp; clarity
              </Text>
              <TouchableOpacity
                style={[styles.enhanceBtn, { backgroundColor: colors.primary, opacity: enhancing ? 0.6 : 1 }]}
                onPress={enhanceWithAI}
                disabled={enhancing}
              >
                {enhancing ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.enhanceBtnText, { color: colors.primaryForeground }]}>
                    Enhance ✦
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Content */}
            <TextInput
              ref={contentRef}
              style={[styles.contentInput, { color: colors.foreground }]}
              value={content}
              onChangeText={setContent}
              placeholder="Start writing your note…&#10;&#10;Tip: Use ## for headings and • for bullet points"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
            />

            {/* Word count */}
            <Text style={[styles.wordCountBar, { color: colors.mutedForeground }]}>
              {wordCount(content)} words · {content.length} characters
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { padding: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newBtnText: { color: "#B45309", fontWeight: "700", fontSize: 13 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySub: { fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  list: { padding: 14, gap: 12 },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  noteHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  subjectPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  subjectText: { fontSize: 11, fontWeight: "600" },
  noteTime: { flex: 1, fontSize: 12 },
  noteTitle: { fontSize: 16, fontWeight: "700" },
  notePreview: { fontSize: 13, lineHeight: 19 },
  noteWords: { fontSize: 11, marginTop: 2 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalClose: { padding: 4 },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: "600" },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: "center",
  },
  saveBtnText: { fontWeight: "700", fontSize: 14 },
  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  subjectRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  subjectChipText: { fontSize: 13, fontWeight: "600" },
  aiBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  aiBarText: { flex: 1, fontSize: 12 },
  enhanceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  enhanceBtnText: { fontSize: 12, fontWeight: "700" },
  contentInput: {
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 300,
  },
  wordCountBar: {
    fontSize: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
