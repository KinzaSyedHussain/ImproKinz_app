import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

export default function Root() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (loading) return;
    if (!configured) return;
    if (user) {
      router.replace("/(tabs)/");
    } else {
      router.replace("/auth/login");
    }
  }, [user, loading, configured, router]);

  if (!configured) {
    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.container}
      >
        <View style={styles.card}>
          <Feather name="book-open" size={48} color={colors.gradientStart} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Improkinz
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Firebase setup required
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            Add your Firebase credentials as environment variables to get started:
          </Text>
          {[
            "EXPO_PUBLIC_FIREBASE_API_KEY",
            "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
            "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
            "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
            "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
            "EXPO_PUBLIC_FIREBASE_APP_ID",
            "OPENAI_API_KEY (for AI tools)",
          ].map((v) => (
            <View key={v} style={[styles.varRow, { backgroundColor: colors.muted }]}>
              <Feather name="key" size={12} color={colors.primary} />
              <Text style={[styles.varText, { color: colors.foreground }]}>
                {v}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.container}
    >
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={styles.loadingText}>Loading Improkinz...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontFamily: undefined,
    fontSize: 28,
  },
  subtitle: {
    fontFamily: undefined,
    fontSize: 16,
  },
  body: {
    fontFamily: undefined,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  varRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: "100%",
  },
  varText: {
    fontFamily: undefined,
    fontSize: 11,
    flex: 1,
  },
  loadingText: {
    color: "#FFFFFF",
    fontFamily: undefined,
    fontSize: 16,
    marginTop: 16,
  },
});
