import { useAuth as useClerkAuth, useClerk } from "@clerk/clerk-expo";
import { signInWithCustomToken, signOut as fbSignOut } from "firebase/auth";
import { useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// Keep this URL pointed at the API server, not the Expo Web server.
// Configure EXPO_PUBLIC_API_URL in artifacts/mobile/.env.local.
const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/**
 * Silently bridges Clerk → Firebase Auth so Firestore security rules work.
 * Renders nothing — place this just inside AuthProvider.
 *
 * When Clerk signs in:
 *   1. Try Clerk's "firebase" JWT template (requires Clerk Dashboard setup).
 *   2. Fall back to the API server exchange (requires Firebase Admin credentials).
 *   3. Fall back to loading the profile directly by Clerk user ID.
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
          // Option 1: Clerk JWT Template for Firebase (configured in Clerk Dashboard).
          const clerkFirebaseToken = await getToken({ template: "firebase" }).catch(() => null);

          if (clerkFirebaseToken) {
            await signInWithCustomToken(auth, clerkFirebaseToken);
            return; // onAuthStateChanged in AuthContext handles profile loading.
          }

          // Option 2: Exchange via the API server.
          if (API_BASE) {
            const clerkToken = await getToken().catch(() => null);

            if (clerkToken) {
              const res = await fetch(`${API_BASE}/api/auth/firebase-token`, {
                method: "POST",
                headers: { Authorization: `Bearer ${clerkToken}` },
              });

              if (res.ok) {
                const body = await res.json();
                if (body?.firebaseToken) {
                  await signInWithCustomToken(auth, body.firebaseToken);
                  return; // onAuthStateChanged handles the rest.
                }
                console.warn("[ClerkFirebaseBridge] Token endpoint returned success without firebaseToken.");
              } else {
                const responseText = await res.text().catch(() => "");
                console.warn(`[ClerkFirebaseBridge] Token exchange failed (${res.status}): ${responseText.slice(0, 300)}`);
              }
            } else {
              console.warn("[ClerkFirebaseBridge] Could not retrieve Clerk session token.");
            }
          } else {
            console.warn("[ClerkFirebaseBridge] EXPO_PUBLIC_API_URL is missing; skipping API token exchange.");
          }

          // Option 3: No Firebase bridge — load profile directly by Clerk user ID.
          // Firestore writes may fail if rules require Firebase Auth.
          await loadProfileByClerkId(userId);
        } catch (e) {
          console.warn("[ClerkFirebaseBridge] bridge error:", e);
          // Last resort: still attempt to show the profile.
          await loadProfileByClerkId(userId).catch((profileError) => {
            console.warn("[ClerkFirebaseBridge] profile fallback failed:", profileError);
          });
        }
      })();
    } else if (!isSignedIn && lastUserId.current) {
      lastUserId.current = null;
      // Sign out of both Firebase and AuthContext.
      fbSignOut(auth).catch(() => {});
      authLogOut().catch(() => {});
    }
  }, [isSignedIn, userId, getToken, loadProfileByClerkId, authLogOut]);

  return null;
}