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
    "study tips education",
    "learn how to study",
    "educational lecture",
    "science explained",
    "history documentary",
    "math tutorial",
  ],
  math: [
    "mathematics tutorial",
    "calculus explained",
    "algebra lesson",
    "geometry math",
    "statistics probability",
    "linear algebra",
  ],
  science: [
    "physics lecture",
    "chemistry explained",
    "biology tutorial",
    "science experiment",
    "quantum physics",
    "organic chemistry",
  ],
  history: [
    "world history documentary",
    "ancient history explained",
    "history lesson",
    "world war history",
    "civilization history",
  ],
  cs: [
    "programming tutorial",
    "computer science lecture",
    "coding explained",
    "algorithms data structures",
    "machine learning tutorial",
    "web development",
  ],
  language: [
    "english grammar lesson",
    "language learning tips",
    "vocabulary lesson",
    "creative writing tutorial",
    "literature analysis",
    "essay writing",
  ],
  general: [
    "ted education",
    "kurzgesagt explained",
    "veritasium",
    "vsauce science",
    "crashcourse",
    "minutephysics",
  ],
};

const FALLBACK_VIDEOS: Video[] = [
  {
    videoId: "aircAruvnKk",
    title: "But what is a neural network?",
    channelName: "3Blue1Brown",
    thumbnail: "https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=aircAruvnKk",
    published: "2017-10-05T00:00:00Z",
    viewCount: "15.2M views",
    duration: "19:13",
  },
  {
    videoId: "WUvTyaaNkzM",
    title: "The essence of calculus",
    channelName: "3Blue1Brown",
    thumbnail: "https://i.ytimg.com/vi/WUvTyaaNkzM/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=WUvTyaaNkzM",
    published: "2017-04-28T00:00:00Z",
    viewCount: "10.5M views",
    duration: "17:04",
  },
  {
    videoId: "HZGCoVF3YvM",
    title: "How to Study Effectively",
    channelName: "Thomas Frank",
    thumbnail: "https://i.ytimg.com/vi/HZGCoVF3YvM/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=HZGCoVF3YvM",
    published: "2019-02-14T00:00:00Z",
    viewCount: "4.1M views",
    duration: "11:26",
  },
  {
    videoId: "IlU-zDU6aQ0",
    title: "The Complete Story of Destiny",
    channelName: "CrashCourse",
    thumbnail: "https://i.ytimg.com/vi/IlU-zDU6aQ0/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=IlU-zDU6aQ0",
    published: "2018-06-18T00:00:00Z",
    viewCount: "2.3M views",
    duration: "12:31",
  },
  {
    videoId: "sDqjCMCdCGo",
    title: "Studying Smarter Not Harder",
    channelName: "Mike and Matty",
    thumbnail: "https://i.ytimg.com/vi/sDqjCMCdCGo/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=sDqjCMCdCGo",
    published: "2020-01-10T00:00:00Z",
    viewCount: "1.8M views",
    duration: "9:42",
  },
  {
    videoId: "qPix_X-9t7E",
    title: "What Is Consciousness?",
    channelName: "Kurzgesagt",
    thumbnail: "https://i.ytimg.com/vi/qPix_X-9t7E/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=qPix_X-9t7E",
    published: "2019-03-12T00:00:00Z",
    viewCount: "14.6M views",
    duration: "7:08",
  },
  {
    videoId: "Xn7KWR9EOGQ",
    title: "The History of the World: Every Year",
    channelName: "Ollie Bye",
    thumbnail: "https://i.ytimg.com/vi/Xn7KWR9EOGQ/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=Xn7KWR9EOGQ",
    published: "2016-04-24T00:00:00Z",
    viewCount: "65.3M views",
    duration: "5:45",
  },
  {
    videoId: "8jLOx1hD3_o",
    title: "CS50 2023 – Lecture 0: Scratch",
    channelName: "CS50",
    thumbnail: "https://i.ytimg.com/vi/8jLOx1hD3_o/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=8jLOx1hD3_o",
    published: "2023-09-01T00:00:00Z",
    viewCount: "1.1M views",
    duration: "1:57:48",
  },
  {
    videoId: "OmJ-4B-mS-Y",
    title: "How to Get Your Brain to Focus",
    channelName: "Veritasium",
    thumbnail: "https://i.ytimg.com/vi/OmJ-4B-mS-Y/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=OmJ-4B-mS-Y",
    published: "2021-09-05T00:00:00Z",
    viewCount: "24.7M views",
    duration: "14:11",
  },
  {
    videoId: "arj7oStGLkU",
    title: "The Feynman Technique: The Best Way to Learn Anything",
    channelName: "Thomas Frank",
    thumbnail: "https://i.ytimg.com/vi/arj7oStGLkU/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=arj7oStGLkU",
    published: "2017-07-01T00:00:00Z",
    viewCount: "3.5M views",
    duration: "5:53",
  },
  {
    videoId: "rkZl2gsLUp4",
    title: "Active Recall: The Most Powerful Study Technique",
    channelName: "Ali Abdaal",
    thumbnail: "https://i.ytimg.com/vi/rkZl2gsLUp4/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=rkZl2gsLUp4",
    published: "2019-11-01T00:00:00Z",
    viewCount: "5.2M views",
    duration: "10:24",
  },
  {
    videoId: "ukLnPbIffxE",
    title: "How to Learn Faster with the Feynman Technique",
    channelName: "Sprouts",
    thumbnail: "https://i.ytimg.com/vi/ukLnPbIffxE/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=ukLnPbIffxE",
    published: "2019-01-15T00:00:00Z",
    viewCount: "7.2M views",
    duration: "5:47",
  },
];

