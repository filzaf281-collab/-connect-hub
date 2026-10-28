"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  GraduationCap,
  BookOpen,
  FileText,
  MessageCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sun,
  Moon,
  LogOut,
  Award,
} from "lucide-react";

export default function StudentDashboard() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const dark = theme === "dark";

  const [user, setUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          if (data.user.role === "TEACHER") {
            router.push("/teacher/dashboard");
            return;
          }
          setUser(data.user);
        }
      })
      .catch(() => {});

    // Fetch published quizzes
    fetch("/api/student/quizzes")
      .then((res) => res.json())
      .then((data) => {
        if (data?.quizzes) {
          setQuizzes(data.quizzes);
        }
      })
      .catch((err) => console.error("Error fetching quizzes:", err))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/signin");
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "Student";

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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#008069] to-[#00A884] text-white flex items-center justify-center shadow-md">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-base leading-tight flex items-center gap-2">
              <span>Student Dashboard</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Student
              </span>
            </h1>
            <p className="text-[11px] opacity-60 hidden sm:block">
              ConnectHub Interactive Learning Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/student/quizzes"
            className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-semibold border transition flex items-center gap-1.5 ${
              dark
                ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
            }`}
          >
            <Award size={15} className="text-[#00A884]" />
            <span>Quizzes</span>
          </Link>

          <Link
            href="/chat"
            className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-semibold border transition flex items-center gap-1.5 ${
              dark
                ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
            }`}
          >
            <MessageCircle size={15} className="text-[#00A884]" />
            <span>Chat</span>
          </Link>

          {/* Theme toggle */}
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

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner with Greeting */}
        <div
          className={`p-6 md:p-8 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
          }`}
        >
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Welcome back, {displayName}! 👋
            </h2>
            <p className="text-xs md:text-sm opacity-70 mt-1 max-w-xl">
              Access your online quizzes, submit class assignments, and collaborate in real-time with your classmates and teachers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/student/quizzes"
              className="px-4 py-2.5 rounded-xl font-semibold text-xs md:text-sm bg-gradient-to-r from-[#008069] to-[#00A884] text-white shadow-md hover:opacity-95 transition flex items-center gap-2"
            >
              <Award size={16} />
              <span>Browse Quizzes</span>
            </Link>

            <Link
              href="/assignments"
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs md:text-sm border transition flex items-center gap-2 ${
                dark
                  ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                  : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
              }`}
            >
              <FileText size={16} />
              <span>Assignments</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className={`p-5 rounded-2xl border shadow-sm ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Available Quizzes
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <BookOpen size={18} />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#00A884]">{quizzes.length}</p>
            <span className="text-[11px] opacity-60 mt-1 block">Ready for you to attempt</span>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Classroom Connect
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                <MessageCircle size={18} />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-teal-500">Live</p>
            <span className="text-[11px] opacity-60 mt-1 block">WhatsApp web clone chat active</span>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Assignment Hub
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <FileText size={18} />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-blue-500">Auto</p>
            <span className="text-[11px] opacity-60 mt-1 block">Submissions with AI summaries</span>
          </div>
        </div>

        {/* Quizzes Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
              <Award size={18} className="text-[#00A884]" />
              <span>Available Quizzes</span>
            </h3>
            <Link
              href="/student/quizzes"
              className="text-xs font-semibold text-[#00A884] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div
              className={`p-8 text-center rounded-2xl border ${
                dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
              }`}
            >
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs opacity-60">Loading your quizzes...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div
              className={`p-8 text-center rounded-2xl border ${
                dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
              }`}
            >
              <BookOpen size={36} className="mx-auto mb-2 opacity-30 text-emerald-500" />
              <p className="font-bold text-sm">No quizzes published yet</p>
              <p className="text-xs opacity-60 mt-1">
                Check back soon when your teacher publishes new quizzes!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => (
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
                      <span className="text-[11px] opacity-60">
                        {quiz.questions?.length || 0} Questions
                      </span>
                    </div>

                    <h4 className="font-bold text-base line-clamp-1 mb-1">{quiz.title}</h4>
                    {quiz.description && (
                      <p className="text-xs opacity-70 line-clamp-2 mb-4 leading-relaxed">
                        {quiz.description}
                      </p>
                    )}

                    {quiz.dueDate && (
                      <p className="text-xs opacity-60 flex items-center gap-1 mb-3">
                        <Clock size={12} />
                        <span>Due: {new Date(quiz.dueDate).toLocaleDateString()}</span>
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/student/quizzes/${quiz.id}`}
                    className="w-full py-2.5 rounded-xl text-center font-semibold text-xs bg-[#00A884] hover:bg-[#008F72] text-white shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>Attempt Quiz</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
