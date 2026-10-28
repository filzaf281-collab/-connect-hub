"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  Sun,
  Moon,
  Search,
  FileQuestion,
} from "lucide-react";

export default function StudentQuizzesPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const dark = theme === "dark";

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    fetch("/api/student/quizzes")
      .then((res) => res.json())
      .then((data) => {
        if (data.quizzes) {
          setQuizzes(data.quizzes);
        }
      })
      .catch((err) => console.error("Error loading quizzes:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        dark ? "bg-[#111B21] text-[#E9EDEF]" : "bg-[#F0F2F5] text-[#111B21]"
      }`}
    >
      {/* Top Navbar */}
      <header
        className={`h-16 px-4 md:px-8 border-b flex items-center justify-between sticky top-0 z-30 shadow-sm backdrop-blur-md ${
          dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
        }`}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/student/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#00A884] dark:text-[#00C896] font-semibold text-xs md:text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Dashboard</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10" />
          <h1 className="font-bold text-sm md:text-base leading-tight">Available Quizzes</h1>
        </div>

        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          className={`p-2 rounded-xl border transition-colors ${
            dark
              ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
              : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
          }`}
          aria-label="Toggle theme"
        >
          {dark ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner */}
        <div
          className={`p-6 md:p-8 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
          }`}
        >
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Test Your Knowledge 🎓
            </h2>
            <p className="text-xs md:text-sm opacity-70 mt-1 max-w-xl">
              Choose an active quiz published by your teacher. Answer questions one by one and get immediate scoring and review.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search
              size={14}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                dark ? "text-[#8696A0]" : "text-gray-400"
              }`}
            />
            <input
              type="text"
              placeholder="Search by topic or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs md:text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 ${
                dark
                  ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                  : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
              }`}
            />
          </div>
        </div>

        {/* Quizzes Grid */}
        {loading ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs opacity-60">Loading published quizzes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <BookOpen size={40} className="mx-auto mb-3 opacity-30 text-emerald-500" />
            <h4 className="font-bold text-base mb-1">No quizzes available</h4>
            <p className="text-xs opacity-60">
              No published quizzes matched your search. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((quiz) => {
              const qCount = quiz.questions?.length || 0;
              const pointsTotal =
                quiz.questions?.reduce((s: number, q: any) => s + (q.points || 10), 0) || 0;

              return (
                <div
                  key={quiz.id}
                  className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between transition hover:shadow-md ${
                    dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        {quiz.subject}
                      </span>
                      <span className="text-xs opacity-60">
                        {qCount} Questions • {pointsTotal} pts
                      </span>
                    </div>

                    <h3 className="font-bold text-base mb-1.5">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-xs opacity-70 line-clamp-3 mb-4 leading-relaxed">
                        {quiz.description}
                      </p>
                    )}

                    <div className="space-y-1.5 text-xs opacity-70 pt-2 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-1.5">
                        <FileQuestion size={13} className="text-[#00A884]" />
                        <span>Teacher: {quiz.teacherName || "Instructor"}</span>
                      </div>

                      {quiz.dueDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="opacity-50" />
                          <span>Due: {new Date(quiz.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-black/5 dark:border-white/5">
                    <Link
                      href={`/student/quizzes/${quiz.id}`}
                      className="w-full py-2.5 rounded-xl font-semibold text-xs md:text-sm bg-gradient-to-r from-[#008069] to-[#00A884] text-white shadow-sm hover:opacity-95 transition flex items-center justify-center gap-2 active:scale-95 text-center"
                    >
                      <Award size={15} />
                      <span>Start Quiz</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
