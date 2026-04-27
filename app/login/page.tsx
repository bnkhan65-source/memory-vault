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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex justify-center items-center">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm text-center">
        
        <h1 className="text-2xl font-bold mb-2">
          Memory Vault
        </h1>

        <p className="text-gray-500 mb-6">
          Capture and store your moments
        </p>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}