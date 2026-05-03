import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

// Load the Ionicons .ttf directly — bypasses the lazy Ionicons.font getter
// which can silently fail in Expo Go on Android
// eslint-disable-next-line @typescript-eslint/no-require-imports
const IONICONS_TTF = require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf");

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="create-post"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="post/[id]" options={{ presentation: "modal" }} />
      <Stack.Screen name="user/[id]" />
      <Stack.Screen name="search" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="flashcards" />
      <Stack.Screen name="summarizer" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
    </Stack>
  );
}

function InnerProviders({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") {
    const { KeyboardProvider } = require("react-native-keyboard-controller");
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>{children}</KeyboardProvider>
      </GestureHandlerRootView>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {children}
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  // Load Inter fonts via useFonts (handles remote + local fonts well)
  const [interLoaded, interError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Load Ionicons separately using Font.loadAsync with a direct require path
  // This is more reliable than spreading Ionicons.font into useFonts
  const [iconsReady, setIconsReady] = useState(false);

  useEffect(() => {
    Font.loadAsync({ Ionicons: IONICONS_TTF })
      .then(() => setIconsReady(true))
      .catch(() => {
        // Still mark as ready so the app renders even without icons
        setIconsReady(true);
      });
  }, []);

  const ready = (interLoaded || !!interError) && iconsReady;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <InnerProviders>
                <RootLayoutNav />
              </InnerProviders>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
