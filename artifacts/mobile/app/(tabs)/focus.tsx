import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { playSound } from "@/lib/sounds";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width: W } = Dimensions.get("window");

const RING_R = 105;
const RING_SW = 14;
const RING_SIZE = (RING_R + RING_SW + 4) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
const CX = RING_SIZE / 2;
const CY = RING_SIZE / 2;

const PRESETS = [
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "25 min", value: 25 },
  { label: "50 min", value: 50 },
];

type Phase = "setup" | "running" | "paused" | "complete";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function Confetti() {
  const colors = ["#F59E0B", "#7C3AED", "#10B981", "#EF4444", "#F472B6", "#38BDF8"];
  const dots = Array.from({ length: 24 }, (_, i) => ({
    key: i,
    color: colors[i % colors.length],
    anim: useRef(new Animated.Value(0)).current,
    x: (Math.random() - 0.5) * W * 0.9,
    delay: Math.random() * 300,
    size: 6 + Math.random() * 8,
  }));

  useEffect(() => {
    const anims = dots.map((d) =>
      Animated.timing(d.anim, {
        toValue: 1,
        duration: 900,
        delay: d.delay,
        useNativeDriver: true,
      })
    );
    Animated.stagger(20, anims).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((d) => (
        <Animated.View
          key={d.key}
          style={{
            position: "absolute",
            top: "35%",
            left: "50%",
            width: d.size,
            height: d.size,
            borderRadius: d.size / 2,
            backgroundColor: d.color,
            transform: [
              { translateX: d.anim.interpolate({ inputRange: [0, 1], outputRange: [0, d.x] }) },
              { translateY: d.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -160 - Math.random() * 120] }) },
              { scale: d.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.4, 0.2] }) },
            ],
            opacity: d.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          }}
        />
      ))}
    </View>
  );
}

