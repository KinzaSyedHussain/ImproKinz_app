import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
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

const { width: W, height: H } = Dimensions.get("window");

const STARS = Array.from({ length: 36 }, (_, i) => ({
  key: i,
  x: ((i * 137.5) % 1) * W + (i % 4) * 22,
  y: ((i * 83.1) % 1) * H,
  size: i % 4 === 0 ? 3 : 1.8,
  delay: (i * 247) % 2000,
}));

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const starAnims = useRef(STARS.map(() => new Animated.Value(0.1))).current;
  const chestPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 700, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(chestPulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(chestPulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    starAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(STARS[i].delay),
          Animated.timing(anim, { toValue: 0.9, duration: 600, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)/");
    } catch (e: any) {
      const code = e?.code || "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Email or password is incorrect.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (code === "auth/operation-not-allowed") {
        setError("Email/Password sign-in not enabled in Firebase Console.");
      } else {
        setError(e?.message || "Sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const glowOpacity = chestPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const glowScale = chestPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={styles.root}>
      {/* Galaxy background */}
      <LinearGradient
        colors={["#1C0B52", "#0D0B2B", "#0A0820"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Nebula blobs */}
      <View style={[styles.blob, { top: -60, left: -80, backgroundColor: "#7C3AED22", width: 250, height: 250 }]} />
      <View style={[styles.blob, { top: H * 0.3, right: -90, backgroundColor: "#4C1D9518", width: 280, height: 280 }]} />
      <View style={[styles.blob, { bottom: H * 0.05, left: W * 0.1, backgroundColor: "#7C3AED14", width: 200, height: 200 }]} />

      {/* Stars */}
      {STARS.map((s, i) => (
        <Animated.View
          key={s.key}
          style={[styles.star, { left: s.x, top: s.y, width: s.size, height: s.size, borderRadius: s.size, opacity: starAnims[i] }]}
        />
      ))}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }], alignItems: "center" }}>

            {/* Glowing chest icon */}
            <View style={styles.iconArea}>
              <Animated.View style={[styles.iconGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
              <LinearGradient
                colors={["#7C3AED", "#4C1D95"]}
                style={styles.iconBox}
              >
                <Text style={styles.chestEmoji}>🎓</Text>
              </LinearGradient>
              {/* Orbiting sparkles */}
              <View style={[styles.sparkle, { top: 2, right: 8 }]}><Text style={{ fontSize: 10 }}>✦</Text></View>
              <View style={[styles.sparkle, { bottom: 8, left: 4 }]}><Text style={{ fontSize: 8 }}>✦</Text></View>
              <View style={[styles.sparkle, { top: 12, left: 0 }]}><Text style={{ fontSize: 7 }}>★</Text></View>
            </View>

            {/* Logo text */}
            <Text style={styles.appName}>
              <Text style={{ color: "#FFFFFF" }}>Impro</Text>
              <Text style={{ color: "#F59E0B" }}>Kinz</Text>
            </Text>
            <Text style={styles.tagline}>✦  AI-Powered Treasure Map to Learning  ✦</Text>

            {/* Form card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSub}>Sign in to continue your journey</Text>

              {!!error && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#FCA5A5" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.form}>
                <View style={[styles.inputWrap, focusedField === "email" && styles.inputFocused]}>
                  <Feather name="mail" size={17} color={focusedField === "email" ? "#A78BFA" : "#6B5FA0"} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#6B5FA0"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                <View style={[styles.inputWrap, focusedField === "pw" && styles.inputFocused]}>
                  <Feather name="lock" size={17} color={focusedField === "pw" ? "#A78BFA" : "#6B5FA0"} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#6B5FA0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPw}
                    onFocus={() => setFocusedField("pw")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name={showPw ? "eye-off" : "eye"} size={17} color="#6B5FA0" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading}
                  style={{ opacity: loading ? 0.75 : 1 }}
                >
                  <LinearGradient
                    colors={["#F59E0B", "#D97706"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.signInBtn}
                  >
                    {loading
                      ? <Text style={styles.signInText}>Signing in...</Text>
                      : (
                        <View style={styles.btnInner}>
                          <Text style={styles.signInText}>Sign In</Text>
                          <Feather name="arrow-right" size={18} color="#fff" />
                        </View>
                      )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={styles.divLine} />
                <Text style={styles.divText}>New here?</Text>
                <View style={styles.divLine} />
              </View>

              <TouchableOpacity
                style={styles.registerBtn}
                onPress={() => router.push("/auth/register")}
              >
                <Text style={styles.registerText}>Create an Account</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom tagline */}
            <Text style={styles.bottomNote}>🔐  Your learning data is safe with us</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blob: { position: "absolute", borderRadius: 140 },
  star: { position: "absolute", backgroundColor: "#FFFFFF" },
  scroll: { alignItems: "center", paddingHorizontal: 20 },

  iconArea: { width: 96, height: 96, alignItems: "center", justifyContent: "center", marginBottom: 16, marginTop: 8 },
  iconGlow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#7C3AED55",
  },
  iconBox: {
    width: 82,
    height: 82,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
  },
  chestEmoji: { fontSize: 42 },
  sparkle: { position: "absolute" },

  appName: { fontSize: 34, fontWeight: "800", letterSpacing: 0.5, fontFamily: undefined },
  tagline: { fontSize: 12, color: "#A78BFA", marginTop: 4, marginBottom: 22, fontFamily: undefined, letterSpacing: 0.3 },

  card: {
    width: "100%",
    backgroundColor: "#1E1554",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#3D2D9022",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: { fontSize: 22, fontWeight: "700", color: "#FFFFFF", fontFamily: undefined, marginBottom: 2 },
  cardSub: { fontSize: 13, color: "#8B7CC4", fontFamily: undefined, marginBottom: 16 },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#3B1515",
    borderWidth: 1,
    borderColor: "#7F1D1D",
    marginBottom: 12,
  },
  errorText: { color: "#FCA5A5", fontSize: 12, flex: 1, lineHeight: 17, fontFamily: undefined },

  form: { gap: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#13103A",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2D2080",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputFocused: { borderColor: "#A78BFA" },
  input: { flex: 1, color: "#FFFFFF", fontSize: 15, fontFamily: undefined },

  signInBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  signInText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: undefined },

  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: "#2D2080" },
  divText: { color: "#6B5FA0", fontSize: 12, fontFamily: undefined },

  registerBtn: {
    borderWidth: 1.5,
    borderColor: "#A78BFA",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  registerText: { color: "#A78BFA", fontSize: 15, fontWeight: "600", fontFamily: undefined },

  bottomNote: { color: "#4B4280", fontSize: 12, marginTop: 18, fontFamily: undefined },
});
