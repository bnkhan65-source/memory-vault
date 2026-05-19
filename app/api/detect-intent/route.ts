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

IMPORTANT — Plot description identification:
When the intent is "movie" and the input describes a plot, premise, setting, or scene rather than naming an actor or title, you MUST try to identify the specific movie and return its title as the query. This is critical because movie databases search by title, not by plot description.
- If you are confident you know the movie, return the title (and year if helpful for disambiguation) as the query.
- If you can make a reasonable guess, return your best guess title — a title search is more likely to succeed than a raw plot description.
- Only fall back to a descriptive query if you truly cannot identify the film.

Examples:
- "that song from the karate kid" → {"intent": "music", "query": "karate kid song"}
- "the Tom Hanks movie where he's stranded on an island" → {"intent": "movie", "query": "Cast Away"}
- "sci-fi movie where people are trapped in a giant cube with deadly rooms" → {"intent": "movie", "query": "Cube 1997"}
- "that movie where a guy wakes up and relives the same day over and over" → {"intent": "movie", "query": "Groundhog Day"}
- "horror movie with a clown that lives in a sewer" → {"intent": "movie", "query": "It"}
- "animated movie where a rat wants to be a chef in Paris" → {"intent": "movie", "query": "Ratatouille"}
- "that funny video with the cat falling off the table" → {"intent": "video", "query": "cat falling off table funny"}
- "80s workout music" → {"intent": "music", "query": "80s workout music"}
- "Madonna" → {"intent": "all", "query": "Madonna"}
- "Beyoncé songs" → {"intent": "all", "query": "Beyoncé"}
- "that old Denzel Washington film about a train" → {"intent": "movie", "query": "Unstoppable Denzel Washington"}
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
      max_tokens: 150,
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
