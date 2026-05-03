import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "./UserAvatar";
import { XPStreakBadge } from "./XPStreakBadge";

const SIDEBAR_WIDTH = 300;

interface Props {
  visible: boolean;
  onClose: () => void;
}

const TOOLS = [
  {
    icon: "layers",
    label: "Flashcard Generator",
    desc: "Create Q&A flashcards from any text",
    route: "/flashcards",
    color: "#4F46E5",
  },
  {
    icon: "align-left",
    label: "AI Summarizer",
    desc: "Get instant summaries of study material",
    route: "/summarizer",
    color: "#7C3AED",
  },
  {
    icon: "check-square",
    label: "Quiz Generator",
    desc: "Practice with AI-generated MCQs",
    route: "/quiz",
    color: "#059669",
  },
];

const NAV_ITEMS = [
  { icon: "search", label: "Search", route: "/search" },
  { icon: "bookmark", label: "Saved Posts", route: "/(tabs)/" },
  { icon: "settings", label: "Settings", route: "/settings" },
];

export function Sidebar({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, logOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: -SIDEBAR_WIDTH,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateX, opacity]);

  const navigate = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 200);
  };

  if (!visible && Platform.OS !== "web") return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? "auto" : "none"}>
      {/* Dim overlay — row layout: left gap (sidebar area) + right tappable area */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="box-none">
        <View style={{ flex: 1, flexDirection: "row" }} pointerEvents="box-none">
          {/* Left gap: same width as sidebar, no touch interception */}
          <View style={{ width: SIDEBAR_WIDTH }} pointerEvents="none" />
          {/* Right: tap-to-close dark area */}
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={[styles.overlayRight, { backgroundColor: colors.overlay }]} />
          </TouchableWithoutFeedback>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.sidebar,
          { backgroundColor: colors.card, transform: [{ translateX }] },
        ]}
      >
        {/* Fixed gradient header */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.profileHeader, { paddingTop: insets.top + 16 }]}
        >
          <UserAvatar
            photoURL={profile?.photoURL}
            displayName={profile?.displayName}
            size={56}
          />
          <Text style={styles.profileName}>
            {profile?.displayName || "Study User"}
          </Text>
          <Text style={styles.profileEmail}>{profile?.email || ""}</Text>
          {profile && (
            <XPStreakBadge xp={profile.xp} streak={profile.streak} compact />
          )}
        </LinearGradient>

        {/* Scrollable content — ensures Light Mode / Sign Out are always reachable */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              AI STUDY TOOLS
            </Text>
            {TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.route}
                style={[styles.toolItem, { borderColor: colors.border }]}
                onPress={() => navigate(tool.route)}
              >
                <View style={[styles.toolIcon, { backgroundColor: tool.color + "18" }]}>
                  <Icon name={tool.icon as any} size={20} color={tool.color} />
                </View>
                <View style={styles.toolInfo}>
                  <Text style={[styles.toolLabel, { color: colors.foreground }]}>
                    {tool.label}
                  </Text>
                  <Text style={[styles.toolDesc, { color: colors.mutedForeground }]}>
                    {tool.desc}
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.section}>
            {NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.navItem}
                onPress={() => navigate(item.route)}
              >
                <Icon name={item.icon as any} size={20} color={colors.foreground} />
                <Text style={[styles.navLabel, { color: colors.foreground }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.navItem} onPress={toggleTheme}>
            <Icon name={isDark ? "sun" : "moon"} size={20} color={colors.primary} />
            <Text style={[styles.navLabel, { color: colors.primary }]}>
              {isDark ? "Light Mode" : "Dark Mode"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={async () => {
              onClose();
              await logOut();
            }}
          >
            <Icon name="log-out" size={20} color="#EF4444" />
            <Text style={[styles.navLabel, { color: "#EF4444" }]}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRight: {
    flex: 1,
    height: "100%",
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 1000,
    elevation: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  profileHeader: {
    padding: 20,
    paddingBottom: 24,
    gap: 6,
  },
  profileName: {
    color: "#FFFFFF",
    fontFamily: undefined,
    fontSize: 18,
    marginTop: 8,
  },
  profileEmail: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: undefined,
    fontSize: 13,
  },
  section: { paddingHorizontal: 12, paddingVertical: 8 },
  sectionLabel: {
    fontFamily: undefined,
    fontSize: 11,
    letterSpacing: 1,
    marginLeft: 4,
    marginBottom: 8,
    marginTop: 4,
  },
  toolItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toolInfo: { flex: 1 },
  toolLabel: { fontFamily: undefined, fontSize: 14 },
  toolDesc: { fontFamily: undefined, fontSize: 12, marginTop: 1 },
  divider: { height: 1, marginHorizontal: 16, marginVertical: 4 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  navLabel: { fontFamily: undefined, fontSize: 15 },
});
