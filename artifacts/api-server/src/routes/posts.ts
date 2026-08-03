import { Router } from "express";
import { getAuth } from "@clerk/express";
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

router.post("/posts", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) {
    return res.status(503).json({ error: "Firebase Admin not configured" });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized — no Clerk session" });
  }

  const body = req.body ?? {};
  const requestedAuthorId = typeof body.authorId === "string" ? body.authorId : "";
  if (requestedAuthorId && requestedAuthorId !== userId) {
    return res.status(403).json({ error: "You can only create posts for your own account." });
  }

  const postData: Record<string, any> = {
    authorId: userId,
    authorName: typeof body.authorName === "string" ? body.authorName : "Learner",
    authorPhoto: typeof body.authorPhoto === "string" ? body.authorPhoto : "",
    content: typeof body.content === "string" ? body.content : "",
    type: typeof body.type === "string" ? body.type : "note",
    subject: typeof body.subject === "string" ? body.subject : null,
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
    videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : null,
    mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : null,
    mediaType: typeof body.mediaType === "string" ? body.mediaType : null,
    likes: Array.isArray(body.likes) ? body.likes : [],
    savedBy: Array.isArray(body.savedBy) ? body.savedBy : [],
    commentCount: typeof body.commentCount === "number" ? body.commentCount : 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (body.poll && typeof body.poll === "object") {
    postData.poll = body.poll;
  }
  if (body.code && typeof body.code === "object") {
    postData.code = body.code;
  }

  if (!postData.content.trim()) {
    return res.status(400).json({ error: "Post content is required." });
  }

  try {
    const created = await db.collection("community_posts").add(postData);
    return res.status(201).json({ id: created.id });
  } catch (e) {
    console.error("[posts] create failed:", e);
    return res.status(500).json({ error: "Failed to create post" });
  }
});

export default router;
