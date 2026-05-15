// app/api/music-search/route.ts
// Searches the iTunes Search API for songs matching the user's query.
// No auth required. Returns up to 5 tracks shaped for the Memory Vault UI.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ tracks: [] });
    }

    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        query
      )}&entity=song&limit=10`
    );

    if (!res.ok) {
      console.error("iTunes API non-OK:", res.status, await res.text());
      return NextResponse.json({ tracks: [] });
    }

    const data = await res.json();

    const tracks =
      data.results?.map((t: any) => ({
        title: t.trackName,
        artist: t.artistName,
        url: t.trackViewUrl,
        image: t.artworkUrl100?.replace("100x100", "300x300"),
        preview: t.previewUrl,
      })) || [];

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("iTunes API error:", error);
    return NextResponse.json({ tracks: [] });
  }
}