import { Router } from "express";
import { getAuth } from "@clerk/express";
import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;
let adminInitAttempted = false;

function getAdminDb(): admin.firestore.Firestore | null {
  if (adminInitAttempted) {
    return adminApp ? admin.firestore(adminApp) : null;
  }

  adminInitAttempted = true;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!json) {
    console.warn("[posts] FIREBASE_SERVICE_ACCOUNT_JSON not set");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(json);

    if (admin.apps.length === 0) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
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

/**
 * Short-lived feed cache.
 *
 * This prevents repeated Expo refreshes/re-renders from creating
 * a new Firestore read every time.
 *
 * The cache is intentionally short so the community feed still
 * feels close to real-time.
 */
const FEED_CACHE_TTL_MS = 30_000;

type FeedCacheEntry = {
  expiresAt: number;
  data: {
    posts: any[];
    hasMore: boolean;
    nextCursor: string | null;
  };
};

const feedCache = new Map<string, FeedCacheEntry>();

function getFeedCacheKey(limit: number, cursor: string | null): string {
  return `${limit}:${cursor ?? "first-page"}`;
}

function getCachedFeed(
  limit: number,
  cursor: string | null,
): FeedCacheEntry["data"] | null {
  const key = getFeedCacheKey(limit, cursor);
  const cached = feedCache.get(key);

  if (!cached) {
    return null;
  }

  if (Date.now() >= cached.expiresAt) {
    feedCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedFeed(
  limit: number,
  cursor: string | null,
  data: FeedCacheEntry["data"],
) {
  const key = getFeedCacheKey(limit, cursor);

  feedCache.set(key, {
    expiresAt: Date.now() + FEED_CACHE_TTL_MS,
    data,
  });
}

/**
 * Any post mutation can make cached feed pages stale.
 * Clearing the cache is cheap and prevents users from seeing
 * an old post/reaction after an action.
 */
function clearFeedCache() {
  feedCache.clear();
}

/**
 * Prevent an unlimited in-memory cache if many cursor values
 * are requested during a long-running server session.
 */
function cleanupExpiredFeedCache() {
  const now = Date.now();

  for (const [key, entry] of feedCache.entries()) {
    if (now >= entry.expiresAt) {
      feedCache.delete(key);
    }
  }
}

function isQuotaExceededError(error: unknown): boolean {
  const value = error as any;

  return (
    value?.code === 8 ||
    value?.code === "RESOURCE_EXHAUSTED" ||
    String(value?.message ?? "")
      .toLowerCase()
      .includes("quota exceeded")
  );
}

/* -------------------------------------------------------------------------- */
/* GET POSTS                                                                  */
/* -------------------------------------------------------------------------- */

router.get("/posts", async (req, res) => {
  const db = getAdminDb();

  if (!db) {
    return res.status(503).json({
      error: "Firebase Admin not configured",
    });
  }

  const pageSize = Math.min(
    50,
    Math.max(
      1,
      parseInt(String(req.query.limit ?? "20"), 10) || 20,
    ),
  );

  const cursorDocId = req.query.cursor
    ? String(req.query.cursor)
    : null;

  cleanupExpiredFeedCache();

  const cached = getCachedFeed(pageSize, cursorDocId);

  if (cached) {
    return res.json(cached);
  }

  try {
    let q: admin.firestore.Query = db
      .collection("community_posts")
      .orderBy("createdAt", "desc")
      .limit(pageSize);

    /*
     * Cursor is the document ID of the last item on the previous page.
     *
     * We fetch its DocumentSnapshot and pass that snapshot to startAfter().
     * This preserves the existing pagination behavior and correctly handles
     * duplicate createdAt values.
     */
    if (cursorDocId) {
      const cursorSnap = await db
        .collection("community_posts")
        .doc(cursorDocId)
        .get();

      if (!cursorSnap.exists) {
        return res.status(410).json({
          error: "stale_cursor",
          message:
            "Cursor document no longer exists. Reset your feed to page 1.",
        });
      }

      q = q.startAfter(cursorSnap);
    }

    const snap = await q.get();

    const posts = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    const hasMore = snap.docs.length === pageSize;

    const nextCursor = hasMore
      ? snap.docs[snap.docs.length - 1].id
      : null;

    const result = {
      posts,
      hasMore,
      nextCursor,
    };

    setCachedFeed(pageSize, cursorDocId, result);

    console.log(
      `[posts] Firestore feed read: ${snap.docs.length} posts`,
    );

    return res.json(result);
  } catch (e) {
    console.error("[posts] query failed:", e);

    if (isQuotaExceededError(e)) {
      return res.status(503).json({
        error: "firestore_quota_exceeded",
        message:
          "Firestore read quota has been exceeded. Please try again later.",
      });
    }

    return res.status(500).json({
      error: "Failed to fetch posts",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* CREATE POST                                                                */
/* -------------------------------------------------------------------------- */

router.post("/posts", async (req: any, res) => {
  const db = getAdminDb();

  if (!db) {
    return res.status(503).json({
      error: "Firebase Admin not configured",
    });
  }

  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized — no Clerk session",
    });
  }

  const body = req.body ?? {};

  const requestedAuthorId =
    typeof body.authorId === "string"
      ? body.authorId
      : "";

  if (
    requestedAuthorId &&
    requestedAuthorId !== userId
  ) {
    return res.status(403).json({
      error:
        "You can only create posts for your own account.",
    });
  }

  const postData: Record<string, any> = {
    authorId: userId,
    authorName:
      typeof body.authorName === "string"
        ? body.authorName
        : "Learner",

    authorPhoto:
      typeof body.authorPhoto === "string"
        ? body.authorPhoto
        : "",

    content:
      typeof body.content === "string"
        ? body.content
        : "",

    type:
      typeof body.type === "string"
        ? body.type
        : "note",

    subject:
      typeof body.subject === "string"
        ? body.subject
        : null,

    imageUrl:
      typeof body.imageUrl === "string"
        ? body.imageUrl
        : null,

    videoUrl:
      typeof body.videoUrl === "string"
        ? body.videoUrl
        : null,

    mediaUrl:
      typeof body.mediaUrl === "string"
        ? body.mediaUrl
        : null,

    mediaType:
      typeof body.mediaType === "string"
        ? body.mediaType
        : null,

    likes:
      Array.isArray(body.likes)
        ? body.likes
        : [],

    savedBy:
      Array.isArray(body.savedBy)
        ? body.savedBy
        : [],

    commentCount:
      typeof body.commentCount === "number"
        ? body.commentCount
        : 0,

    createdAt:
      admin.firestore.FieldValue.serverTimestamp(),
  };

  if (
    body.poll &&
    typeof body.poll === "object"
  ) {
    postData.poll = body.poll;
  }

  if (
    body.code &&
    typeof body.code === "object"
  ) {
    postData.code = body.code;
  }

  if (
    body.studyProgress &&
    typeof body.studyProgress === "object"
  ) {
    postData.studyProgress = {
      duration:
        typeof body.studyProgress.duration === "string"
          ? body.studyProgress.duration
          : "",

      completed:
        typeof body.studyProgress.completed === "string"
          ? body.studyProgress.completed
          : "",

      nextStep:
        typeof body.studyProgress.nextStep === "string"
          ? body.studyProgress.nextStep
          : "",
    };
  }

  if (!postData.content.trim()) {
    return res.status(400).json({
      error: "Post content is required.",
    });
  }

  try {
    const created = await db
      .collection("community_posts")
      .add(postData);

    clearFeedCache();

    console.log(
      `[posts] Created post ${created.id} by ${userId}`,
    );

    return res.status(201).json({
      id: created.id,
    });
  } catch (e) {
    console.error("[posts] create failed:", e);

    if (isQuotaExceededError(e)) {
      return res.status(503).json({
        error: "firestore_quota_exceeded",
        message:
          "Firestore quota has been exceeded. Please try again later.",
      });
    }

    return res.status(500).json({
      error: "Failed to create post",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* POLL VOTE                                                                  */
/* -------------------------------------------------------------------------- */

router.post(
  "/posts/:postId/vote",
  async (req: any, res) => {
    const db = getAdminDb();

    if (!db) {
      return res.status(503).json({
        error: "Firebase Admin not configured",
      });
    }

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized — no Clerk session",
      });
    }

    const optionIndex = Number(
      req.body?.optionIndex,
    );

    if (
      !Number.isInteger(optionIndex) ||
      optionIndex < 0
    ) {
      return res.status(400).json({
        error: "A valid poll option is required.",
      });
    }

    try {
      const poll = await db.runTransaction(
        async (transaction) => {
          const ref = db
            .collection("community_posts")
            .doc(req.params.postId);

          const snapshot =
            await transaction.get(ref);

          if (!snapshot.exists) {
            throw new Error("POST_NOT_FOUND");
          }

          const data =
            snapshot.data() ?? {};

          const storedPoll =
            data.poll ?? data.pollData;

          const storedOptions =
            storedPoll &&
            Array.isArray(storedPoll.options)
              ? storedPoll.options
              : [];

          const options = storedOptions.map(
            (option: any) => ({
              text:
                option.text ??
                option.label ??
                option.name ??
                "Option",

              votes:
                Array.isArray(option.votes)
                  ? [...option.votes]
                  : [],
            }),
          );

          if (optionIndex >= options.length) {
            throw new Error(
              "INVALID_POLL_OPTION",
            );
          }

          const currentOption =
            options.findIndex(
              (option: any) =>
                option.votes.includes(userId),
            );

          if (currentOption === optionIndex) {
            options[optionIndex].votes =
              options[
                optionIndex
              ].votes.filter(
                (id: string) =>
                  id !== userId,
              );
          } else {
            if (currentOption >= 0) {
              options[
                currentOption
              ].votes =
                options[
                  currentOption
                ].votes.filter(
                  (id: string) =>
                    id !== userId,
                );
            }

            options[
              optionIndex
            ].votes = [
              ...options[optionIndex].votes,
              userId,
            ];
          }

          const nextPoll = {
            question:
              storedPoll?.question ??
              storedPoll?.title ??
              data.content ??
              "Poll",

            options,
          };

          transaction.update(ref, {
            poll: nextPoll,
          });

          return nextPoll;
        },
      );

      clearFeedCache();

      return res.json({ poll });
    } catch (e: any) {
      if (
        e?.message === "POST_NOT_FOUND"
      ) {
        return res.status(404).json({
          error: "Post not found.",
        });
      }

      if (
        e?.message ===
        "INVALID_POLL_OPTION"
      ) {
        return res.status(400).json({
          error:
            "This poll option is no longer available.",
        });
      }

      console.error(
        "[posts] vote failed:",
        e,
      );

      if (isQuotaExceededError(e)) {
        return res.status(503).json({
          error:
            "firestore_quota_exceeded",
          message:
            "Firestore quota has been exceeded. Please try again later.",
        });
      }

      return res.status(500).json({
        error: "Failed to save vote.",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* REACTION                                                                   */
/* -------------------------------------------------------------------------- */

router.post(
  "/posts/:postId/reaction",
  async (req: any, res) => {
    const db = getAdminDb();

    if (!db) {
      return res.status(503).json({
        error: "Firebase Admin not configured",
      });
    }

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized — no Clerk session",
      });
    }

    const reactionKey =
      req.body?.reaction;

    if (
      ![
        "like",
        "insightful",
        "congrats",
      ].includes(reactionKey)
    ) {
      return res.status(400).json({
        error: "Unsupported reaction.",
      });
    }

    try {
      const { reactions, authorId } =
        await db.runTransaction(
          async (transaction) => {
            const ref = db
              .collection("community_posts")
              .doc(req.params.postId);

            const snapshot =
              await transaction.get(ref);

            if (!snapshot.exists) {
              throw new Error(
                "POST_NOT_FOUND",
              );
            }

            const data =
              snapshot.data() ?? {};

            const rawReactions =
              data.reactions ?? {};

            const next = {
              like:
                Array.isArray(
                  rawReactions.like,
                )
                  ? [
                      ...rawReactions.like,
                    ]
                  : Array.isArray(
                        data.likes,
                      )
                    ? [...data.likes]
                    : [],

              insightful:
                Array.isArray(
                  rawReactions.insightful,
                )
                  ? [
                      ...rawReactions.insightful,
                    ]
                  : [],

              congrats:
                Array.isArray(
                  rawReactions.congrats,
                )
                  ? [
                      ...rawReactions.congrats,
                    ]
                  : [],
            };

            const current =
              (
                Object.keys(next) as Array<
                  keyof typeof next
                >
              ).find((key) =>
                next[key].includes(
                  userId,
                ),
              );

            (
              Object.keys(next) as Array<
                keyof typeof next
              >
            ).forEach((key) => {
              next[key] =
                next[key].filter(
                  (id) =>
                    id !== userId,
                );
            });

            if (current !== reactionKey) {
              next[
                reactionKey as keyof typeof next
              ].push(userId);
            }

            transaction.update(ref, {
              reactions: next,
              likes: next.like,
            });

            return {
              reactions: next,
              authorId:
                typeof data.authorId ===
                "string"
                  ? data.authorId
                  : "",
            };
          },
        );

      if (
        authorId &&
        authorId !== userId
      ) {
        await db
          .collection("notifications")
          .add({
            userId: authorId,
            type: "reaction",

            message:
              `Someone reacted ${
                reactionKey ===
                "insightful"
                  ? "💡"
                  : reactionKey ===
                      "congrats"
                    ? "🎉"
                    : "👍"
              } to your study post.`,

            postId:
              req.params.postId,

            createdAt:
              admin.firestore
                .FieldValue
                .serverTimestamp(),

            read: false,
          });
      }

      clearFeedCache();

      return res.json({ reactions });
    } catch (e: any) {
      if (
        e?.message === "POST_NOT_FOUND"
      ) {
        return res.status(404).json({
          error: "Post not found.",
        });
      }

      console.error(
        "[posts] reaction failed:",
        e,
      );

      if (isQuotaExceededError(e)) {
        return res.status(503).json({
          error:
            "firestore_quota_exceeded",
          message:
            "Firestore quota has been exceeded. Please try again later.",
        });
      }

      return res.status(500).json({
        error:
          "Failed to save reaction.",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* SAVE POST                                                                  */
/* -------------------------------------------------------------------------- */

router.post(
  "/posts/:postId/save",
  async (req: any, res) => {
    const db = getAdminDb();

    if (!db) {
      return res.status(503).json({
        error: "Firebase Admin not configured",
      });
    }

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized — no Clerk session",
      });
    }

    const collectionName =
      typeof req.body?.collection ===
        "string" &&
      req.body.collection.trim()
        ? req.body.collection
            .trim()
            .slice(0, 40)
        : "Read later";

    try {
      const result =
        await db.runTransaction(
          async (transaction) => {
            const ref = db
              .collection("community_posts")
              .doc(req.params.postId);

            const snapshot =
              await transaction.get(ref);

            if (!snapshot.exists) {
              throw new Error(
                "POST_NOT_FOUND",
              );
            }

            const data =
              snapshot.data() ?? {};

            const savedBy =
              Array.isArray(
                data.savedBy,
              )
                ? [...data.savedBy]
                : [];

            const savedCollections =
              data.savedCollections &&
              typeof data.savedCollections ===
                "object"
                ? {
                    ...data.savedCollections,
                  }
                : {};

            const alreadySaved =
              savedBy.includes(userId);

            if (alreadySaved) {
              const nextSavedBy =
                savedBy.filter(
                  (id: string) =>
                    id !== userId,
                );

              delete savedCollections[
                userId
              ];

              transaction.update(ref, {
                savedBy: nextSavedBy,
                savedCollections,
              });

              return {
                saved: false,
                collection: null,
              };
            }

            savedBy.push(userId);

            savedCollections[userId] =
              collectionName;

            transaction.update(ref, {
              savedBy,
              savedCollections,
            });

            return {
              saved: true,
              collection:
                collectionName,
            };
          },
        );

      clearFeedCache();

      return res.json(result);
    } catch (e: any) {
      if (
        e?.message === "POST_NOT_FOUND"
      ) {
        return res.status(404).json({
          error: "Post not found.",
        });
      }

      console.error(
        "[posts] save failed:",
        e,
      );

      if (isQuotaExceededError(e)) {
        return res.status(503).json({
          error:
            "firestore_quota_exceeded",
          message:
            "Firestore quota has been exceeded. Please try again later.",
        });
      }

      return res.status(500).json({
        error:
          "Failed to update saved post.",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* BEST ANSWER                                                                */
/* -------------------------------------------------------------------------- */

router.post(
  "/posts/:postId/best-answer",
  async (req: any, res) => {
    const db = getAdminDb();

    if (!db) {
      return res.status(503).json({
        error: "Firebase Admin not configured",
      });
    }

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized — no Clerk session",
      });
    }

    try {
      const ref = db
        .collection("community_posts")
        .doc(req.params.postId);

      const snapshot = await ref.get();

      if (!snapshot.exists) {
        return res.status(404).json({
          error: "Post not found.",
        });
      }

      const data =
        snapshot.data() ?? {};

      if (data.authorId !== userId) {
        return res.status(403).json({
          error:
            "Only the question author can choose the best answer.",
        });
      }

      const commentId =
        typeof req.body?.commentId ===
        "string"
          ? req.body.commentId
          : null;

      await ref.update({
        bestAnswerId: commentId,
      });

      const authorId =
        data.authorId;

      /*
       * Keep the existing behavior.
       * The author is the current user here, so this notification
       * condition normally prevents a self-notification.
       */
      if (
        commentId &&
        authorId &&
        authorId !== userId
      ) {
        await db
          .collection("notifications")
          .add({
            userId: authorId,
            type: "best_answer",
            message:
              "Your question received a best answer.",
            postId:
              req.params.postId,
            createdAt:
              admin.firestore
                .FieldValue
                .serverTimestamp(),
            read: false,
          });
      }

      clearFeedCache();

      return res.json({
        bestAnswerId: commentId,
      });
    } catch (e) {
      console.error(
        "[posts] best answer failed:",
        e,
      );

      if (isQuotaExceededError(e)) {
        return res.status(503).json({
          error:
            "firestore_quota_exceeded",
          message:
            "Firestore quota has been exceeded. Please try again later.",
        });
      }

      return res.status(500).json({
        error:
          "Failed to save best answer.",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* DELETE POST                                                                */
/* -------------------------------------------------------------------------- */

router.delete(
  "/posts/:postId",
  async (req: any, res) => {
    const db = getAdminDb();

    if (!db) {
      return res.status(503).json({
        error: "Firebase Admin not configured",
      });
    }

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized — no Clerk session",
      });
    }

    const postId = String(
      req.params.postId || "",
    ).trim();

    if (!postId) {
      return res.status(400).json({
        error: "Post ID is required.",
      });
    }

    try {
      const postRef = db
        .collection("community_posts")
        .doc(postId);

      const snapshot =
        await postRef.get();

      if (!snapshot.exists) {
        return res.status(404).json({
          error: "Post not found.",
        });
      }

      const postData =
        snapshot.data() ?? {};

      if (
        postData.authorId !== userId
      ) {
        return res.status(403).json({
          error:
            "You can only delete your own posts.",
        });
      }

      await postRef.delete();

      clearFeedCache();

      console.log(
        `[posts] Deleted post ${postId} by ${userId}`,
      );

      return res.json({
        success: true,
        id: postId,
      });
    } catch (e) {
      console.error(
        "[posts] delete failed:",
        e,
      );

      if (isQuotaExceededError(e)) {
        return res.status(503).json({
          error:
            "firestore_quota_exceeded",
          message:
            "Firestore quota has been exceeded. Please try again later.",
        });
      }

      return res.status(500).json({
        error:
          "Failed to delete post.",
      });
    }
  },
);

export default router;