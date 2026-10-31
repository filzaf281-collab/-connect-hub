"use client";

import { useState } from "react";
import GetRealClientButton from "@/components/client-simulator-button";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Upload,
  MessageSquare,
  X,
  User,
  ShieldCheck,
} from "lucide-react";

interface CreatePortfolioButtonProps {
  score: number;
  skillName?: string;
  studentName?: string;
  userId?: string;
}

export default function CreatePortfolioButton({
  score,
  skillName = "Web Development",
  studentName = "Student",
  userId,
}: CreatePortfolioButtonProps) {
  // Only appears AFTER 60% score
  if (score < 60) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdPortfolio, setCreatedPortfolio] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [bio, setBio] = useState<string>(
    `Certified ${skillName} specialist scoring ${score}% on Connect Hub assessment. Available for freelance projects, tutoring, and technical assignments.`
  );
  const [customUsername, setCustomUsername] = useState<string>(() => {
    const clean = (studentName || "student")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const rand = Math.floor(100 + Math.random() * 900);
    return `${clean || "talent"}-${rand}`;
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId || "anonymous",
          fullName: studentName,
          photoUrl: photoPreview,
          skillName,
          score,
          whatsappNumber: whatsapp,
          bio,
          customUsername,
        }),
      });

      const data = await res.json();
      if (data.portfolio) {
        setCreatedPortfolio(data.portfolio);
      } else {
        alert(data.error || "Failed to create portfolio");
      }
    } catch (err: any) {
      console.error("Create portfolio error:", err);
      alert(err?.message || "Failed to create portfolio");
    } finally {
      setLoading(false);
    }
  };

  const getPortfolioUrl = () => {
    if (!createdPortfolio) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://connect-hub-plum.vercel.app";
    return `${origin}/p/${createdPortfolio.username}`;
  };

  const handleCopyLink = () => {
    const url = getPortfolioUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const url = getPortfolioUrl();
    const text = encodeURIComponent(
      `🎉 Check out my verified ${skillName} portfolio on Connect Hub! Scored ${score}%: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <>
      {/* 1-Click Auto Portfolio Link Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full max-w-md mx-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white py-3.5 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer mt-3"
      >
        <Sparkles size={18} className="text-amber-300 animate-pulse" />
        <span>1-Click Auto Portfolio Link</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
          <div className="bg-white dark:bg-[#202C33] text-gray-900 dark:text-[#E9EDEF] rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-200 dark:border-[#2A3942] relative max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                setCreatedPortfolio(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              <X size={20} />
            </button>

            {!createdPortfolio ? (
              /* FORM STEP */
              <div className="space-y-5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    Instant Auto Portfolio
                  </span>
                  <h3 className="text-xl md:text-2xl font-extrabold mt-2">
                    Create Your Verified Portfolio
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Your {score}% score in <span className="font-semibold text-gray-800 dark:text-gray-200">{skillName}</span> will be published as a verified badge.
                  </p>
                </div>

                {/* Pre-filled Credentials Notice */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-emerald-900 dark:text-emerald-300">
                      Verified Candidate: {studentName}
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-400 opacity-90">
                      Skill: {skillName} • Verified Score: {score}%
                    </p>
                  </div>
                  <ShieldCheck size={24} className="text-emerald-600 dark:text-emerald-400" />
                </div>

                {/* Photo Upload (Optional) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">
                    Profile Photo (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400">
                        <User size={24} />
                      </div>
                    )}
                    <label className="cursor-pointer px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-semibold transition flex items-center gap-2">
                      <Upload size={14} />
                      <span>{photoPreview ? "Change Photo" : "Upload Picture"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* WhatsApp Number (Optional) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">
                    WhatsApp Number (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. +92 300 1234567"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2A3942] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 block">
                    Clients can click a &quot;Hire on WhatsApp&quot; button to chat with you directly.
                  </span>
                </div>

                {/* Professional Bio (Optional) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">
                    Professional Bio (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2A3942] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    placeholder="Short description of your skills, availability, and tutoring services..."
                  />
                </div>

                {/* Custom Username (Slug) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">
                    Public Portfolio URL
                  </label>
                  <div className="flex items-center gap-1.5 text-xs font-mono bg-gray-100 dark:bg-black/30 p-2.5 rounded-xl border border-gray-200 dark:border-white/10">
                    <span className="opacity-60">/p/</span>
                    <input
                      type="text"
                      value={customUsername}
                      onChange={(e) => setCustomUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      className="bg-transparent font-bold focus:outline-none text-emerald-600 dark:text-emerald-400 flex-1"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold text-xs transition hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={loading}
                    className="flex-2 py-3 rounded-xl bg-gradient-to-r from-[#008069] to-[#00A884] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Publish 1-Click Portfolio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* SUCCESS STATE STEP */
              <div className="text-center space-y-5 py-2">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    🎉 Your Portfolio Is Live!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Your verified public portfolio has been published and is ready to share.
                  </p>
                </div>

                {/* Live Link Box */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-left space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                    Public Profile Link:
                  </span>
                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#111B21] px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-white/10">
                    <span className="font-mono text-xs text-[#00A884] font-bold truncate">
                      {getPortfolioUrl()}
                    </span>
                    <Link
                      href={`/p/${createdPortfolio.username}`}
                      target="_blank"
                      className="text-gray-500 hover:text-gray-800 dark:hover:text-white shrink-0 p-1"
                      title="Open in new tab"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="pt-1">
                  <GetRealClientButton
                    username={createdPortfolio.username}
                    studentName={studentName}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleCopyLink}
                    className="py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    <span>{copied ? "Link Copied!" : "Copy Link"}</span>
                  </button>

                  <button
                    onClick={handleWhatsAppShare}
                    className="py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare size={16} />
                    <span>Share on WhatsApp</span>
                  </button>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/p/${createdPortfolio.username}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#00A884] hover:underline"
                  >
                    <span>View Public Portfolio Now</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
