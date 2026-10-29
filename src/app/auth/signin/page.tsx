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

      // 1. Authenticate with backend API (checks local DB & Supabase Auth)
      const apiRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const apiData = await apiRes.json();

      // Also ensure client-side Supabase session is established for Realtime Chat
      try {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
      } catch (sbErr: any) {
        console.warn("[SignIn] Client Supabase sync notice:", sbErr?.message);
      }

      if (!apiRes.ok || !apiData.success) {
        setError(apiData.error || "Invalid login credentials");
        setLoading(false);
        return;
      }

      const userRole = (apiData.user?.role || "").toUpperCase();

      // Ensure profile row exists in Supabase profiles table without failing
      try {
        const { data: existingProf } = await supabase
          .from("profiles")
          .select("id, role")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (!existingProf && apiData.user?.id) {
          await supabase.from("profiles").upsert(
            {
              id: apiData.user.id,
              email: cleanEmail,
              full_name: apiData.user?.name || cleanEmail.split("@")[0],
              role: userRole === "TEACHER" ? "teacher" : "student",
            },
            { onConflict: "id" }
          );
        }
      } catch (profErr) {
        console.warn("[SignIn] Non-blocking profile check:", profErr);
      }

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
            <label className="block text-sm font-medium text-foreground mb-1">
              Email Address
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@connecthub.com"
              className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#00A884]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#00A884] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00A884] hover:bg-[#00A884]/90 text-white font-semibold py-2 rounded-md transition duration-200 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-[#00A884] hover:underline font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
