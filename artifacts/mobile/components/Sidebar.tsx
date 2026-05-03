import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  {
    icon: "file-text",
    label: "Notes Maker",
    desc: "AI-generated study notes",
    route: "/notes",
    color: "#D97706",
  },
];

const NAV_ITEMS = [
  { icon: "search", label: "Search", route: "/search" },
  { icon: "settings", label: "Settings", route: "/settings" },
];

export function Sidebar({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, logOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -SIDEBAR_WIDTH,
      useNativeDriver: true,
      damping: 22,
      stiffness: 220,
    }).start();
  }, [visible]);

  const navigate = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 220);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Tap outside to close */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Sidebar panel */}
        <Animated.View
          style={[
            styles.sidebar,
            { backgroundColor: colors.card, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Profile header */}
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

          {/* Scrollable body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
            showsVerticalScrollIndicator={false}
            bounces={Platform.OS === "ios"}
            overScrollMode="never"
          >
            {/* AI Tools */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                AI STUDY TOOLS
              </Text>
              {TOOLS.map((tool) => (
                <TouchableOpacity
                  key={tool.route}
                  style={[styles.toolItem, { borderColor: colors.border }]}
                  onPress={() => navigate(tool.route)}
                  activeOpacity={0.7}
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

            {/* Nav items */}
            <View style={styles.section}>
              {NAV_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.route}
                  style={styles.navItem}
                  onPress={() => navigate(item.route)}
                  activeOpacity={0.7}
                >
                  <Icon name={item.icon as any} size={20} color={colors.foreground} />
                  <Text style={[styles.navLabel, { color: colors.foreground }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Theme toggle */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Icon name={isDark ? "sun" : "moon"} size={20} color={colors.primary} />
              <Text style={[styles.navLabel, { color: colors.primary }]}>
                {isDark ? "Light Mode" : "Dark Mode"}
              </Text>
            </TouchableOpacity>

            {/* Sign In / Sign Out — toggles based on auth state */}
            {user ? (
              <TouchableOpacity
                style={[styles.navItem, styles.signOutItem]}
                onPress={async () => {
                  onClose();
                  try { await logOut(); } catch {}
                  router.replace("/auth/login");
                }}
                activeOpacity={0.7}
              >
                <Icon name="log-out" size={20} color="#EF4444" />
                <Text style={[styles.navLabel, { color: "#EF4444" }]}>Sign Out</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navItem, styles.signOutItem]}
                onPress={() => {
                  onClose();
                  router.replace("/auth/login");
                }}
                activeOpacity={0.7}
              >
                <Icon name="log-in" size={20} color="#A78BFA" />
                <Text style={[styles.navLabel, { color: "#A78BFA" }]}>Sign In</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 24,
  },
  profileHeader: {
    padding: 20,
    paddingBottom: 24,
    gap: 6,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  profileEmail: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
  },
  section: { paddingHorizontal: 12, paddingVertical: 8 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "600",
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
  toolLabel: { fontSize: 14, fontWeight: "500" },
  toolDesc: { fontSize: 12, marginTop: 1 },
  divider: { height: 1, marginHorizontal: 16, marginVertical: 4 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  signOutItem: {
    marginTop: 4,
  },
  navLabel: { fontSize: 15, fontWeight: "500" },
});
