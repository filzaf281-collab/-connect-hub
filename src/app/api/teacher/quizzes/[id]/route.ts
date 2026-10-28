import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { deleteQuiz, getQuizWithAttempts } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const quiz = await getQuizWithAttempts(quizId);

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, quiz });
  } catch (err: any) {
    console.error("[Teacher Quiz Detail GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;

    await deleteQuiz(quizId);
    return NextResponse.json({ success: true, message: "Quiz deleted successfully" });
  } catch (err: any) {
    console.error("[Teacher Quiz DELETE] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete quiz" },
      { status: 500 }
    );
  }
}
