"use client";

import { useState } from "react";

const SLIDES = [
  {
    emoji: "🎞️",
    title: "Welcome to Stash",
    body: "Your personal vault for music, movies, and moments you never want to forget. No more \"what was that song?\" moments.",
    cta: "Next",
  },
  {
    emoji: "🎤",
    title: "Just speak it",
    body: "Tap the mic and describe what you're thinking of — \"that 80s Boston song with the guitar solo\" — and Stash finds it instantly.",
    cta: "Next",
  },
  {
    emoji: "💾",
    title: "Save anything",
    body: "Tap results to select them, then save as individual memories or group them into a playlist. Use the 📝 button to create checklists too.",
    cta: "Next",
  },
  {
    emoji: "🔒",
    title: "Your memories are safe",
    body: "Stash uses Firebase — the same security platform trusted by Google. Your data is encrypted, private, and never shared with anyone. Only you can see your memories.",
    cta: "Get Started",
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
      <div className="bg-stone-900 rounded-2xl p-8 w-full max-w-sm border border-stone-700 shadow-2xl">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === slide ? "w-6 bg-amber-400" : "w-2 bg-stone-600"
              }`}
            />
          ))}
        </div>

        {/* Emoji */}
        <div className="text-5xl text-center mb-4">{current.emoji}</div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-stone-100 text-center mb-3">
          {current.title}
        </h2>

        {/* Body */}
        <p className="text-stone-400 text-sm text-center leading-relaxed mb-8">
          {current.body}
        </p>

        {/* CTA */}
        <button
          onClick={advance}
          className="w-full bg-gradient-to-r from-amber-400 to-orange-400 text-white py-3 rounded-xl font-medium text-sm mb-3"
        >
          {current.cta}
        </button>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onDone}
            className="w-full text-stone-600 text-xs py-1 hover:text-stone-400 transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
