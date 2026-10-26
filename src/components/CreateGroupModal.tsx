"use client";

// Create-group modal: group name, optional avatar upload, multi-select of
// users. Inserts groups + group_members (creator = admin).

import { useRef, useState } from "react";
import { X, Users, Check } from "lucide-react";
import { supabase } from "../lib/supabase";

interface MiniProfile {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string | null;
}

export default function CreateGroupModal({
  profiles,
  meId,
  onClose,
  onCreated,
}: {
  profiles: MiniProfile[];
  meId: string;
  onClose: () => void;
  onCreated: (g: { id: string; name: string; avatar_url?: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const toggle = (id: string) => {
    setPicked((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const pickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Enter a group name");
      return;
    }
    if (picked.size === 0) {
      setErr("Select at least one member");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      let avatarUrl = "";
      if (avatarFile) {
        const path = `group_${Date.now()}_${avatarFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("chat-files")
          .upload(path, avatarFile, { contentType: avatarFile.type || undefined });
        if (!upErr) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("chat-files").getPublicUrl(path);
          avatarUrl = publicUrl;
        }
      }

      const { data: group, error: gErr } = await supabase
        .from("groups")
        .insert({
          name: trimmed,
          avatar_url: avatarUrl || null,
          created_by: meId,
          description: "",
        })
        .select()
        .single();
      if (gErr || !group) {
        setErr(gErr?.message || "Could not create group (run SUPABASE_MEGA_UPGRADE.sql)");
        return;
      }

      const rows = [
        { group_id: group.id, user_id: meId, role: "admin" },
        ...Array.from(picked).map((uid) => ({ group_id: group.id, user_id: uid, role: "member" })),
      ];
      const { error: mErr } = await supabase.from("group_members").insert(rows);
      if (mErr) {
        setErr(mErr.message);
        return;
      }
      onCreated({ id: group.id, name: group.name, avatar_url: group.avatar_url });
    } catch (e: any) {
      setErr(e?.message || "Could not create group");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl p-5 shadow-2xl bg-white text-[#111B21] dark:bg-[#202C33] dark:text-[#E9EDEF] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">New group</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-14 h-14 rounded-full bg-brand-100 dark:bg-[#2A3942] flex items-center justify-center overflow-hidden shrink-0"
            aria-label="Group avatar"
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users size={24} className="text-brand-700 dark:text-[#E9EDEF]" />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar} tabIndex={-1} />
          <input
            type="text"
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-[#E9EDEF] dark:border-[#3B4A54] bg-[#F0F2F5] dark:bg-[#2A3942] focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>

        <p className="text-xs uppercase tracking-wide opacity-60 mb-2">
          Add members ({picked.size} selected)
        </p>
        <div className="flex-1 overflow-y-auto -mx-1">
          {profiles.length === 0 && (
            <p className="text-sm opacity-60 px-1">No other users to add yet.</p>
          )}
          {profiles.map((p) => {
            const on = picked.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-[#2A3942] flex items-center justify-center font-semibold shrink-0 overflow-hidden">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (p.full_name || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium truncate text-sm">{p.full_name || "Unknown"}</p>
                  {p.email && <p className="text-xs opacity-60 truncate">{p.email}</p>}
                </div>
                <span
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    on ? "bg-brand-500 border-brand-500 text-white" : "border-gray-400"
                  }`}
                >
                  {on && <Check size={14} />}
                </span>
              </button>
            );
          })}
        </div>

        {err && <p className="text-red-500 text-xs mt-2">{err}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full py-3 rounded-xl font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create group"}
        </button>
      </div>
    </div>
  );
}
