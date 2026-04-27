import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text) {
    return NextResponse.json({ tags: [] });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Generate 3-5 short, single-word tags for this memory. Return ONLY a comma-separated list.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    }),
  });

  const data = await response.json();

  const raw = data.choices?.[0]?.message?.content || "";

  const tags = raw
    .split(",")
    .map((t: string) => t.trim().toLowerCase())
    .filter(Boolean);

  return NextResponse.json({ tags });
}