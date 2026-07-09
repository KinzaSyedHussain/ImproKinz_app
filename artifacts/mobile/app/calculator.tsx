import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<string | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const input = (val: string) => {
    if (fresh) {
      setDisplay(val);
      setFresh(false);
    } else {
      setDisplay(display === "0" ? val : display + val);
    }
  };

  const inputOp = (nextOp: string) => {
    setPrev(display);
    setOp(nextOp);
    setFresh(true);
  };

  const calculate = () => {
    if (!prev || !op) return;
    const a = parseFloat(prev);
    const b = parseFloat(display);
    let result = 0;
    switch (op) {
      case "+": result = a + b; break;
      case "-": result = a - b; break;
      case "*": result = a * b; break;
      case "/": result = b === 0 ? 0 : a / b; break;
      case "%": result = a % b; break;
      case "^": result = Math.pow(a, b); break;
    }
    const out = Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, "");
    setDisplay(out);
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const del = () => {
    if (display.length > 1) setDisplay(display.slice(0, -1));
    else setDisplay("0");
  };

  const rows = [
    ["C", "DEL", "^", "/"],
    ["7", "8", "9", "*"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "%", "="],
  ];

  const btnColors: Record<string, string> = {
    "=": "#2563EB",
    "/": "#D97706",
    "*": "#D97706",
    "-": "#D97706",
    "+": "#D97706",
    "^": "#D97706",
    "%": "#D97706",
    C: "#DC2626",
    DEL: "#6B7280",
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: botPad }}>
      <LinearGradient colors={["#0891B2", "#2563EB"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Calculator</Text>
            <Text style={styles.headerSub}>Quick math solver</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Display */}
      <View style={[styles.display, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.displayText, { color: colors.foreground }]} numberOfLines={1}>
          {display}
        </Text>
        {op && (
          <Text style={[styles.opText, { color: colors.mutedForeground }]}>
            {prev} {op}
          </Text>
        )}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.keyRow}>
            {row.map((key) => {
              const color = btnColors[key] || colors.card;
              const isAction = !!btnColors[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.key, { backgroundColor: color, borderColor: colors.border }]}
                  onPress={() => {
                    if (key === "C") clear();
                    else if (key === "DEL") del();
                    else if (key === "=") calculate();
                    else if (["+", "-", "*", "/", "%", "^"].includes(key)) inputOp(key);
                    else input(key);
                  }}
                >
                  <Text style={[styles.keyText, { color: isAction ? "#fff" : colors.foreground }]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  display: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "flex-end",
  },
  displayText: { fontSize: 36, fontWeight: "700" },
  opText: { fontSize: 14, marginTop: 4 },
  keypad: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  keyRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  key: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  keyText: { fontSize: 20, fontWeight: "600" },
});
