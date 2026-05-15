// app/api/video-search/route.ts
// Searches YouTube for videos matching the query.
// Requires YOUTUBE_API_KEY in .env.local
// Get a free key at: https://console.cloud.google.com → YouTube Data API v3

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ videos: [] });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.error("YOUTUBE_API_KEY is not set in .env.local");
      return NextResponse.json(
        { error: "YouTube API key not configured." },
        { status: 500 }
      );
    }

    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "5");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      const err = await res.json();
      console.error("YOUTUBE API ERROR:", err);
      return NextResponse.json(
        { error: "YouTube search failed." },
        { status: res.status }
      );
    }

    const data = await res.json();

    const videos = (data.items ?? []).map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url ?? "",
      channel: item.snippet.channelTitle,
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("VIDEO SEARCH ERROR:", error);
    return NextResponse.json(
      { error: "Video search failed." },
      { status: 500 }
    );
  }
}
