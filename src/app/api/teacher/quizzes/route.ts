import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createQuiz, getTeacherQuizzes } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const teacherId = user?.id || "teacher-filza-1";
    const quizzes = await getTeacherQuizzes(teacherId);

    return NextResponse.json({ success: true, quizzes });
  } catch (err: any) {
    console.error("[Teacher Quizzes GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { title, subject, description, dueDate, isPublished, questions } = body;

    if (!title || !subject) {
      return NextResponse.json(
        { error: "Title and subject are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      );
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text || !Array.isArray(q.options) || q.options.length < 2) {
        return NextResponse.json(
          { error: `Question ${i + 1} must have text and at least 2 options` },
          { status: 400 }
        );
      }
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        return NextResponse.json(
          { error: `Question ${i + 1} must have a valid correct answer selection` },
          { status: 400 }
        );
      }
    }

    const teacherId = user?.id || "teacher-filza-1";
    const teacherEmail = user?.email || "filzaf281@gmail.com";
    const teacherName = user?.name || "Filza Teacher";

    const quiz = await createQuiz({
      title,
      subject,
      description,
      teacherId,
      teacherEmail,
      teacherName,
      dueDate,
      isPublished: isPublished !== undefined ? isPublished : true,
      questions: questions.map((q) => ({
        text: q.text,
        options: q.options,
        correctAnswer: Number(q.correctAnswer),
        points: Number(q.points) || 10,
      })),
    });

    return NextResponse.json({ success: true, quiz }, { status: 201 });
  } catch (err: any) {
    console.error("[Teacher Quizzes POST] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create quiz" },
      { status: 500 }
    );
  }
}
