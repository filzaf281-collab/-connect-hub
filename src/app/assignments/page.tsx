"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { supabase } from "../../lib/supabase";
import { generateSubmissionSummary } from "../../lib/summarizer";
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  ArrowLeft,
  Sun,
  Moon,
  ExternalLink,
  Sparkles,
  GraduationCap,
  X,
  FileCheck,
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  created_at: string;
  created_by?: string | null;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  file_url?: string | null;
  file_type?: string | null;
  content?: string | null;
  summary?: string | null;
  submitted_at: string;
  status: string;
}

export default function AssignmentsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const dark = theme === "dark";

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);

  // Submit Modal
  const [submittingAssignment, setSubmittingAssignment] = useState<Assignment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth & data fetch
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) {
        router.push("/auth/signin");
        return;
      }
      setUser(u);

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();

      if (p) setProfile(p);
      await loadAssignments(u.id);
    });
  }, [router]);

  const loadAssignments = async (userId: string) => {
    setLoading(true);
    try {
      const [{ data: asgData }, { data: subData }] = await Promise.all([
        supabase.from("assignments").select("*").order("created_at", { ascending: false }),
        supabase.from("submissions").select("*").eq("student_id", userId),
      ]);

      setAssignments((asgData || []) as Assignment[]);

      const subMap: Record<string, Submission> = {};
      for (const s of (subData || []) as Submission[]) {
        subMap[s.assignment_id] = s;
      }
      setMySubmissions(subMap);
    } catch (err: any) {
      console.log("Error loading assignments:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment || !user?.id) return;

    if (!selectedFile && !notes.trim()) {
      setUploadError("Please upload a presentation file or provide notes.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      let fileUrl = "";
      let fileType = "";

      // 1. Upload presentation file to 'assignments' bucket
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage
          .from("assignments")
          .upload(fileName, selectedFile, { contentType: selectedFile.type || undefined });

        if (upErr) {
          setUploadError(
            upErr.message.includes("bucket")
              ? "Storage bucket missing. Please run SUPABASE_DAY8_TEACHER.sql"
              : upErr.message
          );
          setIsUploading(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("assignments").getPublicUrl(fileName);

        fileUrl = publicUrl;
        fileType = selectedFile.type || "application/octet-stream";
      }

      // 2. Determine submission status (submitted vs late)
      const isLate =
        submittingAssignment.due_date &&
        new Date() > new Date(submittingAssignment.due_date);

      // 3. Auto-generate AI summary for this submission
      const summary = generateSubmissionSummary(notes, selectedFile?.name);

      const studentName = profile?.full_name || user.email?.split("@")[0] || "Student";
      const studentEmail = user.email || "";

      // 4. Insert into submissions table
      const { data, error: insErr } = await supabase
        .from("submissions")
        .insert({
          assignment_id: submittingAssignment.id,
          student_id: user.id,
          student_name: studentName,
          student_email: studentEmail,
          file_url: fileUrl || null,
          file_type: fileType || null,
          content: notes.trim() || null,
          summary: summary,
          status: isLate ? "late" : "submitted",
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insErr) {
        setUploadError(insErr.message);
        return;
      }

      setMySubmissions((prev) => ({
        ...prev,
        [submittingAssignment.id]: data as Submission,
      }));

      showToast("🎉 Assignment submitted successfully with auto-generated summary!");
      setSubmittingAssignment(null);
      setSelectedFile(null);
      setNotes("");
    } catch (err: any) {
      setUploadError(err?.message || "Failed to submit assignment.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={`min-h-screen flex flex-col ${
        dark ? "bg-[#0B141A] text-[#E9EDEF]" : "bg-[#F0F2F5] text-[#111B21]"
      }`}
    >
      {/* Header */}
      <header
        className={`h-16 px-4 md:px-8 border-b flex items-center justify-between sticky top-0 z-30 shadow-sm ${
          dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
        }`}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="flex items-center gap-2 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-brand-500 font-semibold text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md">
              <FileCheck size={20} />
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg leading-tight">Student Assignments</h1>
              <p className="text-xs opacity-60 hidden md:block">
                Presentations, Slide Decks & Auto Submissions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/teacher-dashboard"
            className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              dark
                ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
            }`}
          >
            <GraduationCap size={15} />
            <span>Teacher Dashboard</span>
          </Link>

          <button
            onClick={() => setTheme(dark ? "light" : "dark")}
            aria-label="Toggle theme"
            className={`p-2 rounded-xl border transition-colors ${
              dark
                ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
            }`}
          >
            {dark ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Your Course Assignments</h2>
            <p className="text-xs md:text-sm opacity-60">
              Submit presentations, view AI summaries, and monitor deadline statuses.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {assignments.length} Total
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 opacity-60">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div
            className={`p-10 rounded-2xl border text-center shadow-sm ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <FileText size={48} className="mx-auto mb-3 text-emerald-500 opacity-60" />
            <h3 className="font-bold text-lg mb-1">No Assignments Yet</h3>
            <p className="text-sm opacity-60 max-w-sm mx-auto">
              Your instructor hasn&apos;t posted any assignments yet. Switch to the Teacher Dashboard to create one!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((asg) => {
              const sub = mySubmissions[asg.id];
              const isSubmitted = !!sub;
              const isLate = sub?.status === "late";
              const isPastDue = asg.due_date && new Date() > new Date(asg.due_date);

              return (
                <div
                  key={asg.id}
                  className={`p-5 rounded-2xl border shadow-sm transition hover:shadow-md ${
                    dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-base md:text-lg">{asg.title}</h3>
                        {/* Status badge */}
                        {isSubmitted ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isLate
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            <CheckCircle2 size={13} />
                            {isLate ? "Submitted Late" : "Submitted ✓"}
                          </span>
                        ) : isPastDue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                            <AlertTriangle size={13} />
                            Missing / Past Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                            <Clock size={13} />
                            Pending Submission
                          </span>
                        )}
                      </div>

                      {asg.description && (
                        <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">
                          {asg.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs opacity-60 pt-1">
                        {asg.due_date && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} />
                            Due: {new Date(asg.due_date).toLocaleString()}
                          </span>
                        )}
                        <span>Posted: {new Date(asg.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSubmittingAssignment(asg);
                          setSelectedFile(null);
                          setNotes(sub?.content || "");
                        }}
                        className={`px-4 py-2.5 rounded-xl font-medium text-xs md:text-sm transition flex items-center gap-2 ${
                          isSubmitted
                            ? "border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                            : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:opacity-95"
                        }`}
                      >
                        <Upload size={15} />
                        <span>{isSubmitted ? "Re-submit / Update" : "Submit Work"}</span>
                      </button>
                    </div>
                  </div>

                  {/* If user already submitted, show their submission summary card */}
                  {sub && (
                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Sparkles size={14} />
                          Auto AI Summary:
                        </span>
                        <span className="opacity-60">
                          Submitted on {new Date(sub.submitted_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs p-3 rounded-xl bg-black/5 dark:bg-white/5 leading-relaxed">
                        {sub.summary || sub.content}
                      </p>
                      {sub.file_url && (
                        <a
                          href={sub.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500 hover:underline pt-1"
                        >
                          <ExternalLink size={13} />
                          Download Submitted Presentation Deck
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Submission Modal */}
      {submittingAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSubmittingAssignment(null)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border max-h-[88vh] overflow-y-auto ${
              dark ? "bg-[#202C33] border-[#3B4A54]" : "bg-white border-[#E9EDEF]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Submit Assignment</h3>
                <p className="text-xs opacity-60 truncate max-w-xs">{submittingAssignment.title}</p>
              </div>
              <button
                onClick={() => setSubmittingAssignment(null)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Auto Details Card */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Auto-Captured Student Details:
                </p>
                <p className="opacity-90">
                  <span className="font-medium">Name:</span>{" "}
                  {profile?.full_name || user?.email?.split("@")[0] || "Student"}
                </p>
                <p className="opacity-90">
                  <span className="font-medium">Email:</span> {user?.email}
                </p>
              </div>

              {/* File Upload Zone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70">
                  Presentation File (PDF, PPT, DOC, Image)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition hover:border-emerald-500 ${
                    dark ? "border-[#3B4A54] bg-[#111B21]/50" : "border-[#D1D7DB] bg-[#F8F9FA]"
                  }`}
                >
                  <Upload size={32} className="mx-auto mb-2 text-emerald-500 opacity-80" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-semibold text-emerald-500">{selectedFile.name}</p>
                      <p className="text-xs opacity-60">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">Click to select file or presentation deck</p>
                      <p className="text-xs opacity-50">PDF, PPTX, DOCX, ZIP, etc.</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                    }}
                  />
                </div>
              </div>

              {/* Notes / Overview */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70">
                  Presentation Overview & Key Notes (AI Auto-Summarized)
                </label>
                <textarea
                  rows={4}
                  placeholder="Summarize the core findings, architecture, or takeaways of your presentation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    dark
                      ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                      : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                  }`}
                />
              </div>

              {uploadError && <p className="text-red-500 text-xs font-medium">{uploadError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="flex-1 py-2.5 rounded-xl font-medium text-sm border hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-95 shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit to Teacher</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notice */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/85 text-white text-sm px-5 py-2.5 rounded-full shadow-2xl animate-slide-up flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
