// Firebase is only initialized when all required env vars are present.
// The app renders a "setup required" screen when not configured.
export const isFirebaseConfigured =
  !!process.env["EXPO_PUBLIC_FIREBASE_API_KEY"] &&
  !!process.env["EXPO_PUBLIC_FIREBASE_PROJECT_ID"];

import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

let auth!: Auth;
let db!: Firestore;
let storage!: FirebaseStorage;

if (isFirebaseConfigured) {
  const { getApps, initializeApp } = require("firebase/app");
  const { getFirestore } = require("firebase/firestore");
  const { getStorage } = require("firebase/storage");
  const {
    getAuth,
    getReactNativePersistence,
    initializeAuth,
  } = require("firebase/auth");

  const firebaseConfig = {
    apiKey: process.env["EXPO_PUBLIC_FIREBASE_API_KEY"],
    authDomain: process.env["EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"],
    projectId: process.env["EXPO_PUBLIC_FIREBASE_PROJECT_ID"],
    storageBucket: process.env["EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"],
    messagingSenderId: process.env["EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"],
    appId: process.env["EXPO_PUBLIC_FIREBASE_APP_ID"],
  };

  const app =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

  db = getFirestore(app);
  storage = getStorage(app);

  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

export { auth, db, storage };
