import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export interface ChatMessageItem {
  sender: "client" | "student";
  message: string;
  time: string;
}

export interface ClientSimulationRecord {
  id: string;
  userId: string;
  portfolioUsername: string;
  clientName: string;
  clientProject: string;
  chatHistory: ChatMessageItem[];
  skillScore: number;
  createdAt: string;
}

// Memory fallback store for resilient serverless execution
const globalSimulations: Map<string, ClientSimulationRecord> = new Map();
const LOCAL_STORE_FILE = path.join(process.cwd(), ".client-simulations-store.json");

function loadLocalFileStore(): Record<string, ClientSimulationRecord> {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[ClientSimulatorDB] Local file read notice:", err);
  }
  return {};
}

function saveLocalFileStore(data: Record<string, ClientSimulationRecord>) {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[ClientSimulatorDB] Local file write notice:", err);
  }
}

/**
 * Save a new simulation record
 */
export async function saveSimulation(
  data: Omit<ClientSimulationRecord, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): Promise<ClientSimulationRecord> {
  const id = data.id || `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const cleanUsername = (data.portfolioUsername || "").toLowerCase().trim();

  const record: ClientSimulationRecord = {
    id,
    userId: String(data.userId || "anonymous"),
    portfolioUsername: cleanUsername,
    clientName: data.clientName || "Ahmed (Bakery Owner)",
    clientProject: data.clientProject || "Bakery Website $50",
    chatHistory: Array.isArray(data.chatHistory) ? data.chatHistory : [],
    skillScore: Number(data.skillScore) || 85,
    createdAt: data.createdAt || now,
  };

  // 1. Cache in memory and local file store
  globalSimulations.set(cleanUsername, record);
  const fileStore = loadLocalFileStore();
  fileStore[cleanUsername] = record;
  saveLocalFileStore(fileStore);

  // 2. Persist to Supabase "client_simulations" table if it exists
  try {
    const { error } = await supabase.from("client_simulations").upsert(
      {
        id: record.id,
        user_id: record.userId,
        portfolio_username: record.portfolioUsername,
        client_name: record.clientName,
        client_project: record.clientProject,
        chat_history: record.chatHistory,
        skill_score: record.skillScore,
        created_at: record.createdAt,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.warn("[ClientSimulatorDB] Supabase upsert notice (fallback active):", error.message);
    }
  } catch (sbErr) {
    console.warn("[ClientSimulatorDB] Supabase exception notice:", sbErr);
  }

  return record;
}

/**
 * Get the latest simulation by portfolio username
 */
export async function getSimulationByPortfolio(
  portfolioUsername: string
): Promise<ClientSimulationRecord | null> {
  const clean = (portfolioUsername || "").toLowerCase().trim();
  if (!clean) return null;

  // 1. Try Supabase first
  try {
    const { data, error } = await supabase
      .from("client_simulations")
      .select("*")
      .ilike("portfolio_username", clean)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      return {
        id: data.id,
        userId: data.user_id || data.userId || "anonymous",
        portfolioUsername: data.portfolio_username || data.portfolioUsername,
        clientName: data.client_name || data.clientName,
        clientProject: data.client_project || data.clientProject,
        chatHistory: data.chat_history || data.chatHistory || [],
        skillScore: Number(data.skill_score || data.skillScore) || 85,
        createdAt: data.created_at || data.createdAt,
      };
    }
  } catch (sbErr) {
    console.warn("[ClientSimulatorDB] Supabase query notice:", sbErr);
  }

  // 2. Fallback to memory
  if (globalSimulations.has(clean)) {
    return globalSimulations.get(clean)!;
  }

  // 3. Fallback to local file store
  const fileStore = loadLocalFileStore();
  if (fileStore[clean]) {
    globalSimulations.set(clean, fileStore[clean]);
    return fileStore[clean];
  }

  return null;
}
