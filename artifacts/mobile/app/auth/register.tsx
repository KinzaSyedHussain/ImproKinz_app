import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/(tabs)/");
    } catch (e: any) {
      console.error("Sign up error:", e?.code, e?.message);
      const code = e?.code || "";
      if (code === "auth/operation-not-allowed") {
        setError("Email/Password sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password.");
      } else if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Check your internet connection.");
      } else if (code === "auth/invalid-api-key") {
        setError("Firebase API key is invalid. Check EXPO_PUBLIC_FIREBASE_API_KEY secret.");
      } else {
        setError(e?.message || `Sign up failed (${code || "unknown error"})`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.logoWrap}
        >
          <Feather name="user-plus" size={32} color="#FFFFFF" />
        </LinearGradient>

        <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Join thousands of students on StudySpace
        </Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="user" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Full name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="mail" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Email address"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="lock" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Password (min. 6 characters)"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { opacity: loading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Creating account..." : "Create Account"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.link, { color: colors.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, marginBottom: 4, textAlign: "center" },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  errorText: { color: "#DC2626", fontSize: 13, flex: 1, lineHeight: 18 },
  form: { width: "100%", gap: 14 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: { flex: 1, fontFamily: undefined, fontSize: 15 },
  primaryBtn: { borderRadius: 14, overflow: "hidden" },
  gradient: { paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#FFFFFF", fontFamily: undefined, fontSize: 16 },
  footer: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  footerText: { fontFamily: undefined, fontSize: 14 },
  link: { fontFamily: undefined, fontSize: 14 },
});
