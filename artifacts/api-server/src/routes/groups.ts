import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import admin from "firebase-admin";

// ── Firebase Admin (shared lazy-init pattern) ─────────────────────────────────

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
    console.error("[groups] Firebase Admin init failed:", error);
    return null;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_EMAILS = ["improkinz@gmail.com"];

// ── Auth helpers ───────────────────────────────────────────────────────────────

function requireUser(req: any, res: any): string | null {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

/** Verifies admin identity using Clerk's authoritative user record (not mutable profile data). */
async function requireAdmin(req: any, res: any): Promise<string | null> {
  const userId = requireUser(req, res);
  if (!userId) return null;
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const primary = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    const email = primary?.emailAddress ?? "";
    if (!ADMIN_EMAILS.includes(email)) {
      res.status(403).json({ error: "Forbidden — admin only" });
      return null;
    }
    return userId;
  } catch (e) {
    console.error("[groups] admin identity check failed:", e);
    res.status(500).json({ error: "Failed to verify admin identity" });
    return null;
  }
}

/** Returns userId if user is the group creator or a moderator. */
async function requireManager(
  req: any,
  res: any,
  db: admin.firestore.Firestore,
  groupId: string,
): Promise<{ userId: string; groupData: FirebaseFirestore.DocumentData } | null> {
  const userId = requireUser(req, res);
  if (!userId) return null;

  const groupSnap = await db.collection("groups").doc(groupId).get();
  if (!groupSnap.exists) {
    res.status(404).json({ error: "Group not found" });
    return null;
  }
  const groupData = groupSnap.data()!;
  const isCreator = groupData.createdBy === userId;
  const isMod = Array.isArray(groupData.moderators) && groupData.moderators.includes(userId);
  if (!isCreator && !isMod) {
    res.status(403).json({ error: "Forbidden — manager only" });
    return null;
  }
  return { userId, groupData };
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// ── Public group listing (server-filtered — private groups never sent to client) ──

router.get("/groups/public", async (_req, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  try {
    const snap = await db
      .collection("groups")
      .where("isPublic", "==", true)
      .orderBy("createdAt", "desc")
      .get();
    // Project to non-sensitive fields only — never expose members/moderators/bannedUsers
    return res.json({
      groups: snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          description: data.description,
          iconColor: data.iconColor,
          tags: data.tags,
          createdAt: data.createdAt,
          memberCount: data.memberCount,
          postCount: data.postCount,
          isPublic: data.isPublic,
        };
      }),
    });
  } catch (e: any) {
    console.error("[groups] public list failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to fetch groups" });
  }
});

// ── Authenticated: fetch only the calling user's groups (may include private) ─

router.get("/groups/mine", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const snap = await db
      .collection("groups")
      .where("members", "array-contains", userId)
      .get();
    return res.json({ groups: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e: any) {
    console.error("[groups] mine list failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to fetch your groups" });
  }
});

// ── POST /groups/public — only non-sensitive fields returned ─────────────────
// Note: router.get("/groups/public") is already defined above. The projection
// is applied there; see that handler.

// ── Member: create a post (atomic — post + postCount in one batch) ────────────
router.post("/groups/:groupId/posts", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId } = req.params;
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const groupSnap = await db.collection("groups").doc(groupId).get();
    if (!groupSnap.exists) return res.status(404).json({ error: "Group not found" });
    const groupData = groupSnap.data()!;
    if (!Array.isArray(groupData.members) || !groupData.members.includes(userId)) {
      return res.status(403).json({ error: "Only group members can post" });
    }
    if (Array.isArray(groupData.bannedUsers) && groupData.bannedUsers.includes(userId)) {
      return res.status(403).json({ error: "You are banned from this group" });
    }
    const { content } = req.body as { content?: string };
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });
    // Resolve author identity from server-side profile — never trust the client
    const profileSnap = await db.collection("profiles").doc(userId).get();
    const profileData = profileSnap.data() ?? {};
    const resolvedAuthorName =
      profileData.displayName || profileData.name || "Study User";
    const resolvedAuthorPhoto = profileData.photoURL || "";
    const postRef = db.collection("groups").doc(groupId).collection("posts").doc();
    const batch = db.batch();
    batch.set(postRef, {
      authorId: userId,
      authorName: resolvedAuthorName,
      authorPhoto: resolvedAuthorPhoto,
      content: content.trim(),
      type: "note",
      likes: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      pinned: false,
    });
    batch.update(db.collection("groups").doc(groupId), {
      postCount: admin.firestore.FieldValue.increment(1),
    });
    await batch.commit();
    return res.json({ ok: true, postId: postRef.id });
  } catch (e: any) {
    console.error("[groups] create post failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to create post" });
  }
});

// ── Admin: list all groups (requires Clerk-verified admin identity) ────────────
router.get("/admin/groups", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const snap = await db.collection("groups").orderBy("createdAt", "desc").get();
    return res.json({ groups: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e: any) {
    console.error("[groups] admin list groups failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to fetch groups" });
  }
});

