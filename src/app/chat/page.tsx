"use client";

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/supabase";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  MessageCircle,
  Send,
  Sun,
  Moon,
  Phone,
  Video,
  MoreVertical,
  Search,
  Smile,
  Paperclip,
  ArrowLeft,
  CheckCheck,
  Check,
  X,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  PhoneOff,
  Plus,
  Users,
  FileText,
  Download,
  Trash2,
  Sparkles,
  GraduationCap,
  FileCheck,
  Bell,
} from "lucide-react";
import Link from "next/link";
import AudioPlayer from "../../components/AudioPlayer";
import StoriesBar, { StoryGroup } from "../../components/StoriesBar";
import StoryViewer from "../../components/StoryViewer";
import CreateGroupModal from "../../components/CreateGroupModal";
import SummaryModal from "../../components/SummaryModal";
import { generateChatSummary, SummaryResult } from "../../lib/summarizer";
import { useWebRTCCall } from "../../hooks/useWebRTCCall";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  created_at?: string;
}

interface Message {
  id: string;
  conversation_id?: string | null;
  sender_id: string;
  receiver_id?: string | null;
  content: string;
  message_type?: string | null; // "text" | "image" | "file" | "audio"
  file_url?: string | null;
  file_type?: string | null; // MIME type for attachments
  audio_url?: string | null;
  is_read?: boolean | null; // read receipt: true once the RECEIVER opened the chat
  read_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  audio_url?: string | null;
  is_read?: boolean | null;
  delivered_at?: string | null;
  created_at: string;
}

interface GroupMeta {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  created_by?: string | null;
  created_at?: string;
  member_count: number;
  last_message?: string | null;
  last_at?: string | null;
}

// Wallpaper options (saved to localStorage, applied to the messages area)
const wallpapers = [
  { id: "default", bg: "#ffffff" },
  { id: "whatsapp", bg: "#e5ddd5", pattern: true },
  { id: "dark", bg: "#0b141a" },
  { id: "blue", bg: "#d1e7ff" },
  { id: "pink", bg: "#ffdde2" },
];

// Bubble color palette (applied via inline style)
const bubbleColors = ["#dcf8c6", "#a8d8ea", "#e0bbe4", "#ffdfba"];

// Simple subtle "doodle" pattern for the classic WhatsApp wallpaper
const WA_DOODLE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='none' stroke='%23000000' stroke-opacity='0.05' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 18 q6 -10 16 -2 q4 8 -6 10 q-12 2 -10 -8'/%3E%3Crect x='52' y='12' width='20' height='14' rx='5'/%3E%3Cpath d='M56 26 l-3 6 l8 -5'/%3E%3Ccircle cx='108' cy='20' r='7'/%3E%3Cpath d='M104 44 h16 M112 40 l-6 8 M112 40 l6 8'/%3E%3Cpath d='M18 70 h16 v12 h-16 z M22 66 v4 M30 66 v4'/%3E%3Cpath d='M60 60 q10 -8 20 0 q4 10 -8 14 q-14 2 -12 -14'/%3E%3Ccircle cx='116' cy='74' r='6'/%3E%3Cpath d='M112 74 h8 M116 70 v8'/%3E%3Cpath d='M16 110 l10 -6 l10 6 v12 h-20 z'/%3E%3Cpath d='M58 108 h18 a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 h-18 a4 4 0 0 1 -4 -4 v-8 a4 4 0 0 1 4 -4 z'/%3E%3Cpath d='M104 104 l8 8 l16 -18'/%3E%3C/g%3E%3C/svg%3E\")";

// ---------------------------------------------------------------------------
// Resilient message insert.
// The `messages` table may or may not have these optional columns (they're
// added later via SQL migrations). We try with them first and drop any column
// the schema cache reports as missing, so BOTH schemas work.
// ---------------------------------------------------------------------------
const OPTIONAL_MSG_COLS = [
  "receiver_id",
  "message_type",
  "is_read",
  "file_url",
  "file_type",
  "audio_url",
  "summary",
];
const colSupported: Record<string, boolean> = {};
// Flipped to false once we learn the read-receipt columns don't exist, so the
// mark-as-read UPDATE isn't retried (and can't error) on every message.
let readReceiptsSupported = true;

async function insertMessage(payload: Record<string, any>) {
  const p: Record<string, any> = {
    created_at: new Date().toISOString(),
    ...payload,
  };
  // Skip columns we already learned are missing (avoids a failing round-trip).
  for (const c of OPTIONAL_MSG_COLS) {
    if (colSupported[c] === false) delete p[c];
  }

  for (let i = 0; i <= OPTIONAL_MSG_COLS.length; i++) {
    const { data, error } = await supabase.from("messages").insert(p).select().single();
    if (!error) {
      for (const c of OPTIONAL_MSG_COLS) if (c in p) colSupported[c] = true;
      return { data, error: null as any };
    }

    const msg = `${error.message || ""} ${error.details || ""}`;
    const flagged = OPTIONAL_MSG_COLS.find((c) => c in p && msg.includes(c));
    if (flagged) {
      // Column doesn't exist yet → drop it and retry without it.
      colSupported[flagged] = false;
      if (flagged === "is_read") readReceiptsSupported = false;
      delete p[flagged];
      continue;
    }
    return { data, error };
  }
  return { data: null, error: { message: "Could not insert message" } };
}

// ---------------------------------------------------------------------------
// Read-receipt tick status for MY messages only:
//   "sent"      → single grey tick   (inserted, no delivered_at yet)
//   "delivered" → double grey tick   (delivered_at set)
//   "read"      → double BLUE tick   (is_read === true)
// Received messages return null (no ticks shown on them).
// ---------------------------------------------------------------------------
function getTickStatus(msg: Message, myId?: string | null): "sent" | "delivered" | "read" | null {
  if (!myId || msg.sender_id !== myId) return null;
  if (msg.is_read === true) return "read";
  if (msg.delivered_at) return "delivered";
  return "sent";
}

// ---------------------------------------------------------------------------
// Resilient insert for group_messages (file_url / file_type / audio_url /
// delivered_at only exist after SUPABASE_MEGA_UPGRADE.sql is run).
// ---------------------------------------------------------------------------
const OPTIONAL_GROUP_COLS = ["file_url", "file_type", "audio_url", "summary"];
let groupColsSupported = true;

async function insertGroupMessage(payload: Record<string, any>) {
  const p: Record<string, any> = {
    created_at: new Date().toISOString(),
    ...payload,
  };
  if (!groupColsSupported) for (const c of OPTIONAL_GROUP_COLS) delete p[c];

  for (let i = 0; i <= OPTIONAL_GROUP_COLS.length; i++) {
    const { data, error } = await supabase.from("group_messages").insert(p).select().single();
    if (!error) return { data, error: null as any };

    const msg = `${error.message || ""} ${error.details || ""}`;
    const flagged = OPTIONAL_GROUP_COLS.find((c) => c in p && msg.includes(c));
    if (flagged) {
      groupColsSupported = false;
      delete p[flagged];
      continue;
    }
    return { data, error };
  }
  return { data: null, error: { message: "Could not send group message" } };
}

// ---------------------------------------------------------------------------
// Group tick status (same 3 states as 1-1, but "read" requires EVERY other
// member to have a row in group_message_reads).
// ---------------------------------------------------------------------------
function groupTickStatus(
  m: GroupMessage,
  myId: string | null | undefined,
  memberCount: number,
  reads: { message_id: string; user_id: string }[]
): "sent" | "delivered" | "read" | null {
  if (!myId || m.sender_id !== myId) return null;
  if (!m.delivered_at) return "sent";
  const others = Math.max(1, memberCount - 1);
  const readers = new Set(
    reads.filter((r) => r.message_id === m.id && r.user_id !== myId).map((r) => r.user_id)
  );
  return readers.size >= others ? "read" : "delivered";
}

const SENDER_COLORS = [
  "#e91e63",
  "#9c27b0",
  "#3f51b5",
  "#009688",
  "#ff5722",
  "#795548",
  "#607d8b",
];
function senderColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SENDER_COLORS[h % SENDER_COLORS.length];
}

// ---------------------------------------------------------------------------
// Classify a message when `message_type` isn't stored (column not added yet),
// by inferring from the content. Text stays text; storage URLs become media.
// Works for both `messages` and `group_messages` rows (structural typing).
// ---------------------------------------------------------------------------
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi|mkv)$/i;
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|opus|weba|ogg)$/i;
const FILE_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z|tar|gz)$/i;

interface MsgLike {
  sender_id: string;
  content?: string | null;
  message_type?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  audio_url?: string | null;
}

