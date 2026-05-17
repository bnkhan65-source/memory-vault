import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/verifyAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !(await verifyFirebaseToken(token))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured." }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image received." }, { status: 400 });
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 20,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" },
              },
              {
                type: "text",
                text: "What is the main object or item in this photo? If it is a plant, identify the specific common name (e.g. 'monstera', 'snake plant', 'fiddle leaf fig'). For food, name the specific dish or ingredient. For everything else, give the most specific common name you can. Reply with only the item name, 1-3 words, no punctuation.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Vision error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const item = data.choices?.[0]?.message?.content?.trim() || "";
    return NextResponse.json({ item });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("IDENTIFY IMAGE ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
