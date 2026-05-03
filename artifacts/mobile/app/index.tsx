import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";

const { width: W, height: H } = Dimensions.get("window");
const CX = W / 2;
const ORBIT_R = 108;
const CHEST_CY = H * 0.42;

const STARS = Array.from({ length: 42 }, (_, i) => ({
  key: i,
  x: ((i * 137.508) % 1) * W + (i % 5) * 18,
  y: ((i * 79.37) % 1) * (H * 0.72) + (i % 4) * 11,
  size: i % 3 === 0 ? 3 : 1.8,
  delay: (i * 213) % 1900,
}));

const ORBIT_ICONS = [
  { emoji: "🧠", base: 0 },
  { emoji: "💡", base: 90 },
  { emoji: "☁️", base: 180 },
  { emoji: "📚", base: 270 },
];

const MESSAGES = [
  "Unlocking the treasure chest",
  "Loading knowledge maps",
  "Preparing AI-powered tools",
  "Almost there",
];

function TreasureChest({ pulse }: { pulse: Animated.Value }) {
  const sc = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  return (
    <Animated.View style={{ alignItems: "center", transform: [{ scale: sc }] }}>
      {/* Glow behind chest */}
      <View style={styles.chestGlow} />
      {/* Lid */}
      <View style={styles.lid}>
        <View style={styles.lidShine} />
        <View style={styles.lidTrim} />
        <Text style={styles.booksEmoji}>📚</Text>
      </View>
      {/* Body */}
      <View style={styles.body}>
        <View style={styles.bodyStripe} />
        <View style={styles.lock} />
      </View>
    </Animated.View>
  );
}

