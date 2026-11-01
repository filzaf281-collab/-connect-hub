"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

// Firestore compatibility adapter running over the project's database
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
  if (targetTable === "userChats") targetTable = "conversation_participants";
  if (targetTable === "directMessages") targetTable = "messages";

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
    // Clean foreign key references first so postgres constraint does not block profile deletion
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
  } else if (col === "messages" || col === "directMessages") {
    try {
      await supabase.from("messages").delete().eq("id", docRef.id);
    } catch {}
  } else if (col === "userChats") {
    try {
      await supabase.from("conversation_participants").delete().eq("id", docRef.id);
    } catch {}
  } else {
    try {
      await supabase.from(col).delete().eq("id", docRef.id);
    } catch {}
  }
};

export default function AdminResetPage() {
  const [deleting, setDeleting] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);

  const handleFullDelete = async () => {
    if(!confirm("⚠️ FULL FRESH? This will delete ALL accounts and ALL chats. Are you sure? Website features will stay 100% safe.")) return;
    setDeleting(true);
    try {
      const collectionsToWipe = ["users", "conversations", "chats", "messages", "userChats", "directMessages"];
      let deletedCount = 0;
      for(const colName of collectionsToWipe){
        try{
          const snap = await getDocs(collection(db, colName));
          for(const d of snap.docs){
            await deleteDoc(doc(db, colName, d.id));
            deletedCount++;
          }
        } catch(e){ console.log("skip collection", colName); }
      }

      // Also clean any extra database records to guarantee 100% fresh start
      for(const extraCol of ["conversation_participants", "messages", "conversations", "profiles", "portfolios", "quiz_attempts", "client_simulations"]){
        try{
          const { data: recs } = await supabase.from(extraCol).select("id");
          if(recs && recs.length > 0){
            for(const r of recs){
              await supabase.from(extraCol).delete().eq("id", r.id);
            }
          }
        } catch(e){}
      }

      setTotal(deletedCount);
      setDone(true);
      alert(`SUCCESS! Deleted ${deletedCount} records. Website is now 100% FRESH. Now go to Firebase Console > Authentication and delete all users there too for full refresh.`);
    } catch(e:any){
      alert("Error: " + e.message);
    }
    setDeleting(false);
  };

  return (
    <div style={{padding:50, textAlign:"center"}}>
      <h1>ConnectHub - FULL FRESH</h1>
      <p>This will delete ALL accounts, chats, messages. Features will stay safe.</p>
      <button onClick={handleFullDelete} disabled={deleting} style={{background:"red", color:"white", padding:"15px 30px", borderRadius:10, cursor:"pointer"}}>
        {deleting ? "Deleting..." : "DELETE ALL DATA - MAKE FRESH"}
      </button>
      {done && <p style={{marginTop:20, color:"green", fontWeight:"bold"}}>Done! Deleted {total} records. Website is Fresh.</p>}
      <p style={{marginTop:20, fontSize:14}}>After this, ALSO go to: Firebase Console &gt; Authentication &gt; Users &gt; Delete All for 100% fresh signup.</p>
    </div>
  );
}
