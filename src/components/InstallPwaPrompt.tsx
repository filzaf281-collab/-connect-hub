"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent mini-infobar on mobile Chrome
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed previously in this session
      const dismissed = sessionStorage.getItem("pwa-prompt-dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-[#111B21] text-white p-3.5 rounded-2xl shadow-2xl border border-[#2A3942] flex items-center justify-between gap-3 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#00A884] flex items-center justify-center shrink-0 shadow-md">
          <Download size={20} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">Install ConnectHub</p>
          <p className="text-xs text-[#8696A0]">Add to Home Screen for fast access</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-xl bg-[#00A884] hover:bg-[#008F72] text-white text-xs font-semibold shadow-sm transition active:scale-95"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-full hover:bg-white/10 text-[#8696A0] transition"
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
