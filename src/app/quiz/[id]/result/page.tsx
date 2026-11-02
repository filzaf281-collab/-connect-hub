import { redirect } from "next/navigation";

export default async function QuizResultRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;
  redirect(`/student/quizzes/${resolved.id}`);
}
