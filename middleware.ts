import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isTeacherRoute = pathname.startsWith("/teacher");
  const isStudentRoute = pathname.startsWith("/student");
  const isAuthRoute =
    pathname === "/auth/signin" ||
    pathname === "/auth/signup" ||
    pathname === "/auth/login";
  const isHomeRoute = pathname === "/";

  // Check session tokens
  const token =
    request.cookies.get("connecthub_session_token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  let role: string | null = null;
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const decodedJson = atob(payloadBase64);
        const user = JSON.parse(decodedJson);
        role = (user.role || "").toString().toUpperCase();
      }
    } catch (err) {
      console.warn("[Middleware] Token decode warning:", err);
    }
  }

  // 1. Unauthenticated users: protect /teacher/* and /student/*
  if (!role) {
    if (isTeacherRoute || isStudentRoute) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  // 2. Authenticated TEACHER:
  // - Going to student routes, root home page, or auth pages -> redirect to /teacher/dashboard
  if (role === "TEACHER") {
    if (isStudentRoute || isHomeRoute || isAuthRoute) {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 3. Authenticated STUDENT:
  // - Going to teacher routes, root home page, or auth pages -> redirect to /student/dashboard
  if (role === "STUDENT") {
    if (isTeacherRoute || isHomeRoute || isAuthRoute) {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/teacher/:path*",
    "/student/:path*",
    "/auth/signin",
    "/auth/signup",
    "/auth/login",
  ],
};
