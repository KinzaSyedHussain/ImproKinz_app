import { useAuth as useClerkAuth, useClerk } from "@clerk/clerk-expo";
import { signInWithCustomToken, signOut as fbSignOut } from "firebase/auth";
import { useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

/**
 * Silently bridges Clerk → Firebase Auth so Firestore security rules work.
 * Renders nothing — place this just inside AuthProvider.
 *
 * When Clerk signs in:
 *   1. Try Clerk's "firebase" JWT template (needs Clerk Dashboard setup)
 *   2. Fall back to API server exchange (needs FIREBASE_SERVICE_ACCOUNT_JSON)
 *   3. Fall back to loading profile directly by Clerk user ID (no Firebase auth)
 *
 * When Clerk signs out: signs out of Firebase and clears AuthContext.
 */
export function ClerkFirebaseBridge() {
  const { isSignedIn, getToken, userId } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();
  const { loadProfileByClerkId, logOut: authLogOut } = useAuth();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (isSignedIn && userId && userId !== lastUserId.current) {
      lastUserId.current = userId;

      (async () => {
        try {
          // Option 1: Clerk JWT Template for Firebase (configured in Clerk dashboard)
          const clerkFirebaseToken = await getToken({ template: "firebase" }).catch(() => null);
          if (clerkFirebaseToken) {
            await signInWithCustomToken(auth, clerkFirebaseToken);
            return; // onAuthStateChanged in AuthContext will handle profile loading
          }

          // Option 2: Exchange via API server (needs FIREBASE_SERVICE_ACCOUNT_JSON)
          if (API_BASE) {
            const clerkToken = await getToken().catch(() => null);
            if (clerkToken) {
              const res = await fetch(`${API_BASE}/api/auth/firebase-token`, {
                method: "POST",
                headers: { Authorization: `Bearer ${clerkToken}` },
              });
              if (res.ok) {
                const { firebaseToken } = await res.json();
                await signInWithCustomToken(auth, firebaseToken);
                return; // onAuthStateChanged handles the rest
              }
            }
          }

          // Option 3: No Firebase bridge — load profile directly by Clerk user ID
          // Firestore writes may fail if rules require Firebase Auth
          console.info("[ClerkFirebaseBridge] No Firebase bridge configured — using Clerk ID directly.");
          await loadProfileByClerkId(userId);
        } catch (e) {
          console.warn("[ClerkFirebaseBridge] bridge error:", e);
          // Last resort: still show profile
          await loadProfileByClerkId(userId).catch(() => {});
        }
      })();
    } else if (!isSignedIn && lastUserId.current) {
      lastUserId.current = null;
      // Sign out of both Firebase and AuthContext
      fbSignOut(auth).catch(() => {});
      authLogOut().catch(() => {});
    }
  }, [isSignedIn, userId, getToken, loadProfileByClerkId, authLogOut]);

  return null;
}
