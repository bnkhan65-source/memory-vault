"use client";

import { useState, useEffect } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      if (!user.emailVerified && user.providerData[0]?.providerId === "password") {
        router.push("/verify");
      } else {
        router.push("/");
      }
    });
    return () => unsub();
  }, [router]);

  const friendlyError = (code: string): string => {
    switch (code) {
      case "auth/invalid-email":          return "That email address doesn't look right.";
      case "auth/user-not-found":         return "No account found with that email.";
      case "auth/wrong-password":         return "Incorrect password — try again.";
      case "auth/email-already-in-use":   return "An account with that email already exists. Try signing in.";
      case "auth/weak-password":          return "Password must be at least 6 characters.";
      case "auth/too-many-requests":      return "Too many attempts — wait a moment and try again.";
      case "auth/invalid-credential":     return "Incorrect email or password.";
      default:                            return "Something went wrong — please try again.";
    }
  };

  const handleEmailAuth = async () => {
    setError(null);
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    if (mode === "signup" && password !== confirm) { setError("Passwords don't match."); return; }
    if (mode === "signup" && password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(credential.user);
        router.push("/verify");
        return;
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      router.push("/");
    } catch (e: unknown) {
      const code = (e as { code?: string }).code || "";
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  };

  const isChromeIOS = () => {
    if (typeof navigator === "undefined") return false;
    return /CriOS/.test(navigator.userAgent);
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      if (isChromeIOS()) {
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } else {
        await signInWithPopup(auth, new GoogleAuthProvider());
        router.push("/");
      }
    } catch (e: unknown) {
      const code = (e as { code?: string }).code || "";
      setError(friendlyError(code));
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    if (!email.trim()) { setError("Enter your email above first."); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code || "";
      setError(friendlyError(code));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center px-4">
      <div className="bg-slate-900 shadow-xl rounded-2xl p-8 w-full max-w-sm border border-slate-700">

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎞️</div>
          <h1 className="text-3xl font-semibold text-slate-100 tracking-wide">Stash</h1>
          <p className="text-slate-500 mt-1 italic text-sm">Your memories, all in one place</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-slate-800 rounded-xl p-1 mb-5">
          <button
            onClick={() => { setMode("signin"); setError(null); setResetSent(false); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === "signin" ? "bg-violet-500 text-stone-900" : "text-slate-400"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(null); setResetSent(false); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === "signup" ? "bg-violet-500 text-stone-900" : "text-slate-400"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoCapitalize="none"
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 placeholder-stone-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => { if (e.key === "Enter") handleEmailAuth(); }}
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 placeholder-stone-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
          />
          {mode === "signup" && (
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              onKeyDown={(e) => { if (e.key === "Enter") handleEmailAuth(); }}
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 placeholder-stone-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
            />
          )}
        </div>

        {/* Forgot password */}
        {mode === "signin" && (
          <div className="text-right mb-4">
            {resetSent ? (
              <p className="text-xs text-green-400">Reset email sent — check your inbox.</p>
            ) : (
              <button
                onClick={handleForgotPassword}
                className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 mb-3 text-center">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleEmailAuth}
          disabled={loading}
          className="w-full bg-gradient-to-r from-violet-400 to-orange-400 text-white py-3 rounded-xl font-medium text-sm mb-4 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-xs text-slate-600">or</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full bg-slate-800 border border-slate-600 text-slate-300 py-3 rounded-xl text-sm font-medium hover:border-stone-400 transition-colors"
        >
          Continue with Google
        </button>

        <p className="text-center text-xs text-slate-600 mt-5">
          By signing in you agree to our{" "}
          <a href="/privacy" className="text-slate-500 underline hover:text-slate-300 transition-colors">
            Privacy Policy
          </a>
        </p>

      </div>
    </div>
  );
}
