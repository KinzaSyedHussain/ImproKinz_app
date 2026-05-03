import { Router } from "express";

const router = Router();

// Simple in-memory cache (5 min TTL per channel)
const cache = new Map<string, { ts: number; data: Video[] }>();
const CACHE_TTL = 5 * 60 * 1000;

interface Video {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  url: string;
  published: string;
}

const CHANNELS: Record<string, { id: string; name: string }[]> = {
  all: [
    { id: "UCsooa4yRKGN_zEE8iknghZA", name: "TED-Ed" },
    { id: "UCX6b17PVsYBQ0ip5gyeme-Q", name: "CrashCourse" },
  ],
  math: [
    { id: "UCYO_jab_esuFRV4b17AJtAg", name: "3Blue1Brown" },
    { id: "UCFjd8qu9SkNBMnQ8p2UpTbA", name: "Mathologer" },
  ],
  science: [
    { id: "UCsXVk37biltHxX1PLCTJT1w", name: "Kurzgesagt" },
    { id: "UCUHW94eEFW7hkUMVaZz4eDg", name: "MinutePhysics" },
  ],
  history: [
    { id: "UCNjZmd8tfKx3T4QkHqb4YYw", name: "OverSimplified" },
    { id: "UCX6b17PVsYBQ0ip5gyeme-Q", name: "CrashCourse" },
  ],
  language: [
    { id: "UCAuUUnT6oDeKwE6v1NGQxug", name: "TED" },
    { id: "UCsooa4yRKGN_zEE8iknghZA", name: "TED-Ed" },
  ],
  cs: [
    { id: "UCsBjURrPoezykLs9EqgamOA", name: "Fireship" },
    { id: "UC8butISFwT-Wl7EV0hUK0BQ", name: "freeCodeCamp" },
  ],
  general: [
    { id: "UC6nSFpj9HTCZ5t-N3Rm3-HA", name: "Vsauce" },
    { id: "UCsooa4yRKGN_zEE8iknghZA", name: "TED-Ed" },
  ],
};

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseRSS(xml: string, channelName: string): Video[] {
  const videos: Video[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const entry = m[1];
    const videoId = /<yt:videoId>(.*?)<\/yt:videoId>/.exec(entry)?.[1]?.trim() ?? "";
    const title = decodeXmlEntities(
      /<title>([\s\S]*?)<\/title>/.exec(entry)?.[1]?.trim() ?? ""
    );
    const published = /<published>(.*?)<\/published>/.exec(entry)?.[1]?.trim() ?? "";
    const thumbnail =
      /media:thumbnail[^/]*url="([^"]+)"/.exec(entry)?.[1] ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    if (videoId && title) {
      videos.push({
        videoId,
        title,
        channelName,
        thumbnail,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        published,
      });
    }
  }
  return videos;
}

async function fetchChannel(channelId: string, channelName: string): Promise<Video[]> {
  const key = channelId;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const xml = await res.text();
  const videos = parseRSS(xml, channelName);
  cache.set(key, { ts: Date.now(), data: videos });
  return videos;
}

router.get("/videos", async (req, res) => {
  const subject = ((req.query["subject"] as string) || "all").toLowerCase().replace(/\s+/g, "");
  const key = subject === "computerscience" ? "cs" : subject;
  const channels = CHANNELS[key] ?? CHANNELS["all"];

  try {
    const results = await Promise.all(
      channels.map((ch) => fetchChannel(ch.id, ch.name))
    );
    // Interleave results from multiple channels so feed stays varied
    const merged: Video[] = [];
    const maxLen = Math.max(...results.map((r) => r.length));
    for (let i = 0; i < maxLen; i++) {
      for (const ch of results) {
        if (ch[i]) merged.push(ch[i]);
      }
    }
    res.json({ videos: merged.slice(0, 30) });
  } catch (err) {
    req.log.error({ err }, "Videos fetch failed");
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

export default router;
