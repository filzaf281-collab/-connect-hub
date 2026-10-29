import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { findUserByEmail, UserRecord, UserRole } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "connecthub-jwt-secret-key-2026";
export const AUTH_COOKIE_NAME = "connecthub_session_token";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
}

export function cleanEmail(email: string): string {
  if (!email) return "";
  const cleaned = email.trim().toLowerCase();
  if (!cleaned.includes("@") && cleaned === "areebiqbal630") {
    return "areebiqbal630@gmail.com";
  }
  return cleaned;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export function signUserToken(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyUserToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (token) {
      const verified = verifyUserToken(token);
      if (verified) return verified;
    }

    // Check for next-auth session token if present
    const nextAuthToken =
      cookieStore.get("next-auth.session-token")?.value ||
      cookieStore.get("__Secure-next-auth.session-token")?.value;
    if (nextAuthToken) {
      const verified = verifyUserToken(nextAuthToken);
      if (verified) return verified;
    }
  } catch (err) {
    console.warn("Could not retrieve current user from cookies:", err);
  }
  return null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("[Auth] Missing credentials");
          return null;
        }

        const email = cleanEmail(credentials.email);
        console.log(`[Auth] Authorizing attempt for: ${email}`);

        const user = await findUserByEmail(email);
        if (!user) {
          console.log(`[Auth] User not found: ${email}`);
          return null;
        }

        const isValid = await comparePassword(credentials.password, user.password);
        if (!isValid) {
          console.log(`[Auth] Invalid password for: ${email}`);
          return null;
        }

        console.log(`[Auth] Success authorize for: ${email} (Role: ${user.role})`);
        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split("@")[0],
          role: user.role,
        } as any;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role || "STUDENT";
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET || "connecthub-jwt-secret-key-2026",
};

export default authOptions;
