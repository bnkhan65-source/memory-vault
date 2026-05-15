"use client";

import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  // ✅ PUT IT HERE (inside component, before return)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.push("/");
    });

    return () => unsub();
  }, [router]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (e) {
      console.error(e);
      alert("Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex justify-center items-center">
      <div className="bg-stone-900 shadow-xl rounded-2xl p-8 w-full max-w-sm text-center border border-stone-700">

        <div className="text-4xl mb-3">🎞️</div>

        <h1 className="text-3xl font-semibold mb-2 text-stone-100 tracking-wide">
          Stash
        </h1>

        <p className="text-stone-500 mb-6 italic">
          Your memories, all in one place
        </p>

        <button
          onClick={handleLogin}
          className="w-full bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-105 text-white py-3 rounded-lg font-medium transition shadow-md"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}