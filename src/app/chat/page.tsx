"use client";

import { supabase } from "../../lib/supabase";
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
} from "lucide-react";

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
  message_type?: string | null; // "text" | "image" | "file"
  is_read?: boolean | null; // read receipt: true once the RECEIVER opened the chat
  read_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

interface ActiveCall {
  id: string;
  with: Profile;
  dir: "incoming" | "outgoing";
  status: "ringing" | "active";
}

interface IncomingCall {
  id: string;
  caller_id: string;
  receiver_id: string;
  type?: string;
  status: string;
  with: Profile;
}

const ENDED_STATUSES = ["ended", "rejected", "missed", "declined", "failed", "cancelled"];

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
const OPTIONAL_MSG_COLS = ["receiver_id", "message_type", "is_read"];
const colSupported: Record<string, boolean> = {};
// Flipped to false once we learn the read-receipt columns don't exist, so the
// mark-as-read UPDATE isn't retried (and can't error) on every message.
let readReceiptsSupported = true;

async function insertMessage(payload: Record<string, any>) {
  const p: Record<string, any> = { ...payload };
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
// Classify a message when `message_type` isn't stored (column not added yet),
// by inferring from the content. Text stays text; storage URLs become media.
// ---------------------------------------------------------------------------
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;
const FILE_EXT =
  /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z|tar|gz|mp3|mp4|wav|mov|avi|mkv)$/i;

