export async function POST(req: Request) {
  const { query } = await req.json();

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      query
    )}&type=video&maxResults=5&key=${process.env.YOUTUBE_API_KEY}`
  );

  const data = await res.json();

  const videos = data.items.map((item: any) => ({
    title: item.snippet.title,
    videoId: item.id.videoId,
    thumbnail: item.snippet.thumbnails.default.url,
  }));

  return Response.json({ videos });
}