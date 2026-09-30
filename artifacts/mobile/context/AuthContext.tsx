import { asyncStorage as AsyncStorage } from "@/lib/asyncStorage";
import {
  User,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
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
  bannerUrl?: string;
  bio: string;
  subjects: string[];
  xp: number;
  streak: number;
  lastActiveDate: string;
  createdAt: number;
  followers?: string[];
  following?: string[];
  onboardingComplete?: boolean;
  creditsBalance?: number;
  creditsDate?: string;
  surveyReason?: string;
  studyTime?: string;
}

const ADMIN_EMAILS = ["improkinz@gmail.com"];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  isAdmin: boolean;
  logOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  addXP: (amount: number) => Promise<void>;
  /** Called by ClerkFirebaseBridge when Clerk signs in */
  loadProfileByClerkId: (clerkId: string, clerkUser?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=D97706&color=fff&size=128";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const updateStreak = useCallback(async (uid: string, currentStreak: number = 1, lastActive: string = "") => {
    try {
      if (!db) return;
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(`streak_${uid}`);
      if (stored === today) return;

      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const ref = doc(db, "profiles", uid);
      const newStreak = lastActive === yesterday ? (currentStreak || 0) + 1 : 1;

      await updateDoc(ref, { streak: newStreak, lastActiveDate: today });
      await AsyncStorage.setItem(`streak_${uid}`, today);
    } catch (e) {
      console.warn("updateStreak error:", e);
    }
  }, []);

  const fetchProfile = useCallback(async (uid: string, fbUser?: any) => {
    try {
      if (!db) return;
      const ref = doc(db, "profiles", uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        const normalized: UserProfile = {
          uid,
          email: data.email || fbUser?.email || "",
          displayName: data.displayName || data.name || data.userName || fbUser?.displayName || fbUser?.fullName || "Study User",
          photoURL: data.photoURL || data.avatar || fbUser?.photoURL || fbUser?.imageUrl || `${DEFAULT_AVATAR}&name=${encodeURIComponent(data.displayName || "Study User")}`,
          bannerUrl: data.bannerUrl || data.banner,
          bio: data.bio || "",
          subjects: data.subjects || [],
          xp: data.xp || 0,
          streak: data.streak || 1,
          lastActiveDate: data.lastActiveDate || new Date().toDateString(),
          createdAt: data.createdAt || Date.now(),
          followers: data.followers || [],
          following: data.following || [],
          onboardingComplete: data.onboardingComplete ?? false,
          creditsBalance: data.creditsBalance ?? 100,
          creditsDate: data.creditsDate || new Date().toISOString().slice(0, 10),
          surveyReason: data.surveyReason || "",
          studyTime: data.studyTime || "",
        };

        setProfile(normalized);
        updateStreak(uid, normalized.streak, normalized.lastActiveDate);
      } else {
        const name = fbUser?.displayName || fbUser?.fullName || fbUser?.firstName || "Study User";
        const email = fbUser?.email || fbUser?.primaryEmailAddress?.emailAddress || "";
        const photo = fbUser?.photoURL || fbUser?.imageUrl || `${DEFAULT_AVATAR}&name=${encodeURIComponent(name)}`;

        const p: UserProfile = {
          uid,
          email,
          displayName: name,
          photoURL: photo,
          bio: "",
          subjects: [],
          xp: 0,
          streak: 1,
          lastActiveDate: new Date().toDateString(),
          createdAt: Date.now(),
          creditsBalance: 100,
          creditsDate: new Date().toISOString().slice(0, 10),
          onboardingComplete: false,
        };

        await setDoc(ref, { ...p, createdAt: serverTimestamp() });
        setProfile(p);
      }
    } catch (e) {
      console.warn("fetchProfile error:", e);
    }
  }, [updateStreak]);

  // Real-time Firestore Listener & Auth State Sync
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        await fetchProfile(fbUser.uid, fbUser);

        // Real-time listener so changes reflect immediately across the app
        if (db) {
          const profileRef = doc(db, "profiles", fbUser.uid);
          unsubscribeProfile = onSnapshot(profileRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setProfile((prev) => ({
                ...prev,
                ...data,
                uid: fbUser.uid,
                displayName: data.displayName || data.name || prev?.displayName || "Study User",
                photoURL: data.photoURL || data.avatar || prev?.photoURL || "",
              }) as UserProfile);
            }
          });
        }
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [fetchProfile]);

  /**
   * Called by ClerkFirebaseBridge when Clerk signs in
   */
  const loadProfileByClerkId = useCallback(async (clerkId: string, clerkUser?: any) => {
    await fetchProfile(clerkId, clerkUser);
    setLoading(false);
  }, [fetchProfile]);

  const logOut = async () => {
    if (auth) {
      await signOut(auth).catch(() => {});
    }
    setProfile(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    const activeUid = user?.uid || profile?.uid;
    if (activeUid) await fetchProfile(activeUid, user);
  };

  const addXP = async (amount: number) => {
    const activeUid = user?.uid || profile?.uid;
    if (!activeUid || !db) return;
    try {
      const ref = doc(db, "profiles", activeUid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const newXP = (data.xp || 0) + amount;
      await updateDoc(ref, { xp: newXP });
      setProfile((p) => (p ? { ...p, xp: newXP } : p));
    } catch (e) {
      console.warn("addXP error:", e);
    }
  };

  const isAdmin = profile?.email ? ADMIN_EMAILS.includes(profile.email) : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        configured: isFirebaseConfigured,
        isAdmin,
        logOut,
        refreshProfile,
        addXP,
        loadProfileByClerkId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}