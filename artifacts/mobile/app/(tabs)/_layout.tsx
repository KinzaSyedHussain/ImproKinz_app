import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Icon } from "@/components/Icon";

function lucideTab(name: string) {
  return ({ color }: { color: string; focused: boolean }) => (
    <Icon name={name as any} size={22} color={color} />
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const TAB_HEIGHT = isWeb ? 60 : 56;
  const bottomPad = isIOS ? 0 : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,

        tabBarStyle: {
          position: isWeb ? "relative" : "absolute",
          backgroundColor: isWeb ? colors.card : "transparent",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: TAB_HEIGHT + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 4,
          zIndex: 100,
        },

        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? null : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: colors.card,
                },
              ]}
            />
          ),

        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },

        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      {/* =========================
          VISIBLE TABS
          ========================= */}

      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: lucideTab("home"),
        }}
      />

      <Tabs.Screen
        name="youtube"
        options={{
          title: "Videos",
          tabBarIcon: lucideTab("youtube"),
        }}
      />

      <Tabs.Screen
        name="opportunities"
        options={{
          title: "Opportunities",
          tabBarIcon: lucideTab("briefcase"),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: lucideTab("user"),
        }}
      />

      {/* =========================
          HIDDEN ROUTES
          ========================= */}

      <Tabs.Screen
        name="focus"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="opportunity-details"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});