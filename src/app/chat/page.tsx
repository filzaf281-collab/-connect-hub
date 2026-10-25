"use client";

import { supabase } from "../../lib/supabase";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
  Check
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
  conversation_id: string;
  sender_id: string;
  content: string;
  file_url: string | null;
  created_at: string;
  read_by?: string[];
}

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
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // After mounting, we can show the theme toggle
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }: any) => {
      if (u) setUser(u);
      else router.push("/auth/login");
    });
  }, [router]);

  // Fetch profiles except current user
  useEffect(() => {
    if (!user?.id) return;
    
    const loadProfiles = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .order("full_name", { ascending: true });
      
      if (data) setProfiles(data as Profile[]);
    };
    
    loadProfiles();
  }, [user?.id]);

  // Filter profiles based on search
  const filteredProfiles = profiles.filter(profile => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      profile.full_name?.toLowerCase().includes(query) ||
      profile.email?.toLowerCase().includes(query)
    );
  });

  // Get or create conversation when profile selected
  useEffect(() => {
    if (!selectedProfile || !user?.id) return;

    const getOrCreateConversation = async () => {
      setIsLoading(true);
      
      // Check if conversation exists via conversation_participants
      const { data: existing } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      
      if (existing && existing.length > 0) {
        const conversationIds = existing.map(p => p.conversation_id);
        
        const { data: otherPart } = await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", conversationIds)
          .eq("user_id", selectedProfile.id);
        
        if (otherPart && otherPart.length > 0) {
          const shared = otherPart.find(p => conversationIds.includes(p.conversation_id));
          if (shared) {
            setCurrentConversationId(shared.conversation_id);
            await loadMessages(shared.conversation_id);
            setIsLoading(false);
            return;
          }
        }
      }

      // Create new conversation
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ created_by: user.id })
        .select()
        .single();

      if (newConv) {
        // Add both users as participants
        await supabase.from("conversation_participants").insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: selectedProfile.id }
        ]);
        
        setCurrentConversationId(newConv.id);
        setMessages([]);
      }
      
      setIsLoading(false);
    };

    getOrCreateConversation();
  }, [selectedProfile, user?.id]);

  // Load messages for conversation
  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    
    if (data) setMessages(data as Message[]);
  };

  // Realtime subscription - KEEP EXACT SAME AS DAY 3
  useEffect(() => {
    if (!currentConversationId) return;

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${currentConversationId}`
        },
        (payload: any) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentConversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Send message - KEEP EXACT SAME AS DAY 3
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !currentConversationId || !user?.id) return;

    const { error } = await supabase.from("messages").insert({
      conversation_id: currentConversationId,
      sender_id: user.id,
      content: input.trim(),
      file_url: null
    });

    if (error) {
      console.error("Send error:", error);
    } else {
      setInput("");
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    <div className={`h-screen flex overflow-hidden ${theme === "dark" ? "bg-[#111B21]" : "bg-[#F0F2F5]"}`}>
      {/* Left Sidebar */}
      <aside className={`${
        selectedProfile ? "hidden md:flex" : "flex"
      } flex-col w-full md:w-[380px] h-screen border-r shadow-lg z-10 ${
        theme === "dark" ? "bg-[#111B21] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
      }`}>
        {/* Header */}
        <div className={`h-[59px] flex items-center justify-between px-4 border-b ${
          theme === "dark" ? "bg-[#202C33] border-[#2A3942]" : "bg-[#F0F2F5] border-[#E9EDEF]"
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-semibold ring-2 ring-brand-500/30 ${
              theme === "dark" ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
            }`}>
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <MessageCircle size={20} className="text-brand-500 shrink-0" />
              <span className={`font-semibold truncate ${
                theme === "dark" ? "text-[#E9EDEF]" : "text-[#111B21]"
              }`}>
                ConnectHub
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label="Toggle theme"
              className={`p-2 rounded-full transition-colors ${
                theme === "dark" ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
              }`}
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                theme === "dark" ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
              }`}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className={`p-3 border-b ${
          theme === "dark" ? "bg-[#111B21] border-[#2A3942]" : "bg-white border-[#E9EDEF]"
        }`}>
          <div className="relative">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              theme === "dark" ? "text-[#8696A0]" : "text-gray-500"
            }`} />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-full text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition ${
                theme === "dark"
                  ? "bg-[#202C33] text-[#E9EDEF] placeholder-[#8696A0] hover:bg-[#2A3942]"
                  : "bg-[#F0F2F5] text-[#111B21] placeholder-[#667781] hover:bg-[#E9EDEF]"
              }`}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto py-2">
          {filteredProfiles.length === 0 ? (
            <div className={`text-center py-12 px-4 ${
              theme === "dark" ? "text-[#8696A0]" : "text-[#667781]"
            }`}>
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
                    ? theme === "dark"
                      ? "bg-[#2A3942] shadow-md shadow-black/25"
                      : "bg-[#F0F2F5] shadow-md shadow-black/5"
                    : theme === "dark"
                      ? "hover:bg-[#202C33] hover:shadow-sm hover:shadow-black/25"
                      : "hover:bg-[#F5F6F6] hover:shadow-sm hover:shadow-black/5"
                }`}
              >
                {/* Avatar with online indicator */}
                <div className="relative">
                  <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-lg font-semibold ring-2 ring-brand-500/20 ${
                    theme === "dark" ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
                  }`}>
                    {profile.full_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  {profile.is_online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-brand-500 rounded-full border-2 border-white dark:border-[#111B21] shadow-[0_0_6px_rgba(0,168,132,0.6)]"></div>
                  )}
                </div>

                {/* Name and status */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${
                    theme === "dark" ? "text-[#E9EDEF]" : "text-[#111B21]"
                  }`}>
                    {profile.full_name || "Unknown User"}
                  </p>
                  <p className={`text-sm truncate ${
                    theme === "dark" ? "text-[#8696A0]" : "text-[#667781]"
                  }`}>
                    Tap to start chatting
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Right Main Area */}
      <main className={`${
        selectedProfile ? "flex" : "hidden md:flex"
      } flex-1 flex-col min-w-0 ${
        theme === "dark" ? "bg-[#0B141A]" : "bg-[#EFEAE2]"
      }`}>
        {!selectedProfile ? (
          /* Empty State */
          <div className={`flex-1 flex flex-col items-center justify-center text-center px-6 animate-slide-up ${
            theme === "dark" ? "wa-doodle-dark text-[#8696A0]" : "wa-doodle-light text-[#667781]"
          }`}>
            <MessageCircle size={72} className="mb-4 text-brand-500" />
            <h1 className={`text-4xl font-bold mb-3 ${
              theme === "dark" ? "text-[#E9EDEF]" : "text-[#111B21]"
            }`}>
              ConnectHub Web
            </h1>
            <p className="text-lg">Professional communication platform</p>
            <p className="text-sm mt-2">Select a user from the sidebar to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className={`h-[59px] flex items-center justify-between px-4 border-b ${
              theme === "dark" ? "bg-[#202C33] border-[#2A3942]" : "bg-[#F0F2F5] border-[#E9EDEF]"
            }`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedProfile(null)}
                  aria-label="Back to chats"
                  className={`md:hidden p-2 rounded-full transition-colors ${
                    theme === "dark" ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                  }`}
                >
                  <ArrowLeft size={24} />
                </button>
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-semibold ring-2 ring-brand-500/30 ${
                  theme === "dark" ? "bg-[#2A3942] text-[#E9EDEF]" : "bg-brand-100 text-brand-700"
                }`}>
                  {selectedProfile.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <p className={`font-semibold ${
                    theme === "dark" ? "text-[#E9EDEF]" : "text-[#111B21]"
                  }`}>
                    {selectedProfile.full_name || "Unknown User"}
                  </p>
                  <p className={`text-sm ${
                    selectedProfile.is_online
                      ? "text-brand-500 font-medium"
                      : theme === "dark" ? "text-[#8696A0]" : "text-[#667781]"
                  }`}>
                    {selectedProfile.is_online ? "online" : "offline"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Voice call"
                  className={`p-2 rounded-full transition-colors ${
                    theme === "dark" ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                  }`}
                >
                  <Phone size={20} />
                </button>
                <button
                  aria-label="Video call"
                  className={`p-2 rounded-full transition-colors ${
                    theme === "dark" ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                  }`}
                >
                  <Video size={20} />
                </button>
                <button
                  aria-label="More options"
                  className={`p-2 rounded-full transition-colors ${
                    theme === "dark" ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                  }`}
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area with doodle background */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${
              theme === "dark" ? "wa-doodle-dark" : "wa-doodle-light"
            }`}>
              {isLoading ? (
                <div className={`text-center py-8 ${
                  theme === "dark" ? "text-[#8696A0]" : "text-[#667781]"
                }`}>
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className={`text-center py-8 ${
                  theme === "dark" ? "text-[#8696A0]" : "text-[#667781]"
                }`}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] md:max-w-[70%] shadow-md px-3.5 py-2 animate-message-in ${
                          isMine
                            ? `rounded-2xl rounded-tr-[4px] ${theme === "dark" ? "bg-[#005C4B] text-[#E9EDEF] shadow-black/25" : "bg-[#D9FDD3] text-[#111B21] shadow-black/5"}`
                            : `rounded-2xl rounded-tl-[4px] ${theme === "dark" ? "bg-[#202C33] text-[#E9EDEF] shadow-black/25" : "bg-white text-[#111B21] shadow-black/5"}`
                        }`}
                      >
                        <p className="break-words">{msg.content}</p>
                        <div className={`flex items-center justify-end gap-1 text-[11px] mt-1 ${
                          isMine
                            ? theme === "dark" ? "text-[#8696A0]" : "text-[#667781]"
                            : theme === "dark" ? "text-[#8696A0]" : "text-[#667781]"
                        }`}>
                          {formatTime(msg.created_at)}
                          {isMine && (
                            msg.read_by && msg.read_by.length > 1 ? (
                              <CheckCheck size={14} className="text-[#53BDEB]" />
                            ) : (
                              <Check size={14} />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef}></div>
            </div>

            {/* Message Composer */}
            <div className={`p-3 border-t ${
              theme === "dark" ? "bg-[#202C33] border-[#2A3942]" : "bg-[#F0F2F5] border-[#E9EDEF]"
            }`}>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Emoji"
                  className={`p-2 rounded-full transition-colors ${
                    theme === "dark" ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                  }`}
                >
                  <Smile size={24} />
                </button>
                <button
                  aria-label="Attach file"
                  className={`p-2 rounded-full transition-colors ${
                    theme === "dark" ? "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                  }`}
                >
                  <Paperclip size={24} />
                </button>
                <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`flex-1 px-4 py-3 rounded-full text-sm border focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition ${
                      theme === "dark"
                        ? "bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] placeholder-[#8696A0] hover:border-[#4A5A66]"
                        : "bg-white border-[#E9EDEF] text-[#111B21] placeholder-[#667781] hover:border-[#D1D7DB]"
                    }`}
                  />
                  <button
                    type="submit"
                    aria-label="Send message"
                    disabled={!input.trim()}
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
    </div>
  );
}