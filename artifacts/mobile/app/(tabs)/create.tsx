// This screen is never rendered — the tab bar button routes directly to /create-post.
// Expo Router requires a file for every Tabs.Screen name.
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function CreateScreen() {
  const router = useRouter();
  useEffect(() => { router.replace("/create-post"); }, []);
  return <View />;
}
