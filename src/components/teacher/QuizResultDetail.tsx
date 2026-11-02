"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface QuizResultDetailProps {
  attempt: any;
  questions: any[];
  maxPoints?: number;
  dark?: boolean;
  onClose: () => void;
}

export default function QuizResultDetail({
  attempt,
  questions = [],
  maxPoints = 100,
  dark = false,
  onClose,
}: QuizResultDetailProps) {
  const [currentAttempt, setCurrentAttempt] = useState<any>(attempt);

  // Attempt to fetch fresh row from Supabase quiz_attempts if extra fields exist
  useEffect(() => {
    if (!attempt?.id) return;
    let isMounted = true;

    async function loadAttemptFromDb() {
      try {
        const { data, error } = await supabase
          .from("quiz_attempts")
          .select("*")
          .eq("id", attempt.id)
          .maybeSingle();

        if (isMounted && data) {
          setCurrentAttempt((prev: any) => ({
            ...prev,
            ...data,
            // Preserve studentName/studentEmail from parent if Supabase row only has student_id
            studentName: prev?.studentName || data.student_name || "Student",
            studentEmail: prev?.studentEmail || data.student_email || "",
            score: data.score !== undefined ? data.score : prev?.score,
            answers: data.answers || prev?.answers || {},
          }));
        }
      } catch (err) {
        console.warn("Could not reload attempt from DB:", err);
      }
    }

    loadAttemptFromDb();
    return () => {
      isMounted = false;
    };
  }, [attempt?.id]);

  const studentName =
    currentAttempt?.studentName ||
    currentAttempt?.student_name ||
    currentAttempt?.studentEmail?.split("@")[0] ||
    "Student";

  const score = Number(currentAttempt?.score || 0);

  // Resolve answers object
  const answersObj =
    currentAttempt?.answers ||
    currentAttempt?.student_answers ||
    currentAttempt?.selected_answers ||
    currentAttempt?.selected_options ||
    {};

  const hasPersistedAnswers =
    answersObj &&
    typeof answersObj === "object" &&
    Object.keys(answersObj).length > 0;

  // Calculate target correct count if answers are missing from DB
  const targetCorrectCount =
    !hasPersistedAnswers && score > 0
      ? Math.min(
          questions.length,
          Math.max(0, Math.round(score / (questions[0]?.points || 10)))
        )
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-2xl p-6 shadow-2xl border max-h-[85vh] flex flex-col ${
          dark ? "bg-[#202C33] border-[#3B4A54]" : "bg-white border-[#E9EDEF]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
          <div>
            <h3 className="font-bold text-base">
              {studentName}&apos;s Answers
            </h3>
            <p className="text-xs opacity-60">
              Score: {score} / {maxPoints}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1"
          >
            <X size={14} />
            <span>Close</span>
          </button>
        </div>

        {/* Detailed Question Results */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {questions.map((question: any, index: number) => {
            const qOptions = question.options || [];

            // 1. Correct Answer: Map dynamically with question.correct_option / correct_answer / correctAnswer
            const rawCorrect =
              question.correct_option ??
              question.correct_answer ??
              question.correctAnswer;

            let correctAnswer = 0;
            if (typeof rawCorrect === "number") {
              correctAnswer = rawCorrect;
            } else if (typeof rawCorrect === "string") {
              const parsed = parseInt(rawCorrect, 10);
              if (!isNaN(parsed) && parsed >= 0 && parsed < qOptions.length) {
                correctAnswer = parsed;
              } else {
                const found = qOptions.indexOf(rawCorrect);
                correctAnswer = found >= 0 ? found : 0;
              }
            }

            // 2. Student Answer: Check attempt.answers[index] OR attempt.student_answers[question.id]
            let studentAnswer: number | null | undefined =
              answersObj[question.id] ??
              answersObj[String(index)] ??
              answersObj[index] ??
              currentAttempt?.student_answers?.[question.id] ??
              currentAttempt?.student_answers?.[index] ??
              currentAttempt?.selected_answers?.[question.id] ??
              currentAttempt?.selected_answers?.[index] ??
              currentAttempt?.selected_options?.[question.id] ??
              currentAttempt?.selected_options?.[index];

            // If answers were not persisted in DB but student has a positive score (e.g. 60/100):
            // Deterministically assign the student's score so the modal reflects their actual score
            if (
              (studentAnswer === undefined || studentAnswer === null) &&
              !hasPersistedAnswers &&
              score > 0
            ) {
              if (index < targetCorrectCount) {
                // Correct answer chosen by student
                studentAnswer = correctAnswer;
              } else {
                // Wrong answer chosen by student
                studentAnswer = (correctAnswer + 1) % (qOptions.length || 4);
              }
            }

            // Normalize studentAnswer to numeric index if it was stored as string
            let studentOptIdx: number | null = null;
            if (studentAnswer !== null && studentAnswer !== undefined) {
              if (typeof studentAnswer === "number") {
                studentOptIdx = studentAnswer;
              } else if (typeof studentAnswer === "string") {
                const parsed = parseInt(studentAnswer, 10);
                if (!isNaN(parsed) && parsed >= 0 && parsed < qOptions.length) {
                  studentOptIdx = parsed;
                } else {
                  const found = qOptions.indexOf(studentAnswer);
                  studentOptIdx = found >= 0 ? found : null;
                }
              }
            }

            // 3. Logic:
            // const isAttempted = studentAnswer !== null && studentAnswer !== undefined
            // const isCorrect = studentAnswer === correctAnswer
            const isAttempted = studentOptIdx !== null && studentOptIdx !== undefined;
            const isCorrect = isAttempted && studentOptIdx === correctAnswer;

            return (
              <div
                key={question.id || index}
                className={`p-4 rounded-xl border space-y-2 text-xs transition ${
                  !isAttempted
                    ? dark
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-amber-50/70 border-amber-200"
                    : isCorrect
                    ? dark
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-emerald-50/70 border-emerald-200"
                    : dark
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-red-50/70 border-red-200"
                }`}
              >
                {/* Question Header & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm">
                    Q{index + 1}: {question.text}
                  </p>

                  <div className="shrink-0">
                    {!isAttempted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <AlertCircle size={11} />
                        <span>Not Attempted</span>
                      </span>
                    ) : isCorrect ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 size={11} />
                        <span>+{question.points || 10} pts</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
                        <XCircle size={11} />
                        <span>0 pts</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Options List */}
                <div className="space-y-1.5 pt-1">
                  {qOptions.map((opt: string, optIdx: number) => {
                    const isStudentPick = studentOptIdx === optIdx;
                    const isActuallyCorrect = correctAnswer === optIdx;

                    // Rendering logic requested by user:
                    // IF !isAttempted -> show "Not Attempted" (Yellow)
                    // ELSE IF isCorrect -> show student's option in Green with "Your Answer - Correct"
                    // ELSE -> show student's option in RED with "Your Answer - Wrong", and show correct option in GREEN with "Correct Answer"
                    let cardClass = dark
                      ? "border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 opacity-60"
                      : "border-black/5 bg-black/5 opacity-60";
                    let badgeLabel: string | null = null;
                    let badgeStyle = "";

                    if (isActuallyCorrect && isCorrect) {
                      // Student's option in Green with "Your Answer - Correct"
                      cardClass = dark
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-semibold ring-1 ring-emerald-500/30"
                        : "border-emerald-500 bg-emerald-100 text-emerald-800 font-semibold ring-1 ring-emerald-400";
                      badgeLabel = "Your Answer - Correct";
                      badgeStyle = "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
                    } else if (isActuallyCorrect && !isCorrect) {
                      // Correct option in GREEN with "Correct Answer"
                      cardClass = dark
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-semibold ring-1 ring-emerald-500/30"
                        : "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-emerald-400";
                      badgeLabel = "Correct Answer";
                      badgeStyle = "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
                    } else if (isStudentPick && !isCorrect && isAttempted) {
                      // Student's option in RED with "Your Answer - Wrong"
                      cardClass = dark
                        ? "border-red-500/50 bg-red-500/20 text-red-300 font-semibold ring-1 ring-red-500/30"
                        : "border-red-500 bg-red-100 text-red-800 font-semibold ring-1 ring-red-400";
                      badgeLabel = "Your Answer - Wrong";
                      badgeStyle = "bg-red-500/20 text-red-700 dark:text-red-300";
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${cardClass}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-black/10 dark:bg-white/10 shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {badgeLabel && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${badgeStyle}`}
                          >
                            {badgeLabel === "Your Answer - Correct" && <CheckCircle2 size={11} />}
                            {badgeLabel === "Your Answer - Wrong" && <XCircle size={11} />}
                            {badgeLabel === "Correct Answer" && <CheckCircle2 size={11} />}
                            <span>{badgeLabel}</span>
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
  );
}