// Cache results for 2 hours.
// This keeps API usage reasonable while allowing the feed
// to change more often than the previous 12-hour cache.
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

const cache = new Map<string, { videos: Video[]; ts: number }>();

function getCached(key: string): Video[] | null {
  const entry = cache.get(key);

  if (!entry) return null;

  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.videos;
}

function setCached(key: string, videos: Video[]) {
  cache.set(key, {
    videos,
    ts: Date.now(),
  });
}

function parseDuration(iso: string): string {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);

  if (!match) return "";

  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(n: string): string {
  const v = parseInt(n);

  if (isNaN(v)) return "";

  if (v >= 1_000_000) {
    return `${(v / 1_000_000).toFixed(1)}M views`;
  }

  if (v >= 1_000) {
    return `${(v / 1_000).toFixed(0)}K views`;
  }

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
    res.json({
      videos: shuffle(FALLBACK_VIDEOS),
      fallback: true,
      reason: "YouTube API key not configured",
    });

    return;
  }

  const freeQuery = (req.query["q"] as string | undefined)?.trim();

  const rawSubject = (
    (req.query["subject"] as string) || "all"
  )
    .toLowerCase()
    .replace(/\s+/g, "");

  const key = rawSubject === "computerscience" ? "cs" : rawSubject;

  const cacheKey = freeQuery
    ? `q:${freeQuery.toLowerCase()}`
    : `s:${key}`;

  const cached = getCached(cacheKey);

  if (cached) {
    res.json({
      videos: shuffle(cached),
      cached: true,
    });

    return;
  }

  const queries =
    SUBJECT_QUERIES[key] ?? SUBJECT_QUERIES["all"];

  /*
   * For normal category browsing:
   * - randomly select 3 queries
   * - fetch 25 results from each
   * - deduplicate
   *
   * This can produce up to 75 search results before
   * deduplication, while keeping API usage reasonable.
   *
   * For a user search, only their search query is used.
   */
  const selected: string[] = freeQuery
    ? [freeQuery]
    : shuffle(queries).slice(0, 3);

  try {
    const videoIds: string[] = [];

    const searchMeta: Record<
      string,
      {
        channelName: string;
        published: string;
      }
    > = {};

    let quotaExceeded = false;

    await Promise.all(
      selected.map(async (q) => {
        const url = new URL(
          "https://www.googleapis.com/youtube/v3/search"
        );

        url.searchParams.set("part", "snippet");
        url.searchParams.set("q", q);
        url.searchParams.set("type", "video");
        url.searchParams.set("videoEmbeddable", "true");

        /*
         * Removed videoSyndicated=true.
         *
         * This filter can unnecessarily exclude videos.
         * We already require embeddable videos.
         */
        url.searchParams.set("safeSearch", "strict");
        url.searchParams.set("relevanceLanguage", "en");

        // Maximum allowed by YouTube search.list.
        url.searchParams.set("maxResults", "25");

        url.searchParams.set("order", "relevance");
        url.searchParams.set("key", apiKey);

        const r = await fetch(url.toString(), {
          signal: AbortSignal.timeout(8000),
        });

        if (!r.ok) {
          const errBody = await r
            .json()
            .catch(() => ({})) as {
            error?: {
              reason?: string;
              message?: string;
            };
          };

          if (
            r.status === 403 ||
            errBody?.error?.reason === "quotaExceeded"
          ) {
            quotaExceeded = true;

            req.log.warn(
              "YouTube quota exceeded — serving fallback videos"
            );
          } else {
            req.log.warn(
              {
                status: r.status,
                reason: errBody?.error?.reason,
                message: errBody?.error?.message,
              },
              "YouTube search request failed"
            );
          }

          return;
        }

        const data = await r.json() as {
          items?: Array<{
            id?: {
              videoId?: string;
            };
            snippet: {
              title: string;
              channelTitle: string;
              publishedAt: string;
              thumbnails: {
                high?: {
                  url: string;
                };
                medium?: {
                  url: string;
                };
              };
            };
          }>;
        };

        for (const item of data.items ?? []) {
          const vid = item.id?.videoId;

          if (!vid || videoIds.includes(vid)) {
            continue;
          }

          videoIds.push(vid);

          searchMeta[vid] = {
            channelName: item.snippet.channelTitle,
            published: item.snippet.publishedAt,
          };
        }
      })
    );

    if (quotaExceeded || !videoIds.length) {
      const fallback = shuffle(FALLBACK_VIDEOS);

      res.json({
        videos: fallback,
        fallback: true,
      });

      return;
    }

    /*
     * Keep the detail request within YouTube's URL/ID limits
     * and avoid returning an unnecessarily massive feed.
     */
    const limitedVideoIds = videoIds.slice(0, 50);

    const detailsUrl = new URL(
      "https://www.googleapis.com/youtube/v3/videos"
    );

    detailsUrl.searchParams.set(
      "part",
      "contentDetails,statistics,snippet"
    );

    detailsUrl.searchParams.set(
      "id",
      limitedVideoIds.join(",")
    );

    detailsUrl.searchParams.set("key", apiKey);

    const detailsRes = await fetch(detailsUrl.toString(), {
      signal: AbortSignal.timeout(8000),
    });

    if (!detailsRes.ok) {
      const errorBody = await detailsRes
        .json()
        .catch(() => ({}));

      req.log.warn(
        {
          status: detailsRes.status,
          error: errorBody,
        },
        "YouTube video details request failed"
      );

      res.json({
        videos: shuffle(FALLBACK_VIDEOS),
        fallback: true,
      });

      return;
    }

    const detailsData = await detailsRes.json() as {
      items?: Array<{
        id: string;
        snippet: {
          title: string;
          channelTitle: string;
          publishedAt: string;
          thumbnails: {
            high?: {
              url: string;
            };
            medium?: {
              url: string;
            };
          };
        };
        contentDetails?: {
          duration?: string;
        };
        statistics?: {
          viewCount?: string;
        };
      }>;
    };

    const videos: Video[] = (
      detailsData.items ?? []
    ).map((item) => {
      const meta = searchMeta[item.id] ?? {};

      const thumb =
        item.snippet.thumbnails.high?.url ??
        item.snippet.thumbnails.medium?.url ??
        `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;

      return {
        videoId: item.id,
        title: item.snippet.title,
        channelName:
          item.snippet.channelTitle ||
          meta.channelName ||
          "",
        thumbnail: thumb,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        published:
          item.snippet.publishedAt ||
          meta.published ||
          "",
        viewCount: formatViews(
          item.statistics?.viewCount ?? ""
        ),
        duration: parseDuration(
          item.contentDetails?.duration ?? ""
        ),
      };
    });

    if (videos.length) {
      setCached(cacheKey, videos);
    }

    res.json({
      videos: shuffle(videos),
    });
  } catch (err) {
    req.log.error(
      {
        err,
      },
      "YouTube API fetch failed"
    );

    res.json({
      videos: shuffle(FALLBACK_VIDEOS),
      fallback: true,
    });
  }
});

export default router;