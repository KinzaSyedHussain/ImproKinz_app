import { Router } from "express";
import { getAuth } from "@clerk/express";
import admin from "firebase-admin";

// ─── Firebase Admin lazy initialization ──────────────────────────────────────

let adminApp: admin.app.App | null = null;
let adminInitAttempted = false;

function getAdminDb(): admin.firestore.Firestore | null {
  if (adminInitAttempted) {
    return adminApp ? admin.firestore(adminApp) : null;
  }

  adminInitAttempted = true;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!json) {
    console.warn(
      "[opportunities] FIREBASE_SERVICE_ACCOUNT_JSON is not set",
    );
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
  } catch (error) {
    console.error(
      "[opportunities] Firebase Admin init failed:",
      error,
    );
    return null;
  }
}

// ─── Small server-side cache ─────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000;

let opportunitiesCache:
  | {
      expiresAt: number;
      opportunities: any[];
    }
  | null = null;

const opportunityDetailsCache = new Map<
  string,
  {
    expiresAt: number;
    opportunity: any;
  }
>();

function clearOpportunityCaches(opportunityId?: string) {
  opportunitiesCache = null;

  if (opportunityId) {
    opportunityDetailsCache.delete(opportunityId);
  }
}

function getCachedOpportunityDetails(opportunityId: string) {
  const cached = opportunityDetailsCache.get(opportunityId);

  if (!cached) {
    return null;
  }

  if (Date.now() >= cached.expiresAt) {
    opportunityDetailsCache.delete(opportunityId);
    return null;
  }

  return cached.opportunity;
}

function setCachedOpportunityDetails(
  opportunityId: string,
  opportunity: any,
) {
  opportunityDetailsCache.set(opportunityId, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    opportunity,
  });
}

// ─── Firestore error helpers ─────────────────────────────────────────────────

function isQuotaExceededError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const possibleError = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };

  const code = String(possibleError.code ?? "");
  const message = String(possibleError.message ?? "");
  const details = String(possibleError.details ?? "");

  return (
    code === "8" ||
    code.toUpperCase() === "RESOURCE_EXHAUSTED" ||
    message.toUpperCase().includes("RESOURCE_EXHAUSTED") ||
    message.toUpperCase().includes("QUOTA EXCEEDED") ||
    details.toUpperCase().includes("QUOTA EXCEEDED")
  );
}

function sendFirestoreError(
  res: any,
  error: unknown,
  fallbackMessage: string,
) {
  if (isQuotaExceededError(error)) {
    return res.status(503).json({
      error:
        "Firestore is temporarily unavailable because a usage quota was reached. Please try again shortly.",
      code: "FIRESTORE_QUOTA_EXCEEDED",
    });
  }

  const message =
    error instanceof Error ? error.message : fallbackMessage;

  return res.status(500).json({
    error: message,
  });
}

// ─── RevenueCat entitlement ──────────────────────────────────────────────────

const REVENUECAT_SECRET_KEY =
  process.env.REVENUECAT_SECRET_API_KEY;

const VERIFICATION_ENTITLEMENT_ID = "verified";

// ─── Development verification ───────────────────────────────────────────────

function devVerificationEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_VERIFICATION === "true"
  );
}

async function hasDevVerifiedFlag(
  db: admin.firestore.Firestore,
  userId: string,
): Promise<boolean> {
  if (!devVerificationEnabled()) {
    return false;
  }

  try {
    const profileSnap = await db
      .collection("profiles")
      .doc(userId)
      .get();

    const profileData = profileSnap.data() ?? {};

    return profileData.devVerified === true;
  } catch (error) {
    console.error(
      "[opportunities] Dev verification check failed:",
      error,
    );

    return false;
  }
}

// ─── RevenueCat verification ────────────────────────────────────────────────

