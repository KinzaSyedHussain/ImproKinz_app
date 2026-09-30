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
import { Platform, View, Text, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ClerkFirebaseBridge } from "@/context/ClerkFirebaseBridge";
import { CreditProvider } from "@/context/CreditContext";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

const publishableKey = "pk_test_bG92ZWQtbWlubm93LTc0LmNsZXJrLmFjY291bnRzLmRldiQ";

// Safe RevenueCat initialization
try {
  initializeRevenueCat();
} catch (error) {
  console.warn("RevenueCat initialization failed:", error);
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-post" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
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
      <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="study-hub" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="privacy" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="terms" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="create-group" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="create-opportunity" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="group/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

function InnerProviders({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") {
    const { KeyboardProvider } = require("react-native-keyboard-controller");
    return (
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardProvider>{children}</KeyboardProvider>
      </GestureHandlerRootView>
    );
  }
  return (
    <GestureHandlerRootView style={styles.flex}>
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

  if (!fontsLoaded && !fontError && Platform.OS !== "web") return null;

  // Fallback UI when Clerk Publishable Key is missing instead of returning null / blank screen
  if (!publishableKey) {
    return (
      <GestureHandlerRootView style={styles.fallbackContainer}>
        <View style={styles.card}>
          <Text style={styles.errorTitle}>Missing Environment Variables</Text>
          <Text style={styles.errorText}>
            <Text style={styles.bold}>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</Text> is missing from your <Text style={styles.bold}>.env</Text> file.
          </Text>
          <Text style={styles.subText}>
            Add key to your root <Text style={styles.bold}>.env</Text> and restart server:
          </Text>
          <Text style={styles.codeSnippet}>npx expo start -c</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <ClerkFirebaseBridge />
                <SubscriptionProvider>
                  <CreditProvider>
                    <InnerProviders>
                      <RootLayoutNav />
                    </InnerProviders>
                  </CreditProvider>
                </SubscriptionProvider>
              </AuthProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#121212",
  },
  card: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: "#1e1e1e",
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff5252",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#e0e0e0",
    textAlign: "center",
    marginBottom: 8,
  },
  subText: {
    fontSize: 12,
    color: "#a0a0a0",
    textAlign: "center",
    marginBottom: 12,
  },
  bold: {
    fontWeight: "bold",
    color: "#ffffff",
  },
  codeSnippet: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    backgroundColor: "#2d2d2d",
    color: "#00e676",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 13,
  },
});