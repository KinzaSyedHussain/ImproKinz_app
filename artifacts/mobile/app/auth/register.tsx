import { Icon } from "@/components/Icon";
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
import { useSignUp } from "@clerk/clerk-expo";

const { width: W, height: H } = Dimensions.get("window");

const STARS = Array.from({ length: 30 }, (_, i) => ({
  key: i,
  x: ((i * 97.3) % 1) * W + (i % 5) * 16,
  y: ((i * 147.9) % 1) * H,
  size: i % 3 === 0 ? 2.5 : 1.6,
  delay: (i * 187) % 2200,
}));

const PERKS = [
  { icon: "⭐", text: "Earn XP for every study session" },
  { icon: "🤖", text: "AI tools: flashcards, quizzes & more" },
  { icon: "🏆", text: "Climb the leaderboard with streaks" },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const starAnims = useRef(STARS.map(() => new Animated.Value(0.1))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 700, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    starAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(STARS[i].delay),
          Animated.timing(anim, { toValue: 0.85, duration: 550, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.1, duration: 950, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const handleRegister = async () => {
    if (!isLoaded) return;
    setError("");
    if (!name.trim() || !email.trim() || !password) { setError("Please fill in all fields"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: name.trim(),
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (e: any) {
      const msg = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || "Sign up failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Only newly created accounts go through onboarding. Existing users
        // use the sign-in screen and are sent straight to the app.
        router.replace("/onboarding");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (e: any) {
      const msg = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || "Verification failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const busy = loading;

  if (pendingVerification) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#0A0820", "#0D0B2B", "#1C0B52"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 60), paddingBottom: insets.bottom + 40 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ alignItems: "center", width: "100%" }}>
              <View style={styles.verifyIconArea}>
                <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.verifyIconBox}>
                  <Text style={{ fontSize: 36 }}>📬</Text>
                </LinearGradient>
              </View>
              <Text style={styles.verifyTitle}>Check your email</Text>
              <Text style={styles.verifySub}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: "#F59E0B" }}>{email}</Text>
              </Text>

              {!!error && (
                <View style={[styles.errorBox, { width: "100%" }]}>
                  <Icon name="alert-circle" size={14} color="#FCA5A5" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={[styles.inputWrap, { width: "100%", marginTop: 8 }, focusedField === "code" && styles.inputFocused]}>
                <Icon name="shield" size={17} color={focusedField === "code" ? "#A78BFA" : "#6B5FA0"} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#6B5FA0"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  onFocus={() => setFocusedField("code")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <TouchableOpacity
                onPress={handleVerify}
                disabled={busy || code.length < 6}
                style={{ width: "100%", marginTop: 16, opacity: (busy || code.length < 6) ? 0.65 : 1 }}
              >
                <LinearGradient
                  colors={["#F59E0B", "#D97706"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.createBtn}
                >
                  <Text style={styles.createBtnText}>{busy ? "Verifying..." : "Verify & Start Learning 🚀"}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => signUp?.prepareEmailAddressVerification({ strategy: "email_code" })}
                style={{ marginTop: 16 }}
              >
                <Text style={styles.resendText}>Didn't receive it? Resend code</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setPendingVerification(false); setCode(""); setError(""); }} style={{ marginTop: 8 }}>
                <Text style={[styles.resendText, { color: "#6B5FA0" }]}>← Go back</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0A0820", "#0D0B2B", "#1C0B52"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.blob, { top: H * 0.5, right: -70, backgroundColor: "#7C3AED20", width: 260, height: 260 }]} />
      <View style={[styles.blob, { top: H * 0.15, left: -90, backgroundColor: "#4C1D9518", width: 230, height: 230 }]} />

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
            { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }], alignItems: "center", width: "100%" }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Icon name="arrow-left" size={20} color="#A78BFA" />
            </TouchableOpacity>

            <View style={styles.iconArea}>
              <Animated.View style={[styles.iconGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
              <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.iconBox}>
                <Text style={styles.iconEmoji}>🗝️</Text>
              </LinearGradient>
              <View style={[styles.sparkle, { top: 0, right: 6 }]}><Text style={{ fontSize: 11, color: "#F59E0B" }}>✦</Text></View>
              <View style={[styles.sparkle, { bottom: 5, left: 2 }]}><Text style={{ fontSize: 8, color: "#F59E0B" }}>★</Text></View>
            </View>

            <Text style={styles.title}>
              <Text style={{ color: "#FFFFFF" }}>Join </Text>
              <Text style={{ color: "#F59E0B" }}>ImproKinz</Text>
            </Text>
            <Text style={styles.subtitle}>Unlock your personal learning treasury</Text>

            <View style={styles.perksRow}>
              {PERKS.map((p, i) => (
                <View key={i} style={styles.perk}>
                  <Text style={styles.perkIcon}>{p.icon}</Text>
                  <Text style={styles.perkText}>{p.text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create your account</Text>

              {!!error && (
                <View style={styles.errorBox}>
                  <Icon name="alert-circle" size={14} color="#FCA5A5" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.form}>
                <View style={[styles.inputWrap, focusedField === "name" && styles.inputFocused]}>
                  <Icon name="user" size={17} color={focusedField === "name" ? "#A78BFA" : "#6B5FA0"} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor="#6B5FA0"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                <View style={[styles.inputWrap, focusedField === "email" && styles.inputFocused]}>
                  <Icon name="mail" size={17} color={focusedField === "email" ? "#A78BFA" : "#6B5FA0"} />
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
                  <Icon name="lock" size={17} color={focusedField === "pw" ? "#A78BFA" : "#6B5FA0"} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password (min. 8 characters)"
                    placeholderTextColor="#6B5FA0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPw}
                    onFocus={() => setFocusedField("pw")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name={showPw ? "eye-off" : "eye"} size={17} color="#6B5FA0" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={busy}
                  style={{ opacity: busy ? 0.75 : 1 }}
                >
                  <LinearGradient
                    colors={["#7C3AED", "#5B21B6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createBtn}
                  >
                    <View style={styles.btnInner}>
                      <Text style={styles.createBtnText}>{busy ? "Creating account..." : "Start Learning"}</Text>
                      {!busy && <Text style={{ fontSize: 16 }}>🚀</Text>}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerNote}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
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
  backBtn: { alignSelf: "flex-start", padding: 8, marginBottom: 8, backgroundColor: "#1E1554", borderRadius: 12, borderWidth: 1, borderColor: "#2D2080" },

  iconArea: { width: 96, height: 96, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  iconGlow: { position: "absolute", width: 112, height: 112, borderRadius: 56, backgroundColor: "#F59E0B40" },
  iconBox: { width: 80, height: 80, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowColor: "#F59E0B", shadowOpacity: 0.6, shadowRadius: 16, elevation: 10 },
  iconEmoji: { fontSize: 40 },
  sparkle: { position: "absolute" },

  title: { fontSize: 30, fontWeight: "800" },
  subtitle: { fontSize: 13, color: "#8B7CC4", marginTop: 4, marginBottom: 16, textAlign: "center" },

  perksRow: { width: "100%", gap: 8, marginBottom: 20 },
  perk: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1E155488", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#2D208044" },
  perkIcon: { fontSize: 18 },
  perkText: { color: "#C4B5FD", fontSize: 13, flex: 1 },

  card: { width: "100%", backgroundColor: "#1E1554", borderRadius: 24, padding: 22, borderWidth: 1, borderColor: "#2D208033", shadowColor: "#7C3AED", shadowOpacity: 0.18, shadowRadius: 20, elevation: 8 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 14 },

  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11, borderRadius: 10, backgroundColor: "#3B1515", borderWidth: 1, borderColor: "#7F1D1D", marginBottom: 12 },
  errorText: { color: "#FCA5A5", fontSize: 12, flex: 1, lineHeight: 17 },

  form: { gap: 12 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#13103A", borderRadius: 14, borderWidth: 1.5, borderColor: "#2D2080", paddingHorizontal: 14, paddingVertical: 13 },
  inputFocused: { borderColor: "#A78BFA" },
  input: { flex: 1, color: "#FFFFFF", fontSize: 15 },

  createBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", shadowColor: "#7C3AED", shadowOpacity: 0.45, shadowRadius: 12, elevation: 6 },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  footer: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  footerNote: { color: "#6B5FA0", fontSize: 13 },
  footerLink: { color: "#A78BFA", fontSize: 13, fontWeight: "600" },

  verifyIconArea: { width: 90, height: 90, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  verifyIconBox: { width: 76, height: 76, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  verifyTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", marginBottom: 8, textAlign: "center" },
  verifySub: { fontSize: 14, color: "#8B7CC4", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  resendText: { color: "#A78BFA", fontSize: 13, fontWeight: "600" },
});
