import { Router } from "express";
import { getAuth } from "@clerk/express";
import admin from "firebase-admin";

// ── Firebase Admin (shared lazy-init) ────────────────────────────────────────

let adminApp: admin.app.App | null = null;
let adminInitAttempted = false;

function getAdminDb(): admin.firestore.Firestore | null {
  if (adminInitAttempted) return adminApp ? admin.firestore(adminApp) : null;
  adminInitAttempted = true;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    const serviceAccount = JSON.parse(json);
    if (admin.apps.length === 0) {
      adminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      adminApp = admin.app();
    }
    return admin.firestore(adminApp);
  } catch (e) {
    console.error("[opportunities] Firebase Admin init failed:", e);
    return null;
  }
}

// ── RevenueCat entitlement check ──────────────────────────────────────────────

const REVENUECAT_SECRET_KEY = process.env.REVENUECAT_SECRET_API_KEY;
const VERIFICATION_ENTITLEMENT_ID = "verified";

/**
 * Calls the RevenueCat REST API to confirm the caller holds an active
 * "verified" entitlement. Uses the Firebase uid (app_user_id in RevenueCat)
 * as the subscriber identifier.
 */
async function hasVerifiedEntitlement(userId: string): Promise<boolean> {
  if (!REVENUECAT_SECRET_KEY) {
    console.warn("[opportunities] REVENUECAT_SECRET_API_KEY not set — skipping entitlement check");
    return false;
  }
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${REVENUECAT_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) {
      console.warn("[opportunities] RevenueCat subscriber fetch failed:", res.status);
      return false;
    }
    const data = (await res.json()) as { subscriber?: { entitlements?: Record<string, any> } };
    const entitlements = data?.subscriber?.entitlements ?? {};
    const entitlement = entitlements[VERIFICATION_ENTITLEMENT_ID];
    if (!entitlement) return false;
    // Check expiration — null means lifetime (never expires)
    const expiresDate = entitlement.expires_date as string | null;
    if (expiresDate && new Date(expiresDate) < new Date()) return false;
    return true;
  } catch (e) {
    console.error("[opportunities] RevenueCat check error:", e);
    return false;
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// ── GET /opportunities — authenticated read, ordered by createdAt desc ────────

router.get("/opportunities", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const snap = await db
      .collection("opportunities")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    return res.json({
      opportunities: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (e: any) {
    console.error("[opportunities] list failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to fetch opportunities" });
  }
});

// ── POST /opportunities — requires active "verified" RevenueCat entitlement ───

router.post("/opportunities", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // Server-side entitlement check via RevenueCat REST API
  const verified = await hasVerifiedEntitlement(userId);
  if (!verified) {
    return res.status(403).json({
      error:
        "Posting requires a verified entitlement. Purchase verification from the app first.",
    });
  }

  const { type, title, organization, deadline, link, description } = req.body as {
    type?: string;
    title?: string;
    organization?: string;
    deadline?: string;
    link?: string;
    description?: string;
  };

  const VALID_TYPES = ["Hackathon", "Job", "Internship"];
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: "type must be Hackathon, Job, or Internship" });
  }
  if (!title?.trim()) return res.status(400).json({ error: "title is required" });
  if (!organization?.trim()) return res.status(400).json({ error: "organization is required" });
  if (!description?.trim()) return res.status(400).json({ error: "description is required" });

  try {
    // Resolve author display name from Firestore profile — never trust the client
    const profileSnap = await db.collection("profiles").doc(userId).get();
    const profileData = profileSnap.data() ?? {};
    const postedByName = profileData.displayName || profileData.name || "Study User";

    const ref = await db.collection("opportunities").add({
      type,
      title: title.trim(),
      organization: organization.trim(),
      deadline: deadline?.trim() || "Rolling",
      link: link?.trim() ?? "",
      description: description.trim(),
      postedBy: userId,
      postedByName,
      postedByVerified: true, // stamped by server after entitlement check
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true, id: ref.id });
  } catch (e: any) {
    console.error("[opportunities] create failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to create opportunity" });
  }
});

export default router;
