import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { submitQuizAttempt } from "@/lib/db";
import { supabase, isUuid } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const quizId = resolvedParams.id;
    const body = await req.json();
    const { answers, studentName, studentEmail, studentId: customStudentId } = body;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Answers payload is required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    let email = studentEmail || user?.email || "areebiqbal630@gmail.com";
    let name = studentName || user?.name || "Areeb Student";
    let studentId = customStudentId || user?.id;

    // Resolve valid UUID from Supabase profiles if studentId is not a UUID
    if (!isUuid(studentId) && email) {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, full_name")
          .ilike("email", email.trim().toLowerCase())
          .maybeSingle();

        if (prof?.id) {
          studentId = prof.id;
          if (prof.full_name) name = prof.full_name;
        }
      } catch (e) {
        console.warn("Could not lookup student profile UUID:", e);
      }
    }

    const result = await submitQuizAttempt({
      quizId,
      studentId: studentId || "490c24ce-e3c9-473c-9565-207c286ce696",
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
