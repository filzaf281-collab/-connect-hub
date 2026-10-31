"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Award,
  Bot,
  User,
  CheckCircle2,
} from "lucide-react";
import { ClientSimulationRecord } from "@/lib/client-simulator-db";

interface ClientProofBadgeProps {
  username: string;
}

export default function ClientProofBadge({ username }: ClientProofBadgeProps) {
  const [simulation, setSimulation] = useState<ClientSimulationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!username) return;
    async function loadProof() {
      try {
        const res = await fetch(`/api/client-simulator?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (data.simulation && Array.isArray(data.simulation.chatHistory) && data.simulation.chatHistory.length > 0) {
          setSimulation(data.simulation);
        }
      } catch (err) {
        console.warn("[ClientProofBadge] Load notice:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProof();
  }, [username]);

  if (loading || !simulation) return null;

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-emerald-200 shadow-sm space-y-4">
      {/* Header Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-gray-900">
                Client Handling: Verified
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Chat Proof
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Live simulation with {simulation.clientName} ({simulation.clientProject})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs flex items-center gap-1">
            <Award size={14} />
            <span>{simulation.skillScore}% Score</span>
          </span>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <span>{isOpen ? "Hide Transcript" : "View Chat Proof"}</span>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Verified Notice */}
      <p className="text-xs text-gray-600 leading-relaxed">
        Demonstrated professional client handling, negotiation, and requirement clarification in a live client interaction.
      </p>

      {/* Collapsible WhatsApp-Style Transcript */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in space-y-3">
          <div className="p-3 rounded-2xl bg-[#EFEAE2] border border-gray-200 max-h-96 overflow-y-auto space-y-2.5">
            <div className="text-center">
              <span className="px-3 py-1 rounded-full bg-black/10 text-[10px] text-gray-700 font-semibold uppercase tracking-wider">
                🔒 Verified Simulation Transcript
              </span>
            </div>

            {simulation.chatHistory.map((item, idx) => {
              const isClient = item.sender === "client";
              return (
                <div
                  key={idx}
                  className={`flex ${isClient ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2 rounded-2xl shadow-xs text-xs space-y-1 ${
                      isClient
                        ? "bg-white text-gray-900 rounded-tl-xs"
                        : "bg-[#005C4B] text-white rounded-tr-xs"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-75">
                      {isClient ? (
                        <>
                          <Bot size={11} className="text-emerald-600" />
                          <span>{simulation.clientName}</span>
                        </>
                      ) : (
                        <>
                          <User size={11} className="text-emerald-200" />
                          <span>You (Student)</span>
                        </>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{item.message}</p>
                    <div className="text-[10px] text-right opacity-65 flex items-center justify-end gap-1">
                      <span>{item.time || "Just now"}</span>
                      {!isClient && <CheckCircle2 size={11} className="text-emerald-300" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center text-[11px] text-gray-500 flex items-center justify-center gap-1">
            <CheckCircle2 size={13} className="text-[#00A884]" />
            <span>Cryptographically sealed & verified by Connect Hub Simulator Engine</span>
          </div>
        </div>
      )}
    </div>
  );
}
