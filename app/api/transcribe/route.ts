// app/api/transcribe/route.ts
import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/verifyAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || !(await verifyFirebaseToken(token))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── API key check ─────────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured on server." }, { status: 500 });
  }

  // ── Transcribe ────────────────────────────────────────────────────────────
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file received." }, { status: 400 });
    }

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: (() => {
        const fd = new FormData();
        fd.append("file", file, file.name || "audio.webm");
        fd.append("model", "whisper-1");
        return fd;
      })(),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Whisper error: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ text: data.text });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("TRANSCRIPTION ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
