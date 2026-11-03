"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  Plus,
  ExternalLink,
  Share2,
  CheckCircle2,
  Sun,
  Moon,
  Lock,
  Sparkles,
} from "lucide-react";

export default function SkillWitnessListPage() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("ch_skill_certs") || "[]");
      if (Array.isArray(stored) && stored.length > 0) {
        setCertificates(stored);
      }
    } catch (e) {}

    fetch("/api/skill-witness")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.certificates)) {
          setCertificates((prev) => {
            const combined = [...data.certificates];
            prev.forEach((p) => {
              if (!combined.some((c) => c.id === p.id)) {
                combined.push(p);
              }
            });
            return combined;
          });
        }
      })
      .catch((err) => console.error("Error loading certificates:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleShare = (cert: any) => {
    const url =
      cert.qrCodeData ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/skill-witness/${cert.id}?verify=${cert.certificateHash}`
        : `https://connect-hub-plum.vercel.app/skill-witness/${cert.id}?verify=${cert.certificateHash}`);

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(cert.id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        dark ? "bg-[#111B21] text-[#E9EDEF]" : "bg-[#F8FAFC] text-[#111B21]"
      }`}
    >
      {/* Top Navbar */}
      <header
        className={`h-16 px-4 md:px-8 border-b flex items-center justify-between sticky top-0 z-30 shadow-sm backdrop-blur-md ${
          dark ? "bg-[#111B21]/80 border-[#2A3942]" : "bg-white/80 border-gray-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/student/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#00A884] dark:text-[#00C896] font-semibold text-xs md:text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Dashboard</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h1 className="font-bold text-sm md:text-base leading-tight">
                AI Skill Witness
              </h1>
              <p className="text-[10px] opacity-60 hidden sm:block">
                Blockchain-Verified Credentials Registry
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/skill-witness/generate"
            className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md hover:opacity-95 transition flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={14} />
            <span>Generate Certificate</span>
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
            dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-gray-100"
          }`}
        >
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 mb-2">
              <Sparkles size={12} />
              <span>Cryptographic Proof Engine</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              My Verified Skill Certificates 📜
            </h2>
            <p className="text-xs md:text-sm opacity-70 mt-1 max-w-2xl">
              Every certificate contains an immutable cryptographic hash and QR verification code verifiable by recruiters and employers worldwide.
            </p>
          </div>

          <Link
            href="/skill-witness/generate"
            className="px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shrink-0"
          >
            <Plus size={16} />
            <span>New Certificate</span>
          </Link>
        </div>

        {/* Certificates Grid */}
        {loading ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs opacity-60">Loading your blockchain certificates...</p>
          </div>
        ) : certificates.length === 0 ? (
          <div
            className={`p-12 text-center rounded-3xl border ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            } space-y-4 shadow-sm`}
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
              <ShieldCheck size={36} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg">No Certificates Generated Yet</h3>
              <p className="text-xs opacity-70 max-w-sm mx-auto">
                Generate your first AI-witnessed certificate to showcase verified quiz scores and skills on your resume and portfolio.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/skill-witness/generate"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-md hover:opacity-95 transition"
              >
                <Plus size={15} />
                <span>Generate Your First Certificate</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                  dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-gray-100"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {cert.skillName}
                    </span>
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock size={10} />
                      <span>Tamper-Proof</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base line-clamp-1">{cert.studentName}</h3>
                    <p className="font-mono text-[11px] opacity-70 mt-0.5">
                      Hash: {cert.certificateHash}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] opacity-60">Verified Mastery</p>
                      <p className="text-lg font-extrabold text-[#00A884]">
                        {cert.score}% Score
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] opacity-60">Issue Date</p>
                      <p className="text-xs font-semibold">
                        {new Date(cert.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
                  <Link
                    href={`/skill-witness/${cert.id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold text-center shadow-sm hover:opacity-95 transition flex items-center justify-center gap-1.5"
                  >
                    <span>View & Download</span>
                    <ExternalLink size={13} />
                  </Link>

                  <button
                    onClick={() => handleShare(cert)}
                    title="Copy Share Link"
                    className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition text-xs flex items-center gap-1 shrink-0"
                  >
                    {copiedId === cert.id ? (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    ) : (
                      <Share2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
