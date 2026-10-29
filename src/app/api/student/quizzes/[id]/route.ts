import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getQuizById } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const quiz = await getQuizById(quizId);

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // SANITIZE: Never expose correct answers to students before submission
    const sanitizedQuestions = (quiz.questions || []).map((q) => ({
      id: q.id,
      quizId: q.quizId,
      text: q.text,
      options: q.options,
      points: q.points || 10,
    }));

    const sanitizedQuiz = {
      id: quiz.id,
      title: quiz.title,
      subject: quiz.subject,
      description: quiz.description,
      dueDate: quiz.dueDate,
      isPublished: quiz.isPublished,
      questions: sanitizedQuestions,
    };

    return NextResponse.json({ success: true, quiz: sanitizedQuiz });
  } catch (err: any) {
    console.error("[Student Quiz Detail GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}
