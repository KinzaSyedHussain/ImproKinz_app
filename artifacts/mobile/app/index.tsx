import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";

const { width: W, height: H } = Dimensions.get("window");

const STARS = Array.from({ length: 55 }, (_, i) => ({
  key: i,
  x: ((i * 137.508) % 1) * W + (i % 7) * 14,
  y: ((i * 79.37) % 1) * H + (i % 5) * 10,
  size: i % 4 === 0 ? 2.5 : i % 3 === 0 ? 1.8 : 1.2,
  delay: (i * 197) % 2200,
  duration: 600 + (i % 5) * 200,
}));

const FEATURES = [
  { icon: "🧠", label: "AI Study Tools" },
  { icon: "📚", label: "Smart Notes" },
  { icon: "🏆", label: "XP & Rewards" },
  { icon: "🌐", label: "Study Community" },
];

const MESSAGES = [
  "Unlocking knowledge treasures",
  "Preparing AI-powered tools",
  "Loading your study space",
  "Almost ready",
];

export default function Root() {
  const { user, profile, loading, configured } = useAuth();
  const { isSignedIn } = useClerkAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!configured) return;
    // If authenticated but profile hasn't loaded from Firestore yet, wait a bit more
    const isAuthenticated = !!user || !!isSignedIn;
    if (isAuthenticated && profile === undefined) return;

    const t = setTimeout(() => {
      // Clerk session exists but Firebase hasn't bridged yet — still signed in
      const isAuthenticated = !!user || !!isSignedIn;
      if (isAuthenticated) {
        // Route new accounts (profile loaded, onboarding not done) to onboarding.
        // Null profile means Firebase isn't configured or still loading — go to app.
        if (profile !== null && !profile.onboardingComplete) {
          router.replace("/onboarding");
        } else {
          router.replace("/(tabs)");
        }
      } else {
        router.replace("/auth");
      }
    }, 3200);
    return () => clearTimeout(t);
  }, [user, loading, configured, isSignedIn, router]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const featuresFade = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const starAnims = useRef(STARS.map(() => new Animated.Value(0.1))).current;

  const [pct, setPct] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(titleFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(taglineFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(featuresFade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();

    // Glow pulse on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Progress bar
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 3200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    const id = progressAnim.addListener(({ value }) => setPct(Math.round(value)));

    // Stars
    starAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(STARS[i].delay),
          Animated.timing(anim, { toValue: 0.9, duration: STARS[i].duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.05, duration: STARS[i].duration * 1.4, useNativeDriver: true }),
        ])
      ).start();
    });

    const msgTimer = setInterval(() => setMsgIndex((m) => (m + 1) % MESSAGES.length), 900);
    return () => {
      progressAnim.removeListener(id);
      clearInterval(msgTimer);
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[styles.root, { opacity: fadeIn }]}>
      <LinearGradient
        colors={["#110932", "#0D0B2B", "#1A0945", "#0D0B2B"]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glow orbs */}
      <View style={[styles.orb, { top: -80, left: -80, width: 280, height: 280, backgroundColor: "#7C3AED18" }]} />
      <View style={[styles.orb, { top: H * 0.3, right: -100, width: 320, height: 320, backgroundColor: "#4C1D9510" }]} />
      <View style={[styles.orb, { bottom: 0, left: W * 0.1, width: 250, height: 250, backgroundColor: "#F59E0B08" }]} />

      {/* Stars */}
      {STARS.map((s, i) => (
        <Animated.View
          key={s.key}
          style={[
            styles.star,
            { left: s.x, top: s.y, width: s.size, height: s.size, borderRadius: s.size, opacity: starAnims[i] },
          ]}
        />
      ))}

      {/* Main content */}
      <View style={styles.content}>

        {/* Logo with glow */}
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Animated.View style={[styles.logoGlow, { opacity: glowAnim }]} />
          <View style={styles.logoBg}>
            <Image
              source={require("../assets/images/logo_nobg.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* App name */}
        <Animated.View style={[styles.titleWrap, { opacity: titleFade }]}>
          <Text style={styles.titleImpro}>Impro</Text>
          <Text style={styles.titleKinz}>Kinz</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
          Your AI-Powered Study Companion
        </Animated.Text>

        {/* Feature pills */}
        <Animated.View style={[styles.featuresRow, { opacity: featuresFade }]}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featurePill}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Progress */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]}>
              <LinearGradient
                colors={["#F59E0B", "#D97706", "#F59E0B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.progressShine} />
            </Animated.View>
          </View>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>

        <Text style={styles.loadingMsg} numberOfLines={1}>
          {MESSAGES[msgIndex]}…
        </Text>
      </View>

      {/* Bottom badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>✦  Study Smart. Level Up.</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: "absolute", borderRadius: 200 },
  star: { position: "absolute", backgroundColor: "#FFFFFF" },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: H * 0.05,
    gap: 0,
  },

  // Logo
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logoGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#F59E0B22",
  },
  logoBg: {
    width: 160,
    height: 160,
    borderRadius: 40,
    backgroundColor: "#1E1050",
    borderWidth: 1.5,
    borderColor: "#F59E0B33",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  logoImg: {
    width: 140,
    height: 140,
  },

  // Title
  titleWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 20,
    marginBottom: 8,
  },
  titleImpro: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  titleKinz: {
    fontSize: 40,
    fontWeight: "800",
    color: "#F59E0B",
    letterSpacing: -0.5,
  },

  tagline: {
    fontSize: 15,
    color: "#A78BFA",
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: 28,
  },

  // Feature pills
  featuresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 28,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF0D",
    borderWidth: 1,
    borderColor: "#FFFFFF15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featureIcon: { fontSize: 13 },
  featureLabel: { fontSize: 12, color: "#C4B5FD", fontWeight: "500" },

  divider: {
    width: 60,
    height: 1,
    backgroundColor: "#F59E0B33",
    marginBottom: 24,
  },

  // Progress
  progressWrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: "#FFFFFF12",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  progressShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#FFFFFF44",
    borderRadius: 2,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F59E0B",
    minWidth: 34,
    textAlign: "right",
  },
  loadingMsg: {
    fontSize: 13,
    color: "#7C6FAA",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // Bottom badge
  badge: {
    paddingBottom: 36,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 13,
    color: "#FFFFFF22",
    letterSpacing: 1,
    fontWeight: "600",
  },
});
