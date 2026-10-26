"use client";

// WhatsApp-style voice note: play/pause, real waveform decoded from the audio,
// seek by clicking the bars, duration display. Falls back to deterministic
// pseudo-bars when the browser can't decode the container (e.g. Safari).

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

const BAR_COUNT = 42;

function fallbackPeaks(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const peaks: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    peaks.push(0.25 + ((h >>> 8) % 1000) / 1000 * 0.75);
  }
  return peaks;
}

export default function AudioPlayer({
  src,
  mine,
}: {
  src: string;
  mine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<number[]>(() => fallbackPeaks(src));

  // Decode audio once to draw a REAL waveform
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(src);
        const buf = await res.arrayBuffer();
        const Ctx: typeof AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const audio = await ctx.decodeAudioData(buf);
        if (!alive) {
          ctx.close();
          return;
        }
        const ch = audio.getChannelData(0);
        const step = Math.max(1, Math.floor(ch.length / BAR_COUNT));
        const next: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let max = 0;
          const start = i * step;
          for (let j = 0; j < step; j += 8) {
            const v = Math.abs(ch[start + j] || 0);
            if (v > max) max = v;
          }
          next.push(Math.max(0.12, Math.min(1, max * 1.6)));
        }
        setPeaks(next);
        setDuration(audio.duration || 0);
        ctx.close();
      } catch {
        /* keep fallback bars */
      }
    })();
    return () => {
      alive = false;
    };
  }, [src]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      if (progress >= 1) {
        el.currentTime = 0;
      }
      el.play().catch(() => setPlaying(false));
    }
  };

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
    setProgress(ratio);
  };

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const cur = duration * progress;
  const accent = mine ? "#111B21" : "#3b4a54";

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] md:min-w-[240px] py-0.5">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress(el.currentTime / el.duration);
        }}
        onLoadedMetadata={(e) => {
          if (e.currentTarget.duration && isFinite(e.currentTarget.duration)) {
            setDuration(e.currentTarget.duration);
          }
        }}
      />
      <button
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors"
        style={{ backgroundColor: mine ? "rgba(17,27,33,0.12)" : "rgba(0,0,0,0.06)", color: accent }}
      >
        {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>
      <div className="flex-1 cursor-pointer select-none" onClick={onSeek}>
        <div className="flex items-center gap-[2px] h-8">
          {peaks.map((p, i) => {
            const played = i / peaks.length <= progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${Math.round(p * 100)}%`,
                  backgroundColor: played ? "#25d366" : "rgba(120,140,150,0.45)",
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] mt-0.5 opacity-70" style={{ color: accent }}>
          <span>{fmt(cur)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
