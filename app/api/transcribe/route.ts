// app/api/transcribe/route.ts
import OpenAI, { toFile } from "openai";
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

  // ── Transcribe ────────────────────────────────────────────────────────────
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file received." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadFile = await toFile(buffer, file.name || "audio.webm", {
      type: file.type || "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      file: uploadFile,
      model: "whisper-1",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("TRANSCRIPTION ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
