import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { SvgIcon } from "@/components/SvgIcon";

function tabIcon(filled: string, outline: string) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <SvgIcon name={focused ? filled : outline} size={24} color={color} />
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
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: TAB_HEIGHT + bottomPad + (isWeb ? 24 : 0),
          paddingBottom: bottomPad,
          paddingTop: 4,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: tabIcon("home", "home-outline"),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: tabIcon("grid", "grid-outline"),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Videos",
          tabBarIcon: tabIcon("play-circle", "play-circle-outline"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: tabIcon("person", "person-outline"),
        }}
      />
    </Tabs>
  );
}
