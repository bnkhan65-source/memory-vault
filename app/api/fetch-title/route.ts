import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/verifyAuth";

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
  const valid = await verifyFirebaseToken(token);
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Stash/1.0)" },
      signal: AbortSignal.timeout(6000),
    });

    const html = await res.text();

    // Try <title> tag first
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    // Fall back to og:title
    const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);

    const raw = titleMatch?.[1] || ogMatch?.[1] || null;
    const title = raw
      ? raw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
             .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim()
      : null;

    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: null });
  }
}
