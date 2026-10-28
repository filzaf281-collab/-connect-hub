"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
  Download,
  FileQuestion,
} from "lucide-react";

export default function QuizResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  // Resolve params
  const resolvedParams = use(params as Promise<{ id: string }>);
  const quizId = resolvedParams.id;

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/teacher/quizzes/${quizId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.quiz) {
          setQuiz(data.quiz);
        }
      })
      .catch((err) => console.error("Error loading quiz results:", err))
      .finally(() => setLoading(false));
  }, [quizId]);

  const maxPoints =
    quiz?.questions?.reduce((sum: number, q: any) => sum + (q.points || 10), 0) || 0;

  const attempts = quiz?.attempts || [];
  const averageScore =
    attempts.length > 0
      ? (
          attempts.reduce((sum: number, a: any) => sum + a.score, 0) / attempts.length
        ).toFixed(1)
      : "0";

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
            href="/teacher/quizzes"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#00A884] dark:text-[#00C896] font-semibold text-xs md:text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Quizzes</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10" />
          <h1 className="font-bold text-sm md:text-base leading-tight truncate max-w-xs md:max-w-md">
            Quiz Results: {quiz?.title || "Loading..."}
          </h1>
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
        {loading ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs opacity-60">Loading results...</p>
          </div>
        ) : !quiz ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <FileQuestion size={40} className="mx-auto mb-2 opacity-30 text-emerald-500" />
            <h3 className="font-bold text-base">Quiz not found</h3>
          </div>
        ) : (
          <>
            {/* Header Card */}
            <div
              className={`p-6 rounded-2xl border shadow-sm ${
                dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {quiz.subject}
                    </span>
                    <span className="text-xs opacity-60">
                      {quiz.questions?.length || 0} Questions • Max {maxPoints} pts
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold">{quiz.title}</h2>
                  {quiz.description && (
                    <p className="text-xs md:text-sm opacity-70 mt-1 max-w-2xl">
                      {quiz.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5">
                    <p className="text-xs opacity-60">Total Attempts</p>
                    <p className="text-2xl font-extrabold text-[#00A884]">
                      {attempts.length}
                    </p>
                  </div>
                  <div className="text-center px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5">
                    <p className="text-xs opacity-60">Avg Score</p>
                    <p className="text-2xl font-extrabold text-blue-500">
                      {averageScore} / {maxPoints}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submissions / Attempts Table */}
            <div
              className={`rounded-2xl border shadow-sm overflow-hidden ${
                dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
              }`}
            >
              <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
                  <Users size={16} className="text-[#00A884]" />
                  <span>Student Submissions ({attempts.length})</span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-xs uppercase tracking-wider font-semibold ${
                        dark
                          ? "bg-[#111B21]/60 text-[#8696A0] border-[#2A3942]"
                          : "bg-[#F8F9FA] text-[#667781] border-[#E9EDEF]"
                      }`}
                    >
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Percentage</th>
                      <th className="py-3 px-4">Attempted At</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {attempts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center opacity-60">
                          No students have attempted this quiz yet.
                        </td>
                      </tr>
                    ) : (
                      attempts.map((att: any) => {
                        const pct =
                          maxPoints > 0 ? Math.round((att.score / maxPoints) * 100) : 0;
                        const isPassing = pct >= 60;

                        return (
                          <tr
                            key={att.id}
                            className="hover:bg-black/5 dark:hover:bg-white/5 transition"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                                  {(att.studentName || att.studentEmail || "S")
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold">{att.studentName || "Student"}</p>
                                  <p className="text-[11px] opacity-60">{att.studentEmail}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-bold text-sm">
                              {att.score} / {maxPoints}
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  isPassing
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-red-500/15 text-red-600 dark:text-red-400"
                                }`}
                              >
                                {pct}%
                              </span>
                            </td>

                            <td className="py-3.5 px-4 opacity-80 text-xs">
                              {new Date(att.createdAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setSelectedAttempt(att)}
                                className="px-3 py-1 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 text-xs font-semibold transition"
                              >
                                View Answers
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Answer Breakdown Modal */}
      {selectedAttempt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedAttempt(null)}
        >
          <div
            className={`w-full max-w-xl rounded-2xl p-6 shadow-2xl border max-h-[85vh] flex flex-col ${
              dark ? "bg-[#202C33] border-[#3B4A54]" : "bg-white border-[#E9EDEF]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div>
                <h3 className="font-bold text-base">
                  {selectedAttempt.studentName || "Student"}&apos;s Answers
                </h3>
                <p className="text-xs opacity-60">
                  Score: {selectedAttempt.score} / {maxPoints}
                </p>
              </div>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="px-3 py-1 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {quiz?.questions?.map((q: any, idx: number) => {
                const selectedOptIdx = selectedAttempt.answers?.[q.id];
                const isCorrect = selectedOptIdx === q.correctAnswer;

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-sm">
                        Q{idx + 1}: {q.text}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCorrect
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/20 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isCorrect ? `+${q.points || 10} pts` : "0 pts"}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      {q.options?.map((opt: string, optIdx: number) => {
                        const isStudentPick = selectedOptIdx === optIdx;
                        const isActuallyCorrect = q.correctAnswer === optIdx;

                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-lg flex items-center justify-between ${
                              isActuallyCorrect
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold"
                                : isStudentPick
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : "opacity-60"
                            }`}
                          >
                            <span>
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </span>
                            {isActuallyCorrect && (
                              <span className="text-[10px] uppercase font-bold text-emerald-600">
                                Correct Answer
                              </span>
                            )}
                            {isStudentPick && !isActuallyCorrect && (
                              <span className="text-[10px] uppercase font-bold text-red-600">
                                Student Pick
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
