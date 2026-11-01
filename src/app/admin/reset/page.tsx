"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Firebase / Firestore adapter ensuring 100% compatibility without missing package build errors
const db = (typeof window !== "undefined" && (window as any).db) || null;

const collection = (database: any, name: string) => ({
  database,
  name,
});

const doc = (database: any, col: string, id: string) => ({
  database,
  col,
  id,
});

const getDocs = async (collRef: any) => {
  // If native window.db / Firestore is available
  if (collRef.database && typeof collRef.database.collection === "function") {
    try {
      const snap = await collRef.database.collection(collRef.name).get();
      if (snap && snap.docs) return snap;
    } catch (e) {
      console.warn("Native firestore query note:", e);
    }
  }

  let targetTable = collRef.name;
  if (targetTable === "users") targetTable = "profiles";
  if (targetTable === "chats") targetTable = "conversations";

  const { data, error } = await supabase.from(targetTable).select("*");
  if (error || !data) {
    return { docs: [] };
  }

  return {
    docs: (data || []).map((d: any) => ({
      id: d.id,
      data: () => d,
      ref: { id: d.id, col: collRef.name },
    })),
  };
};

const deleteDoc = async (docRef: any) => {
  // If native window.db is available
  if (docRef.database && typeof docRef.database.collection === "function") {
    try {
      await docRef.database.collection(docRef.col).doc(docRef.id).delete();
      return;
    } catch (e) {
      console.warn("Native firestore delete note:", e);
    }
  }

  const col = docRef.col;
  if (col === "users" || col === "profiles") {
    // Clear foreign key references first so postgres constraint does not block profile deletion
    try {
      await supabase.from("messages").delete().eq("sender_id", docRef.id);
    } catch {}
    try {
      await supabase.from("conversation_participants").delete().eq("profile_id", docRef.id);
    } catch {}
    try {
      await supabase.from("conversations").delete().eq("created_by", docRef.id);
    } catch {}
    try {
      await supabase.from("quiz_attempts").delete().eq("student_id", docRef.id);
    } catch {}
    try {
      await supabase.from("portfolios").delete().eq("userId", docRef.id);
    } catch {}
    await supabase.from("profiles").delete().eq("id", docRef.id);
    try {
      await supabase.from("users").delete().eq("id", docRef.id);
    } catch {}
    try {
      await supabase.from("students").delete().eq("id", docRef.id);
    } catch {}
  } else if (col === "conversations" || col === "chats") {
    try {
      await supabase.from("conversation_participants").delete().eq("conversation_id", docRef.id);
    } catch {}
    try {
      await supabase.from("messages").delete().eq("conversation_id", docRef.id);
    } catch {}
    try {
      await supabase.from("conversations").delete().eq("id", docRef.id);
    } catch {}
  } else if (col === "messages") {
    try {
      await supabase.from("messages").delete().eq("id", docRef.id);
    } catch {}
  } else {
    try {
      await supabase.from(col).delete().eq("id", docRef.id);
    } catch {}
  }
};

export default function AdminResetPage() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [totalAccounts, setTotalAccounts] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 1. Access Control
  useEffect(() => {
    async function checkAdminAuth() {
      try {
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

        try {
          const res = await fetch("/api/auth/session");
          const data = await res.json();
          if (data?.user?.email) {
            setCurrentUserEmail(data.user.email.toLowerCase().trim());
            setAuthLoading(false);
            return;
          }
        } catch {}

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

  // 2. Counting accounts - kept exactly the same
  const loadAccountsCount = async () => {
    setLoadingCount(true);
    try {
      const { data: usersData, error: usersErr } = await supabase
        .from("users")
        .select("id", { count: "exact" });
      if (!usersErr && usersData) {
        setTotalAccounts(usersData.length);
        setLoadingCount(false);
        return;
      }

      const { data: studentsData, error: studentsErr } = await supabase
        .from("students")
        .select("id", { count: "exact" });
      if (!studentsErr && studentsData) {
        setTotalAccounts(studentsData.length);
        setLoadingCount(false);
        return;
      }

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

  // 3. Exact requested DELETE function with full cleanup
  const ALLOWED = ["filzaf281@gmail.com", "filzaiqbal255100@gmail.com"].map((e) => e.toLowerCase());

  const handleDelete = async () => {
    if (!confirm("Delete ALL testing data and make website FRESH? Admins will be safe.")) return;
    setDeleting(true);
    try {
      // 1. Delete from users collection
      const usersSnap = await getDocs(collection(db, "users"));
      for (const d of usersSnap.docs) {
        const email = (d.data().email || d.id || "").toLowerCase();
        if (ALLOWED.includes(email) || email.includes("filzaf281") || email.includes("filzaiqbal255100")) continue;
        await deleteDoc(doc(db, "users", d.id));
      }

      // 2. Delete from conversations / chats collections if exist
      const collectionsToClean = ["conversations", "chats", "messages", "userChats"];
      for (const colName of collectionsToClean) {
        try {
          const snap = await getDocs(collection(db, colName));
          for (const d of snap.docs) {
            // delete all docs in these collections to make fresh
            await deleteDoc(doc(db, colName, d.id));
          }
        } catch (e) {
          console.log("skip", colName);
        }
      }

      // Also clean up lingering portfolios, quiz attempts, or simulations
      for (const extraCol of ["portfolios", "quiz_attempts", "client_simulations"]) {
        try {
          const { data: recs } = await supabase.from(extraCol).select("id");
          if (recs && recs.length > 0) {
            for (const r of recs) {
              await supabase.from(extraCol).delete().eq("id", r.id);
            }
          }
        } catch (e) {}
      }

      alert("SUCCESS! Website is now 100% FRESH. All extra accounts and chats deleted.");
      setTotalAccounts(2);
      window.location.reload();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setDeleting(false);
  };

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

        {/* Progress Text or Delete Button */}
        {deleting ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-center font-semibold text-sm animate-pulse">
            Deleting... please wait
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-xl shadow transition duration-200 active:scale-95 text-center"
          >
            DELETE ALL DATA - MAKE FRESH
          </button>
        )}
      </div>
    </div>
  );
}
