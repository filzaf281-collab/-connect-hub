import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { cleanEmail, comparePassword, signUserToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db";

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

    const user = await findUserByEmail(email);
    if (!user) {
      console.log(`[Login API] User not found: ${email}`);
      return NextResponse.json(
        { error: "Invalid login credentials" },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      console.log(`[Login API] Password mismatch for: ${email}`);
      return NextResponse.json(
        { error: "Invalid login credentials" },
        { status: 401 }
      );
    }

    console.log(`[Login API] Login successful for: ${email} (Role: ${user.role})`);

    const token = signUserToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Signed in successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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
