import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";

const { width: W } = Dimensions.get("window");

export default function AuthChoiceScreen() {
  const router = useRouter();
  const { isSignedIn } = useClerkAuth();

  React.useEffect(() => {
    if (isSignedIn) router.replace("/(tabs)");
  }, [isSignedIn, router]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#110932", "#0D0B2B", "#1A0945", "#0D0B2B"]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />

      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <View style={styles.logoGlow} />
          <View style={styles.logoBg}>
            <Image
              source={require("../../assets/images/logo_nobg.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.title}>
          <Text style={styles.titleLight}>Impro</Text>
          <Text style={styles.titleGold}>Kinz</Text>
        </Text>
        <Text style={styles.subtitle}>Your AI-powered study companion</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome to your study space</Text>
          <Text style={styles.cardSubtitle}>
            Sign in to continue, or create a new account to get started.
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>Sign In</Text>
              <Text style={styles.arrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/auth/register")}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryText}>Create an Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Study smart. Level up. ✦</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: "absolute", borderRadius: 220 },
  orbTop: {
    top: -120,
    left: -100,
    width: 300,
    height: 300,
    backgroundColor: "#7C3AED22",
  },
  orbBottom: {
    bottom: -100,
    right: -80,
    width: 280,
    height: 280,
    backgroundColor: "#4C1D9518",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrap: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoGlow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#F59E0B22",
  },
  logoBg: {
    width: 132,
    height: 132,
    borderRadius: 34,
    backgroundColor: "#1E1050",
    borderWidth: 1.5,
    borderColor: "#F59E0B44",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: 116, height: 116 },
  title: { fontSize: 40, fontWeight: "800", letterSpacing: -0.5 },
  titleLight: { color: "#FFFFFF" },
  titleGold: { color: "#F59E0B" },
  subtitle: {
    color: "#A78BFA",
    fontSize: 15,
    marginTop: 6,
    marginBottom: 28,
  },
  card: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#1E1554",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#3D2D9044",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  cardSubtitle: {
    color: "#8B7CC4",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 22,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  arrow: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 18,
  },
  line: { flex: 1, height: 1, backgroundColor: "#2D2080" },
  orText: { color: "#6B5FA0", fontSize: 12 },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#A78BFA",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#C4B5FD", fontSize: 15, fontWeight: "600" },
  footer: { color: "#4B4280", fontSize: 12, marginTop: 24 },
});