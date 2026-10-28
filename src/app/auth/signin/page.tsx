"use client";

import { supabase } from "../../../lib/supabase";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Authenticate with NextAuth / backend DB API
      const apiRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const apiData = await apiRes.json();

      // Also sign in to Supabase in background for realtime chat
      supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      }).catch((sbErr) => {
        console.warn("[SignIn] Supabase background sync note:", sbErr?.message);
      });

      if (!apiRes.ok || !apiData.success) {
        // If API returned invalid credentials, also check Supabase auth
        const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (sbError && !apiData.success) {
          console.log("[SignIn] Invalid credentials:", apiData.error || sbError.message);
          setError(apiData.error || "Invalid login credentials");
          setLoading(false);
          return;
        }

        // Supabase succeeded, determine role
        const role =
          cleanEmail.includes("teacher") || cleanEmail.includes("filzaf281")
            ? "TEACHER"
            : "STUDENT";

        if (role === "TEACHER") {
          router.push("/teacher/dashboard");
        } else {
          router.push("/student/dashboard");
        }
        router.refresh();
        return;
      }

      // API login succeeded! Check role
      const userRole = (apiData.user?.role || "").toUpperCase();
      console.log(`[SignIn] Logged in successfully: ${cleanEmail} (Role: ${userRole})`);

      if (userRole === "TEACHER") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      console.error("[SignIn] Exception:", err?.message);
      setError(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md border border-border rounded-lg p-8 shadow-lg">
        <div className="flex justify-center mb-4">
          <MessageCircle size={40} className="text-[#00A884]" />
        </div>
        <h2 className="text-2xl font-bold text-center text-primary mb-1">ConnectHub</h2>
        <h1 className="text-3xl font-extrabold text-center text-primary mb-6">Welcome back.</h1>

        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 text-red-600 dark:text-red-400 rounded p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-secondary">Email Address</label>
            <input
              type="text"
              placeholder="you@email.com or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground transition hover:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-secondary">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-input border border-border rounded-xl px-4 py-3 pr-12 text-foreground transition hover:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-secondary hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111111] hover:bg-black text-white font-medium py-3.5 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.99] transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-secondary mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="font-medium text-[#00A884] hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
