"use client";

import Link from "next/link";
import { MessageSquare, Sparkles, Bot } from "lucide-react";

interface GetRealClientButtonProps {
  username?: string;
  studentName?: string;
  className?: string;
}

export default function GetRealClientButton({
  username = "",
  studentName = "",
  className = "",
}: GetRealClientButtonProps) {
  const queryParams = new URLSearchParams();
  if (username) queryParams.set("username", username);
  if (studentName) queryParams.set("name", studentName);
  const href = `/client-simulator/start${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition transform hover:scale-[1.01] active:scale-95 cursor-pointer ${className}`}
    >
      <Bot size={16} className="text-emerald-200" />
      <span>Practice with Real Client (FREE)</span>
      <Sparkles size={14} className="text-amber-300 animate-pulse" />
    </Link>
  );
}
