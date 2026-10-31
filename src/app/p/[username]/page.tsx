"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Award,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  MessageSquare,
  Star,
  Clock,
  Briefcase,
} from "lucide-react";
import { PortfolioRecord } from "@/lib/portfolio-db";
import ClientProofBadge from "@/components/client-simulator-badge";
import GetRealClientButton from "@/components/client-simulator-button";

export default function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const username = resolvedParams.username;

  const [portfolio, setPortfolio] = useState<PortfolioRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const res = await fetch(`/api/portfolios?username=${encodeURIComponent(username)}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        if (data.portfolio) {
          setPortfolio(data.portfolio);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Failed to load portfolio:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, [username]);

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getCleanWhatsAppLink = (num: string, name: string, skill: string) => {
    const cleanNum = num.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hello ${name}! I saw your verified ${skill} portfolio on Connect Hub and I'm interested in hiring you for a project.`
    );
    return `https://wa.me/${cleanNum}?text=${message}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-600">Loading verified portfolio...</p>
        </div>
      </div>
    );
  }

  if (notFound || !portfolio) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center border border-gray-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Briefcase size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Not Found</h1>
          <p className="text-sm text-gray-600">
            The portfolio &quot;{username}&quot; does not exist or may have been updated.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00A884] text-white text-sm font-semibold hover:bg-[#008F72] transition"
          >
            <ArrowLeft size={16} />
            <span>Go to Connect Hub</span>
          </Link>
        </div>
      </div>
    );
  }

  const initial = portfolio.fullName.trim().charAt(0).toUpperCase() || "C";
  const scoreBadgeColor =
    portfolio.score >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : portfolio.score >= 60
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-purple-50 text-purple-700 border-purple-200";

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-900 font-sans pb-16">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#008069] to-[#00A884] flex items-center justify-center text-white font-black text-lg shadow-sm">
              C
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-gray-900 block leading-tight">
                Connect<span className="text-[#00A884]">Hub</span>
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Verified Talent
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-300 hover:bg-gray-50 transition flex items-center gap-1.5 text-gray-700 cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? "Link Copied!" : "Copy Link"}</span>
            </button>

            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00A884] hover:bg-[#008F72] text-white transition flex items-center gap-1 shadow-xs"
            >
              <span>Join Connect Hub</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        {/* Profile Card Header (LinkedIn Style Cover) */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header Backdrop */}
          <div className="h-36 md:h-48 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 relative">
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-medium border border-white/20">
              <ShieldCheck size={14} className="text-emerald-300" />
              <span>Verified Credential</span>
            </div>
          </div>

          {/* Profile Header Info */}
          <div className="px-6 md:px-8 pb-8 pt-0 relative">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-20 gap-4 mb-5">
              <div className="relative">
                {portfolio.photoUrl ? (
                  <img
                    src={portfolio.photoUrl}
                    alt={portfolio.fullName}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-white shadow-lg bg-gray-100"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 border-4 border-white shadow-lg flex items-center justify-center text-white text-4xl sm:text-5xl font-black">
                    {initial}
                  </div>
                )}
                {portfolio.verified && (
                  <div
                    className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md"
                    title="Verified by Connect Hub"
                  >
                    <CheckCircle2 size={24} className="text-[#00A884] fill-emerald-100" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {portfolio.whatsappNumber ? (
                  <a
                    href={getCleanWhatsAppLink(
                      portfolio.whatsappNumber,
                      portfolio.fullName,
                      portfolio.skillName
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
                  >
                    <MessageSquare size={16} />
                    <span>Hire Me on WhatsApp</span>
                  </a>
                ) : null}

                <GetRealClientButton
                  username={portfolio.username}
                  studentName={portfolio.fullName}
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Name and Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  {portfolio.fullName}
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Verified by Connect Hub</span>
                </span>
              </div>

              <p className="text-base sm:text-lg font-medium text-gray-700">
                Certified in <span className="font-bold text-[#00A884]">{portfolio.skillName}</span>
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold border ${scoreBadgeColor}`}
                >
                  <Award size={14} />
                  <span>{portfolio.score}% Assessment Score</span>
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  <Star size={13} className="text-amber-500 fill-amber-400" />
                  <span>Top Verified Candidate</span>
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  <Clock size={13} className="text-gray-500" />
                  <span>Available for Hire</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid (LinkedIn + Fiverr style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Left Column: About & Skills */}
          <div className="md:col-span-2 space-y-6">
            {/* About Card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={18} className="text-[#00A884]" />
                <span>About & Professional Bio</span>
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                {portfolio.bio ||
                  `Certified ${portfolio.skillName} professional with a ${portfolio.score}% verified score on Connect Hub. Ready to deliver high quality tutoring, assignments, and freelance projects.`}
              </p>
            </div>

            {/* Verified Skills & Fiverr Gig Highlights */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Award size={18} className="text-[#00A884]" />
                <span>Services & Expertise</span>
              </h2>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                <p className="font-bold text-sm text-emerald-950">
                  🎯 Primary Skill: {portfolio.skillName}
                </p>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Verified through Connect Hub standardized assessment scoring {portfolio.score}%.
                  Available for remote collaboration, tutoring sessions, and direct client work.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  portfolio.skillName,
                  "Connect Hub Certified",
                  "100% Satisfaction",
                  "Fast Delivery",
                  "Tutoring & Homework Help",
                  "Professional Assistance",
                ].map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-800 text-xs font-medium border border-gray-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* AI Client Simulator Proof Badge */}
            <ClientProofBadge username={portfolio.username} />
          </div>

          {/* Right Column: Hire / Verification Summary */}
          <div className="space-y-6">
            {/* Direct Contact Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-gray-900">Direct Contact</h3>

              {portfolio.whatsappNumber ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600">
                    Connect instantly with {portfolio.fullName.split(" ")[0]} via WhatsApp for inquiries, project requests, or hourly tutoring:
                  </p>
                  <a
                    href={getCleanWhatsAppLink(
                      portfolio.whatsappNumber,
                      portfolio.fullName,
                      portfolio.skillName
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} />
                    <span>Hire on WhatsApp</span>
                  </a>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center space-y-2">
                  <p className="text-xs text-gray-600">
                    This candidate has verified their skills on Connect Hub.
                  </p>
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-semibold transition"
                  >
                    Share Profile Link
                  </button>
                </div>
              )}
            </div>

            {/* Assessment Verification Badge Box */}
            <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white rounded-3xl p-6 shadow-md space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck size={16} />
                <span>Connect Hub Certified</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This candidate scored <span className="text-white font-bold">{portfolio.score}%</span> on the verified Connect Hub evaluation for <span className="text-white font-bold">{portfolio.skillName}</span>.
              </p>
              <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Verification ID:</span>
                <span className="font-mono text-emerald-300">
                  CH-{portfolio.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-500 pt-6 border-t border-gray-200">
          <p className="font-semibold text-gray-700">
            Verified portfolio powered by Connect Hub
          </p>
          <p className="mt-1 text-[11px]">
            AI-powered real-time communication platform for education and business.
          </p>
        </footer>
      </main>
    </div>
  );
}
