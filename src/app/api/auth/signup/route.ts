import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { cleanEmail, hashPassword, signUserToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { createUser, findUserByEmail, UserRole } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: rawEmail, password, name, role: rawRole } = body;

    if (!rawEmail || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const email = cleanEmail(rawEmail);
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    console.log(`[Signup API] Creating account for ${email} with role: ${rawRole}`);

    // Check if user already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      console.log(`[Signup API] Email already registered: ${email}`);
      return NextResponse.json(
        { error: "This email is already registered. Please sign in instead." },
        { status: 409 }
      );
    }

    // Role check: TEACHER or STUDENT
    const role: UserRole =
      rawRole && rawRole.toString().toUpperCase() === "TEACHER"
        ? "TEACHER"
        : "STUDENT";

    // Hash password with bcryptjs 10 rounds
    const hashedPassword = await hashPassword(password);

    const user = await createUser({
      email,
      password: hashedPassword,
      name: name || email.split("@")[0],
      role,
    });

    // Also sync role in Supabase profiles if record exists
    try {
      await supabase
        .from("profiles")
        .update({
          role: role === "TEACHER" ? "teacher" : "student",
          is_teacher: role === "TEACHER",
        })
        .ilike("email", email);
    } catch (sbErr) {
      console.warn("[Signup API] Supabase profile sync notice:", sbErr);
    }

    console.log(`[Signup API] User created successfully: ${user.email} (ID: ${user.id}, Role: ${user.role})`);

    const token = signUserToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );

    // Set HTTP-only cookie
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[Signup API] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
