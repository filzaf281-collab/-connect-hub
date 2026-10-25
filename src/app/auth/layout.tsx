"use client";

// Nested layouts must NOT re-declare <html>/<body> — the root layout already
// provides them. Rendering another <html> inside <body> caused hydration
// errors ("cannot be a child of <body>", "mounting a new <html> component").
// Each auth page (signin/signup/login) renders its own self-contained
// full-screen design, so this layout simply passes children through.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
