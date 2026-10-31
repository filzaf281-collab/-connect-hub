import { NextRequest, NextResponse } from "next/server";
import { savePortfolio, getPortfolioByUsername, generateUniqueUsername, cleanUsername } from "@/lib/portfolio-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, fullName, photoUrl, skillName, score, whatsappNumber, bio, customUsername } = body;

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    let username = cleanUsername(customUsername || "");
    if (!username) {
      username = generateUniqueUsername(fullName);
    }

    // Check if username is already taken by someone else
    const existing = await getPortfolioByUsername(username);
    if (existing && existing.userId !== String(userId || "")) {
      // Append random number to ensure uniqueness
      username = `${username}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const portfolio = await savePortfolio({
      userId: String(userId || "anonymous"),
      username,
      fullName: String(fullName).trim(),
      photoUrl: photoUrl || "",
      skillName: String(skillName || "General").trim(),
      score: Number(score) || 0,
      whatsappNumber: String(whatsappNumber || "").trim(),
      bio: String(bio || "").trim(),
    });

    return NextResponse.json({
      success: true,
      message: "Portfolio created successfully",
      portfolio,
      url: `/p/${portfolio.username}`,
    });
  } catch (error: any) {
    console.error("[API Portfolios] Error creating portfolio:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create portfolio" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const portfolio = await getPortfolioByUsername(username);
    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, portfolio });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
