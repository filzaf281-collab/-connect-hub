"use client";

// WhatsApp-style status bar: my avatar with "+" to add a story (ring shows
// around avatars that have an active 24h story), click to view.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export interface StoryRow {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string | null;
  caption?: string | null;
  expires_at?: string | null;
  created_at?: string;
}

export interface StoryGroup {
  userId: string;
  name: string;
  initial: string;
  avatarUrl?: string | null;
  stories: StoryRow[];
}

interface Props {
  meId: string;
  meName: string;
  profiles: { id: string; full_name: string; avatar_url?: string | null }[];
  onOpenGroup: (g: StoryGroup) => void;
  onNotice: (msg: string) => void;
}

export default function StoriesBar({ meId, meName, profiles, onOpenGroup, onNotice }: Props) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
      if (!data) return;
      const byUser = new Map<string, StoryRow[]>();
      for (const s of data as StoryRow[]) {
        const arr = byUser.get(s.user_id) || [];
        arr.push(s);
        byUser.set(s.user_id, arr);
      }
      const next: StoryGroup[] = [];
      byUser.forEach((stories, userId) => {
        const p = profiles.find((x) => x.id === userId);
        next.push({
          userId,
          name: userId === meId ? "My status" : p?.full_name || "Unknown",
          initial: (userId === meId ? meName : p?.full_name || "U").charAt(0).toUpperCase(),
          avatarUrl: userId === meId ? null : p?.avatar_url,
          stories,
        });
      });
      // Mine first, then alphabetical
      next.sort((a, b) => (a.userId === meId ? -1 : b.userId === meId ? 1 : a.name.localeCompare(b.name)));
      setGroups(next);
    } catch {
      /* table may not exist yet — bar shows just the add button */
    }
  }, [profiles, meId, meName]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [load]);

  const addStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const path = `story_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("stories")
        .upload(path, file, { contentType: file.type || undefined });
      if (error) {
        onNotice(error.message.includes("bucket") ? "Run SUPABASE_MEGA_UPGRADE.sql to enable stories" : error.message);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("stories").getPublicUrl(path);
      const { error: insErr } = await supabase.from("stories").insert({
        user_id: meId,
        media_url: publicUrl,
        media_type: file.type.startsWith("video") ? "video" : "image",
        caption: file.name,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      if (insErr) {
        onNotice(insErr.message);
        return;
      }
      onNotice("Status added");
      load();
    } catch (err: any) {
      onNotice(err?.message || "Could not add status");
    } finally {
      setUploading(false);
    }
  };

  const mine = groups.find((g) => g.userId === meId);

  return (
    <div className="px-3 py-2.5 border-b border-[#E9EDEF] dark:border-[#2A3942]">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={addStory}
        tabIndex={-1}
      />
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {/* My status */}
        <button
          onClick={() => (mine ? onOpenGroup(mine) : fileRef.current?.click())}
          className="shrink-0 flex flex-col items-center gap-1 w-16"
          aria-label={mine ? "View my status" : "Add status"}
        >
          <div
            className={`relative w-14 h-14 rounded-full p-[2.5px] ${
              mine
                ? "bg-gradient-to-tr from-[#25d366] via-[#128c7e] to-[#075e54]"
                : "bg-[#E9EDEF] dark:bg-[#3B4A54]"
            }`}
          >
            <div className="w-full h-full rounded-full bg-white dark:bg-[#111B21] flex items-center justify-center overflow-hidden">
              <span className="text-lg font-semibold text-brand-700 dark:text-[#E9EDEF]">
                {meName.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            {!mine && (
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand-500 text-white flex items-center text-sm font-bold border-2 border-white dark:border-[#111B21]">
                +
              </span>
            )}
          </div>
          <span className="text-[10px] text-center text-[#667781] dark:text-[#8696A0] truncate w-16">
            {uploading ? "Adding…" : "My status"}
          </span>
        </button>

        {/* Others' statuses */}
        {groups
          .filter((g) => g.userId !== meId)
          .map((g) => (
            <button
              key={g.userId}
              onClick={() => onOpenGroup(g)}
              className="shrink-0 flex flex-col items-center gap-1 w-16"
              aria-label={`View ${g.name}'s status`}
            >
              <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-[#25d366] via-[#128c7e] to-[#075e54]">
                <div className="w-full h-full rounded-full bg-white dark:bg-[#111B21] flex items-center justify-center overflow-hidden ring-2 ring-white dark:ring-[#111B21]">
                  {g.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-brand-700 dark:text-[#E9EDEF]">
                      {g.initial}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-center text-[#667781] dark:text-[#8696A0] truncate w-16">
                {g.name}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
