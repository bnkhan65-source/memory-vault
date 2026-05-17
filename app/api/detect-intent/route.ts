import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";


export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { text } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ intent: "all", query: text });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a search intent classifier for a personal memory app. Users speak a phrase when they can't remember a song, movie, or video.

Analyze the input and return a JSON object with:
- "intent": one of "music", "movie", "video", or "all"
- "query": a clean, optimized search query to find what they're looking for

Rules:
- Lean toward "music" for anything mentioning songs, lyrics, sounds, beats, albums
- Lean toward "movie" for anything mentioning films, directors, plot descriptions, "that movie"
- Lean toward "video" for YouTube-style content: tutorials, clips, funny videos, documentaries
- Use "all" when the query is a celebrity name or person who is known for BOTH music and film (e.g. Madonna, Lady Gaga, Beyoncé, Elvis, Frank Sinatra, Will Smith, Jennifer Lopez) — they likely want both music AND movie results
- Use "all" when the intent is genuinely unclear
- Strip filler words like "movies", "songs", "films", "music" from the query — keep just the core search terms
- The query should be concise and search-friendly, not the raw spoken text

Examples:
- "that song from the karate kid" → {"intent": "music", "query": "karate kid song"}
- "the Tom Hanks movie where he's stranded on an island" → {"intent": "movie", "query": "Tom Hanks stranded island"}
- "that funny video with the cat falling off the table" → {"intent": "video", "query": "cat falling off table funny"}
- "80s workout music" → {"intent": "music", "query": "80s workout music"}
- "Madonna" → {"intent": "all", "query": "Madonna"}
- "Madonna movies" → {"intent": "all", "query": "Madonna"}
- "Beyoncé songs" → {"intent": "all", "query": "Beyoncé"}
- "that old Denzel Washington film about a train" → {"intent": "movie", "query": "Denzel Washington train"}
- "that song that goes dun dun dun" → {"intent": "music", "query": "dun dun dun song"}
- "Tom Cruise movies" → {"intent": "movie", "query": "Tom Cruise"}

Return only valid JSON, no explanation.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 100,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return NextResponse.json({
      intent: result.intent || "all",
      query: result.query || text,
    });
  } catch (err) {
    console.error("Intent detection error:", err);
    // Fallback: return original text with "all" intent
    return NextResponse.json({ intent: "all", query: text });
  }
}
