import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import prisma from "./prisma";
import { supabase, DEMO_QUIZ_UUID, normalizeQuizId, isUuid } from "./supabase";

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
  percentage?: number;
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

export const WEB_DEV_FUNDAMENTALS_UUID = "1c3b49a6-0478-473d-adb9-57654670f1e7";

export const WEB_DEV_FUNDAMENTALS_QUESTIONS: QuestionRecord[] = [
  {
    id: "wdf-q1",
    quizId: WEB_DEV_FUNDAMENTALS_UUID,
    text: "What does HTML stand for in web development?",
    options: [
      "HyperText Markup Language",
      "High Tech Modern Language",
      "Hyperlink and Text Model Language",
      "Home Tool Management Language",
    ],
    correctAnswer: 0,
    points: 10,
  },
  {
    id: "wdf-q2",
    quizId: WEB_DEV_FUNDAMENTALS_UUID,
    text: "Which HTML5 semantic tag is recommended for defining primary website navigation links?",
    options: ["<navigation>", "<nav>", "<menu>", "<section class=\"nav\">"],
    correctAnswer: 1,
    points: 10,
  },
  {
    id: "wdf-q3",
    quizId: WEB_DEV_FUNDAMENTALS_UUID,
    text: "In the CSS box model, which layer provides space between the element's content and its border?",
    options: ["Margin", "Outline", "Padding", "Spacing"],
    correctAnswer: 2,
    points: 10,
  },
  {
    id: "wdf-q4",
    quizId: WEB_DEV_FUNDAMENTALS_UUID,
    text: "Which CSS Flexbox property specifies the alignment of items along the main axis?",
    options: ["align-items", "justify-content", "flex-direction", "align-content"],
    correctAnswer: 1,
    points: 10,
  },
  {
    id: "wdf-q5",
    quizId: WEB_DEV_FUNDAMENTALS_UUID,
    text: "Which CSS Media Query correctly targets viewport widths that are at least 768px wide?",
    options: [
      "@media screen and (min-width: 768px)",
      "@media screen and (max-device-width: 768px)",
      "@media (viewport-width: 768px)",
      "@media only (width = 768px)",
    ],
    correctAnswer: 0,
    points: 10,
  },
  {
    id: "wdf-q6",
    quizId: WEB_DEV_FUNDAMENTALS_UUID,
    text: "Which keyword was introduced in modern JavaScript (ES6) to declare a block-scoped variable that cannot be reassigned?",
    options: ["var", "let", "const", "final"],
    correctAnswer: 2,
    points: 10,
  },
  {
    id: "wdf-q7",
    quizId: WEB_DEV_FUNDAMENTALS_UUID,
    text: "Which modern DOM method selects the first element matching a specified CSS selector in a web document?",
    options: [
      "document.getElementsByClassName()",
      "document.querySelector()",
      "document.getElementByIdFirst()",
      "document.selectFirstNode()",
    ],
    correctAnswer: 1,
    points: 10,
  },
  {
    id: "wdf-q8",
    quizId: WEB_DEV_FUNDAMENTALS_UUID,
    text: "Which method is the standard way to attach an event handler to a button in JavaScript without overwriting other handlers?",
    options: [
      "button.addEventListener('click', handler)",
      "button.onclick = handler",
      "button.attachEvent('click', handler)",
      "button.bind('click', handler)",
    ],
    correctAnswer: 0,
    points: 10,
  },
  {
    id: "wdf-q9",
    quizId: WEB_DEV_FUNDAMENTALS_UUID,
    text: "What is the primary security advantage of HTTPS compared to standard HTTP?",
    options: [
      "HTTPS compresses web traffic so pages load significantly faster",
      "HTTPS uses TLS/SSL encryption to secure communications and prevent eavesdropping",
      "HTTPS bypasses client-side caching to prevent stale pages",
      "HTTPS operates on port 80 instead of port 443",
    ],
    correctAnswer: 1,
    points: 10,
  },
  {
    id: "wdf-q10",
    quizId: WEB_DEV_FUNDAMENTALS_UUID,
    text: "Which HTTP response status code indicates that a requested resource was successfully created on the server?",
    options: ["200 OK", "201 Created", "204 No Content", "301 Moved Permanently"],
    correctAnswer: 1,
    points: 10,
  },
];

const LOCAL_STORE_FILE = path.join(process.cwd(), ".db-store.json");

