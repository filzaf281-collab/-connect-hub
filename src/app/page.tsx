"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  MessageCircle,
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
  Award,
  Users,
  Bot,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#111B21] flex flex-col font-sans transition-colors selection:bg-[#00A884]/20 selection:text-[#00A884]">
      {/* Sticky Premium Navbar with Backdrop Blur */}
      <header className="sticky top-0 z-50 h-16 flex items-center justify-between px-4 sm:px-8 border-b border-gray-100 dark:border-[#2A3942]/70 bg-white/80 dark:bg-[#111B21]/80 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#008069] to-[#00A884] text-white flex items-center justify-center shadow-md shadow-[#00A884]/20">
            <MessageCircle size={20} />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-[#111B21] dark:text-[#E9EDEF]">
            Connect<span className="text-[#00A884]">Hub</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#111B21] dark:text-[#E9EDEF] hover:bg-gray-100 dark:hover:bg-white/10 transition-all hover:scale-105"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#00A884] hover:bg-[#008F72] text-white shadow-md shadow-[#00A884]/25 hover:shadow-lg hover:shadow-[#00A884]/35 hover:scale-105 active:scale-95 transition-all"
          >
            Sign Up Free
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {mounted && (theme === "light" ? <Moon size={18} /> : <Sun size={18} />)}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-[#00A884]/10 to-emerald-400/10 blur-3xl pointer-events-none rounded-full" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            {/* Announcement Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-[#008069] dark:text-emerald-400 text-xs sm:text-sm font-semibold mb-8 shadow-xs">
              <Sparkles size={14} className="text-[#00A884]" />
              <span>Next-Gen Collaborative Learning & Real-Time Chat</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.12] mb-6">
              Connect, Learn & Grow <br className="hidden sm:inline" />
              with <span className="text-[#00A884]">ConnectHub</span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-2xl mx-auto text-base sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-10">
              The all-in-one educational platform engineered for real-time discussions, voice messaging, instant quizzes, AI client simulations, and verified skill portfolios.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto sm:max-w-none">
              <Link
                href="/auth/signin"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#00A884] hover:bg-[#008F72] text-white font-bold text-base px-8 py-4 shadow-lg shadow-[#00A884]/30 hover:shadow-xl hover:shadow-[#00A884]/40 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <span>Start Chatting - Login</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-white dark:bg-[#202C33] border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-[#00A884] hover:text-[#00A884] hover:scale-105 font-semibold text-base px-8 py-4 shadow-xs transition-all duration-200"
              >
                <span>Create Free Account</span>
              </Link>
            </div>

            {/* Quick Proof Badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#00A884]" />
                <span>30-Day Stay Logged In</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#00A884]" />
                <span>Zero Setup Needed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#00A884]" />
                <span>100% Free For Students</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Everything You Need to Excel
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              Designed with enterprise grade reliability and tailored for modern teachers and students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl border border-gray-100 dark:border-[#2A3942] bg-white dark:bg-[#202C33] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-[#00A884] flex items-center justify-center mb-4">
                  <MessageCircle size={24} />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                  Real-Time Chat & Audio
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  WhatsApp-style instant messaging, real voice audio recorder, and media sharing built for smooth collaboration.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl border border-gray-100 dark:border-[#2A3942] bg-white dark:bg-[#202C33] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center mb-4">
                  <Award size={24} />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                  Interactive Quizzes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Take tests, verify your answers in real time, and earn skill badges with rigorous attempt limits and score analytics.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl border border-gray-100 dark:border-[#2A3942] bg-white dark:bg-[#202C33] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                  <Bot size={24} />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                  AI Client Simulator
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Practice freelancing with an interactive AI client, negotiate budgets, answer project inquiries, and build confidence.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl border border-gray-100 dark:border-[#2A3942] bg-white dark:bg-[#202C33] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                  1-Click Live Portfolio
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Publish a shareable public portfolio page instantly upon scoring 60%+ to show clients on WhatsApp & LinkedIn.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Centered Footer */}
      <footer className="py-10 px-4 sm:px-6 bg-gray-50 dark:bg-[#0c1317] border-t border-gray-100 dark:border-[#2A3942]/60 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-[#00A884]" />
            <span className="font-bold text-gray-900 dark:text-white">ConnectHub</span>
            <span>&mdash; Modern Education & Real-Time Collaboration</span>
          </div>
          <p>&copy; {new Date().getFullYear()} ConnectHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
