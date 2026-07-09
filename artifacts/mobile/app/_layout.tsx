import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@/lib/tokenCache";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ClerkFirebaseBridge } from "@/context/ClerkFirebaseBridge";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

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
      <Stack.Screen name="todo" />
      <Stack.Screen name="board" />
      <Stack.Screen name="chatbot" />
      <Stack.Screen name="pomodoro" />
      <Stack.Screen name="progress" />
      <Stack.Screen name="calculator" />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
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
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // On web, fonts may load asynchronously — don't block render indefinitely
  if (!fontsLoaded && !fontError && Platform.OS !== "web") return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <ClerkFirebaseBridge />
                <InnerProviders>
                  <RootLayoutNav />
                </InnerProviders>
              </AuthProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
