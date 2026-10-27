"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { supabase } from "../../lib/supabase";
import {
  GraduationCap,
  Plus,
  Search,
  Download,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  MessageCircle,
  ArrowLeft,
  Sun,
  Moon,
  ExternalLink,
  X,
  Sparkles,
  Trash2,
  RefreshCw,
  UserCheck,
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
  assignment?: Assignment;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  is_teacher?: boolean;
  avatar_url?: string;
  created_at?: string;
}

export default function TeacherPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const dark = theme === "dark";

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active view: 'assignments' | 'submissions' | 'students'
  const [activeTab, setActiveTab] = useState<"assignments" | "submissions" | "students">("assignments");

  // Data states
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Create Assignment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Student Details Modal
  const [selectedStudent, setSelectedStudent] = useState<{
    profile: Profile;
    submissions: Submission[];
  } | null>(null);

  // Toast feedback
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth & Teacher Role Check
  useEffect(() => {
    let active = true;

    async function checkAuthAndRole() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!active) return;

        if (!currentUser) {
          router.push("/auth/signin");
          return;
        }

        setUser(currentUser);

        // Fetch profile to verify role
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!active) return;

        const role = profileData?.role?.toLowerCase();
        const isTeacherFlag = profileData?.is_teacher === true;
        const emailLower = (currentUser.email || "").toLowerCase();

        // Check if user role == teacher
        // Filzaf281 is the instructor/admin, so always authorize filzaf281
        const isTeacher =
          role === "teacher" ||
          isTeacherFlag ||
          emailLower.includes("teacher") ||
          emailLower.includes("filzaf281") ||
          emailLower.endsWith(".edu");

        if (!isTeacher) {
          // Non-teachers are redirected to /chat
          console.warn("User is not a teacher. Redirecting to /chat");
          router.push("/chat");
          return;
        }

        setProfile(profileData || null);
        setAuthLoading(false);
        await loadAllData();
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/chat");
      }
    }

    checkAuthAndRole();

    return () => {
      active = false;
    };
  }, [router]);

  // Load Assignments, Submissions, and Students from Supabase
  const loadAllData = async () => {
    setLoadingData(true);
    try {
      // 1. Fetch assignments
      const { data: asgData, error: asgErr } = await supabase
        .from("assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (asgErr) console.warn("Assignments fetch warning:", asgErr.message);
      const loadedAssignments = (asgData || []) as Assignment[];
      setAssignments(loadedAssignments);

      // 2. Fetch submissions
      const { data: subData, error: subErr } = await supabase
        .from("submissions")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (subErr) console.warn("Submissions fetch warning:", subErr.message);
      const loadedSubmissions = ((subData || []) as Submission[]).map((s) => ({
        ...s,
        assignment: loadedAssignments.find((a) => a.id === s.assignment_id),
      }));
      setSubmissions(loadedSubmissions);

      // 3. Fetch profiles / students
      const { data: profData, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (profErr) console.warn("Profiles fetch warning:", profErr.message);
      setStudents((profData || []) as Profile[]);
    } catch (err: any) {
      console.error("Failed to load teacher data:", err?.message);
    } finally {
      setLoadingData(false);
    }
  };

  // Realtime subscription for assignments & submissions
  useEffect(() => {
    const channel = supabase
      .channel(`teacher-realtime-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments" },
        () => {
          loadAllData();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        (payload: any) => {
          const newSub = payload.new as Submission;
          if (newSub) {
            showToast(`🔔 New submission received from ${newSub.student_name || "a student"}!`);
            loadAllData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      setCreateError("Assignment title is required.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const payload: Record<string, any> = {
        title,
        description: newDescription.trim() || null,
        created_by: user?.id,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
      };

      const { data, error } = await supabase
        .from("assignments")
        .insert(payload)
        .select()
        .single();

      if (error) {
        setCreateError(error.message || "Failed to create assignment.");
        return;
      }

      setAssignments((prev) => [data as Assignment, ...prev]);
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      showToast("Assignment published successfully!");
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create assignment.");
    } finally {
      setCreating(false);
    }
  };

  // Handle Delete Assignment
  const handleDeleteAssignment = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete assignment "${title}"?`)) return;
    try {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setSubmissions((prev) => prev.filter((s) => s.assignment_id !== id));
      showToast("Assignment removed.");
    } catch (err: any) {
      showToast(`Error deleting assignment: ${err.message}`);
    }
  };

  // Export Submissions as CSV
  const exportSubmissionsCSV = () => {
    if (filteredSubmissions.length === 0) {
      showToast("No submissions to export.");
      return;
    }

    const headers = [
      "Student Name",
      "Student Email",
      "Assignment Title",
      "Status",
      "Submitted At",
      "File URL",
      "Summary",
    ];

    const rows = filteredSubmissions.map((s) => [
      `"${(s.student_name || "Unknown").replace(/"/g, '""')}"`,
      `"${(s.student_email || "").replace(/"/g, '""')}"`,
      `"${(s.assignment?.title || "N/A").replace(/"/g, '""')}"`,
      `"${s.status || "submitted"}"`,
      `"${new Date(s.submitted_at).toLocaleString()}"`,
      `"${s.file_url || ""}"`,
      `"${(s.summary || s.content || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `submissions_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV report exported!");
  };

  // Computed Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sub.student_name?.toLowerCase().includes(q) ||
        sub.student_email?.toLowerCase().includes(q) ||
        sub.assignment?.title?.toLowerCase().includes(q) ||
        sub.summary?.toLowerCase().includes(q);

      const matchesAssignment =
        selectedAssignmentFilter === "all" || sub.assignment_id === selectedAssignmentFilter;

      const matchesStatus =
        selectedStatusFilter === "all" ||
        sub.status?.toLowerCase() === selectedStatusFilter.toLowerCase();

      return matchesSearch && matchesAssignment && matchesStatus;
    });
  }, [submissions, searchQuery, selectedAssignmentFilter, selectedStatusFilter]);

  // Computed Filtered Assignments
  const filteredAssignments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return assignments;
    return assignments.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
  }, [assignments, searchQuery]);

  // Computed Filtered Students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Computed stats
  const stats = useMemo(() => {
    const totalStudents = students.length || new Set(submissions.map((s) => s.student_id)).size;
    const submittedCount = submissions.filter((s) => s.status === "submitted").length;
    const lateCount = submissions.filter((s) => s.status === "late").length;
    const expectedTotal = assignments.length * Math.max(1, totalStudents);
    const pendingCount = Math.max(0, expectedTotal - (submittedCount + lateCount));

    return {
      totalAssignments: assignments.length,
      totalStudents,
      submittedCount,
      lateCount,
      pendingCount,
    };
  }, [students, submissions, assignments]);

  // Welcome display name
  const welcomeUser = useMemo(() => {
    const email = user?.email || "";
    if (email.toLowerCase().includes("filzaf281")) return "filzaf281";
    if (profile?.full_name) return profile.full_name;
    if (email) return email.split("@")[0];
    return "filzaf281";
  }, [user, profile]);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] dark:bg-[#111B21] text-[#111B21] dark:text-[#E9EDEF]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium opacity-70">Loading Teacher Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        dark ? "bg-[#111B21] text-[#E9EDEF]" : "bg-[#F0F2F5] text-[#111B21]"
      }`}
    >
      {/* Top Header styled with ConnectHub Web theme */}
      <header
        className={`h-16 px-4 md:px-8 border-b flex items-center justify-between sticky top-0 z-30 shadow-sm backdrop-blur-md ${
          dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
        }`}
      >
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#00A884] dark:text-[#00C896] font-semibold text-xs md:text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Back to Chat</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#008069] to-[#00A884] text-white flex items-center justify-center shadow-md">
              <GraduationCap size={20} />
            </div>
            <div>
              <h1 className="font-bold text-sm md:text-base leading-tight flex items-center gap-1.5">
                <span>Teacher Dashboard - Welcome {welcomeUser}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  Teacher
                </span>
              </h1>
              <p className="text-[11px] opacity-60 hidden sm:block">
                ConnectHub Assignment & Grading System
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh data button */}
          <button
            onClick={() => loadAllData()}
            title="Refresh data"
            className={`p-2 rounded-xl border transition-colors ${
              dark
                ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
            }`}
          >
            <RefreshCw size={16} className={loadingData ? "animate-spin" : ""} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(dark ? "light" : "dark")}
            aria-label="Toggle theme"
            className={`p-2 rounded-xl border transition-colors ${
              dark
                ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
            }`}
          >
            {dark ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Create Assignment Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-xl font-medium text-xs md:text-sm bg-gradient-to-r from-[#008069] to-[#00A884] text-white shadow-md hover:opacity-95 active:scale-95 transition flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Create Assignment</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner with Greeting */}
        <div
          className={`p-5 md:p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
          }`}
        >
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Teacher Dashboard - Welcome {welcomeUser}
            </h2>
            <p className="text-xs md:text-sm opacity-70 mt-1">
              Manage your classroom assignments, view incoming student submissions, and auto-track progress.
            </p>
          </div>

          {/* Action Buttons required: Create Assignment, View Submissions, Manage Students */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl font-medium text-xs md:text-sm bg-[#00A884] hover:bg-[#008F72] text-white shadow-sm flex items-center gap-2 transition"
            >
              <Plus size={16} />
              <span>Create Assignment</span>
            </button>

            <button
              onClick={() => setActiveTab("submissions")}
              className={`px-4 py-2.5 rounded-xl font-medium text-xs md:text-sm border transition flex items-center gap-2 ${
                activeTab === "submissions"
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : dark
                  ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                  : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
              }`}
            >
              <FileText size={16} />
              <span>View Submissions ({submissions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-2.5 rounded-xl font-medium text-xs md:text-sm border transition flex items-center gap-2 ${
                activeTab === "students"
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : dark
                  ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                  : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
              }`}
            >
              <Users size={16} />
              <span>Manage Students ({students.length})</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          <div
            onClick={() => setActiveTab("assignments")}
            className={`p-4 md:p-5 rounded-2xl border shadow-sm cursor-pointer transition hover:scale-[1.01] ${
              activeTab === "assignments" ? "ring-2 ring-emerald-500/50" : ""
            } ${dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Assignments
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                <FileText size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold">{stats.totalAssignments}</p>
            <span className="text-[11px] opacity-60 mt-1 block">Active course tasks</span>
          </div>

          <div
            onClick={() => setActiveTab("submissions")}
            className={`p-4 md:p-5 rounded-2xl border shadow-sm cursor-pointer transition hover:scale-[1.01] ${
              activeTab === "submissions" ? "ring-2 ring-emerald-500/50" : ""
            } ${dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Submitted
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.submittedCount}
            </p>
            <span className="text-[11px] opacity-60 mt-1 block">Completed & verified</span>
          </div>

          <div
            onClick={() => setActiveTab("students")}
            className={`p-4 md:p-5 rounded-2xl border shadow-sm cursor-pointer transition hover:scale-[1.01] ${
              activeTab === "students" ? "ring-2 ring-emerald-500/50" : ""
            } ${dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Enrolled Students
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Users size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold">{stats.totalStudents}</p>
            <span className="text-[11px] opacity-60 mt-1 block">In ConnectHub database</span>
          </div>

          <div
            className={`p-4 md:p-5 rounded-2xl border shadow-sm ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Late / Missing
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats.lateCount + stats.pendingCount}
            </p>
            <span className="text-[11px] opacity-60 mt-1 block">Requiring follow-up</span>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b pb-2 border-black/10 dark:border-white/10 gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("assignments")}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                activeTab === "assignments"
                  ? "bg-[#00A884] text-white shadow-sm"
                  : dark
                  ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/5"
                  : "text-[#667781] hover:text-[#111B21] hover:bg-black/5"
              }`}
            >
              Assignments ({assignments.length})
            </button>

            <button
              onClick={() => setActiveTab("submissions")}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                activeTab === "submissions"
                  ? "bg-[#00A884] text-white shadow-sm"
                  : dark
                  ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/5"
                  : "text-[#667781] hover:text-[#111B21] hover:bg-black/5"
              }`}
            >
              Submissions ({submissions.length})
            </button>

            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                activeTab === "students"
                  ? "bg-[#00A884] text-white shadow-sm"
                  : dark
                  ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/5"
                  : "text-[#667781] hover:text-[#111B21] hover:bg-black/5"
              }`}
            >
              Students ({students.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-48 sm:w-72">
            <Search
              size={14}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                dark ? "text-[#8696A0]" : "text-gray-400"
              }`}
            />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs md:text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 transition ${
                dark
                  ? "bg-[#202C33] border-[#3B4A54] text-[#E9EDEF] placeholder-[#8696A0]"
                  : "bg-white border-[#E9EDEF] text-[#111B21] placeholder-gray-400"
              }`}
            />
          </div>
        </div>

        {/* TAB 1: LIST ASSIGNMENTS (From Supabase assignments table) */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                <FileText size={18} className="text-[#00A884]" />
                <span>Classroom Assignments</span>
                <span className="text-xs opacity-60">({filteredAssignments.length})</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus size={14} />
                <span>New Assignment</span>
              </button>
            </div>

            {loadingData ? (
              <div
                className={`p-12 text-center rounded-2xl border ${
                  dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
                }`}
              >
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs opacity-60">Loading assignments from Supabase...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div
                className={`p-12 text-center rounded-2xl border ${
                  dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
                }`}
              >
                <FileText size={40} className="mx-auto mb-3 opacity-30 text-emerald-500" />
                <h4 className="font-bold text-base mb-1">No assignments found</h4>
                <p className="text-xs opacity-60 mb-4 max-w-sm mx-auto">
                  Get started by creating your first classroom assignment for students to submit.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#00A884] text-white text-xs font-semibold hover:bg-[#008F72] transition"
                >
                  Create Assignment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssignments.map((assignment) => {
                  const assignmentSubmissions = submissions.filter(
                    (s) => s.assignment_id === assignment.id
                  );
                  const isPastDue =
                    assignment.due_date && new Date(assignment.due_date) < new Date();

                  return (
                    <div
                      key={assignment.id}
                      className={`p-5 rounded-2xl border shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                        dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-base line-clamp-1">{assignment.title}</h4>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                            {assignmentSubmissions.length} submitted
                          </span>
                        </div>

                        {assignment.description && (
                          <p className="text-xs opacity-70 line-clamp-3 mb-4 leading-relaxed">
                            {assignment.description}
                          </p>
                        )}

                        <div className="space-y-1.5 text-xs opacity-70 pt-2 border-t border-black/5 dark:border-white/5">
                          {assignment.due_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar
                                size={13}
                                className={isPastDue ? "text-amber-500" : "text-emerald-500"}
                              />
                              <span className={isPastDue ? "text-amber-500 font-medium" : ""}>
                                Due: {new Date(assignment.due_date).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="opacity-50" />
                            <span>
                              Created: {new Date(assignment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-black/5 dark:border-white/5">
                        <button
                          onClick={() => {
                            setSelectedAssignmentFilter(assignment.id);
                            setActiveTab("submissions");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 text-xs font-medium transition"
                        >
                          View Submissions
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteAssignment(assignment.id, assignment.title)
                          }
                          title="Delete assignment"
                          className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VIEW SUBMISSIONS (Detailed Tracking Table) */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                  <FileText size={18} className="text-[#00A884]" />
                  <span>Student Submissions</span>
                  <span className="text-xs opacity-60">({filteredSubmissions.length})</span>
                </h3>

                {/* Filter dropdowns */}
                <select
                  value={selectedAssignmentFilter}
                  onChange={(e) => setSelectedAssignmentFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    dark
                      ? "bg-[#202C33] border-[#3B4A54] text-[#E9EDEF]"
                      : "bg-white border-[#E9EDEF] text-[#111B21]"
                  }`}
                >
                  <option value="all">All Assignments</option>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    dark
                      ? "bg-[#202C33] border-[#3B4A54] text-[#E9EDEF]"
                      : "bg-white border-[#E9EDEF] text-[#111B21]"
                  }`}
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="late">Late</option>
                  <option value="missing">Missing</option>
                </select>
              </div>

              <button
                onClick={exportSubmissionsCSV}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  dark
                    ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                    : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
                }`}
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>

            <div
              className={`rounded-2xl border shadow-sm overflow-hidden ${
                dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-xs uppercase tracking-wider font-semibold ${
                        dark
                          ? "bg-[#111B21]/60 text-[#8696A0] border-[#2A3942]"
                          : "bg-[#F8F9FA] text-[#667781] border-[#E9EDEF]"
                      }`}
                    >
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Assignment</th>
                      <th className="py-3 px-4">File / Notes</th>
                      <th className="py-3 px-4 min-w-[200px]">AI Summary</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {loadingData ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center opacity-60">
                          Loading submissions...
                        </td>
                      </tr>
                    ) : filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center opacity-60">
                          No student submissions found matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((sub) => {
                        const isLate = sub.status === "late";
                        const isSubmitted = sub.status === "submitted";

                        return (
                          <tr
                            key={sub.id}
                            className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                                  {(sub.student_name || "S").charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-xs truncate max-w-[130px]">
                                    {sub.student_name || "Unknown"}
                                  </p>
                                  <p className="text-[11px] opacity-60 truncate max-w-[130px]">
                                    {sub.student_email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <p className="font-medium text-xs truncate max-w-[160px]">
                                {sub.assignment?.title || "Assignment"}
                              </p>
                            </td>

                            <td className="py-3 px-4">
                              {sub.file_url ? (
                                <a
                                  href={sub.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-xs font-medium hover:text-[#00A884] transition"
                                >
                                  <FileText size={13} />
                                  <span className="truncate max-w-[90px]">
                                    {sub.file_url.split("/").pop() || "Presentation"}
                                  </span>
                                  <ExternalLink size={11} />
                                </a>
                              ) : sub.content ? (
                                <span className="text-xs opacity-70 italic truncate max-w-[110px] block">
                                  Text response
                                </span>
                              ) : (
                                <span className="text-xs opacity-40">No attachment</span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-start gap-1 max-w-xs">
                                <Sparkles size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                                <p className="text-xs line-clamp-2 leading-relaxed opacity-90">
                                  {sub.summary || sub.content || "Uploaded presentation."}
                                </p>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-xs opacity-80 whitespace-nowrap">
                              {new Date(sub.submitted_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>

                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                  isSubmitted
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : isLate
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {isSubmitted && <CheckCircle2 size={11} />}
                                {isLate && <AlertTriangle size={11} />}
                                {sub.status ? sub.status.toUpperCase() : "SUBMITTED"}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <Link
                                href="/chat"
                                className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-emerald-500/10 hover:text-emerald-500 inline-flex transition"
                                title="Open chat"
                              >
                                <MessageCircle size={14} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MANAGE STUDENTS */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                <Users size={18} className="text-[#00A884]" />
                <span>Classroom Students & Enrolled Users</span>
                <span className="text-xs opacity-60">({filteredStudents.length})</span>
              </h3>
            </div>

            <div
              className={`rounded-2xl border shadow-sm overflow-hidden ${
                dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-xs uppercase tracking-wider font-semibold ${
                        dark
                          ? "bg-[#111B21]/60 text-[#8696A0] border-[#2A3942]"
                          : "bg-[#F8F9FA] text-[#667781] border-[#E9EDEF]"
                      }`}
                    >
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Submissions Count</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {loadingData ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center opacity-60">
                          Loading student roster...
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center opacity-60">
                          No students found.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => {
                        const studentSubmissions = submissions.filter(
                          (s) => s.student_id === st.id || s.student_email === st.email
                        );

                        return (
                          <tr
                            key={st.id}
                            className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                                  {(st.full_name || st.email || "U").charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold">{st.full_name || "User"}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 opacity-80">{st.email}</td>

                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  st.role === "teacher" || st.is_teacher
                                    ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                    : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                {st.role || (st.is_teacher ? "teacher" : "student")}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {studentSubmissions.length}
                              </span>{" "}
                              <span className="opacity-60 text-xs">submitted</span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedStudent({
                                    profile: st,
                                    submissions: studentSubmissions,
                                  });
                                }}
                                className="px-3 py-1 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 text-xs font-medium transition"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE ASSIGNMENT MODAL */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${
              dark ? "bg-[#202C33] border-[#3B4A54]" : "bg-white border-[#E9EDEF]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Plus size={20} className="text-[#00A884]" />
                Create New Assignment
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Systems Final Presentation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 ${
                    dark
                      ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                      : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Submit slide deck (.pdf / .ppt) and summary notes..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 ${
                    dark
                      ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                      : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70">
                  Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#00A884]/40 ${
                    dark
                      ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                      : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
                  }`}
                />
              </div>

              {createError && (
                <p className="text-red-500 text-xs font-medium">{createError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl font-medium text-sm border hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-[#008069] to-[#00A884] text-white hover:opacity-95 shadow-md transition disabled:opacity-50"
                >
                  {creating ? "Publishing..." : "Publish Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT DETAILS MODAL */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border max-h-[85vh] flex flex-col ${
              dark ? "bg-[#202C33] border-[#3B4A54]" : "bg-white border-[#E9EDEF]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center">
                  {(selectedStudent.profile.full_name || selectedStudent.profile.email || "S")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {selectedStudent.profile.full_name || "Student"}
                  </h3>
                  <p className="text-xs opacity-60">{selectedStudent.profile.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Submissions History ({selectedStudent.submissions.length})
              </p>

              {selectedStudent.submissions.length === 0 ? (
                <p className="text-xs opacity-60 py-4 text-center">No submissions yet.</p>
              ) : (
                selectedStudent.submissions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">
                        {s.assignment?.title || "Assignment Submission"}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        {s.status}
                      </span>
                    </div>

                    {s.summary && (
                      <p className="text-xs opacity-80 leading-relaxed bg-emerald-500/10 p-2 rounded-lg">
                        {s.summary}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] opacity-70">
                      <span>Submitted: {new Date(s.submitted_at).toLocaleDateString()}</span>
                      {s.file_url && (
                        <a
                          href={s.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#00A884] font-semibold hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={11} />
                          <span>View File</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111B21]/90 dark:bg-white/95 text-white dark:text-[#111B21] text-xs font-medium px-4 py-2.5 rounded-full shadow-2xl animate-fade-in flex items-center gap-2 border border-black/10 dark:border-white/10">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
