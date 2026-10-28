"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileQuestion,
  CheckCircle2,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";

interface QuestionFormItem {
  text: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

export default function CreateQuizPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [questions, setQuestions] = useState<QuestionFormItem[]>([
    {
      text: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      points: 10,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        text: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 10,
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionTextChange = (idx: number, val: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx].text = val;
      return copy;
    });
  };

  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[qIdx].options];
      opts[optIdx] = val;
      copy[qIdx].options = opts;
      return copy;
    });
  };

  const handleCorrectAnswerChange = (qIdx: number, optIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].correctAnswer = optIdx;
      return copy;
    });
  };

  const handlePointsChange = (qIdx: number, val: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].points = val;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !subject.trim()) {
      setError("Please fill in both Quiz Title and Subject.");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} is missing its question text.`);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j]?.trim()) {
          setError(`Question ${i + 1} must have all 4 options filled out.`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/teacher/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          description: description.trim() || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          isPublished: true,
          questions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create quiz");
      }

      router.push("/teacher/quizzes");
      router.refresh();
    } catch (err: any) {
      console.error("Error creating quiz:", err);
      setError(err?.message || "Failed to create quiz");
      setSubmitting(false);
    }
  };

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
            <span>All Quizzes</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10" />
          <h1 className="font-bold text-sm md:text-base leading-tight">Create New Quiz</h1>
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

      {/* Main Form */}
      <main className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs md:text-sm font-medium">
              {error}
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div
            className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <h2 className="font-bold text-base md:text-lg flex items-center gap-2">
              <FileQuestion size={18} className="text-[#00A884]" />
              <span>Quiz Details</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Systems & RPC Quiz"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 ${
                    dark
                      ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                      : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70">
                  Subject *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science, Math, Biology"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 ${
                    dark
                      ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                      : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70">
                Description & Instructions
              </label>
              <textarea
                rows={2}
                placeholder="Give students instructions, time expectations, or topic overview..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 ${
                  dark
                    ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                    : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70">
                Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full md:w-80 px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 ${
                  dark
                    ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                    : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                }`}
              />
            </div>
          </div>

          {/* Section 2: Dynamic Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base md:text-lg flex items-center gap-2">
                <Sparkles size={18} className="text-[#00A884]" />
                <span>Questions ({questions.length})</span>
              </h2>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus size={14} />
                <span>Add Question</span>
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className={`p-6 rounded-2xl border shadow-sm space-y-4 relative ${
                  dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#00A884]">
                    Question #{qIdx + 1}
                  </span>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs opacity-70">
                      <span>Points:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={q.points}
                        onChange={(e) =>
                          handlePointsChange(qIdx, parseInt(e.target.value) || 10)
                        }
                        className={`w-16 px-2 py-1 rounded-lg text-xs border ${
                          dark
                            ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                            : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                        }`}
                      />
                    </div>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition"
                        title="Remove question"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70">
                    Question Text *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter question prompt..."
                    value={q.text}
                    onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 ${
                      dark
                        ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                        : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                    }`}
                  />
                </div>

                {/* Options with Radio for Correct Answer */}
                <div className="space-y-2.5 pt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider opacity-70">
                    Options (Select radio for the correct answer)
                  </label>

                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                        q.correctAnswer === optIdx
                          ? "border-emerald-500 bg-emerald-500/10"
                          : dark
                          ? "border-[#3B4A54] bg-[#111B21]/50"
                          : "border-[#E9EDEF] bg-[#F0F2F5]/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`correct-answer-${qIdx}`}
                        checked={q.correctAnswer === optIdx}
                        onChange={() => handleCorrectAnswerChange(qIdx, optIdx)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Mark as correct answer"
                      />

                      <span className="text-xs font-bold opacity-60 w-5">
                        {String.fromCharCode(65 + optIdx)}.
                      </span>

                      <input
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                        required
                        className={`flex-1 px-3 py-1.5 rounded-lg text-xs md:text-sm border focus:outline-none ${
                          dark
                            ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                            : "bg-white border-[#E9EDEF] text-[#111B21]"
                        }`}
                      />

                      {q.correctAnswer === optIdx && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/15 shrink-0 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>Correct</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddQuestion}
              className={`w-full py-3 rounded-2xl border-2 border-dashed font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition ${
                dark
                  ? "border-[#3B4A54] hover:border-emerald-500 text-[#8696A0] hover:text-emerald-400 hover:bg-white/5"
                  : "border-[#E9EDEF] hover:border-emerald-500 text-gray-500 hover:text-emerald-600 hover:bg-black/5"
              }`}
            >
              <Plus size={16} />
              <span>Add Another Question</span>
            </button>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
            <Link
              href="/teacher/quizzes"
              className="px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs md:text-sm font-semibold bg-gradient-to-r from-[#008069] to-[#00A884] text-white shadow-md hover:opacity-95 transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? "Publishing Quiz..." : "Publish Quiz"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
