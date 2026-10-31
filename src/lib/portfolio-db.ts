import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export interface PortfolioRecord {
  id: string;
  userId: string;
  username: string; // unique, lowercase
  fullName: string;
  photoUrl?: string;
  skillName: string;
  score: number;
  verified: boolean; // true
  whatsappNumber?: string;
  bio?: string;
  createdAt: string;
}

// Memory fallback store for resilient serverless execution
const globalPortfolios: Map<string, PortfolioRecord> = new Map();

const LOCAL_STORE_FILE = path.join(process.cwd(), ".portfolios-store.json");

function loadLocalFileStore(): Record<string, PortfolioRecord> {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[PortfolioDB] Local file read notice:", err);
  }
  return {};
}

function saveLocalFileStore(data: Record<string, PortfolioRecord>) {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[PortfolioDB] Local file write notice:", err);
  }
}

export function cleanUsername(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateUniqueUsername(fullName: string): string {
  const base = cleanUsername(fullName) || "talent";
  const rand = Math.floor(100 + Math.random() * 900);
  return `${base}-${rand}`;
}

/**
 * Save a new or updated portfolio to Supabase and resilient fallback store
 */
export async function savePortfolio(
  data: Omit<PortfolioRecord, "id" | "createdAt" | "verified"> & {
    id?: string;
    verified?: boolean;
    createdAt?: string;
  }
): Promise<PortfolioRecord> {
  const username = cleanUsername(data.username) || generateUniqueUsername(data.fullName);
  const now = new Date().toISOString();
  const id = data.id || `port_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const record: PortfolioRecord = {
    id,
    userId: String(data.userId || "anonymous"),
    username,
    fullName: data.fullName || "Connect Hub Student",
    photoUrl: data.photoUrl || "",
    skillName: data.skillName || "General Skills",
    score: Number(data.score) || 0,
    verified: true,
    whatsappNumber: (data.whatsappNumber || "").trim(),
    bio: data.bio || `Certified in ${data.skillName || "skills"} with ${data.score || 0}% score on Connect Hub. Ready for projects and tutoring.`,
    createdAt: data.createdAt || now,
  };

  // 1. Cache in memory and local store
  globalPortfolios.set(username, record);
  const fileStore = loadLocalFileStore();
  fileStore[username] = record;
  saveLocalFileStore(fileStore);

  // 2. Persist to Supabase "portfolios" table if it exists
  try {
    const { error } = await supabase.from("portfolios").upsert(
      {
        id: record.id,
        user_id: record.userId,
        username: record.username,
        full_name: record.fullName,
        photo_url: record.photoUrl,
        skill_name: record.skillName,
        score: record.score,
        verified: record.verified,
        whatsapp_number: record.whatsappNumber,
        bio: record.bio,
        created_at: record.createdAt,
      },
      { onConflict: "username" }
    );

    if (error) {
      console.warn("[PortfolioDB] Supabase upsert notice (using fallback):", error.message);
    }
  } catch (sbErr) {
    console.warn("[PortfolioDB] Supabase exception notice:", sbErr);
  }

  return record;
}

/**
 * Get portfolio by username (case-insensitive)
 */
export async function getPortfolioByUsername(username: string): Promise<PortfolioRecord | null> {
  const clean = cleanUsername(username);
  if (!clean) return null;

  // 1. Try Supabase first
  try {
    const { data, error } = await supabase
      .from("portfolios")
      .select("*")
      .ilike("username", clean)
      .maybeSingle();

    if (data && !error) {
      return {
        id: data.id,
        userId: data.user_id || data.userId || "anonymous",
        username: data.username,
        fullName: data.full_name || data.fullName,
        photoUrl: data.photo_url || data.photoUrl,
        skillName: data.skill_name || data.skillName,
        score: Number(data.score) || 0,
        verified: data.verified ?? true,
        whatsappNumber: data.whatsapp_number || data.whatsappNumber || "",
        bio: data.bio || "",
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      };
    }
  } catch (sbErr) {
    console.warn("[PortfolioDB] Supabase query notice:", sbErr);
  }

  // 2. Fallback to memory
  if (globalPortfolios.has(clean)) {
    return globalPortfolios.get(clean)!;
  }

  // 3. Fallback to local store
  const fileStore = loadLocalFileStore();
  if (fileStore[clean]) {
    globalPortfolios.set(clean, fileStore[clean]);
    return fileStore[clean];
  }

  return null;
}
