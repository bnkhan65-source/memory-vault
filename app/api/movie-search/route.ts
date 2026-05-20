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

  const stripFillers = (q: string) =>
    q
      .replace(/\b(movies?|films?|pictures?|cinema|filmography|directed by|starring|series|shows?|together|with|and)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const toResult = (item: any, mediaType: "movie" | "tv") => ({
    id: item.id,
    title: mediaType === "tv" ? item.name : item.title,
    year: mediaType === "tv"
      ? (item.first_air_date ? item.first_air_date.split("-")[0] : "")
      : (item.release_date ? item.release_date.split("-")[0] : ""),
    poster: item.poster_path
      ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
      : null,
    mediaType,
  });

  try {
    // Step 1: Search movies AND TV series in parallel
    const [movieRes, tvRes] = await Promise.all([
      fetch(
        `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
        { headers }
      ),
      fetch(
        `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
        { headers }
      ),
    ]);

    const [movieData, tvData] = await Promise.all([movieRes.json(), tvRes.json()]);

    const movieResults = (movieData.results || []).map((m: any) => ({ ...toResult(m, "movie"), popularity: m.popularity }));
    const tvResults = (tvData.results || []).map((m: any) => ({ ...toResult(m, "tv"), popularity: m.popularity }));

    const combined = [...movieResults, ...tvResults]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 12)
      .map(({ popularity: _p, ...rest }) => rest);

    if (combined.length > 0) {
      return NextResponse.json({ movies: combined });
    }

    // Step 2: Check if query looks like multiple people (e.g. "Brad Pitt Jonah Hill")
    const cleanedQuery = stripFillers(query);
    const words = cleanedQuery.split(/\s+/);
    const personIds: { id: number; name: string; movieIds: Set<number> }[] = [];

    for (let i = 0; i < words.length; i++) {
      for (let len = 2; len <= 3; len++) {
        if (i + len > words.length) continue;
        const phrase = words.slice(i, i + len).join(" ");
        const res = await fetch(
          `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(phrase)}&include_adult=false&language=en-US&page=1`,
          { headers }
        );
        const data = await res.json();
        if (data.results?.length > 0) {
          const person = data.results[0];
          const nameMatch = person.name.toLowerCase().includes(words[i].toLowerCase());
          if (nameMatch && !personIds.find((p) => p.id === person.id)) {
            const creditsRes = await fetch(
              `https://api.themoviedb.org/3/person/${person.id}/movie_credits?language=en-US`,
              { headers }
            );
            const creditsData = await creditsRes.json();
            const movieIds = new Set<number>(
              (creditsData.cast || []).map((m: any) => m.id)
            );
            personIds.push({ id: person.id, name: person.name, movieIds });
          }
        }
      }
    }

    // Step 3: If we found 2+ people, return movies they share
    if (personIds.length >= 2) {
      let sharedIds = personIds[0].movieIds;
      for (let i = 1; i < personIds.length; i++) {
        sharedIds = new Set([...sharedIds].filter((id) => personIds[i].movieIds.has(id)));
      }

      if (sharedIds.size > 0) {
        const movieDetails = await Promise.all(
          [...sharedIds].slice(0, 10).map(async (id) => {
            const res = await fetch(
              `https://api.themoviedb.org/3/movie/${id}?language=en-US`,
              { headers }
            );
            return res.json();
          })
        );

        const movies = movieDetails
          .filter((m) => m.id)
          .sort((a, b) => b.popularity - a.popularity)
          .map((m) => toResult(m, "movie"));

        return NextResponse.json({ movies });
      }
    }

    // Step 4: Fall back to single person search (movies + TV credits)
    const personRes = await fetch(
      `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(cleanedQuery)}&include_adult=false&language=en-US&page=1`,
      { headers }
    );
    const personData = await personRes.json();

    if (personData.results?.length > 0) {
      const person = personData.results[0];

      const [movieCreditsRes, tvCreditsRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/person/${person.id}/movie_credits?language=en-US`, { headers }),
        fetch(`https://api.themoviedb.org/3/person/${person.id}/tv_credits?language=en-US`, { headers }),
      ]);
      const [movieCredits, tvCredits] = await Promise.all([movieCreditsRes.json(), tvCreditsRes.json()]);

      const allCredits = [
        ...(movieCredits.cast || []).map((m: any) => ({ ...m, mediaType: "movie" as const })),
        ...(tvCredits.cast || []).map((m: any) => ({ ...m, mediaType: "tv" as const })),
      ]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 12)
        .map((item) => toResult(item, item.mediaType));

      return NextResponse.json({ movies: allCredits });
    }

    return NextResponse.json({ movies: [] });
  } catch (err) {
    console.error("TMDB search error:", err);
    return NextResponse.json({ movies: [] }, { status: 500 });
  }
}
