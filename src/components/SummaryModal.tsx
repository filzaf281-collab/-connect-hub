"use client";

import { useState } from "react";
import { X, Sparkles, Copy, Check, Send, ListChecks, MessageSquare, Lightbulb } from "lucide-react";
import type { SummaryResult } from "../lib/summarizer";

interface Props {
  title: string;
  summary: SummaryResult;
  onClose: () => void;
  onPostToChat: (text: string) => void;
  isDark?: boolean;
}

export default function SummaryModal({
  title,
  summary,
  onClose,
  onPostToChat,
  isDark = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [posted, setPosted] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary.formattedCard);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePost = () => {
    onPostToChat(summary.formattedCard);
    setPosted(true);
    setTimeout(() => {
      setPosted(false);
      onClose();
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl border flex flex-col max-h-[88vh] overflow-hidden ${
          isDark
            ? "bg-[#202C33] border-[#3B4A54] text-[#E9EDEF]"
            : "bg-white border-[#E9EDEF] text-[#111B21]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00A884] to-[#25D366] text-white flex items-center justify-center shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                AI Chat Summary
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  Extractive AI
                </span>
              </h3>
              <p className="text-xs opacity-70 truncate max-w-xs">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Stats pills */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
              <span className="text-xs opacity-70 block mb-0.5">Analyzed</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {summary.messageCount} msgs
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
              <span className="text-xs opacity-70 block mb-0.5">Participants</span>
              <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                {summary.participantCount} users
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
              <span className="text-xs opacity-70 block mb-0.5">Key Topics</span>
              <span className="text-base font-bold text-sky-600 dark:text-sky-400">
                {summary.keyTopics.length} topics
              </span>
            </div>
          </div>

          {/* Overview */}
          <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <p className="text-xs uppercase tracking-wide font-semibold opacity-60 mb-1 flex items-center gap-1.5">
              <MessageSquare size={13} />
              Overview
            </p>
            <p className="text-sm leading-relaxed">{summary.overview}</p>
          </div>

          {/* Key Topics Tags */}
          {summary.keyTopics.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold opacity-60 mb-2">
                Main Topics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {summary.keyTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/20"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Highlights */}
          {summary.bulletPoints.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold opacity-60 mb-2 flex items-center gap-1.5">
                <Lightbulb size={13} />
                Key Discussion Points
              </p>
              <div className="space-y-2">
                {summary.bulletPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs md:text-sm flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <span className="leading-relaxed flex-1">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {summary.actionItems.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold opacity-60 mb-2 flex items-center gap-1.5">
                <ListChecks size={13} />
                Action Items & Tasks
              </p>
              <div className="space-y-2">
                {summary.actionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-xs md:text-sm flex items-start gap-2"
                  >
                    <Check size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed flex-1 text-amber-900 dark:text-amber-200">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-black/10 dark:border-white/10 flex items-center gap-2.5 bg-black/5 dark:bg-white/5">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-3 rounded-xl border border-black/10 dark:border-white/15 font-medium text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check size={16} className="text-emerald-500" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy Summary</span>
              </>
            )}
          </button>
          <button
            onClick={handlePost}
            disabled={posted}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00A884] to-[#25D366] text-white font-medium text-sm hover:opacity-95 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={16} />
            <span>{posted ? "Posted!" : "Post to Chat"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
