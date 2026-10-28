import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function QuizzesIndexPage() {
  const user = await getCurrentUser();
  if (user?.role === "TEACHER") {
    redirect("/teacher/quizzes");
  }
  redirect("/student/quizzes");
}
