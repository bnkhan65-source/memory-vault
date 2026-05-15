import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { image } = await req.json();

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
            content: [
              {
                type: "text",
                text: "Describe this image in a short, emotional, memory-like caption.",
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ],
        max_tokens: 50,
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      caption: data.choices[0].message.content,
    });
  } catch (error) {
    return NextResponse.json({ caption: "" });
  }
}