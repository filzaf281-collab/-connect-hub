"use client";

import { supabase } from "../../../lib/supabase";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, GraduationCap, User } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    const cleanEmail = email.trim().toLowerCase();
    const upperRole = role.toUpperCase(); // 'TEACHER' or 'STUDENT'

    try {
      // 1. Call backend NextAuth / Prisma DB signup API
      const apiRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          name: fullName || cleanEmail.split("@")[0] || "User",
          role: upperRole,
        }),
      });

      const apiData = await apiRes.json();

      if (!apiRes.ok && apiRes.status !== 409) {
        console.warn("[SignUp] API signup error:", apiData.error);
      }

      // 2. Also register in Supabase in background for realtime chat
      supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName || cleanEmail.split("@")[0] || "User",
            role: role,
          },
        },
      }).then(({ data: sbData }) => {
        if (sbData?.user) {
          supabase.from("profiles").upsert(
            {
              id: sbData.user.id,
              email: sbData.user.email,
              full_name: fullName || cleanEmail.split("@")[0] || "User",
              role: role,
              is_teacher: role === "teacher",
            },
            { onConflict: "id" }
          ).then(() => {}, () => {});
        }
      }).catch((sbErr) => {
        console.warn("[SignUp] Supabase background note:", sbErr?.message);
      });

      if (!apiRes.ok && !apiData.success && apiRes.status !== 409) {
        setError(apiData.error || "Failed to create account");
        setLoading(false);
        return;
      }

      // 3. Redirect strictly based on Role:
      // TEACHER -> /teacher/dashboard
      // STUDENT -> /student/dashboard
      console.log(`[SignUp] Success for ${cleanEmail}! Redirecting based on role: ${upperRole}`);
      if (role === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      console.error("[SignUp] Exception:", err);
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
        <h2 className="text-2xl font-bold text-center text-primary mb-1">Create your account</h2>
        <p className="text-center text-secondary text-sm mb-6">Join ConnectHub to start learning & chatting</p>

        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 text-red-600 dark:text-red-400 rounded p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {notice && (
          <div className="bg-green-500/10 border-l-4 border-green-500 text-green-600 dark:text-green-400 rounded p-3 mb-4 text-sm">
            {notice}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-secondary">I am a</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-medium text-sm transition-all ${
                  role === "student"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                    : "border-border text-secondary hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <User size={16} />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-medium text-sm transition-all ${
                  role === "teacher"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                    : "border-border text-secondary hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <GraduationCap size={16} />
                <span>Teacher</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-secondary">Full Name</label>
            <input
              placeholder="Your Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground transition hover:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-secondary">Email Address</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground transition hover:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-secondary">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground transition hover:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
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
                Creating account...
              </>
            ) : (
              `Sign Up as ${role.charAt(0).toUpperCase() + role.slice(1)}`
            )}
          </button>
        </form>

        <p className="text-center text-sm text-secondary mt-6">
          Already have an account?{" "}
          <Link href="/auth/signin" className="font-medium text-[#00A884] hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
