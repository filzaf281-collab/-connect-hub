"use client";

// Full-screen story viewer: segmented progress bars, auto-advance (5s images,
// video plays to end), tap right = next, tap left = prev, X / Esc = close.

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { StoryGroup } from "./StoriesBar";

const IMAGE_MS = 5000;

export default function StoryViewer({
  group,
  onClose,
}: {
  group: StoryGroup;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const story = group.stories[index];
  const isVideo = (story?.media_type || "").startsWith("video");

  const next = () => {
    setIndex((i) => {
      if (i + 1 >= group.stories.length) {
        onClose();
        return i;
      }
      return i + 1;
    });
  };
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // Progress + auto-advance
  useEffect(() => {
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (!story) return;

    if (isVideo) {
      const el = videoRef.current;
      el?.play?.().catch(() => undefined);
      timerRef.current = setInterval(() => {
        const el2 = videoRef.current;
        if (el2 && el2.duration) setProgress(el2.currentTime / el2.duration);
      }, 100);
    } else {
      const started = Date.now();
      timerRef.current = setInterval(() => {
        const p = (Date.now() - started) / IMAGE_MS;
        if (p >= 1) {
          next();
        } else {
          setProgress(p);
        }
      }, 80);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, story?.id]);

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 px-3 pt-3">
        <div className="flex gap-1 mb-2">
          {group.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-semibold text-white">
            {group.initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{group.name}</p>
            <p className="text-white/70 text-xs">
              {new Date(story.created_at || Date.now()).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close story" className="p-2 text-white">
            <X size={26} />
          </button>
        </div>
      </div>

      {/* Tap zones */}
      <button
        onClick={prev}
        aria-label="Previous story"
        className="absolute left-0 top-20 bottom-16 w-1/3 flex items-center justify-center text-white/0 hover:text-white/40"
      >
        <ChevronLeft size={40} />
      </button>
      <button
        onClick={next}
        aria-label="Next story"
        className="absolute right-0 top-20 bottom-16 w-2/3"
      />

      {/* Media */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={story.media_url}
          className="max-h-full max-w-full"
          playsInline
          muted
          onEnded={next}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={story.media_url} alt={story.caption || "status"} className="max-h-full max-w-full" />
      )}

      {story.caption && (
        <p className="absolute bottom-6 inset-x-6 text-center text-white text-sm bg-black/40 rounded-xl px-4 py-2">
          {story.caption}
        </p>
      )}
    </div>
  );
}
