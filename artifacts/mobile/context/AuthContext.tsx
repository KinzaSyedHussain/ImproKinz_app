import { asyncStorage as AsyncStorage } from "@/lib/asyncStorage";
import {
  User,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  /** Called by ClerkFirebaseBridge after Clerk signs in without Firebase bridge */
  loadProfileByClerkId: (clerkId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=D97706&color=fff&size=128";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string, fbUser?: User) => {
    try {
      // Use 'profiles' collection — same as the web app for sync
      const ref = doc(db, "profiles", uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        // Normalize web profile field names to mobile ones
        const normalized: UserProfile = {
          uid,
          email:           data.email       || "",
          displayName:     data.displayName || data.name || data.userName || "Study User",
          photoURL:        data.photoURL    || data.avatar || "",
          bannerUrl:       data.bannerUrl   || data.banner,
          bio:             data.bio         || "",
          subjects:        data.subjects    || [],
          xp:              data.xp          || 0,
          streak:          data.streak      || 1,
          lastActiveDate:  data.lastActiveDate || new Date().toDateString(),
          createdAt:       data.createdAt   || Date.now(),
          followers:       data.followers,
          following:       data.following,
          onboardingComplete: data.onboardingComplete,
          creditsBalance: data.creditsBalance,
          creditsDate: data.creditsDate,
          surveyReason: data.surveyReason,
          studyTime: data.studyTime,
        };
        setProfile(normalized);
      } else {
        const name  = fbUser?.displayName || "Study User";
        const photo = fbUser?.photoURL || `${DEFAULT_AVATAR}&name=${encodeURIComponent(name)}`;
        const p: UserProfile = {
          uid,
          email: fbUser?.email || "",
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
        };
        await setDoc(ref, { ...p, createdAt: serverTimestamp() });
        setProfile(p);
      }
    } catch (e) {
      console.warn("fetchProfile error:", e);
    }
  }, []);

  const updateStreak = useCallback(async (uid: string) => {
    try {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(`streak_${uid}`);
      if (stored === today) return;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const ref = doc(db, "profiles", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data() as UserProfile;
      const newStreak = data.lastActiveDate === yesterday ? (data.streak || 0) + 1 : 1;
      await updateDoc(ref, { streak: newStreak, lastActiveDate: today });
      await AsyncStorage.setItem(`streak_${uid}`, today);
    } catch (e) {
      console.warn("updateStreak error:", e);
    }
  }, []);

  // Firebase auth state listener — Bridge updates this after Clerk sign-in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        await fetchProfile(fbUser.uid, fbUser);
        updateStreak(fbUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchProfile, updateStreak]);

  /**
   * Called by ClerkFirebaseBridge when Clerk is signed in but the Firebase
   * custom token bridge hasn't completed yet (e.g. no service account configured).
   * Allows the app to still show profile data.
   */
  const loadProfileByClerkId = useCallback(async (clerkId: string) => {
    await fetchProfile(clerkId);
    setLoading(false);
  }, [fetchProfile]);

  const logOut = async () => {
    await signOut(auth).catch(() => {});
    setProfile(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid, user);
  };

  const addXP = async (amount: number) => {
    if (!user) return;
    try {
      const ref = doc(db, "profiles", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data() as UserProfile;
      const newXP = (data.xp || 0) + amount;
      await updateDoc(ref, { xp: newXP });
      setProfile((p) => (p ? { ...p, xp: newXP } : p));
    } catch (e) {
      console.warn("addXP error:", e);
    }
  };

  const isAdmin = profile?.email ? ADMIN_EMAILS.includes(profile.email) : false;

  return (
    <AuthContext.Provider value={{
      user, profile, loading, configured: isFirebaseConfigured, isAdmin,
      logOut, refreshProfile, addXP, loadProfileByClerkId,
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
