import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { asyncStorage as AsyncStorage } from "@/lib/asyncStorage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

function storageKey(uid: string) {
  return `todos_v1_${uid}`;
}

async function loadTodos(uid: string): Promise<TodoItem[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TodoItem[];
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

async function persistTodos(uid: string, todos: TodoItem[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(uid), JSON.stringify(todos));
}

export default function TodoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const fetchTodos = async () => {
    if (!user) { setLoading(false); return; }
    const loaded = await loadTodos(user.uid);
    setTodos(loaded);
    setLoading(false);
  };

  useEffect(() => { fetchTodos(); }, [user?.uid]);

  const addTodo = async () => {
    if (!input.trim() || !user) return;
    const newTodo: TodoItem = {
      id: `${user.uid}_${Date.now()}`,
      text: input.trim(),
      done: false,
      createdAt: Date.now(),
    };
    const updated = [newTodo, ...todos];
    await persistTodos(user.uid, updated);
    setTodos(updated);
    setInput("");
  };

  const toggleTodo = async (id: string) => {
    if (!user) return;
    const updated = todos.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    await persistTodos(user.uid, updated);
    setTodos(updated);
  };

  const deleteTodo = (id: string) => {
    Alert.alert("Delete Task", "Remove this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          if (!user) return;
          const updated = todos.filter((t) => t.id !== id);
          await persistTodos(user.uid, updated);
          setTodos(updated);
        },
      },
    ]);
  };

  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const doneCount = todos.filter((t) => t.done).length;
  const totalCount = todos.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <LinearGradient colors={["#059669", "#0891B2"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Todo List</Text>
            <Text style={styles.headerSub}>{doneCount}/{totalCount} completed</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Input */}
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          value={input}
          onChangeText={setInput}
          placeholder="Add a new task..."
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          onSubmitEditing={addTodo}
        />
        <TouchableOpacity onPress={addTodo} disabled={!input.trim()}>
          <Icon name="plus" size={22} color={input.trim() ? "#059669" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {(["all", "active", "done"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && { backgroundColor: "#059669" }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
              {f === "all" ? "All" : f === "active" ? "Active" : "Done"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={{ paddingBottom: botPad }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>✅</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {filter === "done" ? "No completed tasks" : "No tasks yet"}
            </Text>
          </View>
        ) : (
          filtered.map((todo) => (
            <View
              key={todo.id}
              style={[styles.todoRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <TouchableOpacity onPress={() => toggleTodo(todo.id)}>
                <Icon
                  name={todo.done ? "check-circle" : "circle"}
                  size={22}
                  color={todo.done ? "#059669" : colors.mutedForeground}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.todoText,
                  { color: colors.foreground },
                  todo.done && { textDecorationLine: "line-through", opacity: 0.5 },
                ]}
                numberOfLines={2}
              >
                {todo.text}
              </Text>
              <TouchableOpacity onPress={() => deleteTodo(todo.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ))
        )}
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
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  filterText: { fontSize: 12, fontWeight: "600" },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  todoText: { flex: 1, fontSize: 15 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
});
