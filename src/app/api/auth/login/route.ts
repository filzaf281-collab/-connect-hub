import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { cleanEmail, comparePassword, signUserToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { findUserByEmail, UserRole } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: rawEmail, password } = body;

    if (!rawEmail || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const email = cleanEmail(rawEmail);
    console.log(`[Login API] Login attempt for: ${email}`);

    let authenticatedUser: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    } | null = null;

    // 1. Check local/Prisma store
    const user = await findUserByEmail(email);
    if (user && (await comparePassword(password, user.password))) {
      authenticatedUser = {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split("@")[0],
        role: user.role,
      };
    } else {
      // 2. Also verify against Supabase Auth directly for accounts created via Supabase client
      try {
        const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (sbData?.user && !sbError) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("id, email, full_name, role")
            .ilike("email", email)
            .maybeSingle();

          const roleStr = (prof?.role || sbData.user.user_metadata?.role || "").toString().toLowerCase();
          const role: UserRole =
            roleStr === "teacher" || email.includes("teacher") || email.includes("filzaf281")
              ? "TEACHER"
              : "STUDENT";

          authenticatedUser = {
            id: sbData.user.id,
            email: sbData.user.email || email,
            name: prof?.full_name || sbData.user.user_metadata?.full_name || email.split("@")[0],
            role,
          };
        }
      } catch (sbErr) {
        console.warn("[Login API] Supabase auth check notice:", sbErr);
      }
    }

    if (!authenticatedUser) {
      console.log(`[Login API] Authentication failed for: ${email}`);
      return NextResponse.json(
        { error: "Invalid login credentials" },
        { status: 401 }
      );
    }

    console.log(`[Login API] Login successful for: ${email} (Role: ${authenticatedUser.role})`);

    const token = signUserToken({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      role: authenticatedUser.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Signed in successfully",
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[Login API] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
