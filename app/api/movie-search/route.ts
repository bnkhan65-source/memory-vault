import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ movies: [] });
  }

  const apiKey = process.env.TMDB_API_KEY;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    accept: "application/json",
  };

  try {
    // Step 1: Try searching by movie title
    const titleRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      { headers }
    );
    const titleData = await titleRes.json();

    if (titleData.results?.length > 0) {
      const movies = titleData.results.slice(0, 10).map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        year: movie.release_date ? movie.release_date.split("-")[0] : "",
        poster: movie.poster_path
          ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
          : null,
      }));
      return NextResponse.json({ movies });
    }

    // Step 2: No title matches — try searching by person (actor/director)
    // Strip common filler words that confuse the person search
    const personQuery = query
      .replace(/\b(movies?|films?|pictures?|cinema|filmography|directed by|starring)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const personRes = await fetch(
      `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(personQuery)}&include_adult=false&language=en-US&page=1`,
      { headers }
    );
    const personData = await personRes.json();

    if (personData.results?.length > 0) {
      const person = personData.results[0];
      const creditsRes = await fetch(
        `https://api.themoviedb.org/3/person/${person.id}/movie_credits?language=en-US`,
        { headers }
      );
      const creditsData = await creditsRes.json();

      // Sort by popularity and take top 10
      const movies = (creditsData.cast || [])
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 10)
        .map((movie: any) => ({
          id: movie.id,
          title: movie.title,
          year: movie.release_date ? movie.release_date.split("-")[0] : "",
          poster: movie.poster_path
            ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
            : null,
        }));

      return NextResponse.json({ movies });
    }

    // Nothing found
    return NextResponse.json({ movies: [] });
  } catch (err) {
    console.error("TMDB search error:", err);
    return NextResponse.json({ movies: [] }, { status: 500 });
  }
}
