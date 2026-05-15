@AGENTS.md

# Stash App — Session Notes

## What this app is
"Stash" is a Next.js personal memory app. Core use case: user can't remember a song, movie, or video — they speak it into the app, it auto-detects what they're looking for and searches the right category, then they tap a result to save it.

## Tech stack
- Next.js (App Router, Turbopack)
- Firebase Auth (Google) + Firestore + Storage
- OpenAI Whisper (transcription) + GPT-4o-mini (intent classification)
- TMDB API (movies, Bearer token in TMDB_API_KEY env var)
- YouTube Data API v3 (videos, YOUTUBE_API_KEY)
- iTunes Search API (music, free/no key needed)
- Tailwind CSS — dark theme (stone/amber palette)
- PWA planned for mobile distribution

## Voice → auto-search flow (COMPLETED)
1. User taps 🎤, speaks phrase
2. Whisper transcribes it (`/api/transcribe`)
3. GPT-4o-mini classifies intent + cleans query (`/api/detect-intent`)
4. `voiceQuery` state is set (shown as 🎤 "phrase" label — NOT put in input to avoid iOS keyboard)
5. Appropriate search fires automatically:
   - "music" → searchSpotify(query)
   - "movie" → searchMovies(query)
   - "video" → searchVideos(query)
   - "all" → all three in parallel

## Key files
- `app/page.tsx` — main home screen, all state/logic
- `app/api/detect-intent/route.ts` — GPT intent classifier
- `app/api/movie-search/route.ts` — TMDB search (uses TMDB_API_KEY as Bearer)
- `app/api/music-search/route.ts` — iTunes search
- `app/api/video-search/route.ts` — YouTube search
- `components/MemoryCard.tsx` — renders all memory types incl. playlists
- `lib/memoryTypes.ts` — type metadata (includes "playlist" type)

## Important state in page.tsx
- `memory` — text input field value (manual typing only)
- `voiceQuery` — detected query from voice (shown as label, NOT in input)
- `selectedItems` — multi-select tray (up to 10 items)
- `spotifyResults`, `videoResults`, `movieResults` — search results
- `showPlaylistModal` — modal for save as playlist vs separately
- `isListening`, `isDetecting` — voice flow status indicators

## Known issues / last session work
- Fixed: `term.trim is not a function` error in search functions — changed `q ?? memory` to `String(q ?? memory ?? "")` in all three search functions
- Fixed: iOS keyboard popping up after voice search — moved query to `voiceQuery` state instead of `memory` input
- The `Clear ✕` button calls `clearSearchState()` which clears memory, voiceQuery, all results, and selectedItems
- Mic button blurs active element on click to prevent keyboard from opening

## Phone testing setup
- Run: `npm run dev` (one terminal)
- Run: `npx cloudflared tunnel --url http://localhost:3000` (second terminal)
- Each cloudflare restart = new URL → must update:
  1. `next.config.mjs` allowedDevOrigins array
  2. Firebase Console → Authentication → Authorized Domains
- Then restart `npm run dev` to pick up next.config.mjs change

## Pending / next steps
- Verify the `term.trim` fix resolved search results on phone
- Consider Promise.allSettled instead of Promise.all for "all" intent (resilience if one API fails)
- Long term: PWA setup, App Store distribution, monetization plan (see Stash-Launch-Plan.docx in workspace)
