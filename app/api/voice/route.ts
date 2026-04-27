import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { text } = await req.json();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Turn this into a short memory entry: "${text}"`,
          },
        ],
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      memory: data.choices[0].message.content,
    });
  } catch (error) {
    return NextResponse.json({ memory: text });
  }
}