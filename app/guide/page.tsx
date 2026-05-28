"use client";
import { useRouter } from "next/navigation";

export default function GuidePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 px-4 py-8 max-w-2xl mx-auto">

      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-sm text-stone-400 hover:text-amber-400 transition-colors mb-6"
      >
        <span className="text-lg leading-none">←</span>
        <span>Back to Stash</span>
      </button>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🎞️</div>
        <h1 className="text-3xl font-bold text-stone-100 mb-1">Stash</h1>
        <p className="text-amber-400 font-medium">User Guide</p>
        <p className="text-stone-400 text-sm mt-2">Your memories, all in one place</p>
      </div>

      {/* What is Stash */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-amber-400 mb-3 border-b border-stone-800 pb-2">What is Stash?</h2>
        <p className="text-stone-300 text-sm leading-relaxed mb-3">
          Have you ever had a song stuck in your head that you couldn&apos;t remember the name of? Or walked out of a conversation thinking &ldquo;I need to watch that movie&rdquo; — and then completely forgot it by morning? That&apos;s exactly what Stash is for.
        </p>
        <p className="text-stone-300 text-sm leading-relaxed mb-4">
          Stash is a personal memory app that helps you find and save music, movies, and videos before you forget them. Just speak what you&apos;re thinking of — even a vague description — and Stash searches for it and saves it so you can find it again later.
        </p>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-2">
          {[
            ['🎵', 'Say "that 80s song with the saxophone" — Stash finds it and saves it.'],
            ['🎬', 'Say "movies with Tom Hanks and Meg Ryan" — Stash shows you the films they made together.'],
            ['🎥', 'Type "Bohemian Rhapsody" — Stash finds the song and saves it to your collection.'],
            ['📝', 'Create a list called "Movies to Watch" and add titles whenever you hear a recommendation.'],
          ].map(([icon, text], i) => (
            <div key={i} className="flex gap-3 text-sm text-stone-300">
              <span className="shrink-0">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Getting Started */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-amber-400 mb-3 border-b border-stone-800 pb-2">1. Getting Started</h2>
        <p className="text-stone-300 text-sm leading-relaxed mb-3">
          Stash is a web app — no App Store download required. Open your browser and go to:
        </p>
        <div className="bg-stone-900 border border-amber-500/30 rounded-xl p-3 text-center mb-4">
          <span className="text-amber-400 font-mono text-sm font-medium">memory-vault-qrbb.vercel.app</span>
        </div>
        <p className="text-stone-300 text-sm leading-relaxed mb-3">
          Sign in using your Google account.
        </p>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-sm text-stone-400">
          📌 If you sign up with an email and password, you&apos;ll receive a verification email. Click the link in that email before signing in. Google sign-in does not require this step.
        </div>
      </section>

      {/* Best Browser */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-amber-400 mb-3 border-b border-stone-800 pb-2">2. Best Browser for Your Device</h2>
        <p className="text-stone-300 text-sm leading-relaxed mb-3">
          Stash works on all modern browsers, but for the best experience use the recommended browser for your device:
        </p>
        <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden text-sm">
          <div className="grid grid-cols-4 bg-stone-800 text-stone-400 text-xs font-medium px-4 py-2">
            <span>Device</span>
            <span>Best Browser</span>
            <span>Voice</span>
            <span>Install</span>
          </div>
          {[
            ['📱 iPhone', 'Safari', '✅', '✅'],
            ['🤖 Android', 'Chrome', '✅', '✅'],
            ['💻 PC / Mac', 'Any', '✅', 'Optional'],
          ].map(([device, browser, voice, install], i) => (
            <div key={i} className="grid grid-cols-4 px-4 py-2 border-t border-stone-800 text-stone-300">
              <span>{device}</span>
              <span>{browser}</span>
              <span>{voice}</span>
              <span>{install}</span>
            </div>
          ))}
        </div>
        <p className="text-stone-500 text-xs mt-2 px-1">💡 Safari on iPhone gives the smoothest experience — voice search, install-as-app, and all features work perfectly out of the box.</p>
      </section>

      {/* Install on Phone */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-amber-400 mb-3 border-b border-stone-800 pb-2">3. Install Stash on Your Phone</h2>
        <p className="text-stone-300 text-sm leading-relaxed mb-4">
          Installing Stash as an app gives you a home screen icon, full-screen experience, and faster loading — no browser address bar in the way.
        </p>

        <div className="space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
            <p className="text-sm font-semibold text-stone-200 mb-2">📱 iPhone — Safari</p>
            <ol className="space-y-1 text-sm text-stone-400 list-decimal list-inside">
              <li>Open Safari and go to <span className="text-amber-400 font-mono text-xs">memory-vault-qrbb.vercel.app</span></li>
              <li>Tap the Share button (box with arrow, bottom of screen)</li>
              <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</li>
              <li>Tap <strong className="text-stone-300">Add</strong> in the top right corner</li>
            </ol>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
            <p className="text-sm font-semibold text-stone-200 mb-2">🤖 Android — Chrome</p>
            <ol className="space-y-1 text-sm text-stone-400 list-decimal list-inside">
              <li>Open Chrome and go to <span className="text-amber-400 font-mono text-xs">memory-vault-qrbb.vercel.app</span></li>
              <li>Tap the three-dot menu (top right)</li>
              <li>Tap &ldquo;Add to Home screen&rdquo; or &ldquo;Install app&rdquo;</li>
              <li>Tap <strong className="text-stone-300">Add</strong> to confirm</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Voice Search */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-amber-400 mb-3 border-b border-stone-800 pb-2">4. Using Voice Search</h2>
        <p className="text-stone-300 text-sm leading-relaxed mb-3">
          Voice search is the fastest way to save a memory. Tap the microphone button and speak naturally — Stash automatically figures out what you&apos;re looking for.
        </p>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 mb-4 space-y-2">
          {[
            '"That Boston song with the guitar solo" → finds the song',
            '"Tom Hanks movies" → shows his films',
            '"That video about Boston in 1650" → finds the YouTube video',
            '"Blinding Lights" → finds the track',
          ].map((ex, i) => (
            <p key={i} className="text-sm text-stone-400 font-mono">{ex}</p>
          ))}
        </div>
        <p className="text-stone-500 text-xs px-1">💡 Speak clearly and naturally. You don&apos;t need to say exact titles — Stash understands context and partial descriptions.</p>
        <p className="text-stone-300 text-sm leading-relaxed mt-3">
          After speaking, Stash will show you the results. Tap a result to select it, then tap <strong>Save Memory</strong> to store it.
        </p>
      </section>

      {/* Music Service */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-amber-400 mb-3 border-b border-stone-800 pb-2">5. Choosing Your Music Service</h2>
        <p className="text-stone-300 text-sm leading-relaxed mb-3">
          When you save music, Stash lets you open tracks in your preferred streaming service. To set your preference, expand any saved song and tap the service you use:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['🍎 Apple', 'Opens in Apple Music'],
            ['🟢 Spotify', 'Opens in Spotify'],
            ['🔴 YouTube', 'Opens in YouTube Music'],
            ['🔵 Amazon', 'Opens in Amazon Music'],
          ].map(([label, desc], i) => (
            <div key={i} className="bg-stone-900 border border-stone-800 rounded-lg p-3 text-sm">
              <p className="font-medium text-stone-200">{label}</p>
              <p className="text-stone-500 text-xs mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-stone-500 text-xs mt-2 px-1">Your choice is saved automatically — you only need to set it once.</p>
      </section>

      {/* Saving Memories */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-amber-400 mb-3 border-b border-stone-800 pb-2">6. Saving Memories</h2>
        <div className="space-y-3">
          {[
            ['🎤 Voice search', 'Tap the mic, speak, select a result, and tap Save Memory.'],
            ['⌨️ Manual text', 'Type anything in the Add memory box and tap Save Memory — great for quick notes, vibes, or things you don\'t need to search for.'],
            ['🎶 Playlists', 'Select multiple results (up to 10) before saving to group them into one playlist card.'],
            ['✅ Checklists', 'Tap the 📝 button next to the mic to create a checklist (shopping lists, to-do lists, packing lists). Add items later by tapping + on any list card. Tap 📷 Photo to photograph an item — Stash will identify what\'s in the photo and save both the image and label together.'],
          ].map(([title, desc], i) => (
            <div key={i} className="bg-stone-900 border border-stone-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-stone-200 mb-1">{title}</p>
              <p className="text-sm text-stone-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-amber-400 mb-3 border-b border-stone-800 pb-2">7. Tips for the Best Experience</h2>
        <div className="space-y-3">
          {[
            ['Allow microphone access', 'Voice search won\'t work without it. On iPhone, go to Safari → page icon (monitor) in address bar → three dots (...) → Website Settings → Microphone → Allow.'],
            ['Keep Stash installed as an app', 'The installed version is faster and doesn\'t require opening a browser first.'],
            ['If search returns no results', 'Try rephrasing — use the artist\'s name, a lyric, or describe what you remember about it.'],
            ['View photos full screen', 'Tap any saved photo to view it full screen. Pinch to zoom in. Tap anywhere outside to close.'],
            ['Mic shows "No sound detected"', 'Move your phone closer to your mouth and try again.'],
          ].map(([tip, detail], i) => (
            <div key={i} className="bg-stone-900 border border-stone-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-stone-200 mb-1">💡 {tip}</p>
              <p className="text-sm text-stone-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Siri Shortcut */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-amber-400 mb-3 border-b border-stone-800 pb-2">Using Stash with Siri</h2>
        <p className="text-stone-300 text-sm leading-relaxed mb-4">
          You can set up a Siri Shortcut to open Stash instantly with your voice. Once set up, just say the phrase to Siri and Stash will open ready to use.
        </p>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-stone-200 mb-2">Setting up a Siri Shortcut (iPhone)</p>
          <ol className="space-y-1 text-sm text-stone-400 list-decimal list-inside">
            <li>Open the Shortcuts app on your iPhone</li>
            <li>Tap <strong className="text-stone-300">+</strong> in the top right to create a new shortcut</li>
            <li>Tap Add Action, search for <strong className="text-stone-300">&ldquo;Open URL&rdquo;</strong> and select it</li>
            <li>Enter <span className="text-amber-400 font-mono text-xs">memory-vault-qrbb.vercel.app</span> in the URL field</li>
            <li>Rename it to something easy to say, like <strong className="text-stone-300">&ldquo;Open Stash&rdquo;</strong></li>
            <li>Tap Done — now say &ldquo;Hey Siri, Open Stash&rdquo;</li>
          </ol>
        </div>
        <p className="text-stone-500 text-xs mt-2 px-1">Tip: Make sure Stash is added to your Home Screen first — the shortcut will then open the full-screen version.</p>
      </section>

      {/* Footer */}
      <div className="border-t border-stone-800 pt-6 text-center text-stone-500 text-xs space-y-1">
        <p>Questions or feedback? Use the 💬 Feedback button inside the app.</p>
        <p className="text-stone-700">memory-vault-qrbb.vercel.app</p>
      </div>

    </div>
  );
}
