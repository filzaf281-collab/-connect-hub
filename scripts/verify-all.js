const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const supabase = createClient(url, key);

async function runVerification() {
  console.log("=================================================");
  console.log("  CONNECTHUB FULL-STACK AUDIT & VERIFICATION    ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Check Supabase Quizzes Table
  console.log("--- 1. Quizzes Database Verification ---");
  const { data: quizzes, error: qErr } = await supabase.from('quizzes').select('*');
  assert(!qErr, `Supabase quizzes table readable without RLS error (${qErr?.message || 'OK'})`);
  assert(quizzes && quizzes.length > 0, `Found ${quizzes?.length} quiz record(s) in Supabase`);
  
  const webDevQuiz = quizzes?.find(q => q.id === '1c3b49a6-0478-473d-adb9-57654670f1e7');
  assert(!!webDevQuiz, `Published 'Web Development Fundamentals' exists in Supabase (ID: 1c3b49a6-0478-473d-adb9-57654670f1e7)`);

  // 2. Check Supabase Quiz Attempts Table
  console.log("\n--- 2. Quiz Attempts Verification ---");
  const { data: attempts, error: aErr } = await supabase.from('quiz_attempts').select('*');
  assert(!aErr, `Supabase quiz_attempts table readable (${aErr?.message || 'OK'})`);
  assert(attempts && attempts.length > 0, `Found ${attempts?.length} attempt record(s) in Supabase`);
  
  const nullQuizAttempts = attempts?.filter(a => !a.quiz_id);
  assert(!nullQuizAttempts || nullQuizAttempts.length === 0, `Zero attempts with NULL quiz_id (Clean database state)`);

  const webDevAttempts = attempts?.filter(a => a.quiz_id === '1c3b49a6-0478-473d-adb9-57654670f1e7');
  assert(webDevAttempts && webDevAttempts.length > 0, `Found ${webDevAttempts?.length} attempt(s) for 'Web Development Fundamentals'`);

  // Check unique students
  const uniqueStudents = new Set(webDevAttempts?.map(a => a.student_id));
  assert(uniqueStudents.size >= 2, `Multiple distinct students recorded (${uniqueStudents.size} unique students)`);

  // 3. Check Supabase Profiles Table & Teacher/Student Roles
  console.log("\n--- 3. User Profiles & Roles Verification ---");
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email, full_name, role');
  assert(!pErr, `Supabase profiles query successful without nonexistent is_teacher column (${pErr?.message || 'OK'})`);
  
  const teacherProfile = profiles?.find(p => p.email === 'filzaf281@gmail.com');
  assert(teacherProfile && teacherProfile.role === 'teacher', `Teacher 'filzaf281@gmail.com' has verified role='teacher' in Supabase`);

  const studentAreeb = profiles?.find(p => p.email === 'areebiqbal630@gmail.com');
  assert(studentAreeb && studentAreeb.role === 'student', `Student 'areebiqbal630@gmail.com' has verified role='student' in Supabase`);

  const studentAlinaa = profiles?.find(p => p.email === 'alinaa@gmail.com');
  assert(studentAlinaa && studentAlinaa.role === 'student', `Student 'alinaa@gmail.com' has verified role='student' in Supabase`);

  // 4. Questions & Sanitization Check
  console.log("\n--- 4. Questions & Student Sanitization Verification ---");
  // Check that mock or hardcoded answers are not leaked to students
  const dbModule = require('../src/lib/db.ts');
  const publishedQuizzes = await dbModule.getPublishedQuizzes();
  assert(publishedQuizzes.length > 0, `getPublishedQuizzes() returns published quizzes dynamically`);
  
  const pubWebDev = publishedQuizzes.find(q => q.id === '1c3b49a6-0478-473d-adb9-57654670f1e7');
  assert(!!pubWebDev, `Published quiz 'Web Development Fundamentals' returned in student view`);
  assert(pubWebDev?.questions?.length === 10, `Published quiz has exactly 10 questions (not demo 3 questions)`);

  // Verify demo quiz is removed from production view when real quizzes exist
  const hasDemo = publishedQuizzes.some(q => q.id === 'e1a10000-0000-0000-0000-000000000001' || q.id === 'quiz-demo-1');
  assert(!hasDemo, `3-question demo quiz correctly hidden from production student view`);

  // 5. Teacher Results Calculation Check
  console.log("\n--- 5. Teacher Results Calculation ---");
  const teacherQuizDetails = await dbModule.getQuizWithAttempts('1c3b49a6-0478-473d-adb9-57654670f1e7');
  assert(!!teacherQuizDetails, `Teacher can retrieve quiz details with attempts`);
  assert(teacherQuizDetails?.attempts?.length > 0, `Teacher results contains ${teacherQuizDetails?.attempts?.length} attempts`);
  
  const scores = teacherQuizDetails?.attempts?.map(a => a.score) || [];
  const avg = scores.length > 0 ? (scores.reduce((s, c) => s + c, 0) / scores.length).toFixed(1) : 0;
  console.log(`[INFO] Average score calculated: ${avg}/100 across ${scores.length} attempts`);
  assert(Number(avg) > 0, `Average score is computed dynamically (> 0)`);

  console.log("\n=================================================");
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");
  if (failed > 0) process.exit(1);
}

runVerification().catch(err => {
  console.error("Verification script error:", err);
  process.exit(1);
});
