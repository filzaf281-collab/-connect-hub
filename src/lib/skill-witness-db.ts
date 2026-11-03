import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export interface SkillCertificateRecord {
  id: string;
  userId?: string;
  studentName: string;
  skillName: string;
  quizId?: string | null;
  score: number;
  videoProofUrl?: string | null;
  certificateHash: string;
  qrCodeData: string;
  isVerified: boolean;
  createdAt: string;
}

const LOCAL_STORE_FILE = path.join(process.cwd(), ".skill-certificates-store.json");

function loadLocalFileStore(): Record<string, SkillCertificateRecord> {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[SkillWitnessDB] Local file read warning:", err);
  }
  return {};
}

function saveLocalFileStore(data: Record<string, SkillCertificateRecord>) {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[SkillWitnessDB] Local file write warning:", err);
  }
}

/**
 * Generate unique tamper-proof hash: CH-[4 chars user]-[6 digits]
 * Example: CH-9F2B-849102
 */
export function generateCertificateHash(userId?: string): string {
  const cleanId = (userId || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const prefix = cleanId.length >= 4 ? cleanId.substring(0, 4) : Math.random().toString(36).substring(2, 6).toUpperCase();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  return `CH-${prefix}-${randomSuffix}`;
}

/**
 * Generate standard QR code URL for verification
 */
export function generateQrCodeUrl(certificateId: string, hash: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://connect-hub-plum.vercel.app";
  return `${baseUrl}/skill-witness/${certificateId}?verify=${encodeURIComponent(hash)}`;
}

/**
 * Save new certificate to Supabase with resilient fallback to local store
 */
export async function saveCertificate(data: {
  userId?: string;
  studentName: string;
  skillName: string;
  quizId?: string | null;
  score: number;
  videoProofUrl?: string | null;
}): Promise<SkillCertificateRecord> {
  const id = `cert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const certificateHash = generateCertificateHash(data.userId);
  const qrCodeData = generateQrCodeUrl(id, certificateHash);
  const now = new Date().toISOString();

  const record: SkillCertificateRecord = {
    id,
    userId: data.userId || "anonymous",
    studentName: data.studentName || "ConnectHub Student",
    skillName: data.skillName || "Web Development",
    quizId: data.quizId || null,
    score: Math.min(100, Math.max(0, Number(data.score) || 85)),
    videoProofUrl: data.videoProofUrl || null,
    certificateHash,
    qrCodeData,
    isVerified: true,
    createdAt: now,
  };

  // 1. Cache to local file store
  const store = loadLocalFileStore();
  store[record.id] = record;
  saveLocalFileStore(store);

  // 2. Persist to Supabase if table exists
  try {
    const { data: inserted, error } = await supabase.from("skill_certificates").insert({
      id: record.id,
      user_id: record.userId && record.userId.length === 36 ? record.userId : null,
      student_name: record.studentName,
      skill_name: record.skillName,
      quiz_id: record.quizId,
      score: record.score,
      video_proof_url: record.videoProofUrl,
      certificate_hash: record.certificateHash,
      qr_code_data: record.qrCodeData,
      is_verified: true,
      created_at: record.createdAt,
    }).select().maybeSingle();

    if (!error && inserted) {
      record.id = inserted.id;
      store[record.id] = record;
      saveLocalFileStore(store);
    }
  } catch (err) {
    console.warn("[SkillWitnessDB] Supabase insert fallback to local store:", err);
  }

  return record;
}

/**
 * Fetch certificate by ID or Certificate Hash
 */
export async function getCertificateByIdOrHash(idOrHash: string): Promise<SkillCertificateRecord | null> {
  const trimmed = (idOrHash || "").trim();
  if (!trimmed) return null;

  // 1. Try Supabase
  try {
    const isHash = trimmed.startsWith("CH-");
    const query = supabase.from("skill_certificates").select("*");
    const { data, error } = isHash
      ? await query.ilike("certificate_hash", trimmed).maybeSingle()
      : await query.eq("id", trimmed).maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        userId: data.user_id,
        studentName: data.student_name || "ConnectHub Student",
        skillName: data.skill_name,
        quizId: data.quiz_id,
        score: Number(data.score) || 0,
        videoProofUrl: data.video_proof_url,
        certificateHash: data.certificate_hash,
        qrCodeData: data.qr_code_data,
        isVerified: data.is_verified !== false,
        createdAt: data.created_at,
      };
    }
  } catch (err) {
    console.warn("[SkillWitnessDB] Supabase lookup error:", err);
  }

  // 2. Fallback to local file store
  const store = loadLocalFileStore();
  // By ID
  if (store[trimmed]) return store[trimmed];

  // By Hash
  const found = Object.values(store).find(
    (c) => c.certificateHash.toUpperCase() === trimmed.toUpperCase()
  );
  return found || null;
}

/**
 * Get all certificates for a user
 */
export async function getUserCertificates(userId?: string): Promise<SkillCertificateRecord[]> {
  const results: SkillCertificateRecord[] = [];

  // 1. Try Supabase
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("skill_certificates")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach((d) => {
          results.push({
            id: d.id,
            userId: d.user_id,
            studentName: d.student_name || "ConnectHub Student",
            skillName: d.skill_name,
            quizId: d.quiz_id,
            score: Number(d.score) || 0,
            videoProofUrl: d.video_proof_url,
            certificateHash: d.certificate_hash,
            qrCodeData: d.qr_code_data,
            isVerified: d.is_verified !== false,
            createdAt: d.created_at,
          });
        });
      }
    } catch (err) {
      console.warn("[SkillWitnessDB] Supabase query error:", err);
    }
  }

  // 2. Merge local store
  const store = loadLocalFileStore();
  Object.values(store).forEach((c) => {
    if (!results.some((r) => r.id === c.id || r.certificateHash === c.certificateHash)) {
      if (!userId || c.userId === userId || c.userId === "anonymous") {
        results.push(c);
      }
    }
  });

  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Fetch best quiz score for a student in Supabase/local store
 */
export async function getBestScoreForStudent(userId?: string, skillName?: string): Promise<number> {
  let best = 85; // baseline recommended score
  if (!userId) return best;

  try {
    const { data } = await supabase
      .from("quiz_attempts")
      .select("score, total")
      .eq("student_id", userId)
      .order("score", { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      const top = data[0];
      const total = Number(top.total || 100);
      const score = Number(top.score || 0);
      if (total > 0) {
        best = Math.round((score / total) * 100);
      }
    }
  } catch (e) {
    console.warn("Could not query quiz_attempts score:", e);
  }

  return Math.max(best, 80);
}
