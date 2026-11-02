"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export interface QuestionBreakdown {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: number;
  correct_option?: number;
  studentAnswer?: number | null;
  selected_option?: number | null;
  isAttempted?: boolean;
  isCorrect?: boolean;
  points?: number;
}

interface ResultViewProps {
  questions?: any[];
  breakdown?: QuestionBreakdown[];
  studentAnswers?: Record<string, any>;
  dark?: boolean;
}

export default function ResultView({
  questions = [],
  breakdown,
  studentAnswers = {},
  dark = false,
}: ResultViewProps) {
  // Combine breakdown data with questions list if breakdown wasn't pre-computed
  const listToRender: QuestionBreakdown[] =
    breakdown && breakdown.length > 0
      ? breakdown
      : questions.map((q: any) => {
          const rawStudent = studentAnswers[q.id];
          const isAttempted =
            rawStudent !== undefined && rawStudent !== null && rawStudent !== -1;
          const studentPick = isAttempted ? Number(rawStudent) : null;
          const correctPick =
            q.correctAnswer !== undefined
              ? Number(q.correctAnswer)
              : q.correct_option !== undefined
              ? Number(q.correct_option)
              : 0;

          const isCorrect = isAttempted && studentPick === correctPick;

          return {
            id: q.id,
            text: q.text,
            options: q.options || [],
            correctAnswer: correctPick,
            correct_option: correctPick,
            studentAnswer: studentPick,
            selected_option: studentPick,
            isAttempted,
            isCorrect,
            points: q.points || 10,
          };
        });

  if (!listToRender || listToRender.length === 0) {
    return (
      <div className="p-4 text-center text-xs opacity-60">
        No question breakdown available.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-xs md:text-sm uppercase tracking-wider opacity-75">
          Detailed Question Results:
        </h4>
        <span className="text-[11px] opacity-60">
          {listToRender.length} Questions
        </span>
      </div>

      <div className="space-y-3">
        {listToRender.map((item, idx) => {
          const qOptions = item.options || [];

          // Resolve student answer index
          const rawStudent =
            item.studentAnswer ??
            item.selected_option ??
            studentAnswers[item.id];
          const isAttempted =
            rawStudent !== undefined &&
            rawStudent !== null &&
            rawStudent !== "" &&
            rawStudent !== -1;

          let studentOptIdx: number | null = null;
          if (isAttempted) {
            if (typeof rawStudent === "number") {
              studentOptIdx = rawStudent;
            } else if (typeof rawStudent === "string") {
              const parsed = parseInt(rawStudent, 10);
              if (!isNaN(parsed) && parsed >= 0 && parsed < qOptions.length) {
                studentOptIdx = parsed;
              } else {
                const foundIdx = qOptions.indexOf(rawStudent);
                studentOptIdx = foundIdx >= 0 ? foundIdx : null;
              }
            }
          }

          // Resolve correct answer index
          const rawCorrect =
            item.correctAnswer ?? item.correct_option;
          let correctOptIdx = 0;
          if (typeof rawCorrect === "number") {
            correctOptIdx = rawCorrect;
          } else if (typeof rawCorrect === "string") {
            const parsed = parseInt(rawCorrect, 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed < qOptions.length) {
              correctOptIdx = parsed;
            } else {
              const foundIdx = qOptions.indexOf(rawCorrect);
              correctOptIdx = foundIdx >= 0 ? foundIdx : 0;
            }
          }

          // Compute exact status: Correct / Wrong / Not Attempted
          const isCorrect =
            isAttempted && studentOptIdx !== null && studentOptIdx === correctOptIdx;
          const isWrong =
            isAttempted && studentOptIdx !== null && studentOptIdx !== correctOptIdx;
          const isNotAttempted = !isAttempted;

          return (
            <div
              key={item.id || idx}
              className={`p-4 rounded-2xl border transition-all ${
                isCorrect
                  ? dark
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-emerald-50/70 border-emerald-200"
                  : isWrong
                  ? dark
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-red-50/70 border-red-200"
                  : dark
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-amber-50/70 border-amber-200"
              }`}
            >
              {/* Question Header & Status Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-bold text-xs md:text-sm leading-snug">
                    <span className="opacity-60 mr-1.5">Q{idx + 1}.</span>
                    {item.text}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Correct (+{item.points || 10} pts)</span>
                    </span>
                  ) : isWrong ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
                      <XCircle size={13} className="text-red-600 dark:text-red-400" />
                      <span>Wrong (0 pts)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <AlertCircle size={13} className="text-amber-600 dark:text-amber-400" />
                      <span>Not Attempted</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Options List with Exact Color Highlighting */}
              <div className="space-y-1.5 pt-3">
                {qOptions.map((opt: string, optIdx: number) => {
                  const isStudentPick = studentOptIdx === optIdx;
                  const isActuallyCorrect = correctOptIdx === optIdx;

                  let optCardClass = dark
                    ? "border-black/10 dark:border-white/10 bg-black/10 dark:bg-white/5 opacity-60"
                    : "border-gray-200 bg-white/70 opacity-60";
                  let pillBadge = null;

                  if (isActuallyCorrect && isCorrect) {
                    // Correct answer chosen by student -> Green
                    optCardClass = dark
                      ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 font-semibold ring-1 ring-emerald-500/40"
                      : "border-emerald-500 bg-emerald-100 text-emerald-800 font-semibold ring-1 ring-emerald-400";
                    pillBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={11} />
                        Your Answer (Correct)
                      </span>
                    );
                  } else if (isActuallyCorrect && !isCorrect) {
                    // Actual correct answer that student missed -> Green highlight
                    optCardClass = dark
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 font-semibold ring-1 ring-emerald-500/30"
                      : "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-emerald-400";
                    pillBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={11} />
                        Correct Answer
                      </span>
                    );
                  } else if (isStudentPick && isWrong) {
                    // Student's wrong selection -> Red highlight
                    optCardClass = dark
                      ? "border-red-500/60 bg-red-500/20 text-red-300 font-semibold ring-1 ring-red-500/40"
                      : "border-red-500 bg-red-100 text-red-800 font-semibold ring-1 ring-red-400";
                    pillBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300">
                        <XCircle size={11} />
                        Your Answer (Wrong)
                      </span>
                    );
                  }

                  return (
                    <div
                      key={optIdx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${optCardClass}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-black/10 dark:bg-white/10 shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>

                      {pillBadge}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
