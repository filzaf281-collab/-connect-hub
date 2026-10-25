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
  avatar_url: string | null;
  created_at: string;
  is_online?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string | null;
  conversation_id?: string | null;
  content: string;
  type?: string | null; // "text" | "image" | "file"
  file_url?: string | null;
  created_at: string;
  read_by?: string[];
}

interface CallState {
  id: string;
  with: Profile;
  dir: "incoming" | "outgoing";
  status: "ringing" | "active";
}

const ENDED_STATUSES = ["rejected", "ended", "missed", "failed", "declined"];

export default function ChatPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState("");

  // Presence (who is online)
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  // 3-dots menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menu actions
  const [showContact, setShowContact] = useState(false);
  const [wallpaper, setWallpaper] = useState(true);
  const [blocked, setBlocked] = useState(false);

  // Emoji
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Attach
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Calls
  const [call, setCall] = useState<CallState | null>(null);
  const [micReady, setMicReady] = useState(false);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<any>(null);
  const partnerRef = useRef<string | null>(null);
  const profilesRef = useRef<Profile[]>([]);
  const callRef = useRef<CallState | null>(null);
  const messagesChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const callsChannelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const applyCall = (next: CallState | null) => {
    callRef.current = next;
    setCall(next);
  };

  // After mounting, we can show the theme toggle
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current user
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

  // Fetch profiles except current user
  useEffect(() => {
    if (!user?.id) return;

    const loadProfiles = async () => {
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
        /* ignore - profiles are non-critical */
      }
    };

    loadProfiles();
  }, [user?.id]);

  // Filter profiles based on search
  const filteredProfiles = profiles.filter((profile) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      profile.full_name?.toLowerCase().includes(query) ||
      profile.email?.toLowerCase().includes(query)
    );
  });

  // Load messages exchanged with a specific user (by sender/receiver pair)
  const loadMessages = async (otherId: string) => {
    const myId = userRef.current?.id;
    if (!myId) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
        )
        .order("created_at", { ascending: true });

      if (data) {
        const fetched = data as Message[];
        setMessages((prev) => {
          const map = new Map<string, Message>();
          fetched.forEach((m) => map.set(m.id, m));
          prev.forEach((m) => map.set(m.id, m));
          return Array.from(map.values()).sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      }
    } catch {
      /* keep existing messages */
    }
    setIsLoading(false);
  };

  // When a chat is selected, reset state and load that conversation
  useEffect(() => {
    partnerRef.current = selectedProfile?.id ?? null;
    setMenuOpen(false);
    setShowEmoji(false);
    setShowContact(false);
    setBlocked(false);

    if (selectedProfile && user?.id) {
      setMessages([]);
      loadMessages(selectedProfile.id);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfile, user?.id]);

  // Realtime: new messages (channel "chat", client-side guard + dedupe)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const m = payload.new as Message;
          const myId = userRef.current?.id;
          const partner = partnerRef.current;
          if (!m?.id || !myId || !partner) return;

          const belongs =
            (m.sender_id === myId && m.receiver_id === partner) ||
            (m.sender_id === partner && m.receiver_id === myId);
          if (!belongs) return;

          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
        }
      )
      .subscribe();

    messagesChannelRef.current = channel;

    return () => {
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
    };
  }, [user?.id]);

  // Realtime: presence (who is online)
  useEffect(() => {
    if (!user?.id) return;
    const myId = user.id;

    const channel = supabase.channel("online");
    channel
      .on("presence", { event: "sync" }, () => {
        try {
          const state = channel.presenceState() as Record<string, any[]>;
          const ids = new Set<string>();
          Object.values(state).forEach((instances) => {
            instances.forEach((inst: any) => {
              if (inst?.user_id) ids.add(inst.user_id);
            });
          });
          setOnlineIds(ids);
        } catch {
          /* ignore presence parse issues */
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ user_id: myId, online: true }).catch(() => {});
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

  // Realtime: microphone helpers
  const startMic = async () => {
    if (localStreamRef.current) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("unsupported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setMicReady(true);
    } catch {
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

  // Realtime: calls (incoming ring + status updates)
  useEffect(() => {
    if (!user?.id) return;
    const myId = user.id;

    const channel = supabase
      .channel("calls-watcher")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls" },
        (payload: any) => {
          const c = payload.new;
          if (!c?.id) return;
          // Incoming call placed to me, and I'm not already in a call
          if (c.callee_id === myId && c.status === "ringing" && !callRef.current) {
            const caller =
              profilesRef.current.find((p) => p.id === c.caller_id) || {
                id: c.caller_id,
                email: "",
                full_name: "Incoming call",
                avatar_url: null,
                created_at: "",
              };
            applyCall({ id: c.id, with: caller, dir: "incoming", status: "ringing" });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        (payload: any) => {
          const c = payload.new;
          const cur = callRef.current;
          if (!c?.id || !cur || cur.id !== c.id) return;

          if (c.status === "active") {
            applyCall({ ...cur, status: "active" });
            startMic();
          } else if (ENDED_STATUSES.includes(c.status)) {
            stopMic();
            applyCall(null);
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

  // Close 3-dots menu / emoji picker on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
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

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Stop microphone + cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  // Send a text message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || !user?.id || !selectedProfile || blocked) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: selectedProfile.id,
          content: text,
        })
        .select()
        .single();

      if (error || !data) {
        setNotice("Could not send message");
        return;
      }

      setInput("");
      setMessages((prev) =>
        prev.some((x) => x.id === data.id) ? prev : [...prev, data as Message]
      );
    } catch {
      setNotice("Could not send message");
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Emoji click -> append to input
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInput((prev) => prev + emojiData.emoji);
  };

  // Attach: upload to Supabase Storage then send as an image/file message
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.id || !selectedProfile) return;

    setUploading(true);
    try {
      const ext = file.name.includes(".")
        ? file.name.split(".").pop()!
        : "bin";
      const path = `${user.id}/${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("chat-files")
        .upload(path, file);
      if (upErr) {
        setNotice("Upload failed");
        return;
      }

      const { data: pub } = supabase.storage.from("chat-files").getPublicUrl(path);
      const url = pub?.publicUrl;
      if (!url) {
        setNotice("Upload failed");
        return;
      }

      const isImage = file.type.startsWith("image/");
      const { data: inserted, error: insErr } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: selectedProfile.id,
          content: url,
          type: isImage ? "image" : "file",
        })
        .select()
        .single();

      if (insErr || !inserted) {
        setNotice("Could not send attachment");
        return;
      }

      setMessages((prev) =>
        prev.some((x) => x.id === inserted.id) ? prev : [...prev, inserted as Message]
      );
    } catch {
      setNotice("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Calls
  const startCall = async () => {
    if (!user?.id || !selectedProfile || callRef.current) return;
    try {
      const { data, error } = await supabase
        .from("calls")
        .insert({
          caller_id: user.id,
          callee_id: selectedProfile.id,
          status: "ringing",
        })
        .select()
        .single();

      if (error || !data) {
        setNotice("Unable to start call");
        return;
      }
      applyCall({
        id: data.id,
        with: selectedProfile,
        dir: "outgoing",
        status: "ringing",
      });
    } catch {
      setNotice("Unable to start call");
    }
  };

  const acceptCall = async () => {
    const cur = callRef.current;
    if (!cur) return;
    try {
      await supabase.from("calls").update({ status: "active" }).eq("id", cur.id);
    } catch {
      /* still show as active locally */
    }
    applyCall({ ...cur, status: "active" });
    startMic();
  };

  const rejectCall = async () => {
    const cur = callRef.current;
    if (!cur) return;
    try {
      await supabase.from("calls").update({ status: "rejected" }).eq("id", cur.id);
    } catch {
      /* ignore */
    }
    applyCall(null);
  };

  const endCall = async () => {
    const cur = callRef.current;
    if (!cur) return;
    try {
      await supabase.from("calls").update({ status: "ended" }).eq("id", cur.id);
    } catch {
      /* ignore */
    }
    stopMic();
    applyCall(null);
  };

  // Menu actions
  const menuItemClass = (dark: boolean) =>
    `w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${
      dark
        ? "text-[#E9EDEF] hover:bg-white/10"
        : "text-[#111B21] hover:bg-black/5"
    }`;

  const onMenuItem = (action: string) => {
    setMenuOpen(false);
    if (action === "view") setShowContact(true);
    else if (action === "wallpaper") setWallpaper((w) => !w);
    else if (action === "clear") setMessages([]);
    else if (action === "block") setBlocked((b) => !b);
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/signin");
  };

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isOnline = (id: string) => onlineIds.has(id);

  const fileNameFromUrl = (url: string) => {
    try {
      const last = url.split("/").pop() || url;
      return decodeURIComponent(last);
    } catch {
      return "attachment";
    }
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

  const dark = theme === "dark";

  return (
    <div className={`h-screen flex overflow-hidden ${dark ? "bg-[#111B21]" : "bg-[#F0F2F5]"}`}>
      {/* Left Sidebar */}
      <aside
        className={`${
          selectedProfile ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-[380px] h-screen border-r shadow-lg z-10 ${
          dark ? "bg-[#111B21] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
        }`}
      >
        {/* Header */}
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
              <span className={`font-semibold truncate ${dark ? "text-[#E9EDEF]" : "text-[#111B21]"}`}>
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
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={handleLogout}
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

        {/* Search Box */}
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

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto py-2">
          {filteredProfiles.length === 0 ? (
            <div className={`text-center py-12 px-4 ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
              <p className="text-lg font-medium mb-2">Tap to start chatting</p>
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => setSelectedProfile(profile)}
                className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-2xl cursor-pointer transition-all duration-200 ${
                  selectedProfile?.id === profile.id
                    ? dark
                      ? "bg-[#2A3942] shadow-md shadow-black/25"
                      : "bg-[#F0F2F5] shadow-md shadow-black/5"
                    : dark
                      ? "hover:bg-[#202C33] hover:shadow-sm hover:shadow-black/25"
                      : "hover:bg-[#F5F6F6] hover:shadow-sm hover:shadow-black/5"
                }`}
              >
                {/* Avatar with online indicator */}
                <div className="relative">
                  <div
                    className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-lg font-semibold ring-2 ring-brand-500/20 ${
                      dark ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {profile.full_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  {isOnline(profile.id) && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-brand-500 rounded-full border-2 border-white dark:border-[#111B21] shadow-[0_0_6px_rgba(0,168,132,0.6)]"></div>
                  )}
                </div>

                {/* Name and status */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${dark ? "text-[#E9EDEF]" : "text-[#111B21]"}`}>
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

      {/* Right Main Area */}
      <main
        className={`${
          selectedProfile ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 ${dark ? "bg-[#0B141A]" : "bg-[#EFEAE2]"}`}
      >
        {!selectedProfile ? (
          /* Empty State */
          <div
            className={`flex-1 flex flex-col items-center justify-center text-center px-6 animate-slide-up ${
              dark ? "wa-doodle-dark text-[#8696A0]" : "wa-doodle-light text-[#667781]"
            }`}
          >
            <MessageCircle size={72} className="mb-4 text-brand-500" />
            <h1 className={`text-4xl font-bold mb-3 ${dark ? "text-[#E9EDEF]" : "text-[#111B21]"}`}>
              ConnectHub Web
            </h1>
            <p className="text-lg">Professional communication platform</p>
            <p className="text-sm mt-2">Select a user from the sidebar to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div
              className={`h-[59px] flex items-center justify-between px-4 border-b ${
                dark ? "bg-[#202C33] border-[#2A3942]" : "bg-[#F0F2F5] border-[#E9EDEF]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedProfile(null)}
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
                  {selectedProfile.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold truncate ${dark ? "text-[#E9EDEF]" : "text-[#111B21]"}`}>
                    {selectedProfile.full_name || "Unknown User"}
                    {blocked && (
                      <span className="ml-2 text-xs font-normal text-red-500">(blocked)</span>
                    )}
                  </p>
                  <p
                    className={`text-sm ${
                      isOnline(selectedProfile.id)
                        ? "text-brand-500 font-medium"
                        : dark
                          ? "text-[#8696A0]"
                          : "text-[#667781]"
                    }`}
                  >
                    {isOnline(selectedProfile.id) ? "online" : "offline"}
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
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-label="More options"
                    aria-expanded={menuOpen}
                    className={`p-2 rounded-full transition-colors ${
                      dark
                        ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10"
                        : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                    }`}
                  >
                    <MoreVertical size={20} />
                  </button>

                  {menuOpen && (
                    <div
                      className={`absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg z-50 py-1 overflow-hidden ${
                        dark
                          ? "bg-[#202C33] border-[#3B4A54]"
                          : "bg-white border-[#E9EDEF]"
                      }`}
                    >
                      <button className={menuItemClass(dark)} onClick={() => onMenuItem("view")}>
                        View Contact
                      </button>
                      <button className={menuItemClass(dark)} onClick={() => onMenuItem("wallpaper")}>
                        Wallpaper {wallpaper ? "(on)" : "(off)"}
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
                        {blocked ? "Unblock" : "Block"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area with doodle background */}
            <div
              className={`flex-1 overflow-y-auto p-4 space-y-2 ${
                wallpaper
                  ? dark
                    ? "wa-doodle-dark"
                    : "wa-doodle-light"
                  : dark
                    ? "bg-[#0B141A]"
                    : "bg-[#EFEAE2]"
              }`}
            >
              {isLoading ? (
                <div className={`text-center py-8 ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className={`text-center py-8 ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  const kind = msg.type || "text";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] md:max-w-[70%] shadow-md px-3.5 py-2 animate-message-in ${
                          isMine
                            ? `rounded-2xl rounded-tr-[4px] ${
                                dark
                                  ? "bg-[#005C4B] text-[#E9EDEF] shadow-black/25"
                                  : "bg-[#D9FDD3] text-[#111B21] shadow-black/5"
                              }`
                            : `rounded-2xl rounded-tl-[4px] ${
                                dark
                                  ? "bg-[#202C33] text-[#E9EDEF] shadow-black/25"
                                  : "bg-white text-[#111B21] shadow-black/5"
                              }`
                        }`}
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
                          className={`flex items-center justify-end gap-1 text-[11px] mt-1 ${
                            dark ? "text-[#8696A0]" : "text-[#667781]"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                          {isMine &&
                            (msg.read_by && msg.read_by.length > 1 ? (
                              <CheckCheck size={14} className="text-[#53BDEB]" />
                            ) : (
                              <Check size={14} />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef}></div>
            </div>

            {/* Message Composer */}
            <div
              className={`p-3 border-t ${
                dark ? "bg-[#202C33] border-[#2A3942]" : "bg-[#F0F2F5] border-[#E9EDEF]"
              }`}
            >
              {blocked && (
                <p className={`text-xs mb-2 ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
                  You blocked this contact. Choose Unblock in the menu to reply.
                </p>
              )}
              <div className="flex items-center gap-2">
                {/* Emoji (closes on outside click) */}
                <div ref={emojiRef} className="relative">
                  <button
                    onClick={() => setShowEmoji((s) => !s)}
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
                    <div className="absolute bottom-full left-0 mb-2 z-50">
                      <EmojiPicker
                        theme={dark ? "dark" : "light"}
                        onEmojiClick={onEmojiClick}
                        width={300}
                        height={360}
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  )}
                </div>

                {/* Attach */}
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
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
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
                    disabled={!input.trim() || blocked || uploading}
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
      {showContact && selectedProfile && (
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
                className={`p-1 rounded-full ${
                  dark ? "hover:bg-white/10" : "hover:bg-black/5"
                }`}
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
                {selectedProfile.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {selectedProfile.full_name || "Unknown User"}
                </p>
                <p className={`text-sm truncate ${dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
                  {selectedProfile.email}
                </p>
                <p className={`text-sm ${isOnline(selectedProfile.id) ? "text-brand-500" : ""}`}>
                  {isOnline(selectedProfile.id) ? "online" : "offline"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming call modal */}
      {call && call.dir === "incoming" && call.status === "ringing" && (
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
              {call.with.full_name?.charAt(0).toUpperCase() || "?"}
            </div>
            <p className="mt-3 text-sm uppercase tracking-wide opacity-70">Incoming voice call</p>
            <p className="text-xl font-semibold mt-1">{call.with.full_name}</p>
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

      {/* Ongoing / outgoing call bar */}
      {call && !(call.dir === "incoming" && call.status === "ringing") && (
        <div
          className={`fixed top-4 right-4 z-[120] rounded-2xl border shadow-xl px-4 py-3 flex items-center gap-3 ${
            dark ? "bg-[#202C33] border-[#3B4A54] text-[#E9EDEF]" : "bg-white border-[#E9EDEF] text-[#111B21]"
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold">
            {call.with.full_name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{call.with.full_name}</p>
            <p className={`text-xs ${call.status === "active" ? "text-brand-500" : dark ? "text-[#8696A0]" : "text-[#667781]"}`}>
              {call.status === "active"
                ? `Connected${micReady ? " · mic on" : " · mic off"}`
                : call.dir === "outgoing"
                  ? "Ringing…"
                  : "Connected"}
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

      {/* Transient notice toast */}
      {notice && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[130] bg-black/85 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {notice}
        </div>
      )}
    </div>
  );
}
