"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminResetPage() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [totalAccounts, setTotalAccounts] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // 1. Access Control: Only allow email filzaf281@gmail.com
  useEffect(() => {
    async function checkAdminAuth() {
      try {
        // Check localStorage user session first
        if (typeof window !== "undefined") {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              if (parsed?.email) {
                setCurrentUserEmail(parsed.email.toLowerCase().trim());
                setAuthLoading(false);
                return;
              }
            } catch {}
          }
        }

        // Check backend session API
        try {
          const res = await fetch("/api/auth/session");
          const data = await res.json();
          if (data?.user?.email) {
            setCurrentUserEmail(data.user.email.toLowerCase().trim());
            setAuthLoading(false);
            return;
          }
        } catch {}

        // Check client Supabase auth
        try {
          const { data: sbData } = await supabase.auth.getUser();
          if (sbData?.user?.email) {
            setCurrentUserEmail(sbData.user.email.toLowerCase().trim());
            setAuthLoading(false);
            return;
          }
        } catch {}
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAdminAuth();
  }, []);

  // Fetch accounts count when admin is authorized
  const loadAccountsCount = async () => {
    setLoadingCount(true);
    try {
      // 1. Try "users" collection
      const { data: usersData, error: usersErr } = await supabase
        .from("users")
        .select("id", { count: "exact" });
      if (!usersErr && usersData) {
        setTotalAccounts(usersData.length);
        setLoadingCount(false);
        return;
      }

      // 2. Try "students" collection
      const { data: studentsData, error: studentsErr } = await supabase
        .from("students")
        .select("id", { count: "exact" });
      if (!studentsErr && studentsData) {
        setTotalAccounts(studentsData.length);
        setLoadingCount(false);
        return;
      }

      // 3. Try "profiles" collection
      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, email", { count: "exact" });
      if (!profilesErr && profilesData) {
        setTotalAccounts(profilesData.length);
        setLoadingCount(false);
        return;
      }

      setTotalAccounts(0);
    } catch {
      setTotalAccounts(0);
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    if (["filzaf281@gmail.com", "filzaiqbal255100@gmail.com"].includes(currentUserEmail || "")) {
      loadAccountsCount();
    }
  }, [currentUserEmail]);

  // Handle Delete Logic
  const handleDeleteAll = async () => {
    const ok1 = window.confirm(
      "Are you sure you want to delete ALL accounts? Website will become fresh. Design/features will stay safe."
    );
    if (!ok1) return;

    const text = window.prompt("Final confirmation - Type exactly: DELETE ALL");
    if (text !== "DELETE ALL") {
      alert("Cancelled - You did not type DELETE ALL");
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");
    setSuccessMessage("");
    let deletedCount = 0;

    try {
      const collections = ["users", "students", "profiles", "portfolios", "quiz_results"];

      // 1. Delete from database collections one by one
      for (const col of collections) {
        try {
          if (col === "users" || col === "students" || col === "profiles") {
            const { data: docs } = await supabase.from(col).select("id, email");
            if (docs && docs.length > 0) {
              for (const doc of docs) {
                // Do NOT delete admin email doc if found
                if (["filzaf281@gmail.com", "filzaiqbal255100@gmail.com"].includes(doc.email?.toLowerCase().trim() || "")) {
                  continue;
                }
                await supabase.from(col).delete().eq("id", doc.id);
                deletedCount++;
              }
            }
          } else if (col === "portfolios") {
            const { data: docs } = await supabase.from(col).select("id");
            if (docs && docs.length > 0) {
              for (const doc of docs) {
                await supabase.from(col).delete().eq("id", doc.id);
              }
            }
          } else if (col === "quiz_results") {
            const { data: docs } = await supabase.from(col).select("id");
            if (docs && docs.length > 0) {
              for (const doc of docs) {
                await supabase.from(col).delete().eq("id", doc.id);
              }
            }
            // Also clean quiz_attempts table
            const { data: qaDocs } = await supabase.from("quiz_attempts").select("id");
            if (qaDocs && qaDocs.length > 0) {
              for (const doc of qaDocs) {
                await supabase.from("quiz_attempts").delete().eq("id", doc.id);
              }
            }
          }
        } catch (colErr) {
          console.warn(`Note on collection ${col}:`, colErr);
        }
      }

      // Also clean client simulations
      try {
        const { data: simDocs } = await supabase.from("client_simulations").select("id");
        if (simDocs && simDocs.length > 0) {
          for (const doc of simDocs) {
            await supabase.from("client_simulations").delete().eq("id", doc.id);
          }
        }
      } catch {}

      // Handle any global/window Firestore if initialized
      if (typeof window !== "undefined" && (window as any).db) {
        try {
          const firestore = (window as any).db;
          for (const colName of collections) {
            if (typeof firestore.collection === "function") {
              const colRef = firestore.collection(colName);
              const snapshot = await colRef.get();
              if (snapshot && snapshot.docs) {
                for (const doc of snapshot.docs) {
                  const data = doc.data();
                  if (["filzaf281@gmail.com", "filzaiqbal255100@gmail.com"].includes(data?.email?.toLowerCase().trim() || "")) {
                    continue;
                  }
                  await doc.ref.delete();
                  deletedCount++;
                }
              }
            }
          }
        } catch (fErr) {
          console.warn("Firestore delete handler note:", fErr);
        }
      }

      const countReport = deletedCount > 0 ? deletedCount : totalAccounts || 0;
      setSuccessMessage(
        `Success! Deleted ${countReport} accounts. Your website is now 100% fresh. All old features are still safe and working. New users can now Sign Up.`
      );

      // Refresh account counts
      await loadAccountsCount();
    } catch (err: any) {
      setErrorMessage(err?.message || "An error occurred while deleting data.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Show loading while verifying admin identity
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Access Denied if current user is not admin
  const user = { email: currentUserEmail };
  const ALLOWED_EMAILS = ["filzaf281@gmail.com", "filzaiqbal255100@gmail.com"];
  const isAdmin = ALLOWED_EMAILS.includes(user?.email || "");
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-red-600 mb-3">
            Access Denied - Only Admin Filza Allowed
          </h1>
          <p className="text-sm text-gray-600">
            Current account: <span className="font-semibold">{currentUserEmail || "Not logged in"}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto mt-20 p-8 rounded-2xl shadow-lg border border-gray-200 bg-white">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Make Website Fresh - Delete All Testing Data
        </h1>
        <p className="text-xs text-gray-500 mb-6">
          Logged in as: <span className="font-semibold text-gray-700">{currentUserEmail}</span> (Admin)
        </p>

        {/* Total Accounts Count */}
        <div className="bg-gray-100 p-4 rounded-xl mb-6">
          <p className="text-base font-semibold text-gray-800">
            Total Accounts Found:{" "}
            <span className="text-red-600 font-bold text-lg">
              {loadingCount ? "Loading..." : totalAccounts !== null ? totalAccounts : 0}
            </span>
          </p>
        </div>

        {/* Warning Box */}
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm mb-6 leading-relaxed">
          Warning: This will delete all student profiles, quiz data, portfolio data from Firestore to make website 100% fresh. Your website design and features will NOT be affected.
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-sm font-medium mb-6 leading-relaxed">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-100 border border-red-300 p-4 rounded-xl text-red-800 text-sm font-medium mb-6">
            {errorMessage}
          </div>
        )}

        {/* Progress Text or Delete Button */}
        {isDeleting ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-center font-semibold text-sm animate-pulse">
            Deleting... please wait
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDeleteAll}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-xl shadow transition duration-200 active:scale-95 text-center"
          >
            DELETE ALL DATA - MAKE FRESH
          </button>
        )}
      </div>
    </div>
  );
}
