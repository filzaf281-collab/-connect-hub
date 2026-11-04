"use client";

import "./globals.css";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import InstallPwaPrompt from "../components/InstallPwaPrompt";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  // Persistent login: validate session expiry on load
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem("user");
        const expiry = localStorage.getItem("loginExpiry");
        if (storedUser && expiry && Number(expiry) <= Date.now()) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("loginExpiry");
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>ConnectHub - AI Real-Time Chat, Quizzes, Client Simulator & Blockchain Certificates</title>
        <meta name="description" content="ConnectHub is the next-generation communication and learning platform featuring live chat, quizzes, AI client simulator, auto portfolios, and tamper-proof blockchain skill witness certificates." />
        <meta name="keywords" content="ConnectHub, Connect Hub, AI Client Simulator, Quiz System, Blockchain Certificate, Skill Witness, Real-Time Chat, Student Portfolio" />
        <meta name="author" content="ConnectHub" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="ConnectHub - Communication & AI Learning Platform" />
        <meta property="og:description" content="ConnectHub: Real-time chat, interactive quizzes, AI client simulator, student portfolios, and blockchain-verified certificates." />
        <meta property="og:url" content="https://connect-hub-plum.vercel.app" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ConnectHub" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ConnectHub - Communication & AI Learning Platform" />
        <meta name="twitter:description" content="ConnectHub: Real-time chat, interactive quizzes, AI client simulator, student portfolios, and blockchain-verified certificates." />
        <link rel="canonical" href="https://connect-hub-plum.vercel.app" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="background-color" content="#ffffff" />
        <meta name="application-name" content="ConnectHub" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ConnectHub" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <InstallPwaPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