// ── Admin: list open reports (requires Clerk-verified admin identity) ──────────
router.get("/admin/reports", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const snap = await db.collection("reports").where("resolved", "==", false).get();
    return res.json({ reports: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e: any) {
    console.error("[groups] admin list reports failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to fetch reports" });
  }
});

// ── Shared admin-check helper (reusable) ─────────────────────────────────────

async function isCallerAdmin(userId: string): Promise<boolean> {
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const primary = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    return ADMIN_EMAILS.includes(primary?.emailAddress ?? "");
  } catch {
    return false;
  }
}

// ── GET /groups/:groupId — membership-aware, field-projected ──────────────────

router.get("/groups/:groupId", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId } = req.params;
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const groupSnap = await db.collection("groups").doc(groupId).get();
    if (!groupSnap.exists) return res.status(404).json({ error: "Group not found" });
    const data = groupSnap.data()!;

    const [callerIsAdmin, isMember] = await Promise.all([
      isCallerAdmin(userId),
      Promise.resolve(Array.isArray(data.members) && data.members.includes(userId)),
    ]);

    if (callerIsAdmin || isMember) {
      // Full data for admins and members
      return res.json({ group: { id: groupSnap.id, ...data } });
    }
    if (data.isPublic === false) {
      return res.status(403).json({ error: "Access denied — private group" });
    }
    // Public group non-member: safe fields only
    return res.json({
      group: {
        id: groupSnap.id,
        name: data.name,
        description: data.description,
        iconColor: data.iconColor,
        tags: data.tags,
        createdAt: data.createdAt,
        memberCount: data.memberCount,
        postCount: data.postCount,
        isPublic: data.isPublic,
      },
    });
  } catch (e: any) {
    console.error("[groups] get group failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to fetch group" });
  }
});

// ── GET /groups/:groupId/posts — authenticated, membership-enforced ────────────

router.get("/groups/:groupId/posts", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId } = req.params;
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const groupSnap = await db.collection("groups").doc(groupId).get();
    if (!groupSnap.exists) return res.status(404).json({ error: "Group not found" });
    const groupData = groupSnap.data()!;
    const [callerIsAdmin, isMember] = await Promise.all([
      isCallerAdmin(userId),
      Promise.resolve(Array.isArray(groupData.members) && groupData.members.includes(userId)),
    ]);
    if (!isMember && !callerIsAdmin) {
      return res.status(403).json({ error: "Only group members can read posts" });
    }
    const snap = await db
      .collection("groups")
      .doc(groupId)
      .collection("posts")
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();
    return res.json({ posts: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e: any) {
    console.error("[groups] get posts failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to fetch posts" });
  }
});

// ── Admin: delete any group post (transactional) ──────────────────────────────
router.delete("/admin/groups/:groupId/posts/:postId", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId, postId } = req.params;
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const postRef = db.collection("groups").doc(groupId).collection("posts").doc(postId);
    const groupRef = db.collection("groups").doc(groupId);
    let existed = false;
    await db.runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) return; // post missing — skip delete & count change
      existed = true;
      tx.delete(postRef);
      tx.update(groupRef, { postCount: admin.firestore.FieldValue.increment(-1) });
    });
    if (!existed) return res.status(404).json({ error: "Post not found" });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[groups] admin delete post failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to delete post" });
  }
});

// ── Manager: add a member to a group (required for private groups) ───────────
router.post("/groups/:groupId/members", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId } = req.params;
  const { targetUid } = req.body as { targetUid?: string };
  if (!targetUid || typeof targetUid !== "string") {
    return res.status(400).json({ error: "targetUid is required" });
  }
  try {
    const ctx = await requireManager(req, res, db, groupId);
    if (!ctx) return;
    // Reject if the target is banned
    if (Array.isArray(ctx.groupData.bannedUsers) && ctx.groupData.bannedUsers.includes(targetUid)) {
      return res.status(400).json({ error: "That user is banned from this group" });
    }
    // No-op if already a member
    if (Array.isArray(ctx.groupData.members) && ctx.groupData.members.includes(targetUid)) {
      return res.json({ ok: true, alreadyMember: true });
    }
    await db.collection("groups").doc(groupId).update({
      members: admin.firestore.FieldValue.arrayUnion(targetUid),
      memberCount: admin.firestore.FieldValue.increment(1),
    });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[groups] add member failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to add member" });
  }
});

// ── Manager: delete a post from a group (transactional) ──────────────────────
router.delete("/groups/:groupId/posts/:postId", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId, postId } = req.params;
  try {
    const ctx = await requireManager(req, res, db, groupId);
    if (!ctx) return;
    const postRef = db.collection("groups").doc(groupId).collection("posts").doc(postId);
    const groupRef = db.collection("groups").doc(groupId);
    let existed = false;
    await db.runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) return; // post missing — skip delete & count change
      existed = true;
      tx.delete(postRef);
      tx.update(groupRef, { postCount: admin.firestore.FieldValue.increment(-1) });
    });
    if (!existed) return res.status(404).json({ error: "Post not found" });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[groups] delete post failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to delete post" });
  }
});

