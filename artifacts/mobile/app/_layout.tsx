import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Font from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

// Load font from the app's own assets/ folder so Metro always resolves it correctly.
// pnpm uses symlinks in node_modules which Metro can't follow reliably for binary assets.
const FONTS_TO_LOAD = {
  feather: require("../assets/fonts/Feather.ttf"),
  Feather: require("../assets/fonts/Feather.ttf"),
};

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
      <Stack.Screen
        name="post/[id]"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="user/[id]" />
      <Stack.Screen name="search" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="flashcards" />
      <Stack.Screen name="summarizer" />
      <Stack.Screen name="quiz" />
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
  const [fontsReady, setFontsReady] = useState(false);

  const loadFonts = useCallback(async () => {
    try {
      await Font.loadAsync(FONTS_TO_LOAD);
    } catch (e) {
      // Font load failed — still show the app (icons may appear as boxes)
      console.warn("Font load warning:", e);
    } finally {
      setFontsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadFonts();
  }, [loadFonts]);

  if (!fontsReady) return null;

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
