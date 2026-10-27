"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  XCircle,
  Users,
  MessageCircle,
  Bell,
  ArrowLeft,
  Sun,
  Moon,
  ExternalLink,
  ChevronDown,
  X,
  Sparkles,
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
  status: string; // 'submitted' | 'late' | 'missing'
  assignment?: Assignment;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  is_teacher?: boolean;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const dark = theme === "dark";

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isTeacherMode, setIsTeacherMode] = useState(true);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
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
  const [selectedStudentSubmissions, setSelectedStudentSubmissions] = useState<{
    student: { name: string; email: string; id: string };
    items: Submission[];
  } | null>(null);

  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; text: string; time: string }[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Toast notice
  const [toast, setToast] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  // Auth check & load initial data
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) {
        router.push("/auth/signin");
        return;
      }
      setUser(u);

      // Fetch profile to verify role
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();

      if (p) {
        setProfile(p as Profile);
        const isTeacher =
          p.role === "teacher" ||
          p.is_teacher === true ||
          u.email?.includes("teacher") ||
          u.email?.endsWith(".edu");
        setIsTeacherMode(isTeacher || true); // Allow teacher view with role indicator
      }

      await loadDashboardData();
    });
  }, [router]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load assignments
      const { data: asgData } = await supabase
        .from("assignments")
        .select("*")
        .order("created_at", { ascending: false });

      const loadedAssignments = (asgData || []) as Assignment[];
      setAssignments(loadedAssignments);

      // Load submissions
      const { data: subData } = await supabase
        .from("submissions")
        .select("*")
        .order("submitted_at", { ascending: false });

      const loadedSubmissions = ((subData || []) as Submission[]).map((sub) => ({
        ...sub,
        assignment: loadedAssignments.find((a) => a.id === sub.assignment_id),
      }));
      setSubmissions(loadedSubmissions);

      // Load all students
      const { data: profData } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      setStudents((profData || []) as Profile[]);
    } catch (err: any) {
      console.log("Error loading dashboard data:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription for incoming submissions
  useEffect(() => {
    const channel = supabase
      .channel(`teacher-submissions-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        (payload: any) => {
          const newSub = payload.new as Submission;
          if (!newSub?.id) return;

          setSubmissions((prev) => {
            if (prev.some((s) => s.id === newSub.id)) return prev;
            const enriched = {
              ...newSub,
              assignment: assignments.find((a) => a.id === newSub.assignment_id),
            };
            return [enriched, ...prev];
          });

          // Add notification
          setNotifications((prev) => [
            {
              id: newSub.id,
              text: `New submission from ${newSub.student_name || "a student"}`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
            ...prev,
          ]);
          setUnreadNotifs((cnt) => cnt + 1);
          showToast(`🔔 New submission received from ${newSub.student_name}!`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assignments]);

  // Handle assignment creation
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

  // CSV Export
  const downloadCSV = () => {
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
      "AI Summary",
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

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `submissions_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV report downloaded!");
  };

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sub.student_name?.toLowerCase().includes(q) ||
        sub.student_email?.toLowerCase().includes(q) ||
        sub.assignment?.title?.toLowerCase().includes(q) ||
        sub.summary?.toLowerCase().includes(q);

      // Assignment filter
      const matchesAssignment =
        selectedAssignmentFilter === "all" || sub.assignment_id === selectedAssignmentFilter;

      // Status filter
      const matchesStatus =
        selectedStatusFilter === "all" || sub.status?.toLowerCase() === selectedStatusFilter.toLowerCase();

      return matchesSearch && matchesAssignment && matchesStatus;
    });
  }, [submissions, searchQuery, selectedAssignmentFilter, selectedStatusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalStudents = students.length || new Set(submissions.map((s) => s.student_id)).size;
    const submittedCount = submissions.filter((s) => s.status === "submitted").length;
    const lateCount = submissions.filter((s) => s.status === "late").length;
    const expectedTotal = assignments.length * Math.max(1, totalStudents);
    const pendingCount = Math.max(0, expectedTotal - (submittedCount + lateCount));

    return {
      totalStudents,
      submittedCount,
      lateCount,
      pendingCount,
    };
  }, [students, submissions, assignments]);

  if (!mounted) return null;

  return (
    <div
      className={`min-h-screen flex flex-col ${
        dark ? "bg-[#0B141A] text-[#E9EDEF]" : "bg-[#F0F2F5] text-[#111B21]"
      }`}
    >
      {/* Top Navbar */}
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <GraduationCap size={20} />
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg leading-tight flex items-center gap-2">
                Teacher Dashboard
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  Pro
                </span>
              </h1>
              <p className="text-xs opacity-60 hidden md:block">
                Auto-Tracking, Summaries & Grading Hub
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Navigation link to student assignments view */}
          <Link
            href="/assignments"
            className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              dark
                ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
            }`}
          >
            <FileText size={15} />
            <span>Assignments View</span>
          </Link>

          {/* Realtime Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setUnreadNotifs(0);
              }}
              title="Notifications"
              className={`p-2 rounded-xl border relative transition-colors ${
                dark
                  ? "border-[#3B4A54] hover:bg-white/5 text-[#E9EDEF]"
                  : "border-[#E9EDEF] hover:bg-black/5 text-[#111B21]"
              }`}
            >
              <Bell size={18} />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadNotifs}
                </span>
              )}
            </button>

            {/* Notification popup */}
            {showNotifications && (
              <div
                className={`absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-xl p-3 z-50 animate-fade-in ${
                  dark ? "bg-[#202C33] border-[#3B4A54]" : "bg-white border-[#E9EDEF]"
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10 dark:border-white/10">
                  <p className="font-semibold text-xs uppercase tracking-wide">Live Submissions</p>
                  <span className="text-[10px] opacity-60">Realtime</span>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-center py-4 opacity-60">No new submissions yet</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {notifications.map((n, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-xs flex items-start justify-between"
                      >
                        <span className="font-medium pr-2">{n.text}</span>
                        <span className="opacity-50 text-[10px] shrink-0">{n.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
            {dark ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Create Assignment Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl font-medium text-xs md:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:opacity-95 transition flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Create Assignment</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {/* Total Students */}
          <div
            className={`p-4 md:p-5 rounded-2xl border shadow-sm transition hover:shadow-md ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider opacity-60">
                Total Students
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Users size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold">{stats.totalStudents}</p>
            <span className="text-[11px] opacity-60 mt-1 block">Enrolled in courses</span>
          </div>

          {/* Submitted */}
          <div
            className={`p-4 md:p-5 rounded-2xl border shadow-sm transition hover:shadow-md ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider opacity-60">
                Submitted
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.submittedCount}
            </p>
            <span className="text-[11px] opacity-60 mt-1 block">On-time submissions</span>
          </div>

          {/* Late */}
          <div
            className={`p-4 md:p-5 rounded-2xl border shadow-sm transition hover:shadow-md ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider opacity-60">
                Late Submissions
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats.lateCount}
            </p>
            <span className="text-[11px] opacity-60 mt-1 block">Submitted past deadline</span>
          </div>

          {/* Pending / Missing */}
          <div
            className={`p-4 md:p-5 rounded-2xl border shadow-sm transition hover:shadow-md ${
              dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider opacity-60">
                Pending / Missing
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {stats.pendingCount}
            </p>
            <span className="text-[11px] opacity-60 mt-1 block">Awaiting submission</span>
          </div>
        </div>

        {/* Filters & Actions Bar */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
            dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
          }`}
        >
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                dark ? "text-[#8696A0]" : "text-gray-400"
              }`}
            />
            <input
              type="text"
              placeholder="Search by student name, email, or summary keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition ${
                dark
                  ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF] placeholder-[#8696A0]"
                  : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21] placeholder-gray-500"
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Assignment Filter */}
            <select
              value={selectedAssignmentFilter}
              onChange={(e) => setSelectedAssignmentFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-xl text-xs md:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                dark
                  ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                  : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
              }`}
            >
              <option value="all">All Assignments ({assignments.length})</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-xl text-xs md:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                dark
                  ? "bg-[#111B21] border-[#3B4A54] text-[#E9EDEF]"
                  : "bg-[#F0F2F5] border-[#E9EDEF] text-[#111B21]"
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="late">Late</option>
              <option value="missing">Missing</option>
            </select>

            {/* CSV Download Button */}
            <button
              onClick={downloadCSV}
              className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium border transition-colors flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 ${
                dark ? "border-[#3B4A54] text-[#E9EDEF]" : "border-[#E9EDEF] text-[#111B21]"
              }`}
              title="Export table as CSV"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Submissions Table */}
        <div
          className={`rounded-2xl border shadow-sm overflow-hidden ${
            dark ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr
                  className={`border-b text-xs uppercase tracking-wider font-semibold ${
                    dark
                      ? "bg-[#111B21]/60 text-[#8696A0] border-[#2A3942]"
                      : "bg-[#F8F9FA] text-[#667781] border-[#E9EDEF]"
                  }`}
                >
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Assignment</th>
                  <th className="py-3.5 px-4">Submission / File</th>
                  <th className="py-3.5 px-4 min-w-[200px]">AI Summary</th>
                  <th className="py-3.5 px-4">Submitted At</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center opacity-60">
                      Loading submissions data...
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center opacity-60">
                      No submissions found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => {
                    const isLate = sub.status === "late";
                    const isSubmitted = sub.status === "submitted";
                    const dateFormatted = new Date(sub.submitted_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => {
                          const studentSubmissions = submissions.filter(
                            (s) => s.student_id === sub.student_id
                          );
                          setSelectedStudentSubmissions({
                            student: {
                              name: sub.student_name,
                              email: sub.student_email,
                              id: sub.student_id,
                            },
                            items: studentSubmissions,
                          });
                        }}
                        className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        {/* Student Name & Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center text-xs shrink-0">
                              {(sub.student_name || "S").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate max-w-[140px]">
                                {sub.student_name || "Unknown"}
                              </p>
                              <p className="text-xs opacity-60 truncate max-w-[140px]">
                                {sub.student_email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Assignment Title */}
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-sm truncate max-w-[180px]">
                            {sub.assignment?.title || "Assignment"}
                          </p>
                          {sub.assignment?.due_date && (
                            <p className="text-[11px] opacity-60 flex items-center gap-1">
                              <Calendar size={11} />
                              Due: {new Date(sub.assignment.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </td>

                        {/* File preview / attachment */}
                        <td className="py-3.5 px-4">
                          {sub.file_url ? (
                            <a
                              href={sub.file_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-medium hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                            >
                              <FileText size={14} />
                              <span className="truncate max-w-[100px]">
                                {sub.file_url.split("/").pop() || "Presentation"}
                              </span>
                              <ExternalLink size={12} />
                            </a>
                          ) : sub.content ? (
                            <span className="text-xs italic opacity-70 truncate max-w-[120px] block">
                              Text notes
                            </span>
                          ) : (
                            <span className="text-xs opacity-40">No file</span>
                          )}
                        </td>

                        {/* AI Summary */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-1.5 max-w-xs">
                            <Sparkles size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-xs line-clamp-2 leading-relaxed">
                              {sub.summary || sub.content || "Uploaded presentation and assignment artifacts."}
                            </p>
                          </div>
                        </td>

                        {/* Submitted At */}
                        <td className="py-3.5 px-4 text-xs opacity-80 whitespace-nowrap">
                          {dateFormatted}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isSubmitted
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : isLate
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isSubmitted && <CheckCircle2 size={12} />}
                            {isLate && <AlertTriangle size={12} />}
                            {sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : "Submitted"}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push("/chat");
                            }}
                            title="Chat with student"
                            className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                          >
                            <MessageCircle size={15} />
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
      </main>

      {/* Create Assignment Modal */}
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
                <Plus size={20} className="text-emerald-500" />
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
                  placeholder="e.g. Final Presentation: Distributed Systems"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
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
                  placeholder="Upload slide deck (PDF/PPT) and brief overview..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
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
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
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
                  className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-95 shadow-md transition disabled:opacity-50"
                >
                  {creating ? "Publishing..." : "Publish Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {selectedStudentSubmissions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedStudentSubmissions(null)}
        >
          <div
            className={`w-full max-w-xl rounded-2xl p-6 shadow-2xl border max-h-[85vh] flex flex-col ${
              dark ? "bg-[#202C33] border-[#3B4A54]" : "bg-white border-[#E9EDEF]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-lg flex items-center justify-center">
                  {selectedStudentSubmissions.student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    {selectedStudentSubmissions.student.name}
                  </h3>
                  <p className="text-xs opacity-60">
                    {selectedStudentSubmissions.student.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/chat")}
                  className="px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <MessageCircle size={14} />
                  <span>Chat</span>
                </button>
                <button
                  onClick={() => setSelectedStudentSubmissions(null)}
                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                All Submissions ({selectedStudentSubmissions.items.length})
              </p>

              {selectedStudentSubmissions.items.length === 0 ? (
                <p className="text-sm opacity-60 py-6 text-center">No submissions recorded.</p>
              ) : (
                selectedStudentSubmissions.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">
                        {item.assignment?.title || "Assignment Submission"}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          item.status === "submitted"
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {item.summary && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1">
                          <Sparkles size={12} />
                          AI Submission Summary:
                        </p>
                        <p className="leading-relaxed opacity-90">{item.summary}</p>
                      </div>
                    )}

                    {item.content && (
                      <p className="text-xs whitespace-pre-wrap leading-relaxed opacity-80">
                        {item.content}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-xs opacity-70">
                      <span>Submitted: {new Date(item.submitted_at).toLocaleString()}</span>
                      {item.file_url && (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-emerald-500 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          View Document / Deck
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

      {/* Toast Notice */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/85 text-white text-sm px-5 py-2.5 rounded-full shadow-2xl animate-slide-up flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
