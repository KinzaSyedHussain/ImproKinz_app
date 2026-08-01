import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { asyncStorage as AsyncStorage } from "@/lib/asyncStorage";
import React, { useEffect, useState } from "react";
import {
  Alert,
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

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
}

function storageKey(uid: string) {
  return `goals_v1_${uid}`;
}

async function loadGoals(uid: string): Promise<Goal[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(uid));
    if (!raw) return [];
    return JSON.parse(raw) as Goal[];
  } catch {
    return [];
  }
}

async function persistGoals(uid: string, goals: Goal[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(uid), JSON.stringify(goals));
}

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { consumeTool } = useCredits();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("hours");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const fetchGoals = async () => {
    if (!user) return;
    const loaded = await loadGoals(user.uid);
    setGoals(loaded);
  };

  useEffect(() => { fetchGoals(); }, [user?.uid]);

  const addGoal = async () => {
    if (!title.trim() || !target.trim() || !user) return;
    if (!(await consumeTool("progress"))) return;
    const t = parseFloat(target);
    if (isNaN(t) || t <= 0) return;
    const newGoal: Goal = {
      id: `${user.uid}_${Date.now()}`,
      title: title.trim(),
      target: t,
      current: 0,
      unit: unit || "hours",
    };
    const updated = [newGoal, ...goals];
    await persistGoals(user.uid, updated);
    setGoals(updated);
    setTitle("");
    setTarget("");
    setUnit("hours");
    setAdding(false);
  };

  const updateProgress = async (id: string, delta: number) => {
    if (!user) return;
    const updated = goals.map((g) =>
      g.id === id ? { ...g, current: Math.max(0, Math.min(g.target, g.current + delta)) } : g
    );
    await persistGoals(user.uid, updated);
    setGoals(updated);
  };

  const deleteGoal = (id: string) => {
    Alert.alert("Delete Goal", "Remove this progress tracker?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          if (!user) return;
          const updated = goals.filter((g) => g.id !== id);
          await persistGoals(user.uid, updated);
          setGoals(updated);
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: botPad }}>
      <LinearGradient colors={["#7C3AED", "#EC4899"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Progress</Text>
            <Text style={[styles.headerSub, { color: colors.foreground }]}>Track your study goals</Text>
          </View>
          <ToolCreditPill tool="progress" />
        </View>
      </LinearGradient>

      {/* Add button */}
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
        onPress={() => setAdding((a) => !a)}
      >
        <Icon name={adding ? "x" : "plus"} size={18} color="#fff" />
        <Text style={styles.addBtnText}>{adding ? "Cancel" : "New Goal"}</Text>
      </TouchableOpacity>

      {/* Add form */}
      {adding && (
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Goal title e.g. Study Math"
            placeholderTextColor={colors.mutedForeground}
          />
          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
              value={target}
              onChangeText={setTarget}
              placeholder="Target e.g. 10"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
              value={unit}
              onChangeText={setUnit}
              placeholder="Unit e.g. hours"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={addGoal}>
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Create Goal</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Goals list */}
      {goals.length === 0 && !adding ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>🎯</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No goals yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Tap "New Goal" to start tracking</Text>
        </View>
      ) : (
        goals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
          return (
            <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalTitle, { color: colors.foreground }]} numberOfLines={1}>{goal.title}</Text>
                <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                  <Icon name="trash-2" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.goalSub, { color: colors.mutedForeground }]}>
                {goal.current} / {goal.target} {goal.unit}
              </Text>
              {/* Progress bar */}
              <View style={[styles.bar, { backgroundColor: colors.muted }]}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? "#059669" : "#7C3AED" }]} />
              </View>
              <Text style={[styles.pctText, { color: pct >= 100 ? "#059669" : colors.mutedForeground }]}>{pct}%</Text>
              {/* Controls */}
              <View style={styles.controls}>
                <TouchableOpacity style={styles.ctrlBtn} onPress={() => updateProgress(goal.id, -1)}>
                  <Icon name="minus" size={16} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctrlBtn} onPress={() => updateProgress(goal.id, 1)}>
                  <Icon name="plus" size={16} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctrlBtn} onPress={() => updateProgress(goal.id, 5)}>
                  <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>+5</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  form: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formRow: { flexDirection: "row", gap: 10 },
  saveBtn: { alignItems: "center", paddingVertical: 12, borderRadius: 10 },
  saveBtnText: { fontSize: 14, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13 },
  goalCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  goalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  goalTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  goalSub: { fontSize: 13 },
  bar: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  pctText: { fontSize: 12, fontWeight: "600", textAlign: "right" },
  controls: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  ctrlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
