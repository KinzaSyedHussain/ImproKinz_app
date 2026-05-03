import { Router } from "express";

const router = Router();

interface Video {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  url: string;
  published: string;
  viewCount?: string;
  duration?: string;
}

const SUBJECT_QUERIES: Record<string, string[]> = {
  all: [
    "study tips education", "learn how to study", "educational lecture",
    "science explained", "history documentary", "math tutorial",
  ],
  math: [
    "mathematics tutorial", "calculus explained", "algebra lesson",
    "geometry math", "statistics probability", "linear algebra",
  ],
  science: [
    "physics lecture", "chemistry explained", "biology tutorial",
    "science experiment", "quantum physics", "organic chemistry",
  ],
  history: [
    "world history documentary", "ancient history explained",
    "history lesson", "world war history", "civilization history",
  ],
  cs: [
    "programming tutorial", "computer science lecture", "coding explained",
    "algorithms data structures", "machine learning tutorial", "web development",
  ],
  language: [
    "english grammar lesson", "language learning tips", "vocabulary lesson",
    "creative writing tutorial", "literature analysis", "essay writing",
  ],
  general: [
    "ted education", "kurzgesagt explained", "veritasium", "vsauce science",
    "crashcourse", "minutephysics",
  ],
};

function parseDuration(iso: string): string {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!match) return "";
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(n: string): string {
  const v = parseInt(n);
  if (isNaN(v)) return "";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M views`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K views`;
  return `${v} views`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

router.get("/videos", async (req, res) => {
  const apiKey = process.env["YOUTUBE_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ error: "YouTube API key not configured" });
    return;
  }

  const rawSubject = ((req.query["subject"] as string) || "all").toLowerCase().replace(/\s+/g, "");
  const key = rawSubject === "computerscience" ? "cs" : rawSubject;
  const queries = SUBJECT_QUERIES[key] ?? SUBJECT_QUERIES["all"];

  // Pick 2 random queries per request so every refresh gives different results
  const selected = shuffle(queries).slice(0, 2);

  try {
    const videoIds: string[] = [];
    const searchMeta: Record<string, { channelName: string; published: string }> = {};

    // Run both search queries in parallel
    await Promise.all(
      selected.map(async (q) => {
        const url = new URL("https://www.googleapis.com/youtube/v3/search");
        url.searchParams.set("part", "snippet");
        url.searchParams.set("q", q);
        url.searchParams.set("type", "video");
        url.searchParams.set("videoEmbeddable", "true");
        url.searchParams.set("videoSyndicated", "true");
        url.searchParams.set("safeSearch", "strict");
        url.searchParams.set("relevanceLanguage", "en");
        url.searchParams.set("maxResults", "15");
        url.searchParams.set("order", "relevance");
        url.searchParams.set("key", apiKey);

        const r = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
        if (!r.ok) return;
        const data = await r.json() as {
          items?: Array<{
            id: { videoId: string };
            snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails: { high?: { url: string }; medium?: { url: string } } };
          }>
        };
        for (const item of data.items ?? []) {
          const vid = item.id.videoId;
          if (!vid || videoIds.includes(vid)) continue;
          videoIds.push(vid);
          searchMeta[vid] = {
            channelName: item.snippet.channelTitle,
            published: item.snippet.publishedAt,
          };
        }
      })
    );

    if (!videoIds.length) {
      res.json({ videos: [] });
      return;
    }

    // Fetch video details (duration + view count) in one batch
    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.searchParams.set("part", "contentDetails,statistics,snippet");
    detailsUrl.searchParams.set("id", videoIds.join(","));
    detailsUrl.searchParams.set("key", apiKey);

    const detailsRes = await fetch(detailsUrl.toString(), { signal: AbortSignal.timeout(8000) });
    const detailsData = await detailsRes.json() as {
      items?: Array<{
        id: string;
        snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails: { high?: { url: string }; medium?: { url: string } } };
        contentDetails: { duration: string };
        statistics: { viewCount: string };
      }>
    };

    const videos: Video[] = (detailsData.items ?? []).map((item) => {
      const meta = searchMeta[item.id] ?? {};
      const thumb =
        item.snippet.thumbnails.high?.url ??
        item.snippet.thumbnails.medium?.url ??
        `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
      return {
        videoId: item.id,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle || meta.channelName || "",
        thumbnail: thumb,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        published: item.snippet.publishedAt || meta.published || "",
        viewCount: formatViews(item.statistics?.viewCount ?? ""),
        duration: parseDuration(item.contentDetails?.duration ?? ""),
      };
    });

    // Shuffle so every refresh shows a fresh order
    res.json({ videos: shuffle(videos) });
  } catch (err) {
    req.log.error({ err }, "YouTube API fetch failed");
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

export default router;
