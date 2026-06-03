"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  sendEmailVerification,
  reload,
  signOut,
} from "firebase/auth";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      // Google users are always verified — send them straight to the app
      if (user.emailVerified) {
        router.push("/");
        return;
      }
      setEmail(user.email);
    });
    return () => unsub();
  }, [router]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    setError(null);
    const user = auth.currentUser;
    if (!user) return;
    try {
      await sendEmailVerification(user);
      setResent(true);
      setCooldown(30);
    } catch {
      setError("Couldn't send the email — try again in a moment.");
    }
  };

  const handleCheck = async () => {
    setError(null);
    setChecking(true);
    const user = auth.currentUser;
    if (!user) { router.push("/login"); return; }
    try {
      await reload(user);
      if (user.emailVerified) {
        router.push("/");
      } else {
        setError("Email not verified yet — check your inbox and click the link.");
      }
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center px-4">
      <div className="bg-slate-900 shadow-xl rounded-2xl p-8 w-full max-w-sm border border-slate-700 text-center">

        <div className="text-5xl mb-4">📬</div>
        <h1 className="text-xl font-semibold text-slate-100 mb-2">Check your email</h1>
        <p className="text-slate-400 text-sm mb-1">
          We sent a verification link to:
        </p>
        <p className="text-violet-400 text-sm font-medium mb-6 break-all">
          {email ?? "your email address"}
        </p>

        <p className="text-slate-500 text-xs mb-8">
          Click the link in the email to verify your account, then come back here.
        </p>

        {/* Continue button */}
        <button
          onClick={handleCheck}
          disabled={checking}
          className="w-full bg-gradient-to-r from-violet-400 to-orange-400 text-white py-3 rounded-xl font-medium text-sm mb-3 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {checking ? "Checking…" : "I've verified — continue"}
        </button>

        {/* Resend */}
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="w-full bg-slate-800 border border-slate-600 text-slate-300 py-3 rounded-xl text-sm font-medium hover:border-stone-400 transition-colors mb-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Resend email (${cooldown}s)` : resent ? "Resend email" : "Resend email"}
        </button>

        {resent && cooldown > 0 && (
          <p className="text-xs text-green-400 mb-3">Email sent — check your inbox.</p>
        )}

        {error && (
          <p className="text-xs text-red-400 mb-3">{error}</p>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors mt-2"
        >
          Use a different email → sign out
        </button>

      </div>
    </div>
  );
}
