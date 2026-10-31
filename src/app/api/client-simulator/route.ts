import { NextRequest, NextResponse } from "next/server";
import { saveSimulation, getSimulationByPortfolio } from "@/lib/client-simulator-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, portfolioUsername, clientName, clientProject, chatHistory, skillScore } = body;

    if (!portfolioUsername) {
      return NextResponse.json(
        { error: "portfolioUsername is required" },
        { status: 400 }
      );
    }

    const simulation = await saveSimulation({
      userId: String(userId || "anonymous"),
      portfolioUsername: String(portfolioUsername).trim().toLowerCase(),
      clientName: clientName || "Ahmed (Bakery Owner)",
      clientProject: clientProject || "Bakery Website $50",
      chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
      skillScore: Number(skillScore) || 85,
    });

    return NextResponse.json({
      success: true,
      message: "Simulation proof saved successfully",
      simulation,
    });
  } catch (error: any) {
    console.error("[API Client Simulator] Error saving simulation:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save simulation" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "username parameter is required" }, { status: 400 });
    }

    const simulation = await getSimulationByPortfolio(username);
    return NextResponse.json({
      success: true,
      simulation,
    });
  } catch (error: any) {
    console.error("[API Client Simulator] Error fetching simulation:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
