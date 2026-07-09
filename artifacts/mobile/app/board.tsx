import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { asyncStorage as AsyncStorage } from "@/lib/asyncStorage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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

type ColumnKey = "todo" | "doing" | "done";

interface Task {
  id: string;
  text: string;
  column: ColumnKey;
  createdAt: number;
}

const COLUMNS: { key: ColumnKey; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "#2563EB" },
  { key: "doing", label: "In Progress", color: "#D97706" },
  { key: "done", label: "Done", color: "#059669" },
];

function storageKey(uid: string) {
  return `board_v1_${uid}`;
}

async function loadTasks(uid: string): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(uid));
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

async function persistTasks(uid: string, tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(uid), JSON.stringify(tasks));
}

export default function BoardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [addingTo, setAddingTo] = useState<ColumnKey | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const fetchTasks = async () => {
    if (!user) return;
    const loaded = await loadTasks(user.uid);
    setTasks(loaded);
  };

  useEffect(() => { fetchTasks(); }, [user?.uid]);

  const addTask = async (column: ColumnKey) => {
    if (!input.trim() || !user) return;
    const newTask: Task = {
      id: `${user.uid}_${Date.now()}`,
      text: input.trim(),
      column,
      createdAt: Date.now(),
    };
    const updated = [...tasks, newTask];
    await persistTasks(user.uid, updated);
    setTasks(updated);
    setInput("");
    setAddingTo(null);
  };

  const moveTask = async (id: string, to: ColumnKey) => {
    if (!user) return;
    const updated = tasks.map((t) => (t.id === id ? { ...t, column: to } : t));
    await persistTasks(user.uid, updated);
    setTasks(updated);
  };

  const deleteTask = (id: string) => {
    Alert.alert("Delete Task", "Remove this task from the board?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          if (!user) return;
          const updated = tasks.filter((t) => t.id !== id);
          await persistTasks(user.uid, updated);
          setTasks(updated);
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={["#2563EB", "#06B6D4"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Study Board</Text>
            <Text style={styles.headerSub}>Kanban-style task organizer</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: botPad, paddingTop: 12, gap: 12 }}
      >
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.column === col.key);
          return (
            <View key={col.key} style={[styles.column, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.colHeader, { backgroundColor: col.color + "22" }]}>
                <View style={[styles.colDot, { backgroundColor: col.color }]} />
                <Text style={[styles.colLabel, { color: colors.foreground }]}>{col.label}</Text>
                <Text style={[styles.colCount, { color: colors.mutedForeground }]}>{colTasks.length}</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 10 }}>
                {colTasks.map((task) => (
                  <View key={task.id} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.cardText, { color: colors.foreground }]} numberOfLines={3}>{task.text}</Text>
                    <View style={styles.cardActions}>
                      {col.key !== "todo" && (
                        <TouchableOpacity onPress={() => moveTask(task.id, "todo")}>
                          <Icon name="arrow-left" size={14} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      )}
                      {col.key !== "doing" && (
                        <TouchableOpacity onPress={() => moveTask(task.id, "doing")}>
                          <Icon name="loader" size={14} color="#D97706" />
                        </TouchableOpacity>
                      )}
                      {col.key !== "done" && (
                        <TouchableOpacity onPress={() => moveTask(task.id, "done")}>
                          <Icon name="check" size={14} color="#059669" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => deleteTask(task.id)}>
                        <Icon name="trash-2" size={14} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {addingTo === col.key ? (
                  <View style={[styles.addBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.addInput, { color: colors.foreground }]}
                      value={input}
                      onChangeText={setInput}
                      placeholder="Task..."
                      placeholderTextColor={colors.mutedForeground}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => addTask(col.key)}
                    />
                    <View style={styles.addRow}>
                      <TouchableOpacity onPress={() => { setAddingTo(null); setInput(""); }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => addTask(col.key)}>
                        <Text style={{ color: col.color, fontSize: 13, fontWeight: "600" }}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addBtn} onPress={() => setAddingTo(col.key)}>
                    <Icon name="plus" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.addBtnText, { color: colors.mutedForeground }]}>Add task</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  column: { width: 260, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  colHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  colDot: { width: 8, height: 8, borderRadius: 4 },
  colLabel: { flex: 1, fontSize: 14, fontWeight: "700" },
  colCount: { fontSize: 12, fontWeight: "600" },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  cardText: { fontSize: 14, lineHeight: 20 },
  cardActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  addBtnText: { fontSize: 13 },
  addBox: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 8 },
  addInput: { fontSize: 14, padding: 0 },
  addRow: { flexDirection: "row", justifyContent: "space-between" },
});
