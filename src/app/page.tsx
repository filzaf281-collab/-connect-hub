"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MessageCircle, Sun, Moon, ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.role === "TEACHER") {
          router.replace("/teacher/dashboard");
        } else if (data?.user?.role === "STUDENT") {
          router.replace("/student/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#111B21] flex flex-col">
      {/* Top bar */}
      <header className="h-[59px] flex items-center justify-between px-4 sm:px-6 border-b border-[#E9EDEF] dark:border-[#2A3942] bg-white dark:bg-[#202C33]">
        <div className="flex items-center gap-2">
          <MessageCircle size={24} className="text-[#00A884]" />
          <span className="text-lg font-bold text-[#111B21] dark:text-[#E9EDEF]">
            ConnectHub
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/signin"
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#111B21] dark:text-[#E9EDEF] hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Sign Up
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[#667781] dark:text-[#8696A0] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {mounted && (theme === "light" ? <Moon size={20} /> : <Sun size={20} />)}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#00A884]/10 dark:bg-[#00A884]/20 mb-6">
          <MessageCircle size={44} className="text-[#00A884]" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111B21] dark:text-[#E9EDEF] mb-4">
          Welcome to <span className="text-[#00A884]">ConnectHub</span>
        </h1>

        <p className="max-w-xl text-lg text-[#667781] dark:text-[#8696A0] mb-10">
          A professional real-time communication platform. Connect, chat, and
          collaborate instantly — built for Pakistani businesses and education.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-none">
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-lg px-10 py-4 shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Start Chatting - Login
            <ArrowRight size={20} />
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-500/60 text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 hover:border-brand-500 font-medium px-8 py-4 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Create Account
          </Link>
        </div>

        <p className="mt-10 text-sm text-[#667781] dark:text-[#8696A0]">
          Already have an account? Click <span className="font-medium text-[#00A884]">Login</span> above.
        </p>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-[#667781] dark:text-[#8696A0] border-t border-[#E9EDEF] dark:border-[#2A3942]">
        ConnectHub Web — Professional communication platform
      </footer>
    </div>
  );
}
