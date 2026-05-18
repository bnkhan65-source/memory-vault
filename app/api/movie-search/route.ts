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
      .replace(/\b(movies?|films?|pictures?|cinema|filmography|directed by|starring|together|with|and)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

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

    // Step 2: Check if query looks like multiple people (e.g. "Brad Pitt Jonah Hill")
    // Split on common separators and try to find 2+ people
    const cleanedQuery = stripFillers(query);

    // Try to identify multiple person names by searching sub-phrases
    const words = cleanedQuery.split(/\s+/);
    const personIds: { id: number; name: string; movieIds: Set<number> }[] = [];

    // Try 2-word and 3-word combos to find person names
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
          // Only count if name is a reasonably close match
          const nameMatch = person.name.toLowerCase().includes(words[i].toLowerCase());
          if (nameMatch && !personIds.find((p) => p.id === person.id)) {
            // Fetch their movie credits
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
      // Find intersection of all persons' movie sets
      let sharedIds = personIds[0].movieIds;
      for (let i = 1; i < personIds.length; i++) {
        sharedIds = new Set([...sharedIds].filter((id) => personIds[i].movieIds.has(id)));
      }

      if (sharedIds.size > 0) {
        // Fetch details for shared movies
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
          .map((movie) => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split("-")[0] : "",
            poster: movie.poster_path
              ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
              : null,
          }));

        return NextResponse.json({ movies });
      }
    }

    // Step 4: Fall back to single person search
    const personRes = await fetch(
      `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(cleanedQuery)}&include_adult=false&language=en-US&page=1`,
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
