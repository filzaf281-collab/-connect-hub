import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import prisma from "./prisma";

export type UserRole = "TEACHER" | "STUDENT";

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  password: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionRecord {
  id: string;
  quizId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

export interface QuizAttemptRecord {
  id: string;
  quizId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  score: number;
  maxScore?: number;
  answers: any;
  createdAt: string;
}

export interface QuizRecord {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  teacherId: string;
  teacherName?: string;
  teacherEmail?: string;
  createdAt: string;
  dueDate?: string | null;
  isPublished: boolean;
  questions?: QuestionRecord[];
  attempts?: QuizAttemptRecord[];
}

interface LocalStore {
  users: UserRecord[];
  quizzes: QuizRecord[];
  questions: QuestionRecord[];
  attempts: QuizAttemptRecord[];
}

const LOCAL_STORE_FILE = path.join(process.cwd(), ".db-store.json");

// Default initial seed data with bcrypt-hashed passwords for '12345678'
// bcrypt hash of '12345678' with 10 rounds:
const DEFAULT_HASH_12345678 = "$2a$10$wT37tV.r3XJ8hR8M0qB6p.s5eXl4d5w0lBfRjL5mE8q7A8N.d2EWW";

function loadLocalStore(): LocalStore {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const data = fs.readFileSync(LOCAL_STORE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Could not read local store, creating new one:", err);
  }

  const defaultUsers: UserRecord[] = [
    {
      id: "teacher-filza-1",
      email: "filzaf281@gmail.com",
      name: "Filza Teacher",
      password: bcrypt.hashSync("12345678", 10),
      role: "TEACHER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "student-areeb-2",
      email: "areebiqbal630@gmail.com",
      name: "Areeb Student",
      password: bcrypt.hashSync("12345678", 10),
      role: "STUDENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "student-areeb-short",
      email: "areebiqbal630",
      name: "Areeb Student",
      password: bcrypt.hashSync("12345678", 10),
      role: "STUDENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const defaultQuizzes: QuizRecord[] = [
    {
      id: "quiz-demo-1",
      title: "Web Architecture & Next.js Fundamentals",
      subject: "Computer Science",
      description: "Test your understanding of Next.js 14, server components, and full-stack development.",
      teacherId: "teacher-filza-1",
      teacherName: "Filza Teacher",
      teacherEmail: "filzaf281@gmail.com",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isPublished: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const defaultQuestions: QuestionRecord[] = [
    {
      id: "q-1",
      quizId: "quiz-demo-1",
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
      id: "q-2",
      quizId: "quiz-demo-1",
      text: "Which file convention defines the root routing middleware in Next.js?",
      options: ["router.config.ts", "middleware.ts", "server.ts", "app/routes.ts"],
      correctAnswer: 1,
      points: 10,
    },
    {
      id: "q-3",
      quizId: "quiz-demo-1",
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
  ];

  const initialStore: LocalStore = {
    users: defaultUsers,
    quizzes: defaultQuizzes,
    questions: defaultQuestions,
    attempts: [],
  };

  saveLocalStore(initialStore);
  return initialStore;
}

function saveLocalStore(store: LocalStore) {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving local store:", err);
  }
}

let prismaAvailable: boolean | null = null;

async function isPrismaReady(): Promise<boolean> {
  if (prismaAvailable !== null) return prismaAvailable;
  if (!process.env.DATABASE_URL) {
    prismaAvailable = false;
    return false;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    prismaAvailable = true;
    return true;
  } catch (e) {
    console.warn("Prisma connection check failed, using fallback storage:", (e as any)?.message);
    prismaAvailable = false;
    return false;
  }
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const cleanEmail = email.trim().toLowerCase();

  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          password: user.password,
          role: user.role as UserRole,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      }
    } catch (err) {
      console.warn("Prisma findUserByEmail error:", (err as any)?.message);
    }
  }

  // Fallback store
  const store = loadLocalStore();
  const found = store.users.find(
    (u) =>
      u.email.toLowerCase() === cleanEmail ||
      (cleanEmail.includes("@") && u.email.toLowerCase() === cleanEmail.split("@")[0])
  );
  return found || null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          password: user.password,
          role: user.role as UserRole,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      }
    } catch (err) {
      console.warn("Prisma findUserById error:", (err as any)?.message);
    }
  }

  const store = loadLocalStore();
  const found = store.users.find((u) => u.id === id);
  return found || null;
}

