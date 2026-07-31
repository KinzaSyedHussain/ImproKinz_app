import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, usePathname } from "expo-router";
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

const MAIN_NAV = [
  { icon: "home", label: "Home", route: "/(tabs)" },
  { icon: "compass", label: "Explore", route: "/search" },
  { icon: "users", label: "Community", route: "/(tabs)" },
  { icon: "bell", label: "Notifications", route: "/(tabs)/notifications" },
  { icon: "mail", label: "Messages", route: "/(tabs)" },
];

const SECONDARY_NAV = [
  { icon: "bookmark", label: "Saved Posts", route: "/(tabs)/profile" },
  { icon: "user", label: "Profile", route: "/(tabs)/profile" },
  { icon: "grid", label: "Dashboard", route: "/(tabs)/dashboard" },
  { icon: "settings", label: "Settings", route: "/settings" },
];

export function Sidebar({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
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
    setTimeout(() => {
      if (route.startsWith("/(tabs)")) {
        router.replace(route as any);
      } else {
        router.push(route as any);
      }
    }, 220);
  };

  const isActive = (route: string) => {
    if (route === "/(tabs)" && (pathname === "/" || pathname === "/(tabs)")) return true;
    return pathname.startsWith(route.replace("/(tabs)", ""));
  };

  const renderNavItem = (item: typeof MAIN_NAV[0], isMain = true) => {
    const active = isActive(item.route);
    return (
      <TouchableOpacity
        key={item.label}
        style={[
          styles.navItem,
          active && { backgroundColor: colors.primary + "18" },
        ]}
        onPress={() => navigate(item.route)}
        activeOpacity={0.7}
      >
        <Icon
          name={item.icon as any}
          size={20}
          color={active ? colors.primary : colors.foreground}
        />
        <Text
          style={[
            styles.navLabel,
            { color: active ? colors.primary : colors.foreground },
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
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
            {/* Main Navigation */}
            <View style={styles.section}>
              {MAIN_NAV.map((item) => renderNavItem(item, true))}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Secondary Navigation */}
            <View style={styles.section}>
              {SECONDARY_NAV.map((item) => renderNavItem(item, false))}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[styles.navItem, { backgroundColor: colors.primary + "12" }]}
              onPress={() => navigate("/paywall")}
              activeOpacity={0.7}
            >
              <Icon name="award" size={20} color={colors.primary} />
              <Text style={[styles.navLabel, { color: colors.primary }]}>Go Premium</Text>
            </TouchableOpacity>

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

            {/* Sign In / Sign Out */}
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
