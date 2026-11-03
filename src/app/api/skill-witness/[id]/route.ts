import { NextRequest, NextResponse } from "next/server";
import { getCertificateByIdOrHash } from "@/lib/skill-witness-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const idOrHash = resolvedParams.id;
    const url = new URL(req.url);
    const verifyHash = url.searchParams.get("verify");

    const certificate = await getCertificateByIdOrHash(idOrHash);

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    // Check verification status:
    // If verify parameter is passed, ensure it matches certificateHash
    const isHashMatched = verifyHash
      ? verifyHash.trim().toUpperCase() === certificate.certificateHash.toUpperCase()
      : true;

    return NextResponse.json({
      success: true,
      certificate,
      verified: certificate.isVerified && isHashMatched,
      hashMatched: isHashMatched,
    });
  } catch (err: any) {
    console.error("[SkillWitness Detail API GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch certificate" },
      { status: 500 }
    );
  }
}
