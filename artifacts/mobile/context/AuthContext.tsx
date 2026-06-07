import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
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
}

interface AuthContextType {
  user: User | null;
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

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=D97706&color=fff&size=128";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string, fbUser?: User) => {
    try {
      // Try `users/` first (mobile-primary), fall back to `profiles/` (web-primary)
      const mobileRef = doc(db, "users", uid);
      const webRef    = doc(db, "profiles", uid);
      const [mobileSnap, webSnap] = await Promise.all([getDoc(mobileRef), getDoc(webRef)]);

      if (mobileSnap.exists()) {
        const data = mobileSnap.data() as UserProfile;
        // If the web has a more recent display name / photo, prefer it
        if (webSnap.exists()) {
          const webData = webSnap.data() as Partial<UserProfile>;
          const merged: UserProfile = {
            ...data,
            displayName: data.displayName || webData.displayName || data.displayName,
            photoURL:    data.photoURL    || webData.photoURL    || data.photoURL,
            bio:         data.bio         || webData.bio         || data.bio,
          };
          setProfile(merged);
        } else {
          setProfile(data);
        }
      } else if (webSnap.exists()) {
        // User registered on the website — import their profile into `users/`
        const webData = webSnap.data() as Partial<UserProfile>;
        const name  = webData.displayName || fbUser?.displayName || "Study User";
        const photo = webData.photoURL    || fbUser?.photoURL
          || `${DEFAULT_AVATAR}&name=${encodeURIComponent(name)}`;
        const p: UserProfile = {
          uid,
          email:          webData.email   || fbUser?.email || "",
          displayName:    name,
          photoURL:       photo,
          bannerUrl:      webData.bannerUrl,
          bio:            webData.bio     || "",
          subjects:       webData.subjects || [],
          xp:             webData.xp      || 0,
          streak:         webData.streak  || 1,
          lastActiveDate: webData.lastActiveDate || new Date().toDateString(),
          createdAt:      webData.createdAt      || Date.now(),
          following:      webData.following,
        };
        await setDoc(mobileRef, { ...p, createdAt: serverTimestamp() });
        setProfile(p);
      } else if (fbUser) {
        // New user — create in both collections so both platforms see them
        const name  = fbUser.displayName || "Study User";
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
        const base = { ...p, createdAt: serverTimestamp() };
        await Promise.all([
          setDoc(mobileRef, base),
          setDoc(webRef,    base),
        ]);
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
      const ref = doc(db, "users", uid);
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        await fetchProfile(fbUser.uid, fbUser); // pass fbUser so missing doc is auto-created
        updateStreak(fbUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchProfile, updateStreak]);

  const createUserProfile = async (fbUser: User, displayName?: string) => {
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
    const base = { ...p, createdAt: serverTimestamp() };
    // Write to both collections so mobile users appear on the website too
    await Promise.all([
      setDoc(doc(db, "users",    fbUser.uid), base),
      setDoc(doc(db, "profiles", fbUser.uid), base),
    ]);
    setProfile(p);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    // Don't await — Firestore write shouldn't block auth success
    createUserProfile(cred.user, displayName).catch((e) =>
      console.warn("createUserProfile error:", e)
    );
  };

  const googleSignIn = async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (!snap.exists()) await createUserProfile(cred.user);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid, user);
  };

  const addXP = async (amount: number) => {
    if (!user) return;
    try {
      const ref = doc(db, "users", user.uid);
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
