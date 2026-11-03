import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  saveCertificate,
  getUserCertificates,
  getBestScoreForStudent,
} from "@/lib/skill-witness-db";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || user?.id;
    const skillName = url.searchParams.get("skillName") || "Web Development";

    const [certificates, bestScore] = await Promise.all([
      getUserCertificates(userId),
      getBestScoreForStudent(userId, skillName),
    ]);

    return NextResponse.json({
      success: true,
      certificates,
      bestScore,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
          }
        : null,
    });
  } catch (err: any) {
    console.error("[SkillWitness API GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load certificates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { skillName, studentName, score, videoProofUrl, quizId } = body;

    if (!skillName || !skillName.trim()) {
      return NextResponse.json(
        { error: "Skill name is required" },
        { status: 400 }
      );
    }

    const resolvedName = (studentName || user?.name || user?.email?.split("@")[0] || "ConnectHub Student").trim();
    const resolvedUserId = user?.id || body.userId || "student-anonymous";
    const resolvedScore = Number(score) > 0 ? Number(score) : await getBestScoreForStudent(user?.id, skillName);

    const certificate = await saveCertificate({
      userId: resolvedUserId,
      studentName: resolvedName,
      skillName: skillName.trim(),
      score: resolvedScore,
      quizId: quizId || null,
      videoProofUrl: videoProofUrl || null,
    });

    return NextResponse.json({
      success: true,
      message: "Certificate generated and blockchain-hashed successfully",
      certificate,
    });
  } catch (err: any) {
    console.error("[SkillWitness API POST] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate certificate" },
      { status: 500 }
    );
  }
}