function classifyMessage(msg: Message): string {
  if (msg.message_type) return msg.message_type;
  const c = (msg.content || "").trim();
  if (!/^https?:\/\//i.test(c)) return "text";
  const path = c.split(/[?#]/)[0];
  if (IMAGE_EXT.test(path)) return "image";
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

  // Calls
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [micReady, setMicReady] = useState(false);

  // Refs (read inside long-lived realtime subscriptions)
  const scrollRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<any>(null);
  const selectedRef = useRef<Profile | null>(null);
  const profilesRef = useRef<Profile[]>([]);
  const convIdRef = useRef<string | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const callsChannelRef = useRef<any>(null);

  const dark = theme === "dark";

  const updateActiveCall = (v: ActiveCall | null) => {
    activeCallRef.current = v;
    setActiveCall(v);
  };
  const updateIncomingCall = (v: IncomingCall | null) => {
    incomingCallRef.current = v;
    setIncomingCall(v);
  };

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
    if (!myId || !otherId) return;

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

    const channel = supabase
      .channel(`chat-${myId}-${otherId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload: any) => {
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
      .subscribe((status) => console.log("Realtime", status));
    chatChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (chatChannelRef.current === channel) chatChannelRef.current = null;
    };
  }, [user?.id, selected?.id]);

  // Mark messages as READ — but only when the receiver actually opens the chat
  // and views it (1s delay, so a mere flash of the tab doesn't count). Sending
  // NEVER marks anything as read.
  useEffect(() => {
    const myId = user?.id;
    const otherId = selected?.id;
    if (!myId || !otherId || !readReceiptsSupported) return;

    const markAsRead = async () => {
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

    // Re-arms when messages change, so new messages arriving while the chat is
    // open get marked read after the same 1.5s "user is viewing" delay.
    const timer = setTimeout(markAsRead, 1500);
    return () => clearTimeout(timer);
  }, [selected, user?.id, messages]);

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

  // Microphone helpers (voice calls)
  const startMic = async () => {
    if (localStreamRef.current) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("unsupported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setMicReady(true);
    } catch (err: any) {
      console.log("Microphone unavailable:", err?.message);
      setMicReady(false);
      setNotice("Microphone unavailable");
    }
  };

  const stopMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setMicReady(false);
  };

  // Realtime: calls (incoming ring + status updates both ways)
  useEffect(() => {
    if (!user?.id) return;
    const myId = user.id;

    const channel = supabase
      .channel("calls")
      // Someone is calling me
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls", filter: `receiver_id=eq.${myId}` },
        (payload: any) => {
          const c = payload.new;
          if (!c?.id) return;
          if (activeCallRef.current || incomingCallRef.current) return;
          const caller =
            profilesRef.current.find((p) => p.id === c.caller_id) || {
              id: c.caller_id,
              email: "",
              full_name: "Incoming call",
              avatar_url: null,
            };
          updateIncomingCall({ ...c, with: caller } as IncomingCall);
        }
      )
      // My outgoing call changed status (accepted / ended / rejected)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `caller_id=eq.${myId}` },
        (payload: any) => {
          const c = payload.new;
          const cur = activeCallRef.current;
          if (!c?.id || !cur || cur.id !== c.id) return;
          if (c.status === "active") {
            updateActiveCall({ ...cur, status: "active" });
            startMic();
          } else if (ENDED_STATUSES.includes(c.status)) {
            stopMic();
            updateActiveCall(null);
          }
        }
      )
      // A call I'm receiving ended (caller hung up / cancelled)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `receiver_id=eq.${myId}` },
        (payload: any) => {
          const c = payload.new;
          if (!c?.id) return;
          const cur = activeCallRef.current;
          if (cur && cur.id === c.id && ENDED_STATUSES.includes(c.status)) {
            stopMic();
            updateActiveCall(null);
          }
          const inc = incomingCallRef.current;
          if (inc && inc.id === c.id && ENDED_STATUSES.includes(c.status)) {
            updateIncomingCall(null);
          }
        }
      )
      .subscribe();
    callsChannelRef.current = channel;
    return () => {
      if (callsChannelRef.current) {
        supabase.removeChannel(callsChannelRef.current);
        callsChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [messages]);

  // Stop mic + channels on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  // --- Messaging ---
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newMessage.trim();
    if (!text || !user?.id || !selected) return;

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

  // --- Emoji ---
  const onEmojiClick = (e: EmojiClickData) => {
    setNewMessage((prev) => prev + e.emoji);
  };

  // --- Attach (upload to storage, then send as image/file message) ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.id || !selected) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("chat-files").upload(fileName, file);
      if (error) {
        console.log("Upload error:", error.message);
        alert(error.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-files").getPublicUrl(fileName);

      const payload: Record<string, any> = {
        sender_id: user.id,
        content: publicUrl,
        conversation_id: convIdRef.current,
        // Same receipt rules as text: never read/delivered on send.
        is_read: false,
      };
      // Auto-dropped if the column doesn't exist yet.
      if (selected.id) payload.receiver_id = selected.id;
      payload.message_type = file.type.startsWith("image") ? "image" : "file";

      const { data, error: insErr } = await insertMessage(payload);

      if (insErr) {
        console.log("Attachment send error:", insErr.message);
        alert(insErr.message);
        return;
      }

      const row = data as Message | null;
      if (row) setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    } catch (err: any) {
      console.log("Upload error:", err?.message);
      alert(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // --- Calls ---
  const startCall = async () => {
    if (!user?.id || !selected || activeCall || incomingCall) return;
    try {
      const { data, error } = await supabase
        .from("calls")
        .insert({
          caller_id: user.id,
          receiver_id: selected.id,
          type: "voice",
          status: "ringing",
        })
        .select()
        .single();

      if (error || !data) {
        console.log("Call error:", error?.message);
        alert(error?.message || "Unable to start call");
        return;
      }
      updateActiveCall({ id: data.id, with: selected, dir: "outgoing", status: "ringing" });
    } catch (err: any) {
      console.log("Call error:", err?.message);
      alert(err?.message || "Unable to start call");
    }
  };

  const acceptCall = async () => {
    const c = incomingCallRef.current;
    if (!c) return;
    try {
      await supabase.from("calls").update({ status: "active" }).eq("id", c.id);
    } catch {
      /* still show as active locally */
    }
    updateActiveCall({ id: c.id, with: c.with, dir: "incoming", status: "active" });
    updateIncomingCall(null);
    startMic();
  };

  const rejectCall = async () => {
    const c = incomingCallRef.current;
    if (!c) return;
    try {
      await supabase.from("calls").update({ status: "rejected" }).eq("id", c.id);
    } catch {
      /* ignore */
    }
    updateIncomingCall(null);
  };

  const endCall = async () => {
    const c = activeCallRef.current;
    if (!c) return;
    try {
      await supabase.from("calls").update({ status: "ended" }).eq("id", c.id);
    } catch {
      /* ignore */
    }
    stopMic();
    updateActiveCall(null);
  };

  // --- 3-dots menu actions ---
  const menuItemClass = (isDark: boolean) =>
    `w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${
      isDark ? "text-[#E9EDEF] hover:bg-white/10" : "text-[#111B21] hover:bg-black/5"
    }`;

  const onMenuItem = (action: string) => {
    setShowMenu(false);
    if (action === "view") setShowContact(true);
    else if (action === "wallpaper") setShowWallpaper(true);
    else if (action === "clear") setMessages([]);
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

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
          selected ? "hidden md:flex" : "flex"
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
              {dark ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={handleSignOut}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                dark
                  ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
              }`}
            >
              Logout
            </button>
          </div>
        </div>

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

        <div className="flex-1 overflow-y-auto py-2">
          {filteredProfiles.length === 0 ? (
            <div
              className={`text-center py-12 px-4 ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}
            >
              <p className="text-lg font-medium mb-2">Tap to start chatting</p>
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => setSelected(profile)}
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
                <div className="relative">
                  <div
                    className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-lg font-semibold ring-2 ring-brand-500/20 ${
                      dark ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {profile.full_name?.charAt(0).toUpperCase() || "U"}
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
            ))
          )}
        </div>
      </aside>

      {/* Right main area */}
      <main
        className={`${
          selected ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 ${dark ? "bg-[#0B141A]" : "bg-[#EFEAE2]"}`}
      >
        {!selected ? (
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
                  onClick={() => setSelected(null)}
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
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-semibold ring-2 ring-brand-500/30 ${
                    dark ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
                  }`}
                >
                  {selected.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p
                    className={`font-semibold truncate ${
                      dark ? "text-[#E9EDEF]" : "text-[#111B21]"
                    }`}
                  >
                    {selected.full_name || "Unknown User"}
                    {blocked && (
                      <span className="ml-2 text-xs font-normal text-red-500">(blocked)</span>
                    )}
                  </p>
                  <p
                    className={`text-sm ${
                      isOnline(selected.id)
                        ? "text-brand-500 font-medium"
                        : dark
                          ? "text-[#8696A0]"
                          : "text-[#667781]"
                    }`}
                  >
                    {isOnline(selected.id) ? "online" : "offline"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={startCall}
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
                  onClick={startCall}
                  aria-label="Video call"
                  className={`p-2 rounded-full transition-colors ${
                    dark
                      ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                      : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                  }`}
                >
                  <Video size={20} />
                </button>

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
                        View Contact
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
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-[#667781] dark:text-[#8696A0]">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  const kind = classifyMessage(msg);
                  const tick = getTickStatus(msg, user?.id);
                  const bubbleStyle: React.CSSProperties = isMine
                    ? { backgroundColor: bubbleColor, color: "#111B21" }
                    : dark
                      ? { backgroundColor: "#202C33", color: "#E9EDEF" }
                      : { backgroundColor: "#ffffff", color: "#111B21" };
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] md:max-w-[70%] shadow-md px-3.5 py-2 animate-message-in ${
                          isMine ? "rounded-2xl rounded-tr-[4px]" : "rounded-2xl rounded-tl-[4px]"
                        }`}
                        style={bubbleStyle}
                      >
                        {kind === "image" ? (
                          <img
                            src={msg.content}
                            alt="attachment"
                            loading="lazy"
                            className="rounded-lg max-w-[240px] max-h-[260px] object-cover"
                          />
                        ) : kind === "file" ? (
                          <a
                            href={msg.content}
                            target="_blank"
                            rel="noreferrer"
                            className="underline break-all"
                          >
                            {fileNameFromUrl(msg.content)}
                          </a>
                        ) : (
                          <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <div
                          className="flex items-center justify-end gap-1 text-[11px] mt-1 opacity-70"
                          style={{ color: isMine ? "#111B21" : undefined }}
                        >
                          {formatTime(msg.created_at)}
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

                <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={uploading ? "Uploading…" : "Type a message"}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
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
      {incomingCall && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
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
              {incomingCall.with.full_name?.charAt(0).toUpperCase() || "?"}
            </div>
            <p className="mt-3 text-sm uppercase tracking-wide opacity-70">
              Incoming {incomingCall.type || "voice"} call
            </p>
            <p className="text-xl font-semibold mt-1">{incomingCall.with.full_name}</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={rejectCall}
                className="flex-1 py-3 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={acceptCall}
                className="flex-1 py-3 rounded-xl font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active / outgoing call bar */}
      {activeCall && (
        <div
          className={`fixed top-4 right-4 z-[120] rounded-2xl border shadow-xl px-4 py-3 flex items-center gap-3 ${
            dark
              ? "bg-[#202C33] border-[#3B4A54] text-[#E9EDEF]"
              : "bg-white border-[#E9EDEF] text-[#111B21]"
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold">
            {activeCall.with.full_name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{activeCall.with.full_name}</p>
            <p
              className={`text-xs ${
                activeCall.status === "active"
                  ? "text-brand-500"
                  : dark
                    ? "text-[#8696A0]"
                    : "text-[#667781]"
              }`}
            >
              {activeCall.status === "active"
                ? `Connected${micReady ? " · mic on" : " · mic off"}`
                : "Ringing…"}
            </p>
          </div>
          <button
            onClick={endCall}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            End
          </button>
        </div>
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
