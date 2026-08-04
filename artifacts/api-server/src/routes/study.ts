import { Router } from "express";
import { getAuth } from "@clerk/express";
import admin from "firebase-admin";

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
  } catch (error) {
    console.error("[study] Firebase Admin init failed:", error);
    return null;
  }
}

const router = Router();

function requireUser(req: any, res: any): string | null {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized — no Clerk session" });
    return null;
  }
  return userId;
}

router.get("/study/circles", async (_req, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  try {
    const snap = await db.collection("study_circles").limit(40).get();
    return res.json({ circles: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    console.error("[study] circles read failed:", error);
    return res.status(500).json({ error: "Could not load study circles." });
  }
});

router.post("/study/circles", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const userId = requireUser(req, res);
  if (!userId) return;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  if (!name || !subject) return res.status(400).json({ error: "Name and subject are required." });

  try {
    const ref = await db.collection("study_circles").add({
      name: name.slice(0, 60),
      subject: subject.slice(0, 40),
      description: description.slice(0, 180),
      creatorId: userId,
      memberIds: [userId],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(201).json({ id: ref.id });
  } catch (error) {
    console.error("[study] circle create failed:", error);
    return res.status(500).json({ error: "Could not create the study circle." });
  }
});

router.post("/study/circles/:circleId/join", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const ref = db.collection("study_circles").doc(req.params.circleId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Study circle not found." });
    const memberIds = Array.isArray(snap.data()?.memberIds) ? snap.data()?.memberIds : [];
    const joined = memberIds.includes(userId);
    await ref.update({
      memberIds: joined
        ? admin.firestore.FieldValue.arrayRemove(userId)
        : admin.firestore.FieldValue.arrayUnion(userId),
    });
    return res.json({ joined: !joined });
  } catch (error) {
    console.error("[study] circle join failed:", error);
    return res.status(500).json({ error: "Could not update circle membership." });
  }
});

router.get("/study/buddies", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const current = await db.collection("profiles").doc(userId).get();
    const subjects = Array.isArray(current.data()?.subjects) ? current.data()?.subjects : [];
    const snap = await db.collection("profiles").limit(60).get();
    const buddies = snap.docs
      .filter((doc) => doc.id !== userId)
      .map((doc) => {
        const data = doc.data();
        const theirSubjects = Array.isArray(data.subjects) ? data.subjects : [];
        const overlap = theirSubjects.filter((subject: string) => subjects.includes(subject));
        return {
          uid: doc.id,
          displayName: data.displayName || data.name || "Study User",
          photoURL: data.photoURL || data.avatar || "",
          subjects: theirSubjects,
          overlap,
          xp: data.xp || 0,
        };
      })
      .sort((a, b) => b.overlap.length - a.overlap.length || b.xp - a.xp)
      .slice(0, 20);
    return res.json({ buddies });
  } catch (error) {
    console.error("[study] buddies read failed:", error);
    return res.status(500).json({ error: "Could not find study buddies." });
  }
});

router.get("/study/resources", async (_req, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  try {
    const snap = await db.collection("study_resources").limit(50).get();
    return res.json({ resources: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    console.error("[study] resources read failed:", error);
    return res.status(500).json({ error: "Could not load resources." });
  }
});

router.post("/study/resources", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const userId = requireUser(req, res);
  if (!userId) return;
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  if (!title || !url || !subject) return res.status(400).json({ error: "Title, subject, and link are required." });
  try {
    const ref = await db.collection("study_resources").add({
      title: title.slice(0, 100),
      url: url.slice(0, 500),
      subject: subject.slice(0, 40),
      description: description.slice(0, 180),
      authorId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(201).json({ id: ref.id });
  } catch (error) {
    console.error("[study] resource create failed:", error);
    return res.status(500).json({ error: "Could not share the resource." });
  }
});

router.get("/study/focus-rooms", async (_req, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  try {
    const snap = await db.collection("focus_rooms").limit(40).get();
    return res.json({ rooms: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    console.error("[study] focus rooms read failed:", error);
    return res.status(500).json({ error: "Could not load focus rooms." });
  }
});

router.post("/study/focus-rooms", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const userId = requireUser(req, res);
  if (!userId) return;
  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "Open study";
  try {
    const ref = await db.collection("focus_rooms").add({
      subject: subject.slice(0, 50),
      hostId: userId,
      participantIds: [userId],
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(201).json({ id: ref.id });
  } catch (error) {
    console.error("[study] focus room create failed:", error);
    return res.status(500).json({ error: "Could not create the focus room." });
  }
});

router.post("/study/focus-rooms/:roomId/join", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const ref = db.collection("focus_rooms").doc(req.params.roomId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Focus room not found." });
    await ref.update({ participantIds: admin.firestore.FieldValue.arrayUnion(userId) });
    return res.json({ joined: true });
  } catch (error) {
    console.error("[study] focus room join failed:", error);
    return res.status(500).json({ error: "Could not join the focus room." });
  }
});

router.post("/study/connect", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const userId = requireUser(req, res);
  if (!userId) return;
  const targetId = typeof req.body?.targetId === "string" ? req.body.targetId : "";
  if (!targetId || targetId === userId) return res.status(400).json({ error: "Choose another learner." });
  try {
    await db.collection("notifications").add({
      userId: targetId,
      fromUserId: userId,
      type: "study_buddy_request",
      message: "Someone wants to connect as a study buddy.",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
    return res.json({ sent: true });
  } catch (error) {
    console.error("[study] connect failed:", error);
    return res.status(500).json({ error: "Could not send the connection request." });
  }
});

router.get("/study/activity", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const snap = await db.collection("notifications").where("userId", "==", userId).limit(30).get();
    return res.json({ activity: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    console.error("[study] activity read failed:", error);
    return res.status(500).json({ error: "Could not load activity." });
  }
});

export default router;