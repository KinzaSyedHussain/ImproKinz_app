import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";

interface UserInfo {
  photoURL: string | null;
  displayName: string | null;
}

const infoCache = new Map<string, UserInfo>();
const inFlight = new Map<string, Promise<UserInfo>>();

async function fetchUserInfo(uid: string): Promise<UserInfo> {
  if (!uid) return { photoURL: null, displayName: null };
  if (infoCache.has(uid)) return infoCache.get(uid)!;
  if (inFlight.has(uid)) return inFlight.get(uid)!;

  const p = Promise.all([
    getDoc(doc(db, "users",    uid)),
    getDoc(doc(db, "profiles", uid)),
  ])
    .then(([mobileSnap, webSnap]) => {
      const m = mobileSnap.data();
      const w = webSnap.data();
      const info: UserInfo = {
        photoURL:    (m?.photoURL    || w?.photoURL    || w?.avatar        || null) as string | null,
        displayName: (m?.displayName || w?.displayName || w?.name || w?.userName || null) as string | null,
      };
      infoCache.set(uid, info);
      inFlight.delete(uid);
      return info;
    })
    .catch(() => {
      const empty: UserInfo = { photoURL: null, displayName: null };
      infoCache.set(uid, empty);
      inFlight.delete(uid);
      return empty;
    });

  inFlight.set(uid, p);
  return p;
}

/** Legacy: returns just the photo URL (used in PostCard for photo fallback) */
export async function fetchUserPhoto(uid: string): Promise<string | null> {
  return (await fetchUserInfo(uid)).photoURL;
}

export function useUserPhoto(uid: string, fallback?: string | null): string | null {
  const cached = infoCache.get(uid);
  const [photo, setPhoto] = useState<string | null>(
    cached !== undefined ? cached.photoURL : (fallback ?? null)
  );

  useEffect(() => {
    if (cached !== undefined) {
      setPhoto(cached.photoURL ?? fallback ?? null);
      return;
    }
    let cancelled = false;
    fetchUserInfo(uid).then((info) => {
      if (!cancelled) setPhoto(info.photoURL ?? fallback ?? null);
    });
    return () => { cancelled = true; };
  }, [uid]);

  return photo;
}

/**
 * Returns the live display name for a user, checking both users/ and profiles/.
 * Falls back to the name stored in the post document (fallback param).
 */
export function useUserDisplayName(uid: string, fallback?: string | null): string | null {
  const cached = infoCache.get(uid);
  const [name, setName] = useState<string | null>(
    cached !== undefined ? (cached.displayName ?? fallback ?? null) : (fallback ?? null)
  );

  useEffect(() => {
    if (cached !== undefined) {
      setName(cached.displayName ?? fallback ?? null);
      return;
    }
    let cancelled = false;
    fetchUserInfo(uid).then((info) => {
      if (!cancelled) setName(info.displayName ?? fallback ?? null);
    });
    return () => { cancelled = true; };
  }, [uid]);

  return name;
}