export default function Root() {
  const { user, profile, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!configured) return;
    const t = setTimeout(() => {
      if (user) {
        // Send new users (no onboardingComplete flag) to the wizard
        if (profile && !(profile as any).onboardingComplete) {
          router.replace("/onboarding");
        } else {
          router.replace("/(tabs)/");
        }
      } else {
        router.replace("/auth/login");
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [user, loading, configured, profile]);

  // --- Animated values ---
  const fadeIn = useRef(new Animated.Value(0)).current;
  const chestPulse = useRef(new Animated.Value(0)).current;
  const starAnims = useRef(STARS.map(() => new Animated.Value(0.15))).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Orbit driven by JS timer so we can use Math.cos/sin
  const [orbitDeg, setOrbitDeg] = useState(0);
  const orbitRef = useRef(0);

  const [dotIndex, setDotIndex] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(chestPulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(chestPulse, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    starAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(STARS[i].delay),
          Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    });

    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 3200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    const id = progressAnim.addListener(({ value }) => setPct(Math.round(value)));

    // Orbit at ~40fps
    const orbitTimer = setInterval(() => {
      orbitRef.current = (orbitRef.current + 0.9) % 360;
      setOrbitDeg(orbitRef.current);
    }, 25);

    const dotTimer = setInterval(() => setDotIndex((d) => (d + 1) % 4), 500);
    const msgTimer = setInterval(() => setMsgIndex((m) => (m + 1) % MESSAGES.length), 1100);

    return () => {
      progressAnim.removeListener(id);
      clearInterval(orbitTimer);
      clearInterval(dotTimer);
      clearInterval(msgTimer);
    };
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: fadeIn }]}>
      <LinearGradient
        colors={["#1C0B52", "#0D0B2B", "#140A38"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Nebula blobs */}
      <View style={[styles.blob, { top: H * 0.05, left: -70, backgroundColor: "#7C3AED1A", width: 200, height: 200 }]} />
      <View style={[styles.blob, { top: H * 0.25, right: -60, backgroundColor: "#4C1D951A", width: 240, height: 240 }]} />
      <View style={[styles.blob, { bottom: H * 0.1, left: W * 0.15, backgroundColor: "#7C3AED14", width: 160, height: 160 }]} />

      {/* Stars */}
      {STARS.map((s, i) => (
        <Animated.View
          key={s.key}
          style={[
            styles.star,
            { left: s.x, top: s.y, width: s.size, height: s.size, borderRadius: s.size / 2, opacity: starAnims[i] },
          ]}
        />
      ))}

      {/* Logo */}
      <View style={styles.logoRow}>
        <Text style={styles.logoStar}>✦</Text>
        <Text style={styles.logoText}>
          <Text style={{ color: "#FFFFFF" }}>Impro</Text>
          <Text style={{ color: "#F59E0B" }}>Kinz</Text>
        </Text>
      </View>

      {/* Orbit + Chest area — positioned absolutely so star count is correct */}
      <View style={[styles.orbitArea, { marginTop: 24 }]}>
        {/* Orbit ring */}
        <View
          style={[
            styles.orbitRing,
            {
              left: CX - ORBIT_R - 16,
              top: ORBIT_R - 16,
              width: (ORBIT_R + 16) * 2,
              height: (ORBIT_R + 16) * 2,
              borderRadius: ORBIT_R + 16,
            },
          ]}
        />

        {/* Chest centred */}
        <View style={[styles.chestAnchor, { left: CX - 52, top: ORBIT_R - 52 }]}>
          <TreasureChest pulse={chestPulse} />
        </View>

        {/* Orbiting icons */}
        {ORBIT_ICONS.map((icon) => {
          const rad = ((orbitDeg + icon.base) * Math.PI) / 180;
          const ix = CX + Math.cos(rad) * ORBIT_R - 18;
          const iy = ORBIT_R + Math.sin(rad) * ORBIT_R - 18;
          return (
            <View key={icon.base} style={[styles.iconWrap, { left: ix, top: iy }]}>
              <Text style={styles.orbitEmoji}>{icon.emoji}</Text>
            </View>
          );
        })}

        {/* Ring accent dots */}
        {[30, 80, 150, 210, 290, 340].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const dx = CX + Math.cos(rad) * (ORBIT_R + 14) - 5;
          const dy = ORBIT_R + Math.sin(rad) * (ORBIT_R + 14) - 5;
          return <View key={i} style={[styles.ringDot, { left: dx, top: dy }]} />;
        })}
      </View>

      {/* Text section */}
      <Text style={styles.title}>Loading your knowledge{"\n"}treasures...</Text>

      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((d) => (
          <View key={d} style={[styles.dot, d === dotIndex && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.subText}>
        {MESSAGES[msgIndex]} ({pct}%)...
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blob: { position: "absolute", borderRadius: 120 },
  star: { position: "absolute", backgroundColor: "#FFFFFF" },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: H * 0.09,
    gap: 7,
  },
  logoStar: { fontSize: 20, color: "#F59E0B" },
  logoText: { fontSize: 30, fontWeight: "800", fontFamily: undefined },

  orbitArea: {
    width: W,
    height: (ORBIT_R + 20) * 2 + 36,
    position: "relative",
  },
  orbitRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "#A78BFA55",
  },
  chestAnchor: {
    position: "absolute",
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    position: "absolute",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  orbitEmoji: { fontSize: 22 },
  ringDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C4B5FD77",
  },

  // Chest
  chestGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#7C3AED2A",
    top: -4,
  },
  lid: {
    width: 88,
    height: 36,
    backgroundColor: "#92400E",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 2,
    borderColor: "#D97706",
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  lidShine: {
    position: "absolute",
    top: 5,
    left: 8,
    right: 8,
    height: 9,
    backgroundColor: "#FCD34D44",
    borderRadius: 6,
  },
  lidTrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: "#D97706",
  },
  booksEmoji: {
    position: "absolute",
    top: -30,
    fontSize: 28,
  },
  body: {
    width: 88,
    height: 50,
    backgroundColor: "#92400E",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  bodyStripe: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 13,
    height: 5,
    backgroundColor: "#D97706",
    opacity: 0.55,
  },
  lock: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#D97706",
    borderWidth: 2,
    borderColor: "#FCD34D",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 24,
    lineHeight: 32,
    fontFamily: undefined,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 18,
    alignItems: "center",
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#A78BFA44",
  },
  dotActive: {
    backgroundColor: "#C4B5FD",
    width: 11,
    height: 11,
  },
  subText: {
    color: "#A78BFA",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    fontFamily: undefined,
    opacity: 0.9,
  },
});
