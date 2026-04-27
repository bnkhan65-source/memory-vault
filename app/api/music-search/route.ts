import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`
    );

    const data = await res.json();

    const tracks =
      data.results?.map((t: any) => ({
        title: t.trackName,
        artist: t.artistName,
        url: t.trackViewUrl,
        image: t.artworkUrl100.replace("100x100", "300x300"),
        preview: t.previewUrl,
      })) || [];

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("iTunes API error:", error);
    return NextResponse.json({ tracks: [] });
  }
}