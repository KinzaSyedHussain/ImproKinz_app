import { Router } from "express";
import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;
let adminInitAttempted = false;

function getAdminDb(): admin.firestore.Firestore | null {
  if (adminInitAttempted) return adminApp ? admin.firestore(adminApp) : null;
  adminInitAttempted = true;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    console.warn("[posts] FIREBASE_SERVICE_ACCOUNT_JSON not set");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(json);
    if (admin.apps.length === 0) {
      adminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      adminApp = admin.app();
    }
    return admin.firestore(adminApp);
  } catch (e) {
    console.error("[posts] Failed to init firebase-admin:", e);
    return null;
  }
}

const router = Router();

router.get("/posts", async (_req, res) => {
  const db = getAdminDb();
  if (!db) {
    return res.status(503).json({ error: "Firebase Admin not configured" });
  }

  try {
    const snap = await db.collection("community_posts").limit(60).get();
    const posts = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    return res.json({ posts });
  } catch (e) {
    console.error("[posts] query failed:", e);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});

export default router;
