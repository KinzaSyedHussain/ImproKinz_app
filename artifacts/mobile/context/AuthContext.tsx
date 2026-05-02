import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio: string;
  subjects: string[];
  xp: number;
  streak: number;
  lastActiveDate: string;
  createdAt: number;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  googleSignIn: (idToken: string) => Promise<void>;
  logOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  addXP: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=4F46E5&color=fff&size=128";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  const fetchProfile = useCallback(async (uid: string) => {
    if (!isFirebaseConfigured) return;
    try {
      const { doc, getDoc } = require("firebase/firestore");
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const { onAuthStateChanged } = require("firebase/auth");
    const unsub = onAuthStateChanged(auth, async (fbUser: any) => {
      setUser(fbUser);
      if (fbUser) {
        await fetchProfile(fbUser.uid);
        updateStreak(fbUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchProfile]);

  const updateStreak = async (uid: string) => {
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const { doc, getDoc, updateDoc } = require("firebase/firestore");
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(`streak_${uid}`);
      if (stored === today) return;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data() as UserProfile;
      const newStreak = data.lastActiveDate === yesterday ? (data.streak || 0) + 1 : 1;
      await updateDoc(ref, { streak: newStreak, lastActiveDate: today });
      await AsyncStorage.setItem(`streak_${uid}`, today);
    } catch {}
  };

  const createUserProfile = async (fbUser: any, displayName?: string) => {
    const { doc, setDoc, serverTimestamp } = require("firebase/firestore");
    const name = displayName || fbUser.displayName || "Study User";
    const photo = fbUser.photoURL || `${DEFAULT_AVATAR}&name=${encodeURIComponent(name)}`;
    const p: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || "",
      displayName: name,
      photoURL: photo,
      bio: "",
      subjects: [],
      xp: 0,
      streak: 1,
      lastActiveDate: new Date().toDateString(),
      createdAt: Date.now(),
    };
    await setDoc(doc(db, "users", fbUser.uid), { ...p, createdAt: serverTimestamp() });
    setProfile(p);
  };

  const signIn = async (email: string, password: string) => {
    const { signInWithEmailAndPassword } = require("firebase/auth");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { createUserWithEmailAndPassword, updateProfile } = require("firebase/auth");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await createUserProfile(cred.user, displayName);
  };

  const googleSignIn = async (idToken: string) => {
    const { GoogleAuthProvider, signInWithCredential } = require("firebase/auth");
    const { doc, getDoc } = require("firebase/firestore");
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (!snap.exists()) await createUserProfile(cred.user);
  };

  const logOut = async () => {
    const { signOut } = require("firebase/auth");
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  const addXP = async (amount: number) => {
    if (!user) return;
    try {
      const { doc, getDoc, updateDoc } = require("firebase/firestore");
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data() as UserProfile;
      const newXP = (data.xp || 0) + amount;
      await updateDoc(ref, { xp: newXP });
      setProfile((p) => (p ? { ...p, xp: newXP } : p));
    } catch {}
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading, configured: isFirebaseConfigured,
      signIn, signUp, googleSignIn, logOut, refreshProfile, addXP,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
