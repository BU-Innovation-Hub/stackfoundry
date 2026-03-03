/**
 * YouTube Service
 * Server-side only — fetches video metadata from YouTube Data API v3
 * YOUTUBE_API_KEY must never be exposed to the frontend
 */

import https from "https";
import { getEnv } from "../config/env";

// ============================================
// Types
// ============================================

export interface YouTubeMetadata {
  id: string;
  title: string;
  durationSeconds: number;
  thumbnailUrl: string;
}

// ============================================
// Helpers
// ============================================

/**
 * Robustly extract a YouTube video ID from various URL formats:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 *  - plain VIDEO_ID (11-char alphanumeric)
 */
export const extractVideoId = (urlOrId: string): string | null => {
  if (!urlOrId) return null;

  const trimmed = urlOrId.trim();

  // Direct ID (11 chars, alphanumeric + dash + underscore)
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    // youtu.be/VIDEO_ID
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }

    // youtube.com/watch?v=VIDEO_ID
    const vParam = url.searchParams.get("v");
    if (vParam && /^[\w-]{11}$/.test(vParam)) {
      return vParam;
    }

    // youtube.com/embed/VIDEO_ID or youtube.com/v/VIDEO_ID
    const embedMatch = url.pathname.match(/\/(embed|v)\/([\w-]{11})/);
    if (embedMatch) {
      return embedMatch[2];
    }
  } catch {
    // Not a valid URL — return null
  }

  return null;
};

/**
 * Parse ISO 8601 duration (e.g., "PT1H2M10S") to total seconds
 */
const parseISO8601Duration = (iso: string): number => {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Make an HTTPS GET request (no external dependency needed)
 */

const httpsGet = (url: string, timeoutMs = 10000): Promise<string> => {
  return new Promise((resolve, reject) => {
    // https
    //   .get(url, (res) => {
        const req = https.get(url, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      })
      .on("error", reject);
  });
};

// ============================================
// Service Functions
// ============================================

/**
 * Fetch YouTube video metadata from the Data API v3
 * Requires YOUTUBE_API_KEY env var
 */
export const fetchYouTubeMetadata = async (
  videoId: string
): Promise<YouTubeMetadata> => {
  const env = getEnv();
  const apiKey = env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured on the server");
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${encodeURIComponent(
    videoId
  )}&key=${encodeURIComponent(apiKey)}`;


  let data: any;
  try {
    const raw = await httpsGet(url);
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to fetch YouTube metadata: ${err instanceof Error ? err.message : err}`);
  }
  if (data.error) {
    throw new Error(`YouTube API error: ${data.error.message || data.error.code}`);
  }

  if (!data.items || data.items.length === 0) {
    throw new Error(`YouTube video not found: ${videoId}`);
  }

  const item = data.items[0];
  const snippet = item.snippet;
  const contentDetails = item.contentDetails;

  return {
    id: item.id,
    title: snippet.title,
    durationSeconds: parseISO8601Duration(contentDetails.duration),
    thumbnailUrl:
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      "",
  };
};
