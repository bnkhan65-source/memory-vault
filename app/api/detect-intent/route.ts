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

IMPORTANT — Resolve indirect references before searching:
When the intent is "movie", you MUST resolve any indirect references to their actual searchable form. Movie databases search by title or actor name — they cannot interpret descriptions or nicknames.

1. INDIRECT ACTOR REFERENCES: If the user refers to an actor by a role or movie they're known for rather than their name, resolve it to their real name.
   - "the Home Alone actor" → "Macaulay Culkin"
   - "the guy from Forrest Gump" → "Tom Hanks"
   - "the actress from Pretty Woman" → "Julia Roberts"
   - "the Home Alone kid" → "Macaulay Culkin"

2. PLOT DESCRIPTIONS: If the input describes a plot, premise, or scene rather than naming a title, identify the specific movie and return its title.
   - If confident, return the title (and year if helpful for disambiguation)
   - If uncertain, return your best guess — a title search beats a raw description

Examples:
- "that song from the karate kid" → {"intent": "music", "query": "karate kid song"}
- "the Tom Hanks movie where he's stranded on an island" → {"intent": "movie", "query": "Cast Away"}
- "that movie with the Home Alone actor" → {"intent": "movie", "query": "Macaulay Culkin"}
- "movies with the guy from Forrest Gump" → {"intent": "movie", "query": "Tom Hanks"}
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
