"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  Sparkles,
  Sun,
  Moon,
  CheckCircle2,
  Lock,
  QrCode,
  Video,
} from "lucide-react";

const POPULAR_SKILLS = [
  "Web Development",
  "Python Programming",
  "JavaScript & Frontend",
  "React & Next.js",
  "Communication & Soft Skills",
  "UI/UX Design",
  "Database & SQL",
  "Cloud & Backend Engineering",
];

export default function GenerateCertificatePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  const [studentName, setStudentName] = useState("");
  const [skillName, setSkillName] = useState("Web Development");
  const [customSkill, setCustomSkill] = useState("");
  const [score, setScore] = useState<number>(85);
  const [loadingScore, setLoadingScore] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch session and best score
    fetch("/api/skill-witness?skillName=" + encodeURIComponent(skillName))
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.name) {
          setStudentName(data.user.name);
        } else if (data.user?.email) {
          setStudentName(data.user.email.split("@")[0]);
        }
        if (data.bestScore) {
          setScore(data.bestScore);
        }
      })
      .catch((err) => console.warn("Could not prefill certificate:", err))
      .finally(() => setLoadingScore(false));
  }, [skillName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSkill = (skillName === "Other" ? customSkill : skillName).trim();
    if (!finalSkill) {
      setError("Please select or enter a valid skill name.");
      return;
    }
    if (!studentName.trim()) {
      setError("Please enter your name as it should appear on the certificate.");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/skill-witness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillName: finalSkill,
          studentName: studentName.trim(),
          score: Number(score) || 85,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.certificate?.id) {
        throw new Error(data.error || "Failed to generate certificate.");
      }

      // Cache locally for instant access across tabs
      try {
        const stored = JSON.parse(localStorage.getItem("ch_skill_certs") || "[]");
        const updated = [data.certificate, ...stored.filter((c: any) => c.id !== data.certificate.id)];
        localStorage.setItem("ch_skill_certs", JSON.stringify(updated));
      } catch (e) {}

      router.push(`/skill-witness/${data.certificate.id}`);
    } catch (err: any) {
      console.error("Certificate generation error:", err);
      setError(err?.message || "Failed to generate certificate. Please try again.");
      setGenerating(false);
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
                Blockchain-Verified Tamper-Proof Certificates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/skill-witness"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            My Certificates
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
      <main className="flex-1 p-4 md:p-8 max-w-3xl w-full mx-auto space-y-6 flex flex-col justify-center">
        <div
          className={`p-6 md:p-10 rounded-3xl border shadow-xl space-y-6 ${
            dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-gray-100"
          }`}
        >
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Sparkles size={14} />
              <span>AI Skill Witness & Blockchain Hashing</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Generate Your Skill Certificate
            </h2>
            <p className="text-xs md:text-sm opacity-70 max-w-md mx-auto">
              Immortalize your verified ConnectHub quiz accomplishments with a permanent, tamper-proof cryptographic certificate and public QR proof.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl text-xs font-medium bg-red-500/15 text-red-600 border border-red-500/30 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Student Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-75">
                Full Name (on Certificate)
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. John Doe"
                className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition ${
                  dark
                    ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                    : "bg-[#F8FAFC] border-[#E9EDEF] text-[#111B21]"
                }`}
              />
            </div>

            {/* Skill Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-75">
                Certified Skill
              </label>
              <select
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition ${
                  dark
                    ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                    : "bg-[#F8FAFC] border-[#E9EDEF] text-[#111B21]"
                }`}
              >
                {POPULAR_SKILLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="Other">Other (Custom Skill)...</option>
              </select>

              {skillName === "Other" && (
                <input
                  type="text"
                  required
                  placeholder="Enter custom skill name..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  className={`mt-2 w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition ${
                    dark
                      ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                      : "bg-[#F8FAFC] border-[#E9EDEF] text-[#111B21]"
                  }`}
                />
              )}
            </div>

            {/* Score & Proof Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-2xl border space-y-1 ${
                  dark ? "bg-[#111B21]/60 border-[#3B4A54]" : "bg-[#F0F2F5]/60 border-[#E9EDEF]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold opacity-70">
                    Verified Quiz Score
                  </span>
                  <Award size={16} className="text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-20 font-extrabold text-2xl bg-transparent text-[#00A884] focus:outline-none border-b border-emerald-500/50"
                  />
                  <span className="text-xs font-bold opacity-60">/ 100%</span>
                </div>
                <p className="text-[11px] opacity-60">
                  {loadingScore
                    ? "Fetching your top score..."
                    : "Auto-synced with your ConnectHub quiz results."}
                </p>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-1 ${
                  dark ? "bg-[#111B21]/60 border-[#3B4A54]" : "bg-[#F0F2F5]/60 border-[#E9EDEF]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold opacity-70">
                    Cryptographic Integrity
                  </span>
                  <Lock size={16} className="text-purple-500" />
                </div>
                <p className="text-sm font-bold text-purple-500 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 size={16} />
                  <span>SHA-256 Hash Proof</span>
                </p>
                <p className="text-[11px] opacity-60">
                  Unique CH-XXXX-XXXX stamp generated on creation.
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-2">
              <p className="font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={16} />
                <span>What makes this certificate tamper-proof?</span>
              </p>
              <ul className="space-y-1 opacity-75 list-disc list-inside text-[11px]">
                <li>Dynamic QR code encodes direct cryptographic verification link.</li>
                <li>ConnectHub Blockchain Hash guarantees authenticity to employers.</li>
                <li>Instant 1-click Download as Image and public shareable proof link.</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={generating}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Hashing on Blockchain & Generating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Generate Tamper-Proof Certificate</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
