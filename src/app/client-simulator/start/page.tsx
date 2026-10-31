"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Sparkles,
  Award,
  Bot,
  User,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
} from "lucide-react";
import { ChatMessageItem } from "@/lib/client-simulator-db";

function SimulatorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const portfolioUsername = searchParams.get("username") || "student";
  const studentName = searchParams.get("name") || "Student";

  const portfolioLink = `/p/${portfolioUsername}`;
  const clientName = "Ahmed (Bakery Owner)";
  const clientProject = "Bakery Website $50";

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [savingProof, setSavingProof] = useState(false);
  const [proofAdded, setProofAdded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const replyIndexRef = useRef(0);

  // Pre-written realistic client responses
  const clientReplies = [
    "That sounds promising! What features will you include in the website? Will it be fast and mobile-friendly for smartphone customers?",
    "Can you show me design concepts or a sample layout first before we finalize? I want to make sure the pastry photos and menu look really appealing.",
    "My budget is strictly $50 right now because we're just expanding online, but if this goes smoothly, I have 2 other bakery and cafe owners who want websites too. Can we agree on $50 for this version?",
    "Excellent! You communicated clearly, politely, and professionally. I'm happy to award you the project! 🤝 Deal closed.",
  ];

  const getCurrentTimeString = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Karachi",
    });
  };

  // 1. Initial client greeting
  useEffect(() => {
    const greeting: ChatMessageItem = {
      sender: "client",
      message: `Hi ${studentName}! I saw your portfolio (${portfolioLink}). I run a local bakery and need a simple, clean website with our menu and WhatsApp order button. Budget is around $50. Can you do this? How much time will you take?`,
      time: getCurrentTimeString(),
    };
    setMessages([greeting]);
  }, [studentName, portfolioLink]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, simulationComplete]);

  // Handle student send message
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || simulationComplete) return;

    const studentMsg: ChatMessageItem = {
      sender: "student",
      message: text,
      time: getCurrentTimeString(),
    };

    const nextMessages = [...messages, studentMsg];
    setMessages(nextMessages);
    setInputText("");

    // Trigger AI Client response
    if (replyIndexRef.current < clientReplies.length) {
      setIsTyping(true);
      const replyText = clientReplies[replyIndexRef.current];
      replyIndexRef.current += 1;

      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: "client",
            message: replyText,
            time: getCurrentTimeString(),
          },
        ]);

        // If it was the final reply, complete simulation
        if (replyIndexRef.current >= clientReplies.length) {
          setTimeout(() => {
            setSimulationComplete(true);
          }, 800);
        }
      }, 1400);
    } else {
      setSimulationComplete(true);
    }
  };

  // Handle Add Proof to Portfolio
  const handleAddProof = async () => {
    setSavingProof(true);
    try {
      const res = await fetch("/api/client-simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioUsername,
          clientName,
          clientProject,
          chatHistory: messages,
          skillScore: 85,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProofAdded(true);
      } else {
        alert(data.error || "Failed to save proof");
      }
    } catch (err: any) {
      console.error("Save proof error:", err);
      alert(err?.message || "Failed to save chat proof");
    } finally {
      setSavingProof(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-900 font-sans flex flex-col">
      {/* Header (WhatsApp Client Profile) */}
      <header className="bg-[#075E54] text-white px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-full hover:bg-white/10 transition"
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-base shadow-inner">
                👨‍🍳
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25D366] border-2 border-[#075E54]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm md:text-base leading-tight truncate">
                  {clientName}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                  AI Simulator
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 truncate">
                online • Typically replies instantly
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={portfolioLink}
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1 transition"
            >
              <span>My Portfolio</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>

        {/* Project Info Pill */}
        <div className="max-w-3xl mx-auto mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100">
          <span>{clientProject}</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-400/20 text-white font-mono text-[11px]">
            100% Free Practice
          </span>
        </div>
      </header>

      {/* Chat Messages Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-3 pb-4">
          <div className="text-center my-2">
            <span className="px-3 py-1 rounded-full bg-black/10 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Simulation Mode: Interactive Client Practice
            </span>
          </div>

          {messages.map((m, idx) => {
            const isClient = m.sender === "client";
            return (
              <div
                key={idx}
                className={`flex ${isClient ? "justify-start" : "justify-end"} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-sm space-y-1 ${
                    isClient
                      ? "bg-white text-gray-900 rounded-tl-xs"
                      : "bg-[#005C4B] text-white rounded-tr-xs"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-75">
                    {isClient ? (
                      <>
                        <Bot size={12} className="text-emerald-600" />
                        <span>{clientName}</span>
                      </>
                    ) : (
                      <>
                        <User size={12} className="text-emerald-200" />
                        <span>You ({studentName})</span>
                      </>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>

                  <div className="flex items-center justify-end gap-1 text-[10px] opacity-70 mt-1">
                    <span>{m.time}</span>
                    {!isClient && <CheckCheck size={13} className="text-emerald-300" />}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white text-gray-600 px-4 py-2.5 rounded-2xl rounded-tl-xs shadow-sm text-xs flex items-center gap-2">
                <span className="font-medium text-emerald-700">Ahmed is typing</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}

          {/* Simulation Complete Card */}
          {simulationComplete && (
            <div className="mt-6 p-6 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 shadow-lg text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-[#00A884] flex items-center justify-center mx-auto shadow-inner">
                <Award size={32} />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  Simulation Complete!
                </span>
                <h2 className="text-2xl font-extrabold text-gray-900 mt-2">
                  Your Client Handling Score: <span className="text-[#00A884]">85%</span>
                </h2>
                <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto">
                  You successfully handled client negotiation, addressed project scope, and maintained a polite, professional tone.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto text-center text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
                  <p className="opacity-60 text-[10px]">Tone</p>
                  <p className="font-bold text-emerald-600">90%</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
                  <p className="opacity-60 text-[10px]">Clarity</p>
                  <p className="font-bold text-blue-600">85%</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
                  <p className="opacity-60 text-[10px]">Patience</p>
                  <p className="font-bold text-purple-600">95%</p>
                </div>
              </div>

              {!proofAdded ? (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleAddProof}
                    disabled={savingProof}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#008069] to-[#00A884] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {savingProof ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Add This Chat Proof to My Portfolio</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={portfolioLink}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition"
                  >
                    View Portfolio
                  </Link>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-100/60 border border-emerald-300 text-emerald-900 space-y-2">
                  <p className="font-bold text-sm flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Chat Proof Verified & Added to Portfolio!</span>
                  </p>
                  <p className="text-xs text-emerald-800">
                    Your portfolio now features the &quot;Client Handling: Verified (Chat Proof)&quot; badge.
                  </p>
                  <div className="pt-1">
                    <Link
                      href={portfolioLink}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      <span>Check Your Portfolio Badge</span>
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="sticky bottom-2 mt-auto">
          <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2 border border-gray-300 shadow-md">
            <input
              type="text"
              placeholder={
                simulationComplete
                  ? "Simulation complete! Add proof above."
                  : "Type your message to the client..."
              }
              disabled={simulationComplete}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-900 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || simulationComplete}
              className="w-10 h-10 rounded-xl bg-[#00A884] hover:bg-[#008F72] disabled:opacity-40 text-white flex items-center justify-center shadow-xs transition cursor-pointer"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function ClientSimulatorStartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SimulatorContent />
    </Suspense>
  );
}