// Default initial seed data with bcrypt-hashed passwords for '12345678'
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
      id: DEMO_QUIZ_UUID,
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
      quizId: DEMO_QUIZ_UUID,
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
      quizId: DEMO_QUIZ_UUID,
      text: "Which file convention defines the root routing middleware in Next.js?",
      options: ["router.config.ts", "middleware.ts", "server.ts", "app/routes.ts"],
      correctAnswer: 1,
      points: 10,
    },
    {
      id: "q-3",
      quizId: DEMO_QUIZ_UUID,
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


async function isStudentRequest(): Promise<boolean> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token =
      cookieStore.get('connecthub_session_token')?.value ||
      cookieStore.get('next-auth.session-token')?.value ||
      cookieStore.get('__Secure-next-auth.session-token')?.value;

    if (!token) return false;
    const jwt = await import('jsonwebtoken');
    const decoded: any = jwt.default.decode(token);
    if (decoded && (decoded.role === 'STUDENT' || decoded.role === 'student')) {
      return true;
    }
  } catch (e) {}
  return false;
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
  if (found) return found;

  // Also query Supabase profiles
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (prof) {
      return {
        id: prof.id,
        email: prof.email,
        name: prof.full_name || prof.email.split("@")[0],
        password: DEFAULT_HASH_12345678,
        role: (prof.role?.toUpperCase() === "TEACHER" ? "TEACHER" : "STUDENT") as UserRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (e) {}

  return null;
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
  if (found) return found;

  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", id)
      .maybeSingle();

    if (prof) {
      return {
        id: prof.id,
        email: prof.email,
        name: prof.full_name || prof.email.split("@")[0],
        password: DEFAULT_HASH_12345678,
        role: (prof.role?.toUpperCase() === "TEACHER" ? "TEACHER" : "STUDENT") as UserRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (e) {}

  return null;
}

export async function createUser(data: {
  email: string;
  name?: string;
  password?: string;
  passwordHash?: string;
  role?: UserRole;
}): Promise<UserRecord> {
  const cleanEmail = data.email.trim().toLowerCase();
  const role = data.role || "STUDENT";
  const pwd = data.passwordHash || data.password || bcrypt.hashSync("12345678", 10);

  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const created = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: data.name || null,
          password: pwd,
          role,
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
      console.warn("Prisma createUser error, saving to local store:", (err as any)?.message);
    }
  }

  const store = loadLocalStore();
  const existingIdx = store.users.findIndex(
    (u) => u.email.toLowerCase() === cleanEmail
  );

  const newUser: UserRecord = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    email: cleanEmail,
    name: data.name || null,
    password: pwd,
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    store.users[existingIdx] = newUser;
  } else {
    store.users.push(newUser);
  }

  saveLocalStore(store);
  return newUser;
}

