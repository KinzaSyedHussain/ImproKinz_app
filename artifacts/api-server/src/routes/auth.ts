import { Router } from "express";
import { getAuth } from "@clerk/express";
import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;
let adminInitAttempted = false;

function getAdminAuth(): admin.auth.Auth | null {
  if (adminInitAttempted) return adminApp ? admin.auth(adminApp) : null;
  adminInitAttempted = true;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    console.warn("[auth] FIREBASE_SERVICE_ACCOUNT_JSON not set — /auth/firebase-token disabled");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(json);
    if (admin.apps.length === 0) {
      adminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      adminApp = admin.app();
    }
    return admin.auth(adminApp);
  } catch (e) {
    console.error("[auth] Failed to init firebase-admin:", e);
    return null;
  }
}

const router = Router();

router.post("/auth/firebase-token", async (req: any, res: any) => {
  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return res.status(503).json({ error: "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON." });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized — no Clerk session" });
  }

  try {
    const firebaseToken = await adminAuth.createCustomToken(userId);
    return res.json({ firebaseToken });
  } catch (e) {
    console.error("[auth] createCustomToken failed:", e);
    return res.status(500).json({ error: "Failed to create Firebase token" });
  }
});

export default router;
