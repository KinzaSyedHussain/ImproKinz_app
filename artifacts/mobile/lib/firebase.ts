import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// Use dot notation — Expo's Metro bundler only inlines EXPO_PUBLIC_* with dot notation
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_STORAGE_BUCKET = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
const FIREBASE_MESSAGING_SENDER_ID = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const FIREBASE_APP_ID = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

export const isFirebaseConfigured =
  !!FIREBASE_API_KEY && !!FIREBASE_PROJECT_ID;

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY ?? "",
  authDomain: FIREBASE_AUTH_DOMAIN ?? "",
  projectId: FIREBASE_PROJECT_ID ?? "",
  storageBucket: FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: FIREBASE_APP_ID ?? "",
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
