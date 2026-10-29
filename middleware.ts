import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isTeacherRoute = pathname.startsWith("/teacher");
  const isStudentRoute = pathname.startsWith("/student");

  // Only guard /teacher and /student routes
  if (!isTeacherRoute && !isStudentRoute) {
    return NextResponse.next();
  }

  // Check session tokens
  const token =
    request.cookies.get("connecthub_session_token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!token) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const decodedJson = atob(payloadBase64);
      const user = JSON.parse(decodedJson);
      const role = (user.role || "").toString().toUpperCase();

      // TEACHER accessing student route -> redirect to /teacher/dashboard
      if (role === "TEACHER" && isStudentRoute) {
        return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
      }

      // STUDENT accessing teacher route -> redirect to /student/dashboard
      if (role === "STUDENT" && isTeacherRoute) {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
    }
  } catch (err) {
    console.warn("[Middleware] Token decode warning:", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/teacher/:path*", "/student/:path*"],
};
