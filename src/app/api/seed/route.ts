import { NextResponse } from "next/server";
import { seedUsers, getTeacherQuizzes, createQuiz } from "@/lib/db";

export async function GET() {
  return handleSeed();
}

export async function POST() {
  return handleSeed();
}

async function handleSeed() {
  try {
    console.log("[Seed API] Running user and quiz seeding...");
    const { teacher, student } = await seedUsers();

    // Ensure at least one quiz exists
    const existing = await getTeacherQuizzes(teacher.id);
    let sampleQuizCreated = false;

    if (existing.length === 0) {
      await createQuiz({
        title: "Web Architecture & Next.js Fundamentals",
        subject: "Computer Science",
        description: "Test your understanding of Next.js 14, server components, and full-stack development.",
        teacherId: teacher.id,
        teacherEmail: teacher.email,
        teacherName: teacher.name || "Filza Teacher",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isPublished: true,
        questions: [
          {
            text: "What rendering strategy is the default for components in the Next.js App Router?",
            options: [
              "Client-Side Rendering (CSR)",
              "React Server Components (RSC)",
              "Static Site Generation (SSG) with getStaticProps",
              "Incremental Static Regeneration (ISR)",
            ],
            correctAnswer: 1,
            points: 10,
          },
          {
            text: "Which file convention defines the root routing middleware in Next.js?",
            options: ["router.config.ts", "middleware.ts", "server.ts", "app/routes.ts"],
            correctAnswer: 1,
            points: 10,
          },
          {
            text: "How are passwords securely stored for authentication in standard modern backends?",
            options: [
              "Base64 encoded string",
              "Salted hash using bcrypt with work factor",
              "AES-256 reversible encryption",
              "Plain text in a private table",
            ],
            correctAnswer: 1,
            points: 10,
          },
        ],
      });
      sampleQuizCreated = true;
    }

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      seeded: {
        teacher: { email: teacher.email, role: teacher.role },
        student: { email: student.email, role: student.role },
        sampleQuizCreated,
      },
    });
  } catch (err: any) {
    console.error("[Seed API] Error seeding database:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to seed database" },
      { status: 500 }
    );
  }
}
