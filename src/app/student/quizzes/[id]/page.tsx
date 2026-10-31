"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SkillEarningModal from "@/components/SkillEarningModal";
import CreatePortfolioButton from "@/components/CreatePortfolioButton";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Award,
  Sun,
  Moon,
  Clock,
  Sparkles,
  RotateCcw,
} from "lucide-react";

export default function AttemptQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  const resolvedParams = use(params as Promise<{ id: string }>);
  const quizId = resolvedParams.id;

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // answers: { [questionId: string]: selectedOptionIndex }
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showEarning, setShowEarning] = useState(false);

  useEffect(() => {
    fetch(`/api/student/quizzes/${quizId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.quiz) {
          setQuiz(data.quiz);
        }
      })
      .catch((err) => console.error("Error loading quiz:", err))
      .finally(() => setLoading(false));
  }, [quizId]);

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const score = result ? Math.round((result.totalScore / (result.maxScore || 1)) * 100) : 0;
  const progressPercent =
    totalQuestions > 0 ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0;

  const handleSelectOption = (optIdx: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optIdx,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    // Check if any questions unanswered
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < totalQuestions) {
      const confirmSubmit = confirm(
        `You have answered ${answeredCount} of ${totalQuestions} questions. Do you want to submit anyway?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/student/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit attempt");
      }

      setResult(data);
    } catch (err: any) {
      console.error("Error submitting attempt:", err);
      alert(err?.message || "Failed to submit quiz attempt");
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setResult(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] dark:bg-[#111B21] text-[#111B21] dark:text-[#E9EDEF]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium opacity-70">Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] dark:bg-[#111B21] p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#202C33] border border-[#2A3942] text-center space-y-4">
          <h2 className="text-xl font-bold">Quiz Not Found</h2>
          <p className="text-xs opacity-70">This quiz does not exist or has no questions available.</p>
          <Link
            href="/student/quizzes"
            className="inline-block px-4 py-2 rounded-xl bg-[#00A884] text-white text-xs font-semibold"
          >
            Back to Quizzes
          </Link>
        </div>
      </div>
    );
  }

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
            href="/student/quizzes"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#00A884] dark:text-[#00C896] font-semibold text-xs md:text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Exit Quiz</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10" />
          <h1 className="font-bold text-sm md:text-base leading-tight truncate max-w-xs md:max-w-md">
            {quiz.title}
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

      {/* Main Area */}
      <main className="flex-1 p-4 md:p-8 max-w-3xl w-full mx-auto flex flex-col justify-center">
        {result ? (
          /* RESULT SCREEN */
          <div
            className={`p-6 md:p-10 rounded-3xl border shadow-xl text-center space-y-6 ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-[#00A884] flex items-center justify-center mx-auto shadow-inner">
              <Award size={36} />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Quiz Completed
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold mt-3">
                {result.correctCount === result.totalCount
                  ? "Perfect Score! 🌟"
                  : result.correctCount >= Math.ceil(result.totalCount / 2)
                  ? "Great Job! 🎉"
                  : "Good Effort! 📚"}
              </h2>
              <p className="text-xs md:text-sm opacity-70 mt-1">
                You have completed &quot;{quiz.title}&quot;.
              </p>
            </div>

            {/* Score Pill */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto p-4 rounded-2xl bg-black/5 dark:bg-white/5">
              <div>
                <p className="text-[11px] opacity-60">Your Score</p>
                <p className="text-xl md:text-2xl font-extrabold text-[#00A884]">
                  {result.totalScore}
                </p>
              </div>
              <div>
                <p className="text-[11px] opacity-60">Correct Answers</p>
                <p className="text-xl md:text-2xl font-extrabold text-blue-500">
                  {result.correctCount} / {result.totalCount}
                </p>
              </div>
              <div>
                <p className="text-[11px] opacity-60">Percentage</p>
                <p className="text-xl md:text-2xl font-extrabold text-purple-500">
                  {score}%
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowEarning(true)}
              className="w-full max-w-md mx-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold shadow-md hover:opacity-95 transition"
            >
              💰 See My Earning Potential
            </button>

            {score >= 60 && (
              <CreatePortfolioButton
                score={score}
                skillName={quiz?.title || "Web Development"}
                studentName={result?.studentName || "Student"}
                userId={result?.studentId}
              />
            )}

            {/* Question Breakdown Review */}
            <div className="text-left space-y-3 pt-4 border-t border-black/10 dark:border-white/10">
              <p className="font-bold text-xs uppercase tracking-wider opacity-70">
                Question Review:
              </p>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {questions.map((q: any, idx: number) => {
                  const studentPick = answers[q.id];
                  const isCorrect = studentPick === q.correctAnswer;

                  return (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-xs flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold">
                          Q{idx + 1}: {q.text}
                        </p>
                        <p className="opacity-70 mt-0.5">
                          Your Answer:{" "}
                          <span className={isCorrect ? "text-emerald-500 font-semibold" : "text-red-500 font-semibold"}>
                            {studentPick !== undefined ? q.options[studentPick] : "None"}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-emerald-500 font-semibold mt-0.5">
                            Correct: {q.options[q.correctAnswer]}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 mt-0.5">
                        {isCorrect ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={handleRestart}
                className="px-4 py-2.5 rounded-xl border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Retake Quiz</span>
              </button>

              <Link
                href="/student/quizzes"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#008069] to-[#00A884] text-white text-xs font-semibold shadow-md hover:opacity-95 transition"
              >
                Back to All Quizzes
              </Link>
            </div>
          </div>
        ) : (
          /* ACTIVE QUESTION ATTEMPT */
          <div
            className={`p-6 md:p-8 rounded-3xl border shadow-xl space-y-6 ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            {/* Progress Bar & Counter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#00A884]">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="opacity-60">
                  {currentQuestion.points || 10} points
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#008069] to-[#00A884] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="py-2">
              <h2 className="text-lg md:text-xl font-bold leading-relaxed">
                {currentQuestion.text}
              </h2>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQuestion.options.map((opt: string, optIdx: number) => {
                const isSelected = answers[currentQuestion.id] === optIdx;

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                        : dark
                        ? "border-[#3B4A54] bg-[#111B21]/60 hover:bg-[#111B21]"
                        : "border-[#E9EDEF] bg-[#F0F2F5]/60 hover:bg-[#F0F2F5]"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                        isSelected
                          ? "bg-emerald-500 text-white"
                          : "bg-black/10 dark:bg-white/10 opacity-70"
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </div>

                    <span className="text-sm font-medium leading-relaxed flex-1">
                      {opt}
                    </span>

                    {isSelected && (
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons: Previous / Next / Submit */}
            <div className="flex items-center justify-between pt-6 border-t border-black/10 dark:border-white/10 gap-3">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2.5 rounded-xl border text-xs md:text-sm font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2.5">
                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl bg-[#00A884] hover:bg-[#008F72] text-white text-xs md:text-sm font-semibold shadow-md transition flex items-center gap-1.5 active:scale-95"
                  >
                    <span>Next Question</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs md:text-sm font-semibold shadow-md hover:opacity-95 transition flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                  >
                    <Sparkles size={16} />
                    <span>{submitting ? "Submitting..." : "Submit Quiz"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      {showEarning && (
        <SkillEarningModal
          quizResult={result}
          skillName={quiz?.title || 'General'}
          score={score}
          onClose={() => setShowEarning(false)}
        />
      )}
    </div>
  );
}
