import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    console.log("QUERY:", query);
    console.log("CLIENT ID:", process.env.SPOTIFY_CLIENT_ID);
    console.log("CLIENT SECRET:", process.env.SPOTIFY_CLIENT_SECRET);

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenRes.json();

    console.log("TOKEN DATA:", tokenData);

    const accessToken = tokenData.access_token;

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=3`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const text = await searchRes.text();
console.log("SPOTIFY RAW RESPONSE:", text);

if (!searchRes.ok) {
  console.error("Spotify API error:", text);
  return NextResponse.json({ tracks: [] });
}

let searchData: any = {};

try {
  searchData = text ? JSON.parse(text) : {};
} catch (e) {
  console.error("JSON PARSE ERROR:", text);
  return NextResponse.json({ tracks: [] });
}

    console.log("SEARCH DATA:", searchData);

    const tracks =
      searchData.tracks?.items.map((t: any) => ({
        title: t.name,
        artist: t.artists.map((a: any) => a.name).join(", "),
        url: t.external_urls.spotify,
        image: t.album.images[0]?.url,
      })) || [];

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("🔥 FULL ERROR:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}