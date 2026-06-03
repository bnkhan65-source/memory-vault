"use client";

import { useState } from "react";

const SLIDES = [
  {
    emoji: "👋",
    title: "Welcome to Stash!",
    body: "Stash helps you save music, movies, and videos so you never forget them. Let's show you how it works — it only takes a minute.",
    tip: null,
    cta: "Let's go →",
  },
  {
    emoji: "🎤",
    title: "Step 1 — Speak what's on your mind",
    body: "Tap the Speak button and say something like:\n\"that 80s song with the saxophone\"\nor\n\"movies with Meryl Streep\"",
    tip: "Stash listens, figures out if it's music or a movie, and searches automatically.",
    cta: "Next →",
  },
  {
    emoji: "👆",
    title: "Step 2 — Tap a result to select it",
    body: "After Stash searches, you'll see results below. Tap any result to select it — a checkmark ✓ will appear on it.",
    tip: "You can select multiple things at once before saving.",
    cta: "Next →",
  },
  {
    emoji: "🎒",
    title: "Step 3 — Save your selection",
    body: "When you select something, a bag icon 🎒 appears at the bottom of the screen. Tap it to review your selections, then tap Save.",
    tip: "You can save items individually or group them together as a playlist.",
    cta: "Next →",
  },
  {
    emoji: "📋",
    title: "Step 4 — Find your saved memories",
    body: "Everything you save appears below the search area. Tap any card to expand it and open your saved music or movie.",
    tip: "Use the search bar to find a specific memory quickly.",
    cta: "Next →",
  },
  {
    emoji: "📝",
    title: "Bonus — Create lists",
    body: "Tap the List button to create a checklist — great for grocery lists, to-do lists, or anything else you want to remember.",
    tip: "You can add items to a list at any time, and check them off as you go.",
    cta: "Next →",
  },
  {
    emoji: "✅",
    title: "You're all set!",
    body: "Tap the ? button in the header any time you want to see these steps again.",
    tip: null,
    cta: "Start using Stash",
  },
];

type Props = {
  onDone: () => void;
};

export default function OnboardingModal({ onDone }: Props) {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  const advance = () => {
    if (isLast) {
      onDone();
    } else {
      setSlide(slide + 1);
    }
  };

  const goBack = () => {
    if (slide > 0) setSlide(slide - 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
      <div className="bg-slate-900 rounded-2xl p-8 w-full max-w-sm border border-slate-700 shadow-2xl">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === slide ? "w-8 bg-violet-500" : i < slide ? "w-2 bg-violet-700" : "w-2 bg-slate-600"
              }`}
            />
          ))}
        </div>

        {/* Emoji */}
        <div className="text-6xl text-center mb-5">{current.emoji}</div>

        {/* Title */}
        <h2 className="text-xl font-bold text-slate-100 text-center mb-4 leading-snug">
          {current.title}
        </h2>

        {/* Body */}
        <p className="text-slate-300 text-base text-center leading-relaxed mb-4 whitespace-pre-line">
          {current.body}
        </p>

        {/* Tip */}
        {current.tip && (
          <div className="bg-violet-950/50 border border-violet-800/40 rounded-xl px-4 py-3 mb-5">
            <p className="text-violet-300 text-sm text-center leading-relaxed">
              💡 {current.tip}
            </p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={advance}
          className="w-full bg-gradient-to-r from-violet-500 to-orange-400 text-white py-4 rounded-xl font-semibold text-base mb-3"
        >
          {current.cta}
        </button>

        {/* Back + Skip row */}
        <div className="flex justify-between items-center">
          {slide > 0 ? (
            <button
              onClick={goBack}
              className="text-slate-500 text-sm py-1 hover:text-slate-300 transition-colors"
            >
              ← Back
            </button>
          ) : <span />}

          {!isLast && (
            <button
              onClick={onDone}
              className="text-stone-600 text-sm py-1 hover:text-slate-400 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
