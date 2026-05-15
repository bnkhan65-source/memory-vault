// app/api/generate-tags/route.ts
// Receives memory text and returns 2-4 short AI-generated tags.

import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ tags: [] });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 60,
      messages: [
        {
          role: "system",
          content:
            "You generate short tags for personal memory notes. " +
            "Return ONLY a JSON array of 2 to 4 lowercase single-word or hyphenated tags. " +
            "No explanation, no markdown, no extra text. Example: [\"food\",\"family\",\"weekend\"]",
        },
        {
          role: "user",
          content: text.slice(0, 500), // cap input to keep cost low
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";

    let tags: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        tags = parsed
          .filter((t) => typeof t === "string")
          .map((t) => t.toLowerCase().trim())
          .slice(0, 4);
      }
    } catch {
      console.error("TAG PARSE ERROR — raw response:", raw);
    }

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("GENERATE TAGS ERROR:", error);
    // Return empty tags rather than erroring — tags are non-critical
    return NextResponse.json({ tags: [] });
  }
}
