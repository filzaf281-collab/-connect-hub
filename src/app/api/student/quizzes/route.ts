import { NextResponse } from "next/server";
import { getPublishedQuizzes } from "@/lib/db";

export async function GET() {
  try {
    const quizzes = await getPublishedQuizzes();
    return NextResponse.json({ success: true, quizzes });
  } catch (err: any) {
    console.error("[Student Quizzes GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch published quizzes" },
      { status: 500 }
    );
  }
}
