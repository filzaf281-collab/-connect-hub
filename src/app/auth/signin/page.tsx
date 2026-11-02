"use client";

import { supabase } from "../../../lib/supabase";
import { useState, useEffect } from "react";
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

  // Restore persistent session if login hasn't expired without showing login page
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const expiry = localStorage.getItem("loginExpiry");
      if (storedUser && expiry && Number(expiry) > Date.now()) {
        const parsed = JSON.parse(storedUser);
        const role = (parsed?.role || "").toUpperCase();
        if (role === "TEACHER") {
          router.replace("/teacher/dashboard");
        } else {
          router.replace("/student/dashboard");
        }
      }
    } catch {
      /* ignore */
    }
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Authenticate with Supabase Auth directly on client
      let sbUser: any = null;
      let sbErrorMsg = "";
      try {
        const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (sbErr) {
          sbErrorMsg = sbErr.message;
        } else {
          sbUser = sbData?.user;
        }
      } catch (sbEx: any) {
        sbErrorMsg = sbEx?.message || "";
      }

      // 2. Also authenticate with backend API to set HTTP-only cookie and JWT
      let apiUser: any = null;
      let apiToken: string = "";
      let apiErrorMsg = "";
      try {
        const apiRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const apiData = await apiRes.json();
        if (apiRes.ok && apiData.success) {
          apiUser = apiData.user;
          apiToken = apiData.token || "";
        } else {
          apiErrorMsg = apiData.error || "";
        }
      } catch (apiEx: any) {
        apiErrorMsg = apiEx?.message || "";
      }

      // If both failed, display error
      if (!sbUser && !apiUser) {
        setError(sbErrorMsg || apiErrorMsg || "Invalid login credentials. Please check your email and password.");
        setLoading(false);
        return;
      }

      // Determine authenticated user and role
      const effectiveUser = apiUser || {
        id: sbUser?.id,
        email: cleanEmail,
        name: sbUser?.user_metadata?.full_name || cleanEmail.split("@")[0],
        role: (sbUser?.user_metadata?.role || "student").toUpperCase(),
      };

      // Query profiles table for accurate role
      let userRole = (effectiveUser.role || "STUDENT").toUpperCase();
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, role, full_name")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (prof?.role) {
          userRole = prof.role.toLowerCase() === "teacher" ? "TEACHER" : "STUDENT";
          effectiveUser.role = userRole;
        } else if (effectiveUser.id) {
          await supabase.from("profiles").upsert(
            {
              id: effectiveUser.id,
              email: cleanEmail,
              full_name: effectiveUser.name || cleanEmail.split("@")[0],
              role: userRole === "TEACHER" ? "teacher" : "student",
            },
            { onConflict: "id" }
          );
        }
      } catch (profErr) {
        console.warn("[SignIn] Non-blocking profile check:", profErr);
      }

      console.log(`[SignIn] Logged in successfully: ${cleanEmail} (Role: ${userRole})`);

      // Persistent Login: Save to browser local persistence (30 days)
      try {
        localStorage.setItem("user", JSON.stringify(effectiveUser));
        if (apiToken) localStorage.setItem("token", apiToken);
        localStorage.setItem("loginExpiry", String(Date.now() + 30 * 24 * 60 * 60 * 1000));
      } catch (storageErr) {
        console.warn("[SignIn] Persistence warning:", storageErr);
      }

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#111B21] flex items-center justify-center p-4 selection:bg-[#00A884]/20 selection:text-[#00A884]">
      <div className="w-full max-w-md bg-white dark:bg-[#202C33] border border-gray-100 dark:border-[#2A3942] rounded-2xl p-8 sm:p-10 shadow-xl shadow-gray-200/50 dark:shadow-none">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#008069] to-[#00A884] text-white flex items-center justify-center shadow-lg shadow-[#00A884]/25">
            <MessageCircle size={26} />
          </div>
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-center text-[#00A884] mb-1">ConnectHub</h2>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center text-gray-900 dark:text-[#E9EDEF] mb-6">Welcome back</h1>

        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 text-red-600 dark:text-red-400 rounded-xl p-3.5 mb-5 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@connecthub.com"
              className="w-full px-4 py-3 border border-gray-200 dark:border-[#3B4A54] rounded-xl bg-gray-50/60 dark:bg-[#111B21] text-gray-900 dark:text-[#E9EDEF] focus:outline-none focus:ring-2 focus:ring-[#00A884] focus:border-transparent transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 dark:border-[#3B4A54] rounded-xl bg-gray-50/60 dark:bg-[#111B21] text-gray-900 dark:text-[#E9EDEF] focus:outline-none focus:ring-2 focus:ring-[#00A884] focus:border-transparent transition-all pr-11 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00A884] hover:bg-[#008F72] text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-[#00A884]/25 hover:shadow-lg hover:shadow-[#00A884]/35 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[#2A3942] text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-[#00A884] hover:underline font-bold">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
