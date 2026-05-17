// app/api/transcribe/route.ts
// Receives an audio file and transcribes it using OpenAI Whisper.
// Requires a valid Firebase ID token in the Authorization header.

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/verifyAuth";


export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
      return NextResponse.json(
        { error: "No audio file received." },
        { status: 400 }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("TRANSCRIPTION ERROR:", error);
    return NextResponse.json(
      { error: "Transcription failed. Check your OpenAI API key." },
      { status: 500 }
    );
  }
}
