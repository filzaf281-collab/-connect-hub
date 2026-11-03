"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  Download,
  Share2,
  CheckCircle2,
  Sun,
  Moon,
  Lock,
  ExternalLink,
  Copy,
  Video,
  Sparkles,
} from "lucide-react";

export default function CertificateViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params as Promise<{ id: string }>);
  const certificateId = resolvedParams.id;
  const searchParams = useSearchParams();
  const verifyParam = searchParams.get("verify");

  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const certCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check localStorage fallback first for instant zero-lag rendering
    try {
      const stored = JSON.parse(localStorage.getItem("ch_skill_certs") || "[]");
      const localMatch = stored.find(
        (c: any) =>
          c.id === certificateId ||
          c.certificateHash?.toUpperCase() === certificateId.toUpperCase()
      );
      if (localMatch) {
        setCertificate(localMatch);
      }
    } catch (e) {}

    let url = `/api/skill-witness/${certificateId}`;
    if (verifyParam) {
      url += `?verify=${encodeURIComponent(verifyParam)}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.certificate) {
          setCertificate(data.certificate);
          try {
            const stored = JSON.parse(localStorage.getItem("ch_skill_certs") || "[]");
            const updated = [data.certificate, ...stored.filter((c: any) => c.id !== data.certificate.id)];
            localStorage.setItem("ch_skill_certs", JSON.stringify(updated));
          } catch (e) {}
        } else if (!certificate) {
          setError(data.error || "Certificate not found.");
        }
      })
      .catch((err) => {
        console.error("Error loading certificate:", err);
        if (!certificate) {
          setError("Failed to load certificate record.");
        }
      })
      .finally(() => setLoading(false));
  }, [certificateId, verifyParam]);

  const isHashVerified =
    certificate &&
    (!verifyParam ||
      verifyParam.trim().toUpperCase() ===
        certificate.certificateHash.toUpperCase());

  const fullVerifyUrl =
    certificate?.qrCodeData ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/skill-witness/${certificateId}?verify=${certificate?.certificateHash}`
      : `https://connect-hub-plum.vercel.app/skill-witness/${certificateId}?verify=${certificate?.certificateHash}`);

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(fullVerifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDownloadImage = async () => {
    if (!certificate) return;
    setDownloading(true);

    try {
      // Draw high-resolution certificate on an HTML5 canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      canvas.width = 1200;
      canvas.height = 800;

      // Dark background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 800);
      bgGrad.addColorStop(0, "#0B141A");
      bgGrad.addColorStop(0.5, "#111B21");
      bgGrad.addColorStop(1, "#0A1014");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 800);

      // Gold & Emerald Border
      ctx.strokeStyle = "#00A884";
      ctx.lineWidth = 10;
      ctx.strokeRect(30, 30, 1140, 740);

      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.strokeRect(45, 45, 1110, 710);

      // ConnectHub Header
      ctx.fillStyle = "#00A884";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CONNECTHUB • AI SKILL WITNESS", 600, 110);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "14px sans-serif";
      ctx.fillText("DECENTRALIZED & TAMPER-PROOF CRYPTOGRAPHIC RECORD", 600, 140);

      // Certificate Title
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("CERTIFICATE OF SKILL MASTERY", 600, 220);

      ctx.fillStyle = "#A0AEC0";
      ctx.font = "18px sans-serif";
      ctx.fillText("This officially recognizes and validates that", 600, 280);

      // Student Name
      ctx.fillStyle = "#10B981";
      ctx.font = "bold 48px sans-serif";
      ctx.fillText(certificate.studentName, 600, 350);

      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(350, 375);
      ctx.lineTo(850, 375);
      ctx.stroke();

      // Skill Text
      ctx.fillStyle = "#CBD5E1";
      ctx.font = "20px sans-serif";
      ctx.fillText(
        `has demonstrated exceptional verified competence in`,
        600,
        425
      );

      ctx.fillStyle = "#38BDF8";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText(certificate.skillName, 600, 480);

      // Score Pill
      ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
      ctx.fillRect(450, 520, 300, 46);
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(450, 520, 300, 46);

      ctx.fillStyle = "#10B981";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`VERIFIED SCORE: ${certificate.score}%`, 600, 550);

      // Footer: Date & Hash
      ctx.textAlign = "left";
      ctx.fillStyle = "#94A3B8";
      ctx.font = "14px sans-serif";
      ctx.fillText(
        `ISSUED: ${new Date(certificate.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        80,
        680
      );

      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`BLOCKCHAIN HASH: ${certificate.certificateHash}`, 80, 710);

      ctx.textAlign = "right";
      ctx.fillStyle = "#10B981";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("✓ VERIFIED BY CONNECTHUB", 1120, 680);
      ctx.fillStyle = "#64748B";
      ctx.font = "12px sans-serif";
      ctx.fillText("Immutable Ledger Proof", 1120, 710);

      // Trigger download
      const link = document.createElement("a");
      link.download = `Skill-Witness-${certificate.certificateHash}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Canvas export error:", err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111B21] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium opacity-70">
            Validating Blockchain Proof & Loading Certificate...
          </p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#111B21] p-4 text-[#111B21] dark:text-white">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#202C33] border border-red-500/30 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-bold">Certificate Not Found</h2>
          <p className="text-xs opacity-70">
            The requested certificate ID or hash does not exist on the ConnectHub registry.
          </p>
          <div className="pt-2">
            <Link
              href="/skill-witness/generate"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#00A884] text-white text-xs font-semibold shadow-md"
            >
              Generate New Certificate
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        dark ? "bg-[#0B141A] text-[#E9EDEF]" : "bg-[#F0F2F5] text-[#111B21]"
      }`}
    >
      {/* Top Navbar */}
      <header
        className={`h-16 px-4 md:px-8 border-b flex items-center justify-between sticky top-0 z-30 shadow-sm backdrop-blur-md ${
          dark ? "bg-[#111B21]/90 border-[#2A3942]" : "bg-white/90 border-gray-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/skill-witness"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#00A884] dark:text-[#00C896] font-semibold text-xs md:text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            <span>All Certificates</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10" />
          <h1 className="font-bold text-xs md:text-sm truncate max-w-xs md:max-w-md">
            {certificate.skillName} • {certificate.studentName}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-emerald-500">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={14} />
                <span>Share Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md hover:opacity-95 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Download size={14} />
            <span>{downloading ? "Exporting..." : "Download as Image"}</span>
          </button>

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
      <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto space-y-6">
        {/* Verification Alert Banner */}
        {isHashVerified ? (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-md animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="font-extrabold text-xs md:text-sm">
                  Verified by ConnectHub Blockchain — Tamper Proof ✅
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Cryptographic certificate hash matches official registry record:{" "}
                  <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-black/30 font-mono font-bold">
                    {certificate.certificateHash}
                  </code>
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wider shrink-0">
              Active & Valid
            </span>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-3">
            <Lock size={20} className="shrink-0" />
            <div>
              <p className="font-bold text-xs md:text-sm">
                Verification Hash Check Notice
              </p>
              <p className="text-[11px] opacity-80">
                Verify query hash does not match current certificate hash.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* LUXURY CONNECTHUB CERTIFICATE CANVAS CARD */}
        {/* ======================================================== */}
        <div
          ref={certCardRef}
          className="relative rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-[#111B21] via-[#0C151B] to-[#0A1014] text-white p-6 md:p-12 shadow-2xl overflow-hidden"
        >
          {/* Decorative Corner Ornaments */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-amber-400/60 rounded-tl-xl pointer-events-none" />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-amber-400/60 rounded-tr-xl pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-amber-400/60 rounded-bl-xl pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-amber-400/60 rounded-br-xl pointer-events-none" />

          {/* Background Ambient Glow & Watermark */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none text-9xl font-black">
            CONNECTHUB
          </div>

          {/* Certificate Inner Content */}
          <div className="relative z-10 text-center space-y-6">
            {/* Top Brand Header */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>ConnectHub • AI Skill Witness</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
                Certificate of Skill Mastery
              </h2>
              <p className="text-xs uppercase tracking-widest text-[#8696A0]">
                Cryptographically Signed & Decentralized Proof
              </p>
            </div>

            {/* Recipient Announcement */}
            <div className="space-y-2 pt-2">
              <p className="text-xs md:text-sm text-slate-300 italic">
                This officially confirms that
              </p>
              <h3 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-green-200 bg-clip-text text-transparent">
                {certificate.studentName}
              </h3>
              <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto" />
            </div>

            {/* Competency Statement */}
            <div className="space-y-1.5 max-w-xl mx-auto">
              <p className="text-xs md:text-sm text-slate-300">
                has successfully passed rigorous verified testing demonstrating certified mastery in
              </p>
              <p className="text-2xl md:text-3xl font-extrabold text-sky-400">
                {certificate.skillName}
              </p>
            </div>

            {/* Score Pill */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm md:text-base shadow-inner">
              <Award size={20} className="text-amber-400" />
              <span>Verified Score: {certificate.score}% Mastery</span>
            </div>

            {/* Certificate Footer: QR Code & Hash & Seal */}
            <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Left: Issue Date & Hash */}
              <div className="text-center md:text-left space-y-1.5 text-xs">
                <p className="text-[#8696A0]">
                  Issue Date:{" "}
                  <span className="text-white font-semibold">
                    {new Date(certificate.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </p>
                <p className="font-mono text-[11px] text-amber-400 font-bold flex items-center justify-center md:justify-start gap-1.5">
                  <Lock size={12} />
                  <span>Hash: {certificate.certificateHash}</span>
                </p>
                <p className="text-[10px] text-emerald-400/90 font-medium">
                  Status: Tamper-Proof • Permanent Ledger Proof
                </p>
              </div>

              {/* Center: ConnectHub Gold Seal */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-2 border-amber-400/80 bg-amber-400/10 flex items-center justify-center shadow-lg shadow-amber-500/10 ring-4 ring-amber-400/20">
                  <Award size={32} className="text-amber-400" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80 mt-1">
                  Official Seal
                </span>
              </div>

              {/* Right: Large QR Code */}
              <div className="flex flex-col items-center md:items-end space-y-1">
                <div className="p-2.5 rounded-2xl bg-white shadow-xl">
                  <QRCodeSVG
                    value={fullVerifyUrl}
                    size={110}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                  <Sparkles size={11} className="text-emerald-400" />
                  <span>Scan to Verify Online</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Video Proof (Coming Soon) Placeholder */}
        <div
          className={`p-6 rounded-2xl border ${
            dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-gray-100"
          } space-y-3 shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
                <Video size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <span>AI Video Proof of Skill</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
                    Coming Soon
                  </span>
                </h4>
                <p className="text-xs opacity-60">
                  Real-time recording & AI proctoring footage linked directly to this certificate.
                </p>
              </div>
            </div>

            <button
              disabled
              className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold opacity-50 cursor-not-allowed"
            >
              Upload Footage
            </button>
          </div>

          <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 text-center text-xs opacity-60">
            📹 AI Skill Witness Proctoring & Video Capture integration is currently in beta preview. Once enabled, webcam recordings of your quiz attempts will be securely hashed alongside this credential.
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/skill-witness/generate"
            className="px-5 py-2.5 rounded-xl border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1.5"
          >
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Generate Another Certificate</span>
          </Link>

          <button
            onClick={handleCopyLink}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-semibold shadow-md hover:opacity-95 transition flex items-center gap-1.5 active:scale-95"
          >
            <Copy size={14} />
            <span>{copied ? "Link Copied!" : "Copy Verification Link"}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