function classifyMessage(msg: MsgLike): "text" | "image" | "video" | "audio" | "file" {
  if (msg.audio_url || msg.message_type === "audio") return "audio";
  const ft = (msg.file_type || "").toLowerCase();
  if (ft.startsWith("image") || msg.message_type === "image") return "image";
  if (ft.startsWith("video")) return "video";
  if ((msg.file_url || "").trim()) return "file";
  if (msg.message_type === "file") return "file";
  const c = (msg.content || "").trim();
  if (!/^https?:\/\//i.test(c)) return "text";
  const path = c.split(/[?#]/)[0];
  if (IMAGE_EXT.test(path)) return "image";
  if (VIDEO_EXT.test(path)) return "video";
  if (AUDIO_EXT.test(path)) return "audio";
  if (FILE_EXT.test(path)) return "file";
  return "text";
}

export default function ChatPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState("");

  // 3-dots menu
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menu-driven panels
  const [showContact, setShowContact] = useState(false);
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // Emoji
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Wallpaper + bubble theme (persisted)
  const [wallpaperId, setWallpaperId] = useState("default");
  const [bubbleColor, setBubbleColor] = useState("#dcf8c6");

  // Attach
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Sidebar tabs + groups
  const [sidebarTab, setSidebarTab] = useState<"chats" | "groups">("chats");
  const [groups, setGroups] = useState<GroupMeta[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupMeta | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupReads, setGroupReads] = useState<{ message_id: string; user_id: string }[]>([]);
  const [groupMembers, setGroupMembers] = useState<Profile[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Typing + presence (table-backed)
  const [typingMap, setTypingMap] = useState<Record<string, number>>({});
  const [peerPresence, setPeerPresence] = useState<{
    is_online?: boolean | null;
    last_seen?: string | null;
  } | null>(null);

  // Stories
  const [storyTarget, setStoryTarget] = useState<StoryGroup | null>(null);
  const [storyUserIds, setStoryUserIds] = useState<Set<string>>(new Set());
  const [storyGroupsMap, setStoryGroupsMap] = useState<Map<string, StoryGroup>>(new Map());

  // AI Summary Modal state
  const [summaryData, setSummaryData] = useState<{ title: string; result: SummaryResult } | null>(null);
  const [newSubmissionsCount, setNewSubmissionsCount] = useState(0);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);

  // Refs (read inside long-lived realtime subscriptions)
  const scrollRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<any>(null);
  const selectedRef = useRef<Profile | null>(null);
  const profilesRef = useRef<Profile[]>([]);
  const convIdRef = useRef<string | null>(null);
  const chatChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);

  // Group / typing / presence / voice refs
  const selectedGroupRef = useRef<GroupMeta | null>(null);
  const tablesChannelRef = useRef<any>(null);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingLastPushRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recStartRef = useRef(0);
  const recCancelRef = useRef(false);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dark = theme === "dark";

  // WebRTC calling (audio + video), signaling over Supabase broadcast
  const rtc = useWebRTCCall(user?.id, (id: string) => {
    const p = profilesRef.current.find((x) => x.id === id);
    const name = p?.full_name || "Unknown";
    return { name, initial: (name || "U").charAt(0).toUpperCase() };
  });

  // Mark mounted (avoids hydration mismatch for theme-dependent UI)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch current auth user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }: any) => {
      if (u) {
        userRef.current = u;
        setUser(u);
      } else {
        router.push("/auth/signin");
      }
    });
  }, [router]);

  // Load other users' profiles
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", user.id)
          .order("full_name", { ascending: true });
        if (data) {
          const list = data as Profile[];
          profilesRef.current = list;
          setProfiles(list);
        }
      } catch {
        /* non-critical */
      }
    })();
  }, [user?.id]);

  // Restore wallpaper + bubble color from localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const w = localStorage.getItem("ch_wallpaper");
      const b = localStorage.getItem("ch_bubble");
      if (w) setWallpaperId(w);
      if (b) setBubbleColor(b);
    } catch {
      /* storage may be unavailable */
    }
  }, [mounted]);

  // Find (or create) the conversation shared by the two users
  const getOrCreateConversation = async (myId: string, otherId: string): Promise<string | null> => {
    try {
      const { data: mine } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", myId);
      const myConvIds = (mine || []).map((p: any) => p.conversation_id);

      if (myConvIds.length > 0) {
        const { data: otherPart } = await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", myConvIds)
          .eq("user_id", otherId);
        const shared = (otherPart || []).find((p: any) =>
          myConvIds.includes(p.conversation_id)
        );
        if (shared) return shared.conversation_id;
      }

      // No shared conversation → create one + both participants
      const { data: newConv, error: convErr } = await supabase
        .from("conversations")
        .insert({ created_by: myId })
        .select()
        .single();
      if (convErr || !newConv) return null;

      await supabase.from("conversation_participants").insert([
        { conversation_id: newConv.id, user_id: myId },
        { conversation_id: newConv.id, user_id: otherId },
      ]);
      return newConv.id;
    } catch {
      return null;
    }
  };

  // Load every message exchanged between the two users (pair OR filter, so
  // full history loads regardless of conversation_id bookkeeping).
  const loadMessages = async (myId: string, otherId: string) => {
    setIsLoading(true);
    try {
      const pairFilter =
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),` +
        `and(sender_id.eq.${otherId},receiver_id.eq.${myId})`;

      // Safety net: rows written before receiver_id was populated only carry
      // conversation_id — also include messages from conversations these two
      // users share so older history still loads.
      let convBranch = "";
      try {
        const { data: mine } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", myId);
        const myConvIds = (mine || []).map((p: any) => p.conversation_id);
        if (myConvIds.length) {
          const { data: shared } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .in("conversation_id", myConvIds)
            .eq("user_id", otherId);
          const sharedIds = (shared || []).map((p: any) => p.conversation_id);
          if (sharedIds.length) {
            convBranch = `,conversation_id.in.(${sharedIds.join(",")})`;
          }
        }
      } catch {
        /* pair filter alone still works */
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`${pairFilter}${convBranch}`)
        .order("created_at", { ascending: true });

      if (error) {
        console.log("Load messages error:", error.message);
      } else if (data && selectedRef.current?.id === otherId) {
        // Ignore stale responses if the user switched chats mid-flight
        setMessages(data as Message[]);
      }
    } catch (err: any) {
      console.log("Load messages error:", err?.message);
    }
    if (selectedRef.current?.id === otherId) setIsLoading(false);
  };

  // Load a group conversation: members, history, per-user reads
  const loadGroupConversation = async (gid: string) => {
    setIsLoading(true);
    try {
      const { data: memRows } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", gid);
      const ids = (memRows || []).map((r: any) => r.user_id);
      let memberProfiles: Profile[] = [];
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("*").in("id", ids);
        memberProfiles = (ps || []) as Profile[];
      }

      const { data: gms } = await supabase
        .from("group_messages")
        .select("*")
        .eq("group_id", gid)
        .order("created_at", { ascending: true })
        .limit(300);

      let reads: { message_id: string; user_id: string }[] = [];
      try {
        const mids = (gms || []).map((m: any) => m.id);
        if (mids.length) {
          const { data: rr } = await supabase
            .from("group_message_reads")
            .select("message_id, user_id")
            .in("message_id", mids);
          reads = (rr || []) as any;
        }
      } catch {
        /* table may not exist until SQL runs */
      }

      if (selectedGroupRef.current?.id !== gid) return; // stale response
      setGroupMembers(memberProfiles);
      setGroupMessages((gms || []) as GroupMessage[]);
      setGroupReads(reads);
    } catch (err: any) {
      console.log("Load group error:", err?.message);
    }
    if (selectedGroupRef.current?.id === gid) setIsLoading(false);
  };

  // Load the user's groups for the sidebar (with member count + last message)
  const loadGroups = async (myId: string) => {
    try {
      const { data: gm } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", myId);
      const gids = (gm || []).map((r: any) => r.group_id);
      if (!gids.length) {
        setGroups([]);
        return;
      }
      const [{ data: gs }, { data: memRows }, { data: lms }] = await Promise.all([
        supabase.from("groups").select("*").in("id", gids).order("created_at", { ascending: false }),
        supabase.from("group_members").select("group_id").in("group_id", gids),
        supabase
          .from("group_messages")
          .select("*")
          .in("group_id", gids)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      const counts: Record<string, number> = {};
      for (const r of memRows || []) counts[r.group_id] = (counts[r.group_id] || 0) + 1;
      const lastMsg: Record<string, GroupMessage> = {};
      for (const m of (lms || []) as GroupMessage[]) {
        if (!lastMsg[m.group_id]) lastMsg[m.group_id] = m;
      }
      setGroups(
        ((gs || []) as any[]).map((g) => ({
          ...g,
          member_count: counts[g.id] || 1,
          last_message: lastMsg[g.id]?.content
            ? String(lastMsg[g.id].content).slice(0, 60)
            : lastMsg[g.id]
              ? "Attachment"
              : null,
          last_at: lastMsg[g.id]?.created_at || null,
        }))
      );
    } catch (err: any) {
      console.log("Load groups error:", err?.message);
    }
  };

  // When a GROUP chat is opened: reset state, load members + history + reads
  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
    setGroupMessages([]);
    setGroupReads([]);
    setGroupMembers([]);
    if (selectedGroup && user?.id) {
      loadGroupConversation(selectedGroup.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup, user?.id]);

  // Load group list when the user is ready
  useEffect(() => {
    if (!user?.id) return;
    loadGroups(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // When a chat is opened: reset state, resolve conversation, load messages
  useEffect(() => {
    selectedRef.current = selected;
    setShowMenu(false);
    setShowEmoji(false);
    setShowContact(false);
    setShowWallpaper(false);
    setBlocked(false);

    if (selected && user?.id) {
      setMessages([]);
      const otherId = selected.id;
      (async () => {
        // Resolve the conversation (needed to attach conversation_id on send)
        // in parallel with loading history — history itself is pair-based.
        const convP = getOrCreateConversation(user.id, otherId).then((id) => {
          convIdRef.current = id;
          if (!id) console.log("No shared conversation row yet; using pair ids");
          return id;
        });
        await Promise.all([convP, loadMessages(user.id, otherId)]);
      })();
    } else {
      setMessages([]);
      convIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, user?.id]);

  // Realtime: one channel per (user, open chat) carrying BOTH events.
  // - INSERT: append new messages (deduped, JS pair filter). If I'm the
  //   receiver, instantly claim delivery by setting delivered_at, which flips
  //   the SENDER's tick from single grey to double grey via the UPDATE event.
  // - UPDATE: read receipts — when the receiver marks my message read, the
  //   tick flips live to blue.
  // The topic includes Date.now() so every subscription gets a FRESH topic:
  // reusing a topic name right after removeChannel is a known cause of
  // missed/delayed realtime events.
  useEffect(() => {
    const myId = user?.id;
    const otherId = selected?.id;
    const gid = selectedGroup?.id;
    if (!myId || (!otherId && !gid)) return;

    const claimDelivered = async (id: string) => {
      if (!readReceiptsSupported) return;
      const { error } = await supabase
        .from("messages")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        const msg = `${error.message || ""} ${error.details || ""}`;
        if (/is_read|read_at|delivered_at/i.test(msg)) readReceiptsSupported = false;
      }
    };

    const claimGroupDelivered = async (id: string) => {
      const { error } = await supabase
        .from("group_messages")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", id)
        .is("delivered_at", null);
      if (error) {
        const msg = `${error.message || ""} ${error.details || ""}`;
        if (/group_messages|delivered_at/i.test(msg)) groupColsSupported = false;
      }
    };

    const channel = supabase
      .channel(`chat-${myId}-${otherId || gid}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload: any) => {
          if (!otherId) return;
          const m = payload.new as Message;
          if (!m?.id) return;
          const belongs =
            (m.sender_id === myId && m.receiver_id === otherId) ||
            (m.sender_id === otherId && m.receiver_id === myId);
          if (!belongs) return;
          // Guard against a stale channel firing after switching chats
          if (selectedRef.current?.id !== otherId) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          // I am the receiver and it's not delivered yet → claim delivery now
          if (m.receiver_id === myId && !m.delivered_at) await claimDelivered(m.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload: any) => {
          if (!otherId) return;
          const updated = payload.new as Message;
          if (!updated?.id) return;
          // Only updates to MY sent messages matter (delivered/read receipts)
          if (updated.sender_id !== myId) return;
          if (selectedRef.current?.id !== otherId) return;
          setMessages((prev) =>
            prev.some((x) => x.id === updated.id)
              ? prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x))
              : prev
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages" },
        async (payload: any) => {
          const m = payload.new as GroupMessage;
          if (!m?.id || m.group_id !== gid) return;
          if (selectedGroupRef.current?.id !== gid) return;
          setGroupMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== myId && !m.delivered_at) await claimGroupDelivered(m.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "group_messages" },
        (payload: any) => {
          const m = payload.new as GroupMessage;
          if (!m?.id || m.sender_id !== myId) return;
          if (selectedGroupRef.current?.id !== gid) return;
          setGroupMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev.map((x) => (x.id === m.id ? { ...x, ...m } : x))
              : prev
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_message_reads" },
        (payload: any) => {
          const r = payload.new as { message_id: string; user_id: string };
          if (!r?.message_id || r.user_id === myId) return;
          setGroupReads((prev) =>
            prev.some((x) => x.message_id === r.message_id && x.user_id === r.user_id)
              ? prev
              : [...prev, r]
          );
        }
      )
      .subscribe((status) => console.log("Realtime", status));
    chatChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (chatChannelRef.current === channel) chatChannelRef.current = null;
    };
  }, [user?.id, selected?.id, selectedGroup?.id]);

  // Mark messages as READ — but only when the receiver actually opens the chat
  // and views it (1s delay, so a mere flash of the tab doesn't count). Sending
  // NEVER marks anything as read.
  useEffect(() => {
    const myId = user?.id;
    const otherId = selected?.id;
    const gid = selectedGroup?.id;

    const markDmRead = async () => {
      // Only rows where I am the RECEIVER and the open chat's user is the SENDER
      const { error } = await supabase
        .from("messages")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
        })
        .eq("receiver_id", myId)
        .eq("sender_id", otherId)
        .eq("is_read", false);
      if (error) {
        const msg = `${error.message || ""} ${error.details || ""}`;
        if (/is_read|read_at|delivered_at/i.test(msg)) {
          // Columns not migrated yet → disable receipts until SQL is run
          readReceiptsSupported = false;
          console.log("Read receipts inactive until the is_read migration runs");
        } else {
          console.log("Mark-as-read error:", error.message);
        }
        return;
      }
      // Reflect locally (same array ref when nothing changed → no effect loop)
      setMessages((prev) => {
        let changed = false;
        const ts = new Date().toISOString();
        const next = prev.map((m) => {
          if (m.sender_id === otherId && m.receiver_id === myId && !m.is_read) {
            changed = true;
            return { ...m, is_read: true, read_at: ts, delivered_at: m.delivered_at || ts };
          }
          return m;
        });
        return changed ? next : prev;
      });
    };

    // Group path: upsert my per-message read rows + claim delivery for
    // anything that arrived while I was offline.
    const markGroupRead = async () => {
      const incoming = groupMessages.filter((m) => m.sender_id !== myId);
      if (!incoming.length) return;
      const ts = new Date().toISOString();
      const ids = incoming.map((m) => m.id);
      try {
        await supabase.from("group_message_reads").upsert(
          ids.map((id) => ({ message_id: id, user_id: myId })),
          { onConflict: "message_id,user_id", ignoreDuplicates: true }
        );
        await supabase
          .from("group_messages")
          .update({ delivered_at: ts })
          .in("id", ids)
          .is("delivered_at", null);
      } catch (err: any) {
        console.log("Group mark-read error:", err?.message);
      }
      if (selectedGroupRef.current?.id !== gid) return;
      setGroupReads((prev) => {
        const seen = new Set(prev.map((r) => `${r.message_id}:${r.user_id}`));
        const add = ids
          .map((id) => ({ message_id: id, user_id: myId }))
          .filter((r) => !seen.has(`${r.message_id}:${r.user_id}`));
        return add.length ? [...prev, ...add] : prev;
      });
      setGroupMessages((prev) => {
        let changed = false;
        const next = prev.map((m) => {
          if (m.sender_id !== myId && !m.delivered_at) {
            changed = true;
            return { ...m, delivered_at: ts };
          }
          return m;
        });
        return changed ? next : prev;
      });
    };

    const run = () => {
      if (otherId && readReceiptsSupported) markDmRead();
      else if (gid) markGroupRead();
    };

    // Re-arms when messages change, so new messages arriving while the chat is
    // open get marked read after the same 1.5s "user is viewing" delay.
    const timer = setTimeout(run, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, selectedGroup, user?.id, messages, groupMessages]);

  // Global table channel: typing indicators (INSERT/UPDATE/DELETE) + peer
  // presence updates. Created ONCE per user (no server-side filter, JS
  // filtered), so there's no topic-reuse race on chat switches.
  useEffect(() => {
    const myId = user?.id;
    if (!myId) return;

    const markTyping = (uid: string) => {
      setTypingMap((prev) => ({ ...prev, [uid]: Date.now() }));
      if (typingTimersRef.current[uid]) clearTimeout(typingTimersRef.current[uid]);
      typingTimersRef.current[uid] = setTimeout(() => {
        setTypingMap((prev) => {
          if (!(uid in prev)) return prev;
          const next = { ...prev };
          delete next[uid];
          return next;
        });
      }, 4000);
    };

    const applyTyping = (r: any) => {
      if (!r?.sender_id || r.sender_id === myId || r.is_typing === false) return;
      const dmMine = r.receiver_id === myId && selectedRef.current?.id === r.sender_id;
      const grpMine = !!r.group_id && r.group_id === selectedGroupRef.current?.id;
      if (dmMine || grpMine) markTyping(r.sender_id);
    };

    const channel = supabase
      .channel(`tables-${myId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "typing_indicators" },
        ({ payload }: any) => applyTyping(payload.new)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "typing_indicators" },
        ({ payload }: any) => applyTyping(payload.new)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "typing_indicators" },
        ({ payload }: any) => {
          const r = payload.old;
          if (!r?.sender_id) return;
          setTypingMap((prev) => {
            if (!(r.sender_id in prev)) return prev;
            const next = { ...prev };
            delete next[r.sender_id];
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_presence" },
        ({ payload }: any) => {
          const r = payload.new;
          if (r?.user_id && r.user_id === selectedRef.current?.id) setPeerPresence(r);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        ({ payload }: any) => {
          setNewSubmissionsCount((cnt) => cnt + 1);
          setNotice(`🔔 New submission received: ${payload?.new?.student_name || "Student"}`);
        }
      )
      .subscribe();
    tablesChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (tablesChannelRef.current === channel) tablesChannelRef.current = null;
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
    };
  }, [user?.id]);

  // user_presence: mark online on mount, heartbeat last_seen every 30s,
  // go offline on unload (keepalive fetch survives page teardown).
  useEffect(() => {
    const myId = user?.id;
    if (!myId) return;

    const touch = async (online: boolean) => {
      try {
        await supabase.from("user_presence").upsert(
          {
            user_id: myId,
            is_online: online,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      } catch {
        /* table may not exist until SQL runs */
      }
    };

    touch(true);
    const iv = setInterval(() => touch(true), 30000);

    const goOffline = () => {
      (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const tok = data?.session?.access_token;
          if (!tok) return;
          fetch(`${SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${myId}`, {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${tok}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              is_online: false,
              last_seen: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
            keepalive: true,
          }).catch(() => undefined);
        } catch {
          /* ignore */
        }
      })();
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") goOffline();
      else touch(true);
    };
    window.addEventListener("pagehide", goOffline);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(iv);
      window.removeEventListener("pagehide", goOffline);
      document.removeEventListener("visibilitychange", onVis);
      touch(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Peer presence: fetch last_seen when a 1-1 chat opens
  useEffect(() => {
    const other = selected?.id;
    if (!other) {
      setPeerPresence(null);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("user_presence")
          .select("*")
          .eq("user_id", other)
          .maybeSingle();
        if (selectedRef.current?.id === other) setPeerPresence((data as any) || null);
      } catch {
        /* table may not exist until SQL runs */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // (Read receipts now arrive on the merged chat channel above.)

  // Realtime presence: who is online
  useEffect(() => {
    if (!user?.id) return;
    const myId = user.id;
    const channel = supabase.channel("presence", {
      config: { presence: { key: myId } },
    });
    channel.on("presence", { event: "sync" }, () => {
      try {
        const state = channel.presenceState() as Record<string, unknown>;
        setOnlineUsers(Object.keys(state));
      } catch {
        /* ignore */
      }
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({ user_id: myId, online: true });
        } catch {
          /* ignore */
        }
      }
    });
    presenceChannelRef.current = channel;
    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [user?.id]);

  // Close the 3-dots menu / emoji picker on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setShowMenu(false);
      if (emojiRef.current && !emojiRef.current.contains(target)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Auto-clear notices
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  // Keep scrolled to the newest message
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages]);

  // --- Messaging ---
  const sendGroupText = async (text: string) => {
    const grp = selectedGroup;
    if (!grp || !user?.id) return;
    const { data, error } = await insertGroupMessage({
      group_id: grp.id,
      sender_id: user.id,
      content: text,
    });
    if (error) {
      setNotice(error.message || "Could not send group message");
      return;
    }
    const row = data as GroupMessage | null;
    setNewMessage("");
    if (row) setGroupMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newMessage.trim();
    if (!text || !user?.id) return;
    if (selectedGroup) {
      await sendGroupText(text);
      return;
    }
    if (!selected) return;

    try {
      const payload: Record<string, any> = {
        sender_id: user.id,
        content: text,
        conversation_id: convIdRef.current,
        // Read receipts: NEVER read or delivered on send — the RECEIVER's
        // client claims delivery (delivered_at) via realtime, and marks read
        // only after actually opening the chat. So: single grey tick first.
        is_read: false,
      };
      // Only kept if the column exists; auto-dropped otherwise.
      if (selected.id) payload.receiver_id = selected.id;

      const { data, error } = await insertMessage(payload);

      if (error) {
        console.log("Send error:", error.message);
        alert(error.message);
        return;
      }

      // Optimistic append of the row returned by .select().single()
      const row = data as Message | null;
      setNewMessage("");
      if (row) {
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      }
    } catch (err: any) {
      console.log("Send error:", err?.message);
      alert(err?.message || "Failed to send message");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- AI Chat Summaries (Extractive NLP) ---
  const handleSummarizeChat = () => {
    const chatTitle = selectedGroup ? selectedGroup.name : selected?.full_name || "Direct Chat";
    const chatMsgs = selectedGroup
      ? groupMessages.map((m) => ({
          senderName:
            m.sender_id === user?.id
              ? "Me"
              : groupMembers.find((p) => p.id === m.sender_id)?.full_name || "Member",
          text: m.content || "",
          created_at: m.created_at,
        }))
      : messages.map((m) => ({
          senderName: m.sender_id === user?.id ? "Me" : selected?.full_name || "User",
          text: m.content || "",
          created_at: m.created_at,
        }));

    const result = generateChatSummary(chatMsgs, chatTitle);
    setSummaryData({ title: chatTitle, result });
  };

  const handlePostSummary = async (summaryText: string) => {
    if (selectedGroup && user?.id) {
      const { data } = await insertGroupMessage({
        group_id: selectedGroup.id,
        sender_id: user.id,
        content: summaryText,
        summary: summaryText,
      });
      if (data) {
        setGroupMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as GroupMessage]));
      }
      setNotice("AI Summary posted to group");
    } else if (selected && user?.id) {
      const payload: Record<string, any> = {
        sender_id: user.id,
        receiver_id: selected.id,
        conversation_id: convIdRef.current,
        content: summaryText,
        summary: summaryText,
        is_read: false,
      };
      const { data } = await insertMessage(payload);
      if (data) {
        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]));
      }
      setNotice("AI Summary posted to chat");
    }
  };

  // --- Emoji ---
  const onEmojiClick = (e: EmojiClickData) => {
    setNewMessage((prev) => prev + e.emoji);
  };

  // --- Attach (upload to storage, then send as image/file message) ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const myId = user?.id;
    if (!file || !myId || (!selected && !selectedGroup)) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("chat-files")
        .upload(fileName, file, { contentType: file.type || undefined });
      if (error) {
        console.log("Upload error:", error.message);
        setNotice(
          error.message.includes("bucket")
            ? "Run SUPABASE_MEGA_UPGRADE.sql to enable media sharing"
            : error.message
        );
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-files").getPublicUrl(fileName);
      const isImage = file.type.startsWith("image");

      if (selectedGroup) {
        const { data, error: insErr } = await insertGroupMessage({
          group_id: selectedGroup.id,
          sender_id: myId,
          content: publicUrl,
          file_url: publicUrl,
          file_type: file.type || "application/octet-stream",
        });
        if (insErr) {
          setNotice(insErr.message || "Could not send attachment");
          return;
        }
        const row = data as GroupMessage | null;
        if (row)
          setGroupMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        return;
      }
      if (!selected) return;

      const payload: Record<string, any> = {
        sender_id: myId,
        content: publicUrl,
        conversation_id: convIdRef.current,
        // Same receipt rules as text: never read/delivered on send.
        is_read: false,
        receiver_id: selected.id,
        message_type: isImage ? "image" : "file",
        file_url: publicUrl,
        file_type: file.type || "application/octet-stream",
      };

      const { data, error: insErr } = await insertMessage(payload);

      if (insErr) {
        console.log("Attachment send error:", insErr.message);
        setNotice(insErr.message);
        return;
      }

      const row = data as Message | null;
      if (row) setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    } catch (err: any) {
      console.log("Upload error:", err?.message);
      setNotice(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // --- Voice messages (hold the mic to record, release to send) ---
  const startRecording = async () => {
    if (recording || !user?.id || (!selected && !selectedGroup)) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });

      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 128000,
      };
      if (mimeType) {
        options.mimeType = mimeType;
      }

      const rec = new MediaRecorder(stream, options);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const elapsed = Date.now() - recStartRef.current;
        setRecording(false);
        setRecSeconds(0);
        if (recCancelRef.current || elapsed < 500) {
          recCancelRef.current = false;
          return;
        }
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        sendVoiceMessage(blob);
      };
      rec.start();
      recorderRef.current = rec;
      recStartRef.current = Date.now();
      recCancelRef.current = false;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => {
        setRecSeconds(Math.floor((Date.now() - recStartRef.current) / 1000));
      }, 500);
    } catch (err: any) {
      console.log("Recording error:", err?.message);
      setNotice(
        err?.name === "NotAllowedError" || err?.name === "SecurityError"
          ? "Microphone blocked by the browser — allow mic access to send voice notes"
          : "Voice recording is not supported in this browser"
      );
    }
  };

  const stopRecording = (cancel = false) => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    if (cancel) recCancelRef.current = true;
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    try {
      recorderRef.current.stop();
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
  };

  const sendVoiceMessage = async (blob: Blob) => {
    const myId = user?.id;
    if (!myId) return;
    setUploading(true);
    try {
      const ext = (blob.type.split("/")[1] || "webm").split(";")[0] || "webm";
      const path = `voice_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("chat-files")
        .upload(path, blob, { contentType: blob.type || "audio/webm" });
      if (error) {
        setNotice(
          error.message.includes("bucket")
            ? "Run SUPABASE_MEGA_UPGRADE.sql to enable voice messages"
            : error.message
        );
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-files").getPublicUrl(path);

      if (selectedGroup) {
        const { data, error: insErr } = await insertGroupMessage({
          group_id: selectedGroup.id,
          sender_id: myId,
          content: publicUrl,
          file_url: publicUrl,
          file_type: blob.type || "audio/webm",
          audio_url: publicUrl,
        });
        if (insErr) {
          setNotice(insErr.message || "Could not send voice message");
          return;
        }
        const row = data as GroupMessage | null;
        if (row)
          setGroupMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        return;
      }
      if (!selected) return;

      const payload: Record<string, any> = {
        sender_id: myId,
        content: publicUrl,
        conversation_id: convIdRef.current,
        is_read: false,
        receiver_id: selected.id,
        message_type: "audio",
        file_url: publicUrl,
        file_type: blob.type || "audio/webm",
        audio_url: publicUrl,
      };
      const { data, error: insErr } = await insertMessage(payload);
      if (insErr) {
        setNotice(insErr.message || "Could not send voice message");
        return;
      }
      const row = data as Message | null;
      if (row) setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    } catch (err: any) {
      console.log("Voice message error:", err?.message);
      setNotice(err?.message || "Voice message failed");
    } finally {
      setUploading(false);
    }
  };

  // --- Typing indicator push (throttled while composing, delete 2s after idle) ---
  const resetTypingStop = (delay = 2000) => {
    const myId = user?.id;
    if (!myId) return;
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    typingStopRef.current = setTimeout(() => {
      (async () => {
        try {
          if (selectedGroupRef.current) {
            await supabase
              .from("typing_indicators")
              .delete()
              .eq("sender_id", myId)
              .eq("group_id", selectedGroupRef.current.id);
          } else if (selectedRef.current) {
            await supabase
              .from("typing_indicators")
              .delete()
              .eq("sender_id", myId)
              .eq("receiver_id", selectedRef.current.id);
          }
        } catch {
          /* typing is best-effort */
        }
      })();
    }, delay);
  };

  const pushTyping = () => {
    const myId = user?.id;
    if (!myId) return;
    const now = Date.now();
    if (now - typingLastPushRef.current < 1500) {
      resetTypingStop();
      return;
    }
    typingLastPushRef.current = now;
    (async () => {
      try {
        const grp = selectedGroupRef.current;
        if (grp) {
          const { data } = await supabase
            .from("typing_indicators")
            .update({ is_typing: true, updated_at: new Date().toISOString() })
            .eq("sender_id", myId)
            .eq("group_id", grp.id)
            .select("id");
          if (!data || data.length === 0) {
            await supabase
              .from("typing_indicators")
              .insert({ sender_id: myId, group_id: grp.id, is_typing: true });
          }
        } else if (selectedRef.current) {
          const otherId = selectedRef.current.id;
          const { data } = await supabase
            .from("typing_indicators")
            .update({ is_typing: true, updated_at: new Date().toISOString() })
            .eq("sender_id", myId)
            .eq("receiver_id", otherId)
            .is("group_id", null)
            .select("id");
          if (!data || data.length === 0) {
            await supabase
              .from("typing_indicators")
              .insert({ sender_id: myId, receiver_id: otherId, is_typing: true });
          }
        }
      } catch {
        /* typing is best-effort */
      }
    })();
    resetTypingStop();
  };

  // --- Calls (WebRTC audio/video via the useWebRTCCall hook) ---
  const startRtcCall = (kind: "audio" | "video") => {
    if (!user?.id || !selected || rtc.call || rtc.incoming) return;
    rtc.startCall({ id: selected.id, full_name: selected.full_name }, kind);
  };

  // --- 3-dots menu actions ---
  const menuItemClass = (isDark: boolean) =>
    `w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${
      isDark ? "text-[#E9EDEF] hover:bg-white/10" : "text-[#111B21] hover:bg-black/5"
    }`;

  const onMenuItem = (action: string) => {
    setShowMenu(false);
    if (action === "view") {
      if (selectedGroup) setShowGroupInfo(true);
      else if (selected) setShowContact(true);
    }
    else if (action === "wallpaper") setShowWallpaper(true);
    else if (action === "clear") {
      if (selectedGroup) setGroupMessages([]);
      else setMessages([]);
    }
    else if (action === "block") setBlocked((b) => !b);
    else if (action === "report") setNotice("Reported. Our team will review this account.");
  };

  // --- Wallpaper / bubble persistence ---
  const selectWallpaper = (id: string) => {
    setWallpaperId(id);
    try {
      localStorage.setItem("ch_wallpaper", id);
    } catch {
      /* ignore */
    }
  };

  const selectBubble = (color: string) => {
    setBubbleColor(color);
    try {
      localStorage.setItem("ch_bubble", color);
    } catch {
      /* ignore */
    }
  };

  // --- Misc ---
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/signin");
  };

  const toggleTheme = () => setTheme(dark ? "light" : "dark");

  function formatPKTime(isoString?: string) {
    if (!isoString) return '';
    const s = String(isoString);
    const normalized = !s.endsWith('Z') && !/[+-]\d{2}/.test(s)
      ? (s.includes('T') ? s + 'Z' : s.replace(' ', 'T') + 'Z')
      : s;
    return new Date(normalized).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  const isOnline = (id: string) => onlineUsers.includes(id);

  const fileNameFromUrl = (url: string) => {
    try {
      return decodeURIComponent(url.split("/").pop() || "attachment");
    } catch {
      return "attachment";
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
    );
  });

  // Wallpaper background applied to the messages area
  const activeWallpaper = wallpapers.find((w) => w.id === wallpaperId) || wallpapers[0];
  const wallpaperBg =
    activeWallpaper.id === "default" ? (dark ? "#0b141a" : "#ffffff") : activeWallpaper.bg;
  const messagesAreaStyle: React.CSSProperties = {
    backgroundColor: wallpaperBg,
    backgroundImage: activeWallpaper.pattern ? WA_DOODLE : undefined,
    backgroundSize: activeWallpaper.pattern ? "140px 140px" : undefined,
    backgroundRepeat: activeWallpaper.pattern ? "repeat" : undefined,
  };

  // --- Derived: typing display, group counts, unified message view items ---
  const dmTyping = selected
    ? !!typingMap[selected.id] && Date.now() - typingMap[selected.id] < 5000
    : false;
  const groupTypingNames = selectedGroup
    ? groupMembers
        .filter(
          (m) => m.id !== user?.id && typingMap[m.id] && Date.now() - typingMap[m.id] < 5000
        )
        .map((m) => (m.full_name || "Someone").split(" ")[0])
    : [];
  const groupMemberCount = groupMembers.length || selectedGroup?.member_count || 1;

  const viewItems = (selected
    ? messages.map((m) => {
        const kind = classifyMessage(m);
        return {
          id: m.id,
          isMine: m.sender_id === user?.id,
          senderName: null as string | null,
          senderId: m.sender_id,
          kind,
          url: kind === "text" ? "" : m.file_url || m.audio_url || m.content,
          text: m.content,
          tick: getTickStatus(m, user?.id),
          created_at: m.created_at,
        };
      })
    : selectedGroup
      ? groupMessages.map((m) => {
          const kind = classifyMessage(m);
          const mine = m.sender_id === user?.id;
          return {
            id: m.id,
            isMine: mine,
            senderName: mine
              ? null
              : groupMembers.find((p) => p.id === m.sender_id)?.full_name || "Unknown",
            senderId: m.sender_id,
            kind,
            url: kind === "text" ? "" : m.file_url || m.audio_url || m.content || "",
            text: m.content || "",
            tick: groupTickStatus(m, user?.id, groupMemberCount, groupReads),
            created_at: m.created_at,
          };
        })
      : []
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const callStatusText = rtc.call
    ? rtc.call.status === "active"
      ? "Connected"
      : rtc.call.status === "connecting"
        ? "Connecting…"
        : rtc.call.dir === "outgoing"
          ? "Ringing…"
          : "Ringing…"
    : "";

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="h-screen flex bg-[#F0F2F5] dark:bg-[#111B21] animate-fade-in">
        <div className="flex-1 flex items-center justify-center">
          <MessageCircle size={48} className="text-brand-500 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left sidebar */}
      <aside
        className={`${
          selected || selectedGroup ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-[380px] h-screen border-r shadow-lg z-10 ${
          dark ? "bg-[#111B21] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
        }`}
      >
        <div
          className={`h-[59px] flex items-center justify-between px-4 border-b ${
            dark ? "bg-[#202C33] border-[#2A3942]" : "bg-[#F0F2F5] border-[#E9EDEF]"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-semibold ring-2 ring-brand-500/30 ${
                dark ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
              }`}
            >
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <MessageCircle size={20} className="text-brand-500 shrink-0" />
              <span
                className={`font-semibold truncate ${
                  dark ? "text-[#E9EDEF]" : "text-[#111B21]"
                }`}
              >
                ConnectHub
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/assignments"
              title="Assignments & Presentations"
              aria-label="Assignments & Presentations"
              className={`p-2 rounded-full transition-colors ${
                dark
                  ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
              }`}
            >
              <FileCheck size={19} />
            </Link>
            <Link
              href="/teacher"
              title="Teacher Dashboard"
              aria-label="Teacher Dashboard"
              className={`p-2 rounded-full transition-colors relative ${
                dark
                  ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
              }`}
            >
              <GraduationCap size={20} />
              {newSubmissionsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </Link>
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label="Toggle theme"
              className={`p-2 rounded-full transition-colors ${
                dark
                  ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
              }`}
            >
              {dark ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button
              onClick={handleSignOut}
              className={`text-xs md:text-sm font-medium px-2.5 py-1.5 rounded-full transition-colors ${
                dark
                  ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
              }`}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stories bar (24h status) */}
        {user?.id && (
          <StoriesBar
            meId={user.id}
            meName={user?.email?.split("@")[0] || "Me"}
            profiles={profiles}
            onOpenGroup={setStoryTarget}
            onNotice={setNotice}
            onActiveStoriesChange={(ids, gMap) => {
              setStoryUserIds(ids);
              setStoryGroupsMap(gMap);
            }}
          />
        )}

        {/* Chats | Groups tabs */}
        <div className={`flex border-b ${dark ? "border-[#2A3942]" : "border-[#E9EDEF]"}`}>
          {(["chats", "groups"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setSidebarTab(t);
                if (t === "groups" && user?.id) loadGroups(user.id);
              }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                sidebarTab === t
                  ? "text-brand-500 border-b-2 border-brand-500"
                  : dark
                    ? "text-[#8696A0] hover:text-[#E9EDEF]"
                    : "text-[#667781] hover:text-[#111B21]"
              }`}
            >
              {t === "chats" ? "Chats" : "Groups"}
            </button>
          ))}
        </div>

        {sidebarTab === "chats" && (
        <div
          className={`p-3 border-b ${
            dark ? "bg-[#111B21] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
          }`}
        >
          <div className="relative">
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                dark ? "text-[#8696A0]" : "text-gray-500"
              }`}
            />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-full text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition ${
                dark
                  ? "bg-[#202C33] text-[#E9EDEF] placeholder-[#8696A0] hover:bg-[#2A3942]"
                  : "bg-[#F0F2F5] text-[#111B21] placeholder-[#667781] hover:bg-[#E9EDEF]"
              }`}
            />
          </div>
        </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {sidebarTab === "chats" ? (
            filteredProfiles.length === 0 ? (
              <div
                className={`text-center py-12 px-4 ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}
              >
                <p className="text-lg font-medium mb-2">Tap to start chatting</p>
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                const hasStory = storyUserIds.has(profile.id);
                return (
                <div
                  key={profile.id}
                  onClick={() => {
                    setSelectedGroup(null);
                    setSelected(profile);
                  }}
                  className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-2xl cursor-pointer transition-all duration-200 ${
                    selected?.id === profile.id
                      ? dark
                        ? "bg-[#2A3942] shadow-md shadow-black/25"
                        : "bg-[#F0F2F5] shadow-md shadow-black/5"
                      : dark
                        ? "hover:bg-[#202C33] hover:shadow-sm hover:shadow-black/25"
                        : "hover:bg-[#F5F6F6] hover:shadow-sm hover:shadow-black/5"
                  }`}
                >
                  <div
                    className={`relative shrink-0 ${
                      hasStory
                        ? "p-[2.5px] rounded-full bg-gradient-to-tr from-[#25d366] via-[#128c7e] to-[#075e54] cursor-pointer"
                        : ""
                    }`}
                    onClick={(e) => {
                      if (hasStory && storyGroupsMap.has(profile.id)) {
                        e.stopPropagation();
                        setStoryTarget(storyGroupsMap.get(profile.id)!);
                      }
                    }}
                    title={hasStory ? `View ${profile.full_name}'s status` : undefined}
                  >
                    <div
                      className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-lg font-semibold overflow-hidden ${
                        hasStory
                          ? "ring-2 ring-white dark:ring-[#111B21]"
                          : "ring-2 ring-brand-500/20"
                      } ${
                        dark ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        profile.full_name?.charAt(0).toUpperCase() || "U"
                      )}
                    </div>
                    {isOnline(profile.id) && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#111B21] shadow-[0_0_8px_#10B981]"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold truncate ${
                        dark ? "text-[#E9EDEF]" : "text-[#111B21]"
                      }`}
                    >
                      {profile.full_name || "Unknown User"}
                    </p>
                    <p className={`text-sm truncate ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
                      {isOnline(profile.id) ? "online" : "Tap to start chatting"}
                    </p>
                  </div>
                </div>
                );
              })
            )
          ) : (
            <>
              {/* New group button */}
              <button
                onClick={() => setShowCreateGroup(true)}
                className={`w-full flex items-center gap-3 p-3 mx-2 my-1 rounded-2xl cursor-pointer transition-all duration-200 ${
                  dark
                    ? "bg-brand-500/10 hover:bg-brand-500/20 text-brand-400"
                    : "bg-brand-500/10 hover:bg-brand-500/20 text-brand-700"
                }`}
              >
                <span className="w-[50px] h-[50px] rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0">
                  <Plus size={26} />
                </span>
                <span className="font-semibold">New group</span>
              </button>

              {groups.length === 0 ? (
                <div
                  className={`text-center py-12 px-4 ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}
                >
                  <p className="text-lg font-medium mb-2">No groups yet</p>
                  <p className="text-sm">Tap “New group” to create one</p>
                </div>
              ) : (
                groups.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => {
                      setSelected(null);
                      setSelectedGroup(g);
                    }}
                    className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-2xl cursor-pointer transition-all duration-200 ${
                      selectedGroup?.id === g.id
                        ? dark
                          ? "bg-[#2A3942] shadow-md shadow-black/25"
                          : "bg-[#F0F2F5] shadow-md shadow-black/5"
                        : dark
                          ? "hover:bg-[#202C33] hover:shadow-sm hover:shadow-black/25"
                          : "hover:bg-[#F5F6F6] hover:shadow-sm hover:shadow-black/5"
                    }`}
                  >
                    <div
                      className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-lg font-semibold ring-2 ring-brand-500/20 shrink-0 overflow-hidden ${
                        dark ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {g.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users size={22} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold truncate ${
                          dark ? "text-[#E9EDEF]" : "text-[#111B21]"
                        }`}
                      >
                        {g.name}
                      </p>
                      <p className={`text-sm truncate ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
                        {g.last_message ? `${g.last_message} · ` : ""}
                        {g.member_count} member{g.member_count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </aside>

      {/* Right main area */}
      <main
        className={`${
          selected || selectedGroup ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 ${dark ? "bg-[#0B141A]" : "bg-[#EFEAE2]"}`}
      >
        {!selected && !selectedGroup ? (
          <div
            className={`flex-1 flex flex-col items-center justify-center text-center px-6 animate-slide-up ${
              dark ? "wa-doodle-dark text-[#8696A0]" : "wa-doodle-light text-[#667781]"
            }`}
          >
            <MessageCircle size={72} className="mb-4 text-brand-500" />
            <h1
              className={`text-4xl font-bold mb-3 ${dark ? "text-[#E9EDEF]" : "text-[#111B21]"}`}
            >
              ConnectHub Web
            </h1>
            <p className="text-lg">Professional communication platform</p>
            <p className="text-sm mt-2">Select a user from the sidebar to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div
              className={`h-[59px] flex items-center justify-between px-4 border-b ${
                dark ? "bg-[#202C33] border-[#2A3942]" : "bg-[#F0F2F5] border-[#E9EDEF]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setSelected(null);
                    setSelectedGroup(null);
                  }}
                  aria-label="Back to chats"
                  className={`md:hidden p-2 rounded-full transition-colors ${
                    dark
                      ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                      : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                  }`}
                >
                  <ArrowLeft size={24} />
                </button>
                <div
                  className="flex items-center gap-3 min-w-0 cursor-pointer"
                  onClick={() => {
                    if (selectedGroup) setShowGroupInfo(true);
                    else if (selected) setShowContact(true);
                  }}
                  title={selectedGroup ? "View group info" : "View contact"}
                >
                  <div
                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-semibold ring-2 ring-brand-500/30 overflow-hidden ${
                      dark ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {selectedGroup ? (
                      selectedGroup.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedGroup.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users size={20} />
                      )
                    ) : (
                      selected?.full_name?.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`font-semibold truncate ${
                        dark ? "text-[#E9EDEF]" : "text-[#111B21]"
                      }`}
                    >
                      {selectedGroup ? selectedGroup.name : selected?.full_name || "Unknown User"}
                      {!selectedGroup && blocked && (
                        <span className="ml-2 text-xs font-normal text-red-500">(blocked)</span>
                      )}
                    </p>
                    <p
                      className={`text-sm truncate ${
                        dmTyping || groupTypingNames.length
                          ? "text-brand-500 font-medium"
                          : !selectedGroup && (isOnline(selected?.id || "") || peerPresence?.is_online)
                            ? "text-brand-500 font-medium"
                            : dark
                              ? "text-[#8696A0]"
                              : "text-[#667781]"
                      }`}
                    >
                      {selectedGroup
                        ? `${groupTypingNames.length
                            ? `${groupTypingNames.slice(0, 2).join(", ")}${
                                groupTypingNames.length > 2 ? " and others" : ""
                              } is typing…`
                            : `${groupMemberCount} member${groupMemberCount === 1 ? "" : "s"}`}`
                        : dmTyping
                          ? "typing…"
                          : isOnline(selected?.id || "") || peerPresence?.is_online
                            ? "online"
                            : peerPresence?.last_seen
                              ? `Last seen ${new Date(peerPresence.last_seen).toLocaleString()}`
                              : "offline"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* AI Summarize Chat button */}
                <button
                  onClick={handleSummarizeChat}
                  title="Summarize chat with AI"
                  aria-label="Summarize chat with AI"
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold ${
                    dark
                      ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 shadow-sm"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-sm"
                  }`}
                >
                  <Sparkles size={14} className="text-emerald-500" />
                  <span className="hidden sm:inline">Summarize</span>
                </button>

                {!selectedGroup && (
                  <>
                    <button
                      onClick={() => startRtcCall("audio")}
                      aria-label="Voice call"
                      className={`p-2 rounded-full transition-colors ${
                        dark
                          ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                          : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                      }`}
                    >
                      <Phone size={20} />
                    </button>
                    <button
                      onClick={() => startRtcCall("video")}
                      aria-label="Video call"
                      className={`p-2 rounded-full transition-colors ${
                        dark
                          ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                          : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                      }`}
                    >
                      <Video size={20} />
                    </button>
                  </>
                )}

                {/* 3-dots menu (closes on outside click) */}
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setShowMenu((v) => !v)}
                    aria-label="More options"
                    aria-expanded={showMenu}
                    className={`p-2 rounded-full transition-colors ${
                      dark
                        ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                        : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                    }`}
                  >
                    <MoreVertical size={20} />
                  </button>

                  {showMenu && (
                    <div
                      className={`absolute right-0 top-full mt-1 w-52 rounded-xl border shadow-lg z-50 py-1 overflow-hidden ${
                        dark ? "bg-[#202C33] border-[#3B4A54]" : "bg-white border-[#E9EDEF]"
                      }`}
                    >
                      <button className={menuItemClass(dark)} onClick={() => onMenuItem("view")}>
                        {selectedGroup ? "Group info" : "View contact"}
                      </button>
                      <button
                        className={menuItemClass(dark)}
                        onClick={() => {
                          setShowMenu(false);
                          handleSummarizeChat();
                        }}
                      >
                        AI Summary
                      </button>
                      <button
                        className={menuItemClass(dark)}
                        onClick={() => onMenuItem("wallpaper")}
                      >
                        Change Wallpaper
                      </button>
                      <button className={menuItemClass(dark)} onClick={() => onMenuItem("clear")}>
                        Clear Chat
                      </button>
                      {!selectedGroup && (
                        <>
                          <button
                            className={`${menuItemClass(dark)} ${
                              blocked ? "text-brand-500" : "text-red-500"
                            }`}
                            onClick={() => onMenuItem("block")}
                          >
                            {blocked ? "Unblock User" : "Block User"}
                          </button>
                          <button
                            className={`${menuItemClass(dark)} text-red-500`}
                            onClick={() => onMenuItem("report")}
                          >
                            Report
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages area (wallpaper applied via style) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={messagesAreaStyle}>
              {isLoading ? (
                <div className="text-center py-8 text-[#667781] dark:text-[#8696A0]">
                  Loading messages...
                </div>
              ) : viewItems.length === 0 ? (
                <div className="text-center py-8 text-[#667781] dark:text-[#8696A0]">
                  {selectedGroup
                    ? "No messages yet. Say hi to the group!"
                    : "No messages yet. Start the conversation!"}
                </div>
              ) : (
                viewItems.map((item) => {
                  const isMine = item.isMine;
                  const tick = item.tick;
                  const bubbleStyle: React.CSSProperties = isMine
                    ? { backgroundColor: bubbleColor, color: "#111B21" }
                    : dark
                      ? { backgroundColor: "#202C33", color: "#E9EDEF" }
                      : { backgroundColor: "#ffffff", color: "#111B21" };
                  return (
                    <div
                      key={item.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] md:max-w-[70%] shadow-md px-3.5 py-2 animate-message-in ${
                          isMine ? "rounded-2xl rounded-tr-[4px]" : "rounded-2xl rounded-tl-[4px]"
                        }`}
                        style={bubbleStyle}
                      >
                        {item.senderName && (
                          <p
                            className="text-xs font-bold mb-1"
                            style={{ color: senderColor(item.senderId) }}
                          >
                            {item.senderName}
                          </p>
                        )}
                        {item.kind === "image" ? (
                          <img
                            src={item.url}
                            alt="attachment"
                            loading="lazy"
                            onClick={() => window.open(item.url, "_blank")}
                            className="rounded-lg max-w-[240px] max-h-[260px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          />
                        ) : item.kind === "video" ? (
                          <video
                            src={item.url}
                            controls
                            playsInline
                            preload="metadata"
                            className="rounded-lg max-w-[260px] max-h-[280px] bg-black"
                          />
                        ) : item.kind === "audio" ? (
                          <AudioPlayer src={item.url} mine={isMine} />
                        ) : item.kind === "file" ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="flex items-center gap-3 p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors max-w-xs"
                          >
                            <div className="w-10 h-10 rounded-lg bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                              <FileText size={20} />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="font-medium text-xs truncate underline">{fileNameFromUrl(item.url)}</p>
                              <p className="text-[10px] opacity-70">Click to download</p>
                            </div>
                            <Download size={16} className="opacity-60 shrink-0" />
                          </a>
                        ) : item.text.startsWith("✨ *AI Discussion Summary") || item.text.includes("*AI Summary") ? (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 text-xs md:text-sm">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 pb-1 border-b border-emerald-500/20">
                              <Sparkles size={14} className="text-emerald-500" />
                              <span>AI Chat Summary</span>
                            </div>
                            <p className="break-words whitespace-pre-wrap leading-relaxed">{item.text}</p>
                          </div>
                        ) : (
                          <p className="break-words whitespace-pre-wrap">{item.text}</p>
                        )}
                        <div
                          className="flex items-center justify-end gap-1 text-[11px] mt-1 opacity-70"
                          style={{ color: isMine ? "#111B21" : undefined }}
                        >
                          {formatPKTime(item.created_at)}
                          {/* Ticks: single grey = sent, double grey = delivered, double BLUE = read */}
                          {tick === "sent" && <Check size={14} style={{ color: "#667781" }} />}
                          {tick === "delivered" && (
                            <CheckCheck size={14} style={{ color: "#667781" }} />
                          )}
                          {tick === "read" && <CheckCheck size={14} style={{ color: "#53bdeb" }} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator inside message stream */}
              {(dmTyping || groupTypingNames.length > 0) && (
                <div className="flex justify-start animate-fade-in py-1">
                  <div
                    className={`px-3.5 py-2 rounded-2xl rounded-tl-[4px] text-xs shadow-md flex items-center gap-2 ${
                      dark ? "bg-[#202C33] text-[#E9EDEF]" : "bg-white text-[#111B21]"
                    }`}
                  >
                    <span className="font-medium text-brand-500">
                      {selectedGroup
                        ? `${groupTypingNames.slice(0, 2).join(", ")}${
                            groupTypingNames.length > 2 ? " and others" : ""
                          } is typing`
                        : `${selected?.full_name?.split(" ")[0] || "User"} is typing`}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={scrollRef}></div>
            </div>

            {/* Composer */}
            <div
              className={`p-3 border-t ${
                dark ? "bg-[#202C33] border-[#2A3942]" : "bg-[#F0F2F5] border-[#E9EDEF]"
              }`}
            >
              {blocked && (
                <p
                  className={`text-xs mb-2 ${
                    dark ? "text-[#8696A0]" : "text-[#667781]"
                  }`}
                >
                  You blocked this contact. Choose Unblock in the menu to reply.
                </p>
              )}
              <div className="flex items-center gap-2">
                {/* Emoji (closes on outside click) */}
                <div ref={emojiRef} className="relative">
                  <button
                    onClick={() => setShowEmoji((v) => !v)}
                    aria-label="Emoji"
                    aria-expanded={showEmoji}
                    className={`p-2 rounded-full transition-colors ${
                      dark
                        ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                        : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                    }`}
                  >
                    <Smile size={24} />
                  </button>
                  {showEmoji && (
                    <div style={{ position: "absolute", bottom: "60px", zIndex: 50 }}>
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme={dark ? "dark" : "light"}
                        width={300}
                        height={360}
                      />
                    </div>
                  )}
                </div>

                {/* Attach / Pin */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach file"
                  disabled={uploading}
                  className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
                    dark
                      ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                      : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                  }`}
                >
                  <Paperclip size={24} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  tabIndex={-1}
                />

                {/* Voice message — hold or tap to record */}
                {!recording && (
                  <button
                    onClick={() => {
                      if (!recording) startRecording();
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      startRecording();
                    }}
                    onPointerUp={() => {
                      if (Date.now() - recStartRef.current >= 800) {
                        stopRecording(false);
                      }
                    }}
                    onPointerLeave={() => {
                      if (recorderRef.current && Date.now() - recStartRef.current >= 800) {
                        stopRecording(true);
                      }
                    }}
                    onPointerCancel={() => stopRecording(true)}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-label="Record voice message"
                    title="Hold or tap to record voice message"
                    disabled={uploading || blocked}
                    style={{ touchAction: "none" }}
                    className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
                      dark
                        ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                        : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                    }`}
                  >
                    <Mic size={24} />
                  </button>
                )}

                {recording ? (
                  <div className="flex-1 flex items-center justify-between gap-3 px-4 py-2 rounded-full bg-red-500/10 text-red-500 text-sm font-medium">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <span className="truncate">
                        Recording {Math.floor(recSeconds / 60)}:
                        {(recSeconds % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => stopRecording(true)}
                        title="Discard recording"
                        aria-label="Discard recording"
                        className="p-1.5 rounded-full hover:bg-red-500/20 text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => stopRecording(false)}
                        title="Send voice note"
                        aria-label="Send voice note"
                        className="p-1.5 rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={uploading ? "Uploading…" : "Type a message"}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        if (e.target.value.trim()) {
                          pushTyping();
                        } else {
                          resetTypingStop(0);
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      disabled={blocked}
                      className={`flex-1 px-4 py-3 rounded-full text-sm border focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition disabled:opacity-60 ${
                        dark
                          ? "bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] placeholder-[#8696A0] hover:border-[#4A5A66]"
                          : "bg-white border-[#E9EDEF] text-[#111B21] placeholder-[#667781] hover:border-[#D1D7DB]"
                      }`}
                    />
                    <button
                      type="submit"
                      aria-label="Send message"
                      disabled={!newMessage.trim() || blocked || uploading}
                      className="p-3 rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 hover:shadow-brand-500/40 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* View Contact modal */}
      {showContact && selected && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowContact(false)}
        >
          <div
            className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${
              dark ? "bg-[#202C33] text-[#E9EDEF]" : "bg-white text-[#111B21]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Contact info</h3>
              <button
                onClick={() => setShowContact(false)}
                aria-label="Close contact info"
                className={`p-1 rounded-full ${dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold ring-2 ring-brand-500/30 ${
                  dark ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
                }`}
              >
                {selected.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{selected.full_name || "Unknown User"}</p>
                <p className={`text-sm truncate ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
                  {selected.email}
                </p>
                <p className={`text-sm ${isOnline(selected.id) ? "text-brand-500" : ""}`}>
                  {isOnline(selected.id) ? "online" : "offline"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Info modal */}
      {showGroupInfo && selectedGroup && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowGroupInfo(false)}
        >
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col ${
              dark ? "bg-[#202C33] text-[#E9EDEF]" : "bg-white text-[#111B21]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Group info</h3>
              <button
                onClick={() => setShowGroupInfo(false)}
                aria-label="Close group info"
                className={`p-1 rounded-full ${dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#E9EDEF] dark:border-[#2A3942]">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold ring-2 ring-brand-500/30 overflow-hidden shrink-0 ${
                  dark ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
                }`}
              >
                {selectedGroup.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedGroup.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={28} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-lg truncate">{selectedGroup.name}</p>
                <p className={`text-xs ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
                  Group · {groupMembers.length || selectedGroup.member_count} member{(groupMembers.length || selectedGroup.member_count) === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <p className="text-xs uppercase tracking-wide opacity-60 mb-2 font-medium">
              Members ({groupMembers.length || selectedGroup.member_count})
            </p>
            <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {groupMembers.map((m) => {
                const online = isOnline(m.id);
                const isMe = m.id === user?.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-[#2A3942] flex items-center justify-center font-semibold shrink-0 overflow-hidden">
                        {m.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (m.full_name || "U").charAt(0).toUpperCase()
                        )}
                      </div>
                      {online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#202C33]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.full_name || "Unknown"}
                        {isMe && <span className="ml-1 text-xs opacity-60 font-normal">(You)</span>}
                      </p>
                      <p className={`text-xs truncate ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
                        {online ? "online" : m.email || "Member"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Wallpaper & bubble picker */}
      {showWallpaper && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowWallpaper(false)}
        >
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${
              dark ? "bg-[#202C33] text-[#E9EDEF]" : "bg-white text-[#111B21]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Chat wallpaper</h3>
              <button
                onClick={() => setShowWallpaper(false)}
                aria-label="Close wallpaper picker"
                className={`p-1 rounded-full ${dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {wallpapers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => selectWallpaper(w.id)}
                  title={w.id}
                  aria-label={`Wallpaper ${w.id}`}
                  className={`h-14 rounded-xl border-2 transition ${
                    wallpaperId === w.id ? "border-brand-500" : "border-transparent"
                  }`}
                  style={{
                    backgroundColor:
                      w.id === "default" ? (dark ? "#0b141a" : "#ffffff") : w.bg,
                    backgroundImage: w.pattern ? WA_DOODLE : undefined,
                    backgroundSize: w.pattern ? "70px 70px" : undefined,
                  }}
                />
              ))}
            </div>

            <h3 className="text-lg font-semibold mt-6 mb-3">Bubble color</h3>
            <div className="grid grid-cols-4 gap-3">
              {bubbleColors.map((c) => (
                <button
                  key={c}
                  onClick={() => selectBubble(c)}
                  title={c}
                  aria-label={`Bubble color ${c}`}
                  className={`h-12 rounded-xl border-2 transition ${
                    bubbleColor === c ? "border-brand-500" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Incoming call modal */}
      {rtc.incoming && (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-black/70 p-4">
          <div
            className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center ${
              dark ? "bg-[#202C33] text-[#E9EDEF]" : "bg-white text-[#111B21]"
            }`}
          >
            <div
              className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-semibold ring-2 ring-brand-500/40 ${
                dark ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
              }`}
            >
              {rtc.incoming.fromInitial || "?"}
            </div>
            <p className="mt-3 text-sm uppercase tracking-wide opacity-70">
              Incoming {rtc.incoming.kind} call
            </p>
            <p className="text-xl font-semibold mt-1">{rtc.incoming.fromName}</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={rtc.rejectCall}
                className="flex-1 py-3 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={rtc.acceptCall}
                className="flex-1 py-3 rounded-xl font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active video call — fullscreen (hidden while the incoming modal is up) */}
      {rtc.call && rtc.call.kind === "video" && !rtc.incoming && (
        <div className="fixed inset-0 z-[140] bg-black flex flex-col">
          <video
            ref={rtc.remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <video
            ref={rtc.localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-4 right-4 w-28 h-36 md:w-40 md:h-52 rounded-xl object-cover shadow-lg border border-white/20 z-10"
          />
          <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10 text-white">
            <p className="font-semibold text-lg">{rtc.call.peerName}</p>
            <p className="text-sm opacity-80">{callStatusText}</p>
          </div>
          <div className="absolute bottom-8 inset-x-0 z-10 flex items-center justify-center gap-4">
            <button
              onClick={rtc.toggleMic}
              aria-label={rtc.micOn ? "Mute microphone" : "Unmute microphone"}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-white/15 text-white backdrop-blur hover:bg-white/25 transition-colors"
            >
              {rtc.micOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            <button
              onClick={rtc.endCall}
              aria-label="End call"
              className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg shadow-red-500/40 hover:bg-red-600 transition-colors"
            >
              <PhoneOff size={26} />
            </button>
            <button
              onClick={rtc.toggleCam}
              aria-label={rtc.camOn ? "Turn camera off" : "Turn camera on"}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-white/15 text-white backdrop-blur hover:bg-white/25 transition-colors"
            >
              {rtc.camOn ? <Camera size={24} /> : <CameraOff size={24} />}
            </button>
          </div>
        </div>
      )}

      {/* Active audio call — compact bar (hidden while the incoming modal is up) */}
      {rtc.call && rtc.call.kind === "audio" && !rtc.incoming && (
        <>
          <video ref={rtc.remoteVideoRef} autoPlay playsInline className="hidden" />
          <video ref={rtc.localVideoRef} autoPlay playsInline muted className="hidden" />
          <div
            className={`fixed top-4 right-4 z-[120] rounded-2xl border shadow-xl px-4 py-3 flex items-center gap-3 ${
              dark
                ? "bg-[#202C33] border-[#3B4A54] text-[#E9EDEF]"
                : "bg-white border-[#E9EDEF] text-[#111B21]"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold">
              {rtc.call.peerInitial || "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{rtc.call.peerName}</p>
              <p
                className={`text-xs ${
                  rtc.call.status === "active"
                    ? "text-brand-500"
                    : dark
                      ? "text-[#8696A0]"
                      : "text-[#667781]"
                }`}
              >
                {callStatusText}
                {rtc.call.status === "active" && !rtc.micOn ? " · muted" : ""}
              </p>
            </div>
            <button
              onClick={rtc.toggleMic}
              aria-label={rtc.micOn ? "Mute microphone" : "Unmute microphone"}
              className={`p-2 rounded-lg transition-colors ${
                rtc.micOn ? "text-brand-500" : "text-red-500"
              } ${dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
            >
              {rtc.micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button
              onClick={rtc.endCall}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              End
            </button>
          </div>
        </>
      )}

      {/* Call notice toast (declined / busy / no answer) */}
      {rtc.callNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[125] bg-black/85 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {rtc.callNotice}
        </div>
      )}

      {/* Story viewer */}
      {storyTarget && <StoryViewer group={storyTarget} onClose={() => setStoryTarget(null)} />}

      {/* Create group modal */}
      {showCreateGroup && user?.id && (
        <CreateGroupModal
          profiles={profiles}
          meId={user.id}
          onClose={() => setShowCreateGroup(false)}
          onCreated={async (g) => {
            setShowCreateGroup(false);
            setNotice("Group created");
            await loadGroups(user.id);
            setSelected(null);
            setSelectedGroup({
              id: g.id,
              name: g.name,
              description: "",
              avatar_url: g.avatar_url || null,
              created_by: user.id,
              member_count: 1,
            });
          }}
        />
      )}

      {/* AI Summary Modal */}
      {summaryData && (
        <SummaryModal
          title={summaryData.title}
          summary={summaryData.result}
          onClose={() => setSummaryData(null)}
          onPostToChat={handlePostSummary}
          isDark={dark}
        />
      )}

      {/* Transient notice */}
      {notice && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[130] bg-black/85 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {notice}
        </div>
      )}
    </div>
  );
}
