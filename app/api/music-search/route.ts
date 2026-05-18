// app/api/music-search/route.ts
// Searches the iTunes Search API for songs matching the user's query.
// No auth required. Returns up to 8 unique tracks shaped for the Stash UI.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ tracks: [] });
    }

    // Fetch more results so we have room to deduplicate
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=30`
    );

    if (!res.ok) {
      console.error("iTunes API non-OK:", res.status, await res.text());
      return NextResponse.json({ tracks: [] });
    }

    const data = await res.json();

    const seen = new Set<string>();
    const tracks: any[] = [];

    for (const t of data.results || []) {
      if (!t.trackName || !t.artistName) continue;

      // Deduplicate by normalised title + artist
      const key = `${t.trackName.toLowerCase().trim()}|${t.artistName.toLowerCase().trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      tracks.push({
        title: t.trackName,
        artist: t.artistName,
        album: t.collectionName || null,
        url: t.trackViewUrl,
        image: t.artworkUrl100?.replace("100x100", "300x300"),
        preview: t.previewUrl,
      });

      if (tracks.length >= 8) break;
    }

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("iTunes API error:", error);
    return NextResponse.json({ tracks: [] });
  }
}
