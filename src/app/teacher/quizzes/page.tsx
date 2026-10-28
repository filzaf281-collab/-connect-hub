"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  GraduationCap,
  Plus,
  ArrowLeft,
  Calendar,
  FileQuestion,
  Users,
  Trash2,
  ExternalLink,
  Sun,
  Moon,
  Search,
  CheckCircle2,
} from "lucide-react";

export default function TeacherQuizzesPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const dark = theme === "dark";

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    setMounted(true);
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/quizzes");
      const data = await res.json();
      if (data.quizzes) {
        setQuizzes(data.quizzes);
      }
    } catch (err: any) {
      console.error("Error loading quizzes:", err);
      showToast("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete quiz "${title}"?`)) return;
    try {
      const res = await fetch(`/api/teacher/quizzes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
        showToast("Quiz deleted successfully");
      } else {
        showToast(data.error || "Failed to delete quiz");
      }
    } catch (err: any) {
      showToast("Error deleting quiz");
    }
  };

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
            href="/teacher/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#00A884] dark:text-[#00C896] font-semibold text-xs md:text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Teacher Dashboard</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#008069] to-[#00A884] text-white flex items-center justify-center shadow-md">
              <FileQuestion size={20} />
            </div>
            <div>
              <h1 className="font-bold text-sm md:text-base leading-tight">
                Teacher Quizzes
              </h1>
              <p className="text-[11px] opacity-60 hidden sm:block">
                Create & Monitor Interactive Quizzes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/teacher/quizzes/create"
            className="px-3.5 py-2 rounded-xl font-semibold text-xs md:text-sm bg-gradient-to-r from-[#008069] to-[#00A884] text-white shadow-md hover:opacity-95 transition flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Create Quiz</span>
          </Link>

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
        </div>
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
              Manage Your Classroom Quizzes
            </h2>
            <p className="text-xs md:text-sm opacity-70 mt-1 max-w-xl">
              Publish custom multiple-choice quizzes, set due dates and point values, and view student test results in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search
                size={14}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  dark ? "text-[#8696A0]" : "text-gray-400"
                }`}
              />
              <input
                type="text"
                placeholder="Search quizzes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs md:text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 ${
                  dark
                    ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                    : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                }`}
              />
            </div>

            <Link
              href="/teacher/quizzes/create"
              className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-[#00A884] hover:bg-[#008F72] text-white transition flex items-center gap-1.5 shrink-0"
            >
              <Plus size={16} />
              <span>New Quiz</span>
            </Link>
          </div>
        </div>

        {/* Quiz List */}
        {loading ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs opacity-60">Loading your quizzes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <FileQuestion size={44} className="mx-auto mb-3 opacity-30 text-emerald-500" />
            <h4 className="font-bold text-base mb-1">No quizzes found</h4>
            <p className="text-xs opacity-60 mb-4 max-w-sm mx-auto">
              Create your first multiple-choice quiz for students to take online.
            </p>
            <Link
              href="/teacher/quizzes/create"
              className="px-4 py-2 rounded-xl bg-[#00A884] text-white text-xs font-semibold hover:bg-[#008F72] transition inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Create Your First Quiz</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((quiz) => {
              const attemptCount = quiz.attempts?.length || 0;
              const questionCount = quiz.questions?.length || 0;

              return (
                <div
                  key={quiz.id}
                  className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition hover:shadow-md ${
                    dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        {quiz.subject}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        {quiz.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>

                    <h3 className="font-bold text-base line-clamp-1 mb-1">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-xs opacity-70 line-clamp-2 mb-3 leading-relaxed">
                        {quiz.description}
                      </p>
                    )}

                    <div className="space-y-1 text-xs opacity-70 pt-2 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <FileQuestion size={13} className="text-emerald-500" />
                          <span>{questionCount} Questions</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={13} className="text-blue-500" />
                          <span>{attemptCount} Attempts</span>
                        </span>
                      </div>

                      {quiz.dueDate && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <Calendar size={13} className="opacity-50" />
                          <span>Due: {new Date(quiz.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-black/5 dark:border-white/5">
                    <Link
                      href={`/teacher/quizzes/${quiz.id}/results`}
                      className="px-3.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={13} />
                      <span>View Results ({attemptCount})</span>
                    </Link>

                    <button
                      onClick={() => handleDelete(quiz.id, quiz.title)}
                      title="Delete Quiz"
                      className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Toast Notice */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111B21]/90 dark:bg-white/95 text-white dark:text-[#111B21] text-xs font-medium px-4 py-2.5 rounded-full shadow-2xl animate-fade-in flex items-center gap-2 border border-black/10 dark:border-white/10">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