async function hasVerifiedEntitlement(
  db: admin.firestore.Firestore,
  userId: string,
): Promise<boolean> {
  // Development verification
  if (await hasDevVerifiedFlag(db, userId)) {
    console.log(
      `[opportunities] DEV verification accepted for user ${userId}`,
    );

    return true;
  }

  if (!REVENUECAT_SECRET_KEY) {
    console.warn(
      "[opportunities] REVENUECAT_SECRET_API_KEY not set — entitlement check failed",
    );

    return false;
  }

  try {
    const url =
      "https://api.revenuecat.com/v1/subscribers/" +
      encodeURIComponent(userId);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${REVENUECAT_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(
        "[opportunities] RevenueCat subscriber fetch failed:",
        response.status,
      );

      return false;
    }

    const data = (await response.json()) as {
      subscriber?: {
        entitlements?: Record<
          string,
          {
            expires_date?: string | null;
          }
        >;
      };
    };

    const entitlements =
      data?.subscriber?.entitlements ?? {};

    const entitlement =
      entitlements[VERIFICATION_ENTITLEMENT_ID];

    if (!entitlement) {
      return false;
    }

    const expiresDate =
      entitlement.expires_date ?? null;

    if (
      expiresDate &&
      new Date(expiresDate) < new Date()
    ) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "[opportunities] RevenueCat check error:",
      error,
    );

    return false;
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────

const router = Router();

// ─── GET /opportunities ──────────────────────────────────────────────────────

router.get(
  "/opportunities",
  async (req, res) => {
    const db = getAdminDb();

    if (!db) {
      return res.status(503).json({
        error: "Firebase Admin not configured",
      });
    }

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    try {
      // Return cached list when available.
      if (
        opportunitiesCache &&
        Date.now() < opportunitiesCache.expiresAt
      ) {
        return res.json({
          opportunities:
            opportunitiesCache.opportunities,
        });
      }

      const snapshot = await db
        .collection("opportunities")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const opportunities = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      opportunitiesCache = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        opportunities,
      };

      return res.json({
        opportunities,
      });
    } catch (error: unknown) {
      console.error(
        "[opportunities] List failed:",
        error,
      );

      return sendFirestoreError(
        res,
        error,
        "Failed to fetch opportunities",
      );
    }
  },
);

// ─── GET /opportunities/:id ──────────────────────────────────────────────────

router.get(
  "/opportunities/:id",
  async (req, res) => {
    const db = getAdminDb();

    if (!db) {
      return res.status(503).json({
        error: "Firebase Admin not configured",
      });
    }

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const opportunityId = req.params.id;

    if (!opportunityId) {
      return res.status(400).json({
        error: "Opportunity ID is required",
      });
    }

    try {
      // Avoid another Firestore read if this opportunity
      // was recently requested.
      const cachedOpportunity =
        getCachedOpportunityDetails(opportunityId);

      if (cachedOpportunity) {
        return res.json({
          opportunity: cachedOpportunity,
        });
      }

      const opportunityRef = db
        .collection("opportunities")
        .doc(opportunityId);

      const snapshot = await opportunityRef.get();

      if (!snapshot.exists) {
        return res.status(404).json({
          error: "Opportunity not found",
        });
      }

      const opportunity = {
        id: snapshot.id,
        ...snapshot.data(),
      };

      setCachedOpportunityDetails(
        opportunityId,
        opportunity,
      );

      return res.json({
        opportunity,
      });
    } catch (error: unknown) {
      console.error(
        "[opportunities] Details failed:",
        error,
      );

      return sendFirestoreError(
        res,
        error,
        "Failed to fetch opportunity",
      );
    }
  },
);

// ─── POST /opportunities/dev-verify ──────────────────────────────────────────

router.post(
  "/opportunities/dev-verify",
  async (req, res) => {
    if (!devVerificationEnabled()) {
      return res.status(404).json({
        error: "Development verification is disabled",
      });
    }

    const db = getAdminDb();

    if (!db) {
      return res.status(503).json({
        error: "Firebase Admin not configured",
      });
    }

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    try {
      await db
        .collection("profiles")
        .doc(userId)
        .set(
          {
            devVerified: true,
            devVerifiedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          },
        );

      console.log(
        `[opportunities] DEV verification enabled for user ${userId}`,
      );

      return res.json({
        ok: true,
        verified: true,
        devOnly: true,
      });
    } catch (error: unknown) {
      console.error(
        "[opportunities] Dev verification failed:",
        error,
      );

      return sendFirestoreError(
        res,
        error,
        "Failed to enable development verification",
      );
    }
  },
);

// ─── POST /opportunities ─────────────────────────────────────────────────────

