"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-xl mx-auto">

        <button
          onClick={() => router.back()}
          className="text-sm text-slate-500 hover:text-slate-300 mb-6 flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-6 text-slate-300 text-sm leading-relaxed">

          <div>
            <h1 className="text-2xl font-semibold text-slate-100 mb-1">Privacy Policy</h1>
            <p className="text-slate-500 text-xs">Last updated: May 2026</p>
          </div>

          <p>
            Stash is a personal memory app that helps you find and save music, movies, and videos.
            This policy explains what information we collect, how we use it, and your rights regarding your data.
          </p>

          <section>
            <h2 className="text-slate-100 font-semibold mb-2">Information We Collect</h2>
            <ul className="space-y-2 text-slate-400">
              <li><span className="text-slate-200 font-medium">Account information</span> — your email address and authentication details when you create an account or sign in with Google.</li>
              <li><span className="text-slate-200 font-medium">Memories and lists</span> — the content you save in the app, including titles, notes, playlists, and checklists.</li>
              <li><span className="text-slate-200 font-medium">Voice recordings</span> — when you use the microphone feature, your audio is sent to OpenAI Whisper for transcription. Recordings are not stored after transcription is complete.</li>
              <li><span className="text-slate-200 font-medium">Feedback</span> — messages you voluntarily submit through the in-app feedback form.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-slate-100 font-semibold mb-2">How We Use Your Information</h2>
            <ul className="space-y-2 text-slate-400">
              <li>To provide and operate the Stash service.</li>
              <li>To save and retrieve your memories across devices.</li>
              <li>To process voice searches and identify what you are looking for.</li>
              <li>To manage your account.</li>
              <li>To respond to feedback and improve the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-slate-100 font-semibold mb-2">Third-Party Services</h2>
            <p className="text-slate-400 mb-2">Stash uses the following third-party services to function:</p>
            <ul className="space-y-2 text-slate-400">
              <li><span className="text-slate-200 font-medium">Firebase (Google)</span> — account authentication and data storage. <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">Privacy policy</a></li>
              <li><span className="text-slate-200 font-medium">OpenAI</span> — voice transcription and intent detection. Audio is processed but not retained. <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">Privacy policy</a></li>
              <li><span className="text-slate-200 font-medium">TMDB (The Movie Database)</span> — movie search results. <a href="https://www.themoviedb.org/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">Privacy policy</a></li>
              <li><span className="text-slate-200 font-medium">YouTube Data API</span> — video search results. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">Privacy policy</a></li>
              <li><span className="text-slate-200 font-medium">iTunes Search API (Apple)</span> — music search results. No personal data is shared with Apple.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-slate-100 font-semibold mb-2">Data Storage and Security</h2>
            <p className="text-slate-400">
              Your data is stored securely in Google Firebase, protected by Firebase security rules that ensure
              only you can access your own memories. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-slate-100 font-semibold mb-2">Your Rights</h2>
            <ul className="space-y-2 text-slate-400">
              <li>You can delete any memory at any time from within the app.</li>
              <li>You can request deletion of your entire account and all associated data by contacting us.</li>
              <li>You can withdraw consent for voice processing by simply not using the microphone feature.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-slate-100 font-semibold mb-2">Children</h2>
            <p className="text-slate-400">
              Stash is not directed at children under 13. We do not knowingly collect personal information
              from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-slate-100 font-semibold mb-2">Changes to This Policy</h2>
            <p className="text-slate-400">
              We may update this policy from time to time. Any changes will be posted on this page
              with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-slate-100 font-semibold mb-2">Contact</h2>
            <p className="text-slate-400">
              If you have any questions about this policy or your data, please contact us at{" "}
              <a href="mailto:bnkhan65@gmail.com" className="text-violet-400 underline">bnkhan65@gmail.com</a>.
            </p>
          </section>

        </div>

        <p className="text-center text-xs text-stone-700 mt-6">Stash &copy; 2026</p>

      </div>
    </div>
  );
}