export default function FocusScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addXP } = useAuth();

  const [phase, setPhase] = useState<Phase>("setup");
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [customInput, setCustomInput] = useState("");
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [sessions, setSessions] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coinAnim = useRef(new Animated.Value(0)).current;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  useEffect(() => {
    if (phase === "running") {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  const handleComplete = () => {
    const mins = Math.round(totalSeconds / 60);
    const coins = Math.max(1, Math.round(mins / 5));
    const xpGain = mins * 2;
    setSessions((s) => s + 1);
    setCoinsEarned(coins);
    addXP(xpGain).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playSound("focusComplete").catch(() => {});

    Animated.sequence([
      Animated.timing(coinAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(coinAnim, { toValue: 1.15, useNativeDriver: true }),
    ]).start();

    setPhase("complete");
  };

  const startSession = (mins: number) => {
    const secs = mins * 60;
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("running");
  };

  const pauseResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase((p) => (p === "running" ? "paused" : "running"));
  };

  const endSession = () => {
    Alert.alert("End Session?", "Your progress won't count toward a reward.", [
      { text: "Keep going", style: "cancel" },
      { text: "End", style: "destructive", onPress: () => { clearInterval(intervalRef.current!); setPhase("setup"); setSecondsLeft(totalSeconds); } },
    ]);
  };

  const resetToSetup = () => {
    coinAnim.setValue(0);
    setPhase("setup");
    setSecondsLeft(selectedMinutes * 60);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Setup phase ───────────────────────────────── */}
        {phase === "setup" && (
          <>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>Focus Timer</Text>
            <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
              Set your time and earn gold coins when you finish
            </Text>

            {/* Session counter */}
            {sessions > 0 && (
              <View style={[styles.sessionBadge, { backgroundColor: colors.secondary }]}>
                <Icon name="trophy" size={14} color={colors.primary} />
                <Text style={[styles.sessionBadgeText, { color: colors.primary }]}>
                  {sessions} session{sessions > 1 ? "s" : ""} completed today
                </Text>
              </View>
            )}

            {/* Preset chips */}
            <Text style={[styles.label, { color: colors.foreground }]}>Choose duration</Text>
            <View style={styles.presetRow}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => { setSelectedMinutes(p.value); setCustomInput(""); }}
                  style={[
                    styles.preset,
                    {
                      backgroundColor: selectedMinutes === p.value && !customInput ? colors.primary : colors.card,
                      borderColor: selectedMinutes === p.value && !customInput ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.78}
                >
                  <Text style={[styles.presetText, {
                    color: selectedMinutes === p.value && !customInput ? colors.primaryForeground : colors.foreground,
                  }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom input */}
            <View style={[styles.customWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Icon name="edit-3" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.customInput, { color: colors.foreground }]}
                value={customInput}
                onChangeText={(v) => {
                  const n = v.replace(/[^0-9]/g, "");
                  setCustomInput(n);
                  if (n) setSelectedMinutes(parseInt(n, 10));
                }}
                placeholder="Custom minutes (e.g. 45)"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={3}
              />
              {!!customInput && (
                <Text style={[styles.customUnit, { color: colors.primary }]}>min</Text>
              )}
            </View>

            {/* Reward preview */}
            <View style={[styles.rewardPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Icon name="coins" size={18} color={colors.primary} />
              <Text style={[styles.rewardText, { color: colors.mutedForeground }]}>
                Complete this session →{" "}
                <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>
                  +{Math.max(1, Math.round((customInput ? parseInt(customInput) || 0 : selectedMinutes) / 5))} coins
                </Text>
                {" "}+{" "}
                <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>
                  +{(customInput ? parseInt(customInput) || 0 : selectedMinutes) * 2} XP
                </Text>
              </Text>
            </View>

            {/* Start button */}
            <TouchableOpacity
              onPress={() => {
                const mins = customInput ? parseInt(customInput, 10) : selectedMinutes;
                if (!mins || mins < 1 || mins > 300) {
                  Alert.alert("Invalid duration", "Please choose between 1 and 300 minutes.");
                  return;
                }
                startSession(mins);
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.purpleStart, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startBtn}
              >
                <Icon name="play" size={20} color="#fff" />
                <Text style={styles.startBtnText}>Start Focus Session</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* ── Timer phase (running / paused) ────────────── */}
        {(phase === "running" || phase === "paused") && (
          <>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>
              {phase === "paused" ? "⏸ Paused" : "Focusing…"}
            </Text>

            {/* SVG ring */}
            <View style={styles.ringWrap}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Defs>
                  <SvgGrad id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.purpleStart} stopOpacity="1" />
                    <Stop offset="1" stopColor={colors.primary} stopOpacity="1" />
                  </SvgGrad>
                </Defs>
                {/* Background track */}
                <Circle cx={CX} cy={CY} r={RING_R} stroke={colors.secondary} strokeWidth={RING_SW} fill="none" />
                {/* Progress arc */}
                <Circle
                  cx={CX}
                  cy={CY}
                  r={RING_R}
                  stroke="url(#ringGrad)"
                  strokeWidth={RING_SW}
                  fill="none"
                  strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  rotation={-90}
                  origin={`${CX},${CY}`}
                />
              </Svg>

              {/* Time display overlaid */}
              <View style={styles.timeOverlay}>
                <Text style={[styles.timeText, { color: colors.foreground }]}>{formatTime(secondsLeft)}</Text>
                <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>
                  {phase === "paused" ? "paused" : "remaining"}
                </Text>
              </View>
            </View>

            {/* Controls */}
            <View style={styles.controlRow}>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={endSession}>
                <Icon name="square" size={22} color={colors.destructive ?? "#EF4444"} />
                <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>End</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={pauseResume} activeOpacity={0.85}>
                <LinearGradient
                  colors={[colors.purpleStart, colors.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.pauseBtn}
                >
                  <Icon name={phase === "running" ? "pause" : "play"} size={28} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 20 }}>⭐</Text>
                <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>
                  +{Math.round(totalSeconds / 60) * 2} XP
                </Text>
              </View>
            </View>

            <Text style={[styles.focusTip, { color: colors.mutedForeground }]}>
              Stay focused — your coins are waiting! 🏆
            </Text>
          </>
        )}

        {/* ── Complete phase ─────────────────────────────── */}
        {phase === "complete" && (
          <>
            <Confetti />
            <View style={styles.completeWrap}>
              <Animated.View
                style={{
                  transform: [{ scale: coinAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                  opacity: coinAnim,
                }}
              >
                <LinearGradient
                  colors={[colors.purpleStart, colors.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.coinCircle}
                >
                  <Text style={styles.coinEmoji}>🏆</Text>
                </LinearGradient>
              </Animated.View>

              <Text style={[styles.completeTitle, { color: colors.foreground }]}>Session Complete!</Text>
              <Text style={[styles.completeSub, { color: colors.mutedForeground }]}>
                Excellent focus! You've earned:
              </Text>

              <View style={styles.rewardRow}>
                <View style={[styles.rewardPill, { backgroundColor: colors.secondary }]}>
                  <Text style={styles.rewardPillEmoji}>🪙</Text>
                  <Text style={[styles.rewardPillText, { color: colors.primary }]}>+{coinsEarned} coins</Text>
                </View>
                <View style={[styles.rewardPill, { backgroundColor: colors.secondary }]}>
                  <Text style={styles.rewardPillEmoji}>⭐</Text>
                  <Text style={[styles.rewardPillText, { color: colors.primary }]}>+{Math.round(totalSeconds / 60) * 2} XP</Text>
                </View>
              </View>

              <View style={styles.completeActions}>
                <TouchableOpacity
                  onPress={resetToSetup}
                  activeOpacity={0.85}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={[colors.purpleStart, colors.primary]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.anotherBtn}
                  >
                    <Icon name="rotate-ccw" size={18} color="#fff" />
                    <Text style={styles.anotherBtnText}>Another Session</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, alignItems: "center", gap: 18 },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 26, textAlign: "center" },
  screenSub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: -10 },

  sessionBadge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  sessionBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  label: { fontFamily: "Inter_600SemiBold", fontSize: 15, alignSelf: "flex-start" },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%" },
  preset: { paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, minWidth: (W - 60) / 4 - 5, alignItems: "center" },
  presetText: { fontFamily: "Inter_700Bold", fontSize: 14 },

  customWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, width: "100%" },
  customInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15 },
  customUnit: { fontFamily: "Inter_700Bold", fontSize: 14 },

  rewardPreview: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, width: "100%" },
  rewardText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 19 },

  startBtn: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 12, width: W - 40 },
  startBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },

  // Timer
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  timeOverlay: { position: "absolute", alignItems: "center" },
  timeText: { fontFamily: "Inter_700Bold", fontSize: 52, letterSpacing: 2 },
  timeLabel: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4 },

  controlRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  controlBtn: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  controlLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
  pauseBtn: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  focusTip: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },

  // Complete
  completeWrap: { alignItems: "center", gap: 16, width: "100%", paddingTop: 20 },
  coinCircle: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center" },
  coinEmoji: { fontSize: 52 },
  completeTitle: { fontFamily: "Inter_700Bold", fontSize: 28 },
  completeSub: { fontFamily: "Inter_400Regular", fontSize: 15 },
  rewardRow: { flexDirection: "row", gap: 12 },
  rewardPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 20 },
  rewardPillEmoji: { fontSize: 20 },
  rewardPillText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  completeActions: { flexDirection: "row", gap: 12, width: "100%" },
  anotherBtn: { borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  anotherBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});