router.post(
  "/opportunities",
  async (req, res) => {
    const db = getAdminDb();

    if (!db) {
      return res.status(503).json({
        error: "Firebase Admin not configured",
      });
    }

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const verified =
      await hasVerifiedEntitlement(
        db,
        userId,
      );

    if (!verified) {
      return res.status(403).json({
        error:
          "Posting requires a verified entitlement. Purchase verification from the app first.",
      });
    }

    const {
      type,
      title,
      organization,
      deadline,
      link,
      description,
    } = req.body as {
      type?: string;
      title?: string;
      organization?: string;
      deadline?: string;
      link?: string;
      description?: string;
    };

    const VALID_TYPES = [
      "Hackathon",
      "Job",
      "Internship",
    ];

    if (
      !type ||
      !VALID_TYPES.includes(type)
    ) {
      return res.status(400).json({
        error:
          "type must be Hackathon, Job, or Internship",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        error: "title is required",
      });
    }

    if (!organization?.trim()) {
      return res.status(400).json({
        error: "organization is required",
      });
    }

    if (!description?.trim()) {
      return res.status(400).json({
        error: "description is required",
      });
    }

    try {
      const profileSnap = await db
        .collection("profiles")
        .doc(userId)
        .get();

      const profileData =
        profileSnap.data() ?? {};

      const postedByName =
        profileData.displayName ||
        profileData.name ||
        "Study User";

      const opportunityData = {
        type,
        title: title.trim(),
        organization: organization.trim(),
        deadline:
          deadline?.trim() || "Rolling",
        link: link?.trim() ?? "",
        description: description.trim(),

        // IMPORTANT:
        // This is the Clerk user ID.
        // The DELETE route uses this same field
        // to verify ownership.
        postedBy: userId,

        postedByName,
        postedByVerified: true,

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),
      };

      const ref = await db
        .collection("opportunities")
        .add(opportunityData);

      clearOpportunityCaches();

      console.log(
        "[opportunities] Created opportunity:",
        {
          id: ref.id,
          postedBy: userId,
        },
      );

      return res.json({
        ok: true,
        id: ref.id,
      });
    } catch (error: unknown) {
      console.error(
        "[opportunities] Create failed:",
        error,
      );

      return sendFirestoreError(
        res,
        error,
        "Failed to create opportunity",
      );
    }
  },
);

// ─── DELETE /opportunities/:id ───────────────────────────────────────────────

router.delete(
  "/opportunities/:id",
  async (req, res) => {
    console.log(
      "[opportunities] DELETE request received:",
      req.params.id,
    );

    const db = getAdminDb();

    if (!db) {
      console.error(
        "[opportunities] DELETE failed: Firebase Admin not configured",
      );

      return res.status(503).json({
        error: "Firebase Admin not configured",
      });
    }

    const { userId } = getAuth(req);

    console.log(
      "[opportunities] DELETE authenticated user:",
      userId ?? "NO USER",
    );

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const opportunityId = req.params.id;

    if (!opportunityId) {
      return res.status(400).json({
        error: "Opportunity ID is required",
      });
    }

    try {
      const opportunityRef = db
        .collection("opportunities")
        .doc(opportunityId);

      const snapshot =
        await opportunityRef.get();

      if (!snapshot.exists) {
        console.warn(
          "[opportunities] DELETE failed: opportunity not found:",
          opportunityId,
        );

        return res.status(404).json({
          error: "Opportunity not found",
        });
      }

      const opportunity =
        snapshot.data();

      const postedBy =
        opportunity?.postedBy;

      console.log(
        "[opportunities] DELETE ownership check:",
        {
          opportunityId,
          postedBy,
          currentUserId: userId,
          isOwner: postedBy === userId,
        },
      );

      if (postedBy !== userId) {
        return res.status(403).json({
          error:
            "You can only delete opportunities that you posted.",
        });
      }

      await opportunityRef.delete();

      clearOpportunityCaches(
        opportunityId,
      );

      console.log(
        "[opportunities] DELETE successful:",
        {
          opportunityId,
          userId,
        },
      );

      return res.json({
        ok: true,
        deleted: true,
        id: opportunityId,
      });
    } catch (error: unknown) {
      console.error(
        "[opportunities] DELETE error:",
        error,
      );

      return sendFirestoreError(
        res,
        error,
        "Failed to delete opportunity",
      );
    }
  },
);

export default router;