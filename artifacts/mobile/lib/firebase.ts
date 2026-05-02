import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

export const isFirebaseConfigured =
  !!process.env["EXPO_PUBLIC_FIREBASE_API_KEY"] &&
  !!process.env["EXPO_PUBLIC_FIREBASE_PROJECT_ID"];

const firebaseConfig = {
  apiKey: process.env["EXPO_PUBLIC_FIREBASE_API_KEY"] ?? "",
  authDomain: process.env["EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"] ?? "",
  projectId: process.env["EXPO_PUBLIC_FIREBASE_PROJECT_ID"] ?? "",
  storageBucket: process.env["EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"] ?? "",
  messagingSenderId: process.env["EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"] ?? "",
  appId: process.env["EXPO_PUBLIC_FIREBASE_APP_ID"] ?? "",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: ReturnType<typeof getAuth>;
if (Platform.OS !== "web") {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
} else {
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
