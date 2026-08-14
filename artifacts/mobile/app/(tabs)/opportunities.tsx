import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Opportunities tab — placeholder.
 * Full implementation built in Task #12 (Opportunities tab + $5 verification paywall).
 */
export default function OpportunitiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 10,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Opportunities
        </Text>
      </View>

      {/* Placeholder body */}
      <View style={styles.center}>
        <LinearGradient
          colors={["#F59E0B22", "#7C3AED22"]}
          style={styles.iconWrap}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name="briefcase" size={40} color="#F59E0B" />
        </LinearGradient>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Opportunities Coming Soon
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Hackathons, jobs, and internships for students — post
          opportunities or discover your next big break.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "center",
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
