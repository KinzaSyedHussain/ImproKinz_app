import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";

const photoCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

export async function fetchUserPhoto(uid: string): Promise<string | null> {
  if (photoCache.has(uid)) return photoCache.get(uid) ?? null;
  if (inFlight.has(uid)) return inFlight.get(uid)!;
  const p = Promise.all([
    getDoc(doc(db, "users",    uid)),
    getDoc(doc(db, "profiles", uid)),
  ])
    .then(([mobileSnap, webSnap]) => {
      // Prefer the mobile doc, fall back to web doc
      const photo =
        (mobileSnap.data()?.photoURL as string | undefined) ||
        (webSnap.data()?.photoURL   as string | undefined) ||
        null;
      photoCache.set(uid, photo);
      inFlight.delete(uid);
      return photo;
    })
    .catch(() => {
      photoCache.set(uid, null);
      inFlight.delete(uid);
      return null;
    });
  inFlight.set(uid, p);
  return p;
}

export function useUserPhoto(uid: string, fallback?: string | null) {
  const cached = photoCache.get(uid);
  const [photo, setPhoto] = useState<string | null>(
    cached !== undefined ? cached : (fallback ?? null)
  );

  useEffect(() => {
    if (cached !== undefined) {
      setPhoto(cached ?? fallback ?? null);
      return;
    }
    let cancelled = false;
    fetchUserPhoto(uid).then((p) => {
      if (!cancelled) setPhoto(p ?? fallback ?? null);
    });
    return () => { cancelled = true; };
  }, [uid]);

  return photo;
}
