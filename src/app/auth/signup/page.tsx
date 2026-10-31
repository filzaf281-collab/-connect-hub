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

      // 2. Also register in Supabase for realtime chat session
      try {
        const { data: sbData } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName || cleanEmail.split("@")[0] || "User",
              role: role,
            },
          },
        });

        if (sbData?.user) {
          await supabase.from("profiles").upsert(
            {
              id: sbData.user.id,
              email: cleanEmail,
              full_name: fullName || cleanEmail.split("@")[0] || "User",
              role: role,
            },
            { onConflict: "id" }
          );
        }
      } catch (sbErr: any) {
        console.warn("[SignUp] Supabase background note:", sbErr?.message);
      }

      if (!apiRes.ok || !apiData.success) {
        setError(apiData.error || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // 3. Redirect strictly based on Role:
      // TEACHER -> /teacher/dashboard
      // STUDENT -> /student/dashboard
      console.log(`[SignUp] Success for ${cleanEmail}! Redirecting based on role: ${upperRole}`);
      if (role === "teacher" || upperRole === "TEACHER") {
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#111B21] flex items-center justify-center p-4 selection:bg-[#00A884]/20 selection:text-[#00A884]">
      <div className="w-full max-w-md bg-white dark:bg-[#202C33] border border-gray-100 dark:border-[#2A3942] rounded-2xl p-8 sm:p-10 shadow-xl shadow-gray-200/50 dark:shadow-none">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#008069] to-[#00A884] text-white flex items-center justify-center shadow-lg shadow-[#00A884]/25">
            <MessageCircle size={26} />
          </div>
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-center text-[#00A884] mb-1">ConnectHub</h2>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center text-gray-900 dark:text-[#E9EDEF] mb-2">Create an account</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">Join to start learning, quizzing & collaborating</p>

        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 text-red-600 dark:text-red-400 rounded-xl p-3.5 mb-5 text-sm font-medium">
            {error}
          </div>
        )}

        {notice && (
          <div className="bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-xl p-3.5 mb-5 text-sm font-medium">
            {notice}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all duration-200 ${
                  role === "student"
                    ? "border-[#00A884] bg-[#00A884]/10 text-[#008069] dark:text-[#00C896] ring-2 ring-[#00A884]/20 shadow-xs"
                    : "border-gray-200 dark:border-[#3B4A54] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <User size={16} />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all duration-200 ${
                  role === "teacher"
                    ? "border-[#00A884] bg-[#00A884]/10 text-[#008069] dark:text-[#00C896] ring-2 ring-[#00A884]/20 shadow-xs"
                    : "border-gray-200 dark:border-[#3B4A54] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <GraduationCap size={16} />
                <span>Teacher</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <input
              placeholder="Your Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 dark:border-[#3B4A54] rounded-xl bg-gray-50/60 dark:bg-[#111B21] text-gray-900 dark:text-[#E9EDEF] focus:outline-none focus:ring-2 focus:ring-[#00A884] focus:border-transparent transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 dark:border-[#3B4A54] rounded-xl bg-gray-50/60 dark:bg-[#111B21] text-gray-900 dark:text-[#E9EDEF] focus:outline-none focus:ring-2 focus:ring-[#00A884] focus:border-transparent transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              className="w-full px-4 py-3 border border-gray-200 dark:border-[#3B4A54] rounded-xl bg-gray-50/60 dark:bg-[#111B21] text-gray-900 dark:text-[#E9EDEF] focus:outline-none focus:ring-2 focus:ring-[#00A884] focus:border-transparent transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00A884] hover:bg-[#008F72] text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-[#00A884]/25 hover:shadow-lg hover:shadow-[#00A884]/35 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              `Sign Up as ${role.charAt(0).toUpperCase() + role.slice(1)}`
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[#2A3942] text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-[#00A884] hover:underline font-bold">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
