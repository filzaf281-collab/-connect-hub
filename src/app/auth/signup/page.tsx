"use client";

import { supabase } from "../../../lib/supabase";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    // Let Supabase auth handle existence checks — no manual pre-check.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || email.split("@")[0] || "User" },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Supabase returns a user with an EMPTY identities array when the email
    // is already registered. Surface a friendly message instead of failing.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError("This email is already registered. Please sign in instead.");
      setLoading(false);
      return;
    }

    // If email confirmation is ON, there is no session yet.
    if (!data.session) {
      setNotice("Almost there! Check your email to confirm your account, then sign in.");
      setLoading(false);
      return;
    }

    // Email confirmation is OFF — create/update the profile, then go to chat.
    if (data.user) {
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email: data.user.email,
          full_name: fullName || data.user.email?.split("@")[0] || "User",
        },
        { onConflict: "id" }
      );
    }

    router.push("/chat");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md border border-border rounded-lg p-8 shadow-lg">
        <div className="flex justify-center mb-4">
          <MessageCircle size={40} className="text-[#00A884]" />
        </div>
        <h2 className="text-2xl font-bold text-center text-primary mb-1">Create your account</h2>
        <p className="text-center text-secondary text-sm mb-6">Join ConnectHub to start chatting</p>

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
            className="w-full bg-[#111111] hover:bg-black text-white font-medium py-3.5 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.99] transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? "Creating account..." : "Sign Up"}
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