// ── Manager: toggle pin on a group post ──────────────────────────────────────
router.post("/groups/:groupId/posts/:postId/pin", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId, postId } = req.params;
  try {
    const ctx = await requireManager(req, res, db, groupId);
    if (!ctx) return;
    const isPinned = Array.isArray(ctx.groupData.pinnedPostIds) &&
      ctx.groupData.pinnedPostIds.includes(postId);
    await db.collection("groups").doc(groupId).update({
      pinnedPostIds: isPinned
        ? admin.firestore.FieldValue.arrayRemove(postId)
        : admin.firestore.FieldValue.arrayUnion(postId),
    });
    return res.json({ ok: true, pinned: !isPinned });
  } catch (e: any) {
    console.error("[groups] pin post failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to pin post" });
  }
});

// ── Manager: remove a member from a group ────────────────────────────────────
router.delete("/groups/:groupId/members/:uid", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId, uid } = req.params;
  try {
    const ctx = await requireManager(req, res, db, groupId);
    if (!ctx) return;
    // Cannot remove the creator
    if (ctx.groupData.createdBy === uid) {
      return res.status(400).json({ error: "Cannot remove the group creator" });
    }
    await db.collection("groups").doc(groupId).update({
      members: admin.firestore.FieldValue.arrayRemove(uid),
      memberCount: admin.firestore.FieldValue.increment(-1),
    });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[groups] remove member failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to remove member" });
  }
});

// ── Creator-only: ban a member ───────────────────────────────────────────────
router.post("/groups/:groupId/members/:uid/ban", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId, uid } = req.params;
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const groupSnap = await db.collection("groups").doc(groupId).get();
    if (!groupSnap.exists) return res.status(404).json({ error: "Group not found" });
    const groupData = groupSnap.data()!;
    if (groupData.createdBy !== userId) {
      return res.status(403).json({ error: "Forbidden — creator only" });
    }
    if (groupData.createdBy === uid) {
      return res.status(400).json({ error: "Cannot ban the group creator" });
    }
    await db.collection("groups").doc(groupId).update({
      members: admin.firestore.FieldValue.arrayRemove(uid),
      bannedUsers: admin.firestore.FieldValue.arrayUnion(uid),
      memberCount: admin.firestore.FieldValue.increment(-1),
    });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[groups] ban member failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to ban member" });
  }
});

// ── Manager: toggle moderator role ───────────────────────────────────────────
router.patch("/groups/:groupId/members/:uid/mod", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId, uid } = req.params;
  try {
    const ctx = await requireManager(req, res, db, groupId);
    if (!ctx) return;

    // Server-side validation: target must be a current, non-banned member
    const isMember = Array.isArray(ctx.groupData.members) && ctx.groupData.members.includes(uid);
    const isBanned = Array.isArray(ctx.groupData.bannedUsers) && ctx.groupData.bannedUsers.includes(uid);
    if (!isMember || isBanned) {
      return res.status(400).json({
        error: "Target must be a current, non-banned group member",
      });
    }

    const isMod = Array.isArray(ctx.groupData.moderators) && ctx.groupData.moderators.includes(uid);
    await db.collection("groups").doc(groupId).update({
      moderators: isMod
        ? admin.firestore.FieldValue.arrayRemove(uid)
        : admin.firestore.FieldValue.arrayUnion(uid),
    });
    return res.json({ ok: true, isMod: !isMod });
  } catch (e: any) {
    console.error("[groups] toggle mod failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to update moderator" });
  }
});

// ── Authenticated: create a report (post or group) ───────────────────────────
router.post("/reports", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const userId = requireUser(req, res);
  if (!userId) return;
  const { targetType, targetId, reason } = req.body as {
    targetType?: string;
    targetId?: string;
    reason?: string;
  };
  if (!targetType || !["post", "group"].includes(targetType)) {
    return res.status(400).json({ error: "targetType must be 'post' or 'group'" });
  }
  if (!targetId || !reason) {
    return res.status(400).json({ error: "targetId and reason are required" });
  }
  try {
    await db.collection("reports").add({
      reportedBy: userId,
      targetType,
      targetId,
      reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false,
    });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[groups] create report failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to create report" });
  }
});

// ── Admin: delete a group ─────────────────────────────────────────────────────
router.delete("/admin/groups/:groupId", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { groupId } = req.params;
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    await db.collection("groups").doc(groupId).delete();
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[groups] admin delete group failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to delete group" });
  }
});

// ── Admin: resolve a report ───────────────────────────────────────────────────
router.patch("/admin/reports/:reportId/resolve", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { reportId } = req.params;
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    await db.collection("reports").doc(reportId).update({ resolved: true });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[groups] resolve report failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to resolve report" });
  }
});

// ── Admin: suspend a user ─────────────────────────────────────────────────────
router.patch("/admin/users/:uid/suspend", async (req: any, res) => {
  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "Firebase Admin not configured" });
  const { uid } = req.params;
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    await db.collection("profiles").doc(uid).update({ suspended: true });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[groups] suspend user failed:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to suspend user" });
  }
});

export default router;
