import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { submitQuizAttempt } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const body = await req.json();
    const { answers, studentName, studentEmail } = body;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Answers payload is required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const studentId = user?.id || `student-${Date.now()}`;
    const name = studentName || user?.name || "Student";
    const email = studentEmail || user?.email || "areebiqbal630@gmail.com";

    const result = await submitQuizAttempt({
      quizId,
      studentId,
      studentName: name,
      studentEmail: email,
      answers,
    });

    return NextResponse.json({
      success: true,
      message: "Quiz submitted successfully",
      ...result,
    });
  } catch (err: any) {
    console.error("[Student Quiz Attempt POST] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit quiz attempt" },
      { status: 500 }
    );
  }
}