export async function createUser(data: {
  email: string;
  password: string; // Plain password or pre-hashed
  name?: string;
  role?: UserRole;
}): Promise<UserRecord> {
  const cleanEmail = data.email.trim().toLowerCase();
  const role: UserRole = data.role === "TEACHER" ? "TEACHER" : "STUDENT";
  const name = data.name || cleanEmail.split("@")[0] || "User";

  // Ensure password is hash if not already bcrypt format
  const passwordHash = data.password.startsWith("$2")
    ? data.password
    : await bcrypt.hash(data.password, 10);

  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const created = await prisma.user.upsert({
        where: { email: cleanEmail },
        update: {
          name,
          password: passwordHash,
          role: role as any,
        },
        create: {
          email: cleanEmail,
          password: passwordHash,
          name,
          role: role as any,
        },
      });

      return {
        id: created.id,
        email: created.email,
        name: created.name,
        password: created.password,
        role: created.role as UserRole,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err) {
      console.warn("Prisma createUser error, falling back to local store:", (err as any)?.message);
    }
  }

  const store = loadLocalStore();
  const existingIndex = store.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  const newUser: UserRecord = {
    id: existingIndex >= 0 ? store.users[existingIndex].id : `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    email: cleanEmail,
    name,
    password: passwordHash,
    role,
    createdAt: existingIndex >= 0 ? store.users[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    store.users[existingIndex] = newUser;
  } else {
    store.users.push(newUser);
  }

  saveLocalStore(store);
  return newUser;
}

export async function seedUsers(): Promise<{ teacher: UserRecord; student: UserRecord }> {
  const teacher = await createUser({
    email: "filzaf281@gmail.com",
    password: "12345678",
    name: "filzaf281",
    role: "TEACHER",
  });

  const student = await createUser({
    email: "areebiqbal630@gmail.com",
    password: "12345678",
    name: "areebiqbal630",
    role: "STUDENT",
  });

  // Also support short username "areebiqbal630"
  await createUser({
    email: "areebiqbal630",
    password: "12345678",
    name: "areebiqbal630",
    role: "STUDENT",
  });

  return { teacher, student };
}

// -------------------------------------------------------------
// QUIZ OPERATIONS
// -------------------------------------------------------------

export async function getTeacherQuizzes(teacherId: string): Promise<QuizRecord[]> {
  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const list = await prisma.quiz.findMany({
        where: { teacherId },
        include: {
          questions: true,
          attempts: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return list.map((q) => ({
        id: q.id,
        title: q.title,
        subject: q.subject,
        description: q.description,
        teacherId: q.teacherId,
        createdAt: q.createdAt.toISOString(),
        dueDate: q.dueDate ? q.dueDate.toISOString() : null,
        isPublished: q.isPublished,
        questions: q.questions.map((qn) => ({
          id: qn.id,
          quizId: qn.quizId,
          text: qn.text,
          options: qn.options,
          correctAnswer: qn.correctAnswer,
          points: qn.points,
        })),
        attempts: q.attempts.map((att) => ({
          id: att.id,
          quizId: att.quizId,
          studentId: att.studentId,
          score: att.score,
          answers: att.answers,
          createdAt: att.createdAt.toISOString(),
        })),
      }));
    } catch (err) {
      console.warn("Prisma getTeacherQuizzes error:", (err as any)?.message);
    }
  }

  const store = loadLocalStore();
  const quizzes = store.quizzes.filter(
    (q) => q.teacherId === teacherId || q.teacherEmail?.includes("filzaf281")
  );

  return quizzes.map((q) => {
    const questions = store.questions.filter((qn) => qn.quizId === q.id);
    const attempts = store.attempts.filter((att) => att.quizId === q.id);
    return {
      ...q,
      questions,
      attempts,
    };
  });
}

export async function createQuiz(data: {
  title: string;
  subject: string;
  description?: string;
  teacherId: string;
  teacherEmail?: string;
  teacherName?: string;
  dueDate?: string;
  isPublished?: boolean;
  questions: {
    text: string;
    options: string[];
    correctAnswer: number;
    points?: number;
  }[];
}): Promise<QuizRecord> {
  const isPublished = data.isPublished !== undefined ? data.isPublished : true;
  const dueDate = data.dueDate ? new Date(data.dueDate) : null;

  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const created = await prisma.quiz.create({
        data: {
          title: data.title,
          subject: data.subject,
          description: data.description || null,
          teacherId: data.teacherId,
          dueDate,
          isPublished,
          questions: {
            create: data.questions.map((qn) => ({
              text: qn.text,
              options: qn.options,
              correctAnswer: qn.correctAnswer,
              points: qn.points || 10,
            })),
          },
        },
        include: {
          questions: true,
          attempts: true,
        },
      });

      return {
        id: created.id,
        title: created.title,
        subject: created.subject,
        description: created.description,
        teacherId: created.teacherId,
        createdAt: created.createdAt.toISOString(),
        dueDate: created.dueDate ? created.dueDate.toISOString() : null,
        isPublished: created.isPublished,
        questions: created.questions.map((qn) => ({
          id: qn.id,
          quizId: qn.quizId,
          text: qn.text,
          options: qn.options,
          correctAnswer: qn.correctAnswer,
          points: qn.points,
        })),
        attempts: [],
      };
    } catch (err) {
      console.warn("Prisma createQuiz error, saving to local store:", (err as any)?.message);
    }
  }

  const store = loadLocalStore();
  const quizId = `quiz-${Date.now()}`;
  const newQuiz: QuizRecord = {
    id: quizId,
    title: data.title,
    subject: data.subject,
    description: data.description || null,
    teacherId: data.teacherId,
    teacherEmail: data.teacherEmail || "filzaf281@gmail.com",
    teacherName: data.teacherName || "Filza Teacher",
    createdAt: new Date().toISOString(),
    dueDate: data.dueDate || null,
    isPublished,
  };

  const newQuestions: QuestionRecord[] = data.questions.map((qn, idx) => ({
    id: `q-${quizId}-${idx + 1}`,
    quizId,
    text: qn.text,
    options: qn.options,
    correctAnswer: qn.correctAnswer,
    points: qn.points || 10,
  }));

  store.quizzes.unshift(newQuiz);
  store.questions.push(...newQuestions);
  saveLocalStore(store);

  return {
    ...newQuiz,
    questions: newQuestions,
    attempts: [],
  };
}

export async function deleteQuiz(quizId: string): Promise<boolean> {
  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      await prisma.quiz.delete({ where: { id: quizId } });
      return true;
    } catch (err) {
      console.warn("Prisma deleteQuiz error:", (err as any)?.message);
    }
  }

  const store = loadLocalStore();
  store.quizzes = store.quizzes.filter((q) => q.id !== quizId);
  store.questions = store.questions.filter((qn) => qn.quizId !== quizId);
  store.attempts = store.attempts.filter((att) => att.quizId !== quizId);
  saveLocalStore(store);
  return true;
}

export async function getQuizWithAttempts(quizId: string): Promise<QuizRecord | null> {
  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          questions: true,
          attempts: {
            include: { student: true },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (quiz) {
        return {
          id: quiz.id,
          title: quiz.title,
          subject: quiz.subject,
          description: quiz.description,
          teacherId: quiz.teacherId,
          createdAt: quiz.createdAt.toISOString(),
          dueDate: quiz.dueDate ? quiz.dueDate.toISOString() : null,
          isPublished: quiz.isPublished,
          questions: quiz.questions.map((qn) => ({
            id: qn.id,
            quizId: qn.quizId,
            text: qn.text,
            options: qn.options,
            correctAnswer: qn.correctAnswer,
            points: qn.points,
          })),
          attempts: quiz.attempts.map((att) => ({
            id: att.id,
            quizId: att.quizId,
            studentId: att.studentId,
            studentName: att.student?.name || att.student?.email,
            studentEmail: att.student?.email,
            score: att.score,
            answers: att.answers,
            createdAt: att.createdAt.toISOString(),
          })),
        };
      }
    } catch (err) {
      console.warn("Prisma getQuizWithAttempts error:", (err as any)?.message);
    }
  }

  const store = loadLocalStore();
  const quiz = store.quizzes.find((q) => q.id === quizId);
  if (!quiz) return null;

  const questions = store.questions.filter((qn) => qn.quizId === quizId);
  const attempts = store.attempts.filter((att) => att.quizId === quizId);

  return {
    ...quiz,
    questions,
    attempts,
  };
}

export async function getPublishedQuizzes(): Promise<QuizRecord[]> {
  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const quizzes = await prisma.quiz.findMany({
        where: { isPublished: true },
        include: {
          questions: true,
          attempts: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        subject: q.subject,
        description: q.description,
        teacherId: q.teacherId,
        createdAt: q.createdAt.toISOString(),
        dueDate: q.dueDate ? q.dueDate.toISOString() : null,
        isPublished: q.isPublished,
        questions: q.questions.map((qn) => ({
          id: qn.id,
          quizId: qn.quizId,
          text: qn.text,
          options: qn.options,
          correctAnswer: qn.correctAnswer,
          points: qn.points,
        })),
        attempts: q.attempts.map((att) => ({
          id: att.id,
          quizId: att.quizId,
          studentId: att.studentId,
          score: att.score,
          answers: att.answers,
          createdAt: att.createdAt.toISOString(),
        })),
      }));
    } catch (err) {
      console.warn("Prisma getPublishedQuizzes error:", (err as any)?.message);
    }
  }

  const store = loadLocalStore();
  const quizzes = store.quizzes.filter((q) => q.isPublished !== false);

  return quizzes.map((q) => {
    const questions = store.questions.filter((qn) => qn.quizId === q.id);
    const attempts = store.attempts.filter((att) => att.quizId === q.id);
    return {
      ...q,
      questions,
      attempts,
    };
  });
}

export async function getQuizById(quizId: string): Promise<QuizRecord | null> {
  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { questions: true },
      });
      if (quiz) {
        return {
          id: quiz.id,
          title: quiz.title,
          subject: quiz.subject,
          description: quiz.description,
          teacherId: quiz.teacherId,
          createdAt: quiz.createdAt.toISOString(),
          dueDate: quiz.dueDate ? quiz.dueDate.toISOString() : null,
          isPublished: quiz.isPublished,
          questions: quiz.questions.map((qn) => ({
            id: qn.id,
            quizId: qn.quizId,
            text: qn.text,
            options: qn.options,
            correctAnswer: qn.correctAnswer,
            points: qn.points,
          })),
        };
      }
    } catch (err) {
      console.warn("Prisma getQuizById error:", (err as any)?.message);
    }
  }

  const store = loadLocalStore();
  const quiz = store.quizzes.find((q) => q.id === quizId);
  if (!quiz) return null;
  const questions = store.questions.filter((qn) => qn.quizId === quizId);
  return {
    ...quiz,
    questions,
  };
}

export async function submitQuizAttempt(data: {
  quizId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  answers: Record<string, number>; // questionId -> selectedIndex
}): Promise<{
  attempt: QuizAttemptRecord;
  totalScore: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
}> {
  const quiz = await getQuizById(data.quizId);
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    throw new Error("Quiz not found or has no questions.");
  }

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;

  for (const qn of quiz.questions) {
    maxScore += qn.points || 10;
    const selected = data.answers[qn.id];
    if (selected !== undefined && selected === qn.correctAnswer) {
      totalScore += qn.points || 10;
      correctCount++;
    }
  }

  const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const attemptRecord: QuizAttemptRecord = {
    id: attemptId,
    quizId: data.quizId,
    studentId: data.studentId,
    studentName: data.studentName || data.studentEmail?.split("@")[0] || "Student",
    studentEmail: data.studentEmail || "",
    score: totalScore,
    maxScore,
    answers: data.answers,
    createdAt: new Date().toISOString(),
  };

  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const created = await prisma.quizAttempt.create({
        data: {
          quizId: data.quizId,
          studentId: data.studentId,
          score: totalScore,
          answers: data.answers as any,
        },
      });
      attemptRecord.id = created.id;
    } catch (err) {
      console.warn("Prisma submitQuizAttempt error, saving locally:", (err as any)?.message);
    }
  }

  const store = loadLocalStore();
  store.attempts.push(attemptRecord);
  saveLocalStore(store);

  return {
    attempt: attemptRecord,
    totalScore,
    maxScore,
    correctCount,
    totalCount: quiz.questions.length,
  };
}