export const seedUsers = ensureSeedUsers;
export async function ensureSeedUsers(): Promise<{ teacher: UserRecord; student: UserRecord }> {
  console.log("[Seed] Ensuring initial seed users exist...");
  let teacher: UserRecord = {
    id: "teacher-filza-1",
    email: "filzaf281@gmail.com",
    name: "Filza Teacher",
    password: bcrypt.hashSync("12345678", 10),
    role: "TEACHER",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let student: UserRecord = {
    id: "student-areeb-2",
    email: "areebiqbal630@gmail.com",
    name: "Areeb Student",
    password: bcrypt.hashSync("12345678", 10),
    role: "STUDENT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const usePrisma = await isPrismaReady();
  if (usePrisma) {
    try {
      const teacherEmail = "filzaf281@gmail.com";
      const teacherExists = await prisma.user.findUnique({
        where: { email: teacherEmail },
      });

      if (!teacherExists) {
        const t = await prisma.user.create({
          data: {
            email: teacherEmail,
            name: "Filza Teacher",
            password: bcrypt.hashSync("12345678", 10),
            role: "TEACHER",
          },
        });
        teacher = { ...teacher, id: t.id };
        console.log("[Seed] Seeded teacher user in Prisma DB");
      } else {
        teacher = {
          id: teacherExists.id,
          email: teacherExists.email,
          name: teacherExists.name,
          password: teacherExists.password,
          role: teacherExists.role as UserRole,
          createdAt: teacherExists.createdAt.toISOString(),
          updatedAt: teacherExists.updatedAt.toISOString(),
        };
      }

      const studentEmail = "areebiqbal630@gmail.com";
      const studentExists = await prisma.user.findUnique({
        where: { email: studentEmail },
      });

      if (!studentExists) {
        const s = await prisma.user.create({
          data: {
            email: studentEmail,
            name: "Areeb Student",
            password: bcrypt.hashSync("12345678", 10),
            role: "STUDENT",
          },
        });
        student = { ...student, id: s.id };
        console.log("[Seed] Seeded student user in Prisma DB");
      } else {
        student = {
          id: studentExists.id,
          email: studentExists.email,
          name: studentExists.name,
          password: studentExists.password,
          role: studentExists.role as UserRole,
          createdAt: studentExists.createdAt.toISOString(),
          updatedAt: studentExists.updatedAt.toISOString(),
        };
      }
    } catch (err) {
      console.warn("[Seed] Prisma seeding notice:", (err as any)?.message);
    }
  }

  loadLocalStore();
  return { teacher, student };
}

// -------------------------------------------------------------
// QUIZ OPERATIONS
// -------------------------------------------------------------

export async function getTeacherQuizzes(teacherId: string): Promise<QuizRecord[]> {
  try {
    const { data: sbQuizzes } = await supabase
      .from("quizzes")
      .select("*")
      .order("created_at", { ascending: false });

    if (sbQuizzes && sbQuizzes.length > 0) {
      const { data: sbAtts } = await supabase.from("quiz_attempts").select("*");
      const attMap: Record<string, any[]> = {};
      (sbAtts || []).forEach((a: any) => {
        if (a.quiz_id) {
          if (!attMap[a.quiz_id]) attMap[a.quiz_id] = [];
          attMap[a.quiz_id].push(a);
        }
      });

      return sbQuizzes.map((q: any) => {
        let qQuestions: QuestionRecord[] = [];
        if (q.id === WEB_DEV_FUNDAMENTALS_UUID) {
          qQuestions = WEB_DEV_FUNDAMENTALS_QUESTIONS;
        }

        const qAttempts = (attMap[q.id] || []).map((a: any) => ({
          id: a.id,
          quizId: q.id,
          studentId: a.student_id || "student-1",
          score: Number(a.score || 0),
          maxScore: Number(a.total || 100),
          answers: a.answers || {},
          createdAt: a.created_at || new Date().toISOString(),
        }));

        return {
          id: q.id,
          title: q.title,
          subject: q.subject || "Web Development",
          description: q.description || "",
          teacherId: q.teacher_id || teacherId,
          teacherName: "Teacher",
          createdAt: q.created_at || new Date().toISOString(),
          dueDate: q.due_date || null,
          isPublished: q.is_published !== false,
          questions: qQuestions,
          attempts: qAttempts,
        };
      });
    }
  } catch (err) {
    console.warn("Supabase getTeacherQuizzes error:", err);
  }

  const store = loadLocalStore();
  const quizzes = store.quizzes.filter(
    (q) => q.teacherId === teacherId || q.teacherEmail?.includes("filzaf281")
  );

  return quizzes.map((q) => {
    const targetId = normalizeQuizId(q.id);
    const questions = store.questions.filter((qn) => qn.quizId === q.id || qn.quizId === targetId);
    const localAttempts = store.attempts.filter((att) => att.quizId === q.id || att.quizId === targetId);
    return {
      ...q,
      questions,
      attempts: localAttempts,
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

  const store = loadLocalStore();
  const quizId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `e1a1${Date.now()}`.padEnd(36, "0");

  try {
    await supabase.from("quizzes").insert({
      id: quizId,
      title: data.title,
      description: data.description || null,
    });
  } catch (e) {}

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
  try {
    await supabase.from("quiz_attempts").delete().eq("quiz_id", quizId);
    await supabase.from("quizzes").delete().eq("id", quizId);
  } catch (e) {}

  const store = loadLocalStore();
  store.quizzes = store.quizzes.filter((q) => q.id !== quizId);
  store.questions = store.questions.filter((qn) => qn.quizId !== quizId);
  store.attempts = store.attempts.filter((att) => att.quizId !== quizId);
  saveLocalStore(store);
  return true;
}

export async function getQuizWithAttempts(quizId: string): Promise<QuizRecord | null> {
  const targetQuizId = normalizeQuizId(quizId);

  // 1. Web Development Fundamentals
  if (targetQuizId === WEB_DEV_FUNDAMENTALS_UUID || quizId === WEB_DEV_FUNDAMENTALS_UUID) {
    let attempts: QuizAttemptRecord[] = [];
    try {
      const { data: sbAtt } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", WEB_DEV_FUNDAMENTALS_UUID)
        .order("created_at", { ascending: false });

      if (sbAtt && sbAtt.length > 0) {
        const studentIds = sbAtt.map((a: any) => a.student_id).filter(Boolean);
        let pMap: Record<string, any> = {};
        if (studentIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", studentIds);
          (profs || []).forEach((pr: any) => { pMap[pr.id] = pr; });
        }

        attempts = sbAtt.map((a: any) => {
          const score = Number(a.score || 0);
          const maxScore = Number(a.total || 100);
          const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
          return {
            id: a.id,
            quizId: WEB_DEV_FUNDAMENTALS_UUID,
            studentId: a.student_id || "student-1",
            studentName: pMap[a.student_id]?.full_name || a.student_name || "Student",
            studentEmail: pMap[a.student_id]?.email || a.student_email || "student@connecthub.com",
            score,
            maxScore,
            percentage: pct,
            answers: a.answers || {},
            createdAt: a.created_at || new Date().toISOString(),
          };
        });
      }
    } catch (e) {}

    let title = "Web Development Fundamentals";
    let desc = "Test your knowledge of web development fundamentals, including HTML, CSS, JavaScript, responsive web design, and web servers. This quiz is designed for beginner-level web development students to assess their basic concepts and understanding of modern website development.";
    try {
      const { data: sbQ } = await supabase.from("quizzes").select("*").eq("id", WEB_DEV_FUNDAMENTALS_UUID).maybeSingle();
      if (sbQ) {
        title = sbQ.title || title;
        desc = sbQ.description || desc;
      }
    } catch (e) {}

    const isStudent = await isStudentRequest();
    const safeQuestions = isStudent
      ? WEB_DEV_FUNDAMENTALS_QUESTIONS.map(({ correctAnswer, ...rest }) => rest as QuestionRecord)
      : WEB_DEV_FUNDAMENTALS_QUESTIONS;

    return {
      id: WEB_DEV_FUNDAMENTALS_UUID,
      title,
      subject: "Web Development",
      description: desc,
      teacherId: "teacher-1",
      teacherName: "Teacher",
      createdAt: new Date().toISOString(),
      dueDate: null,
      isPublished: true,
      questions: safeQuestions,
      attempts,
    };
  }

  // 2. Other quizzes from Supabase
  try {
    const { data: sbQ } = await supabase.from("quizzes").select("*").eq("id", targetQuizId).maybeSingle();
    if (sbQ) {
      let qList: QuestionRecord[] = [];
      const { data: sbQns } = await supabase.from("questions").select("*").eq("quiz_id", targetQuizId);
      if (sbQns && sbQns.length > 0) {
        qList = sbQns.map((qn: any) => ({
          id: qn.id,
          quizId: targetQuizId,
          text: qn.question_text || qn.text || "Question",
          options: Array.isArray(qn.options) ? qn.options : JSON.parse(qn.options || "[]"),
          correctAnswer: typeof qn.correct_answer === "number" ? qn.correct_answer : parseInt(qn.correct_answer || "0", 10),
          points: qn.points || 10,
        }));
      }

      if (qList.length === 0) {
        const store = loadLocalStore();
        qList = store.questions.filter((qn) => qn.quizId === targetQuizId || qn.quizId === quizId);
      }

      let attempts: QuizAttemptRecord[] = [];
      const { data: sbAtt } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", targetQuizId)
        .order("created_at", { ascending: false });

      if (sbAtt && sbAtt.length > 0) {
        const studentIds = sbAtt.map((a: any) => a.student_id).filter(Boolean);
        let pMap: Record<string, any> = {};
        if (studentIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", studentIds);
          (profs || []).forEach((pr: any) => { pMap[pr.id] = pr; });
        }
        attempts = sbAtt.map((a: any) => {
          const score = Number(a.score || 0);
          const maxScore = Number(a.total || 30);
          const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
          return {
            id: a.id,
            quizId: targetQuizId,
            studentId: a.student_id || "student-1",
            studentName: pMap[a.student_id]?.full_name || "Student",
            studentEmail: pMap[a.student_id]?.email || "",
            score,
            maxScore,
            percentage: pct,
            answers: a.answers || {},
            createdAt: a.created_at || new Date().toISOString(),
          };
        });
      }

      const isStudent = await isStudentRequest();
      const safeQuestions = isStudent
        ? qList.map(({ correctAnswer, ...rest }) => rest as QuestionRecord)
        : qList;

      return {
        id: sbQ.id,
        title: sbQ.title,
        subject: sbQ.subject || "Computer Science",
        description: sbQ.description || "",
        teacherId: sbQ.teacher_id || "teacher-1",
        createdAt: sbQ.created_at || new Date().toISOString(),
        dueDate: sbQ.due_date || null,
        isPublished: sbQ.is_published !== false,
        questions: safeQuestions,
        attempts,
      };
    }
  } catch (err) {
    console.warn("Supabase getQuizWithAttempts error:", err);
  }

  // 3. Fallback to LocalStore
  const store = loadLocalStore();
  const quiz = store.quizzes.find((q) => q.id === targetQuizId || q.id === quizId);
  if (!quiz) return null;

  const questions = store.questions.filter((qn) => qn.quizId === targetQuizId || qn.quizId === quizId);
  const attempts = store.attempts.filter((att) => att.quizId === targetQuizId || att.quizId === quizId);

  return {
    ...quiz,
    questions,
    attempts,
  };
}

export async function getPublishedQuizzes(): Promise<QuizRecord[]> {
  try {
    const { data: sbQuizzes } = await supabase
      .from("quizzes")
      .select("*")
      .order("created_at", { ascending: false });

    if (sbQuizzes && sbQuizzes.length > 0) {
      const { data: sbAttempts } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, student_id");

      const attemptsCountMap: Record<string, number> = {};
      (sbAttempts || []).forEach((a: any) => {
        if (a.quiz_id) {
          attemptsCountMap[a.quiz_id] = (attemptsCountMap[a.quiz_id] || 0) + 1;
        }
      });

      const mapped: QuizRecord[] = sbQuizzes.map((q: any) => {
        let qQuestions: QuestionRecord[] = [];
        if (q.id === WEB_DEV_FUNDAMENTALS_UUID) {
          qQuestions = WEB_DEV_FUNDAMENTALS_QUESTIONS;
        }

        const count = attemptsCountMap[q.id] || 0;
        const dummyAttempts = Array.from({ length: count }, (_, i) => ({
          id: `att-${q.id}-${i}`,
          quizId: q.id,
          studentId: "student",
          score: 0,
          answers: {},
          createdAt: q.created_at || new Date().toISOString(),
        }));

        return {
          id: q.id,
          title: q.title,
          subject: q.subject || "Web Development",
          description: q.description || "",
          teacherId: q.teacher_id || "teacher-1",
          teacherName: "Teacher",
          createdAt: q.created_at || new Date().toISOString(),
          dueDate: q.due_date || null,
          isPublished: q.is_published !== false,
          questions: qQuestions,
          attempts: dummyAttempts,
        };
      });

      const publishedOnly = mapped.filter((q) => q.isPublished !== false);

      // Remove the 3-question demo quiz from production if real published quizzes exist
      const realQuizzes = publishedOnly.filter(
        (q) => q.id !== DEMO_QUIZ_UUID && q.id !== "quiz-demo-1"
      );

      if (realQuizzes.length > 0) {
        return realQuizzes;
      }
      return publishedOnly;
    }
  } catch (err) {
    console.warn("Supabase getPublishedQuizzes error:", err);
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
  const targetQuizId = normalizeQuizId(quizId);

  // 1. Web Development Fundamentals
  if (targetQuizId === WEB_DEV_FUNDAMENTALS_UUID || quizId === WEB_DEV_FUNDAMENTALS_UUID) {
    try {
      const { data: sbQ } = await supabase.from("quizzes").select("*").eq("id", WEB_DEV_FUNDAMENTALS_UUID).maybeSingle();
      return {
        id: WEB_DEV_FUNDAMENTALS_UUID,
        title: sbQ?.title || "Web Development Fundamentals",
        subject: sbQ?.subject || "Web Development",
        description: sbQ?.description || "Test your knowledge of web development fundamentals, including HTML, CSS, JavaScript, responsive web design, and web servers. This quiz is designed for beginner-level web development students to assess their basic concepts and understanding of modern website development.",
        teacherId: sbQ?.teacher_id || "teacher-1",
        createdAt: sbQ?.created_at || new Date().toISOString(),
        dueDate: sbQ?.due_date || null,
        isPublished: sbQ?.is_published !== false,
        questions: WEB_DEV_FUNDAMENTALS_QUESTIONS,
      };
    } catch (e) {
      return {
        id: WEB_DEV_FUNDAMENTALS_UUID,
        title: "Web Development Fundamentals",
        subject: "Web Development",
        description: "Test your knowledge of web development fundamentals, including HTML, CSS, JavaScript, responsive web design, and web servers.",
        teacherId: "teacher-1",
        createdAt: new Date().toISOString(),
        dueDate: null,
        isPublished: true,
        questions: WEB_DEV_FUNDAMENTALS_QUESTIONS,
      };
    }
  }

  // 2. Supabase quizzes table
  try {
    const { data: sbQuiz } = await supabase.from("quizzes").select("*").eq("id", targetQuizId).maybeSingle();
    if (sbQuiz) {
      let qList: QuestionRecord[] = [];
      const { data: sbQuestions } = await supabase.from("questions").select("*").eq("quiz_id", targetQuizId);
      if (sbQuestions && sbQuestions.length > 0) {
        qList = sbQuestions.map((qn: any) => ({
          id: qn.id,
          quizId: targetQuizId,
          text: qn.question_text || qn.text || "Question",
          options: Array.isArray(qn.options) ? qn.options : JSON.parse(qn.options || "[]"),
          correctAnswer: typeof qn.correct_answer === "number" ? qn.correct_answer : parseInt(qn.correct_answer || "0", 10),
          points: qn.points || 10,
        }));
      }

      if (qList.length === 0) {
        const store = loadLocalStore();
        qList = store.questions.filter((qn) => qn.quizId === targetQuizId || qn.quizId === quizId);
      }

      return {
        id: sbQuiz.id,
        title: sbQuiz.title,
        subject: sbQuiz.subject || "Computer Science",
        description: sbQuiz.description || "",
        teacherId: sbQuiz.teacher_id || "teacher-1",
        createdAt: sbQuiz.created_at || new Date().toISOString(),
        dueDate: sbQuiz.due_date || null,
        isPublished: sbQuiz.is_published !== false,
        questions: qList,
      };
    }
  } catch (err) {
    console.warn("Supabase getQuizById error:", err);
  }

  const store = loadLocalStore();
  const quiz = store.quizzes.find((q) => q.id === targetQuizId || q.id === quizId);
  if (!quiz) return null;
  const questions = store.questions.filter((qn) => qn.quizId === targetQuizId || qn.quizId === quizId);
  return {
    ...quiz,
    questions,
  };
}

// In-memory debounce cache to prevent duplicate submissions from rapid clicks or network retries
const recentSubmissionsCache = new Map<string, { timestamp: number; result: any }>();

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
  percentage: number;
  correctCount: number;
  totalCount: number;
}> {
  const quiz = await getQuizById(data.quizId);
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    throw new Error("Quiz not found or has no questions.");
  }

  // Deduplication check: key by studentId + quizId within 3 seconds
  const debounceKey = `${data.studentId}_${data.quizId}`;
  const cached = recentSubmissionsCache.get(debounceKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < 3000) {
    console.log("[submitQuizAttempt] Returning cached result to prevent duplicate submission");
    return cached.result;
  }

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;

  for (const qn of quiz.questions) {
    const points = qn.points || 10;
    maxScore += points;
    const selected = data.answers[qn.id];
    if (selected !== undefined && Number(selected) === Number(qn.correctAnswer)) {
      totalScore += points;
      correctCount++;
    }
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const targetQuizId = normalizeQuizId(data.quizId);
  const studentUuid = isUuid(data.studentId) ? data.studentId : null;

  const attemptRecord: QuizAttemptRecord = {
    id: attemptId,
    quizId: targetQuizId,
    studentId: data.studentId,
    studentName: data.studentName || data.studentEmail?.split("@")[0] || "Student",
    studentEmail: data.studentEmail || "",
    score: totalScore,
    maxScore,
    percentage,
    answers: data.answers,
    createdAt: new Date().toISOString(),
  };

  // Insert into Supabase quiz_attempts table
  try {
    const { data: inserted, error: insErr } = await supabase.from("quiz_attempts").insert({
      quiz_id: targetQuizId,
      student_id: studentUuid,
      score: totalScore,
      total: maxScore,
    }).select().maybeSingle();

    if (inserted && inserted.id) {
      attemptRecord.id = inserted.id;
    }
  } catch (sbErr) {
    console.warn("[submitQuizAttempt] Supabase insert error:", sbErr);
  }

  const store = loadLocalStore();
  store.attempts.push(attemptRecord);
  saveLocalStore(store);

  const result = {
    attempt: attemptRecord,
    totalScore,
    maxScore,
    percentage,
    correctCount,
    totalCount: quiz.questions.length,
  };

  recentSubmissionsCache.set(debounceKey, { timestamp: now, result });
  return result;
}
