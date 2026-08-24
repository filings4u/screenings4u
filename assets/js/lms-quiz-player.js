(() => {
  "use strict";

  const TABLES = {
    enrollments: "lms_enrollments",
    courses: "lms_courses",
    lessons: "lms_lessons",
    quizzes: "lms_quizzes",
    questions: "lms_quiz_questions",
    options: "lms_quiz_options",
    attempts: "lms_quiz_attempts",
    answers: "lms_quiz_answers"
  };

  const state = {
    user: null,
    enrollment: null,
    lesson: null,
    quiz: null,
    questions: [],
    options: [],
    attempts: [],
    currentAnswers: {},
    currentAttemptNumber: 0,
    submitted: false
  };

  const $ = id => document.getElementById(id);

  function db() {
    const client = window.supabaseClient || window.supabase;
    if (!client || typeof client.from !== "function") {
      throw new Error("Supabase client is not available.");
    }
    return client;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;")
      .replaceAll(">","&gt;").replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function params() {
    const p = new URLSearchParams(location.search);
    return {
      quizId: p.get("quiz") || "",
      lessonId: p.get("lesson") || "",
      enrollmentId: p.get("enrollment") || ""
    };
  }

  async function requireUser() {
    const { data, error } = await db().auth.getUser();
    if (error) throw error;
    if (!data?.user) throw new Error("You must be signed in to take this assessment.");
    state.user = data.user;
  }

  async function loadEnrollment() {
    const { enrollmentId } = params();
    if (!enrollmentId) throw new Error("This assessment link is missing the enrollment ID.");

    const { data, error } = await db()
      .from(TABLES.enrollments)
      .select(`
        id, user_id, course_id, status, progress_percent,
        course:lms_courses(id,title,passing_score,certificate_enabled)
      `)
      .eq("id", enrollmentId)
      .eq("user_id", state.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Your course enrollment could not be verified.");
    if (!["active","completed"].includes(String(data.status))) {
      throw new Error("This enrollment is not active.");
    }

    state.enrollment = data;
  }

  async function loadLessonAndQuiz() {
    const p = params();

    let quizQuery = db().from(TABLES.quizzes).select("*");

    if (p.quizId) {
      quizQuery = quizQuery.eq("id", p.quizId);
    } else if (p.lessonId) {
      quizQuery = quizQuery.eq("lesson_id", p.lessonId);
    } else {
      throw new Error("This assessment link is missing a quiz or lesson ID.");
    }

    const { data: quiz, error } = await quizQuery.maybeSingle();
    if (error) throw error;
    if (!quiz) throw new Error("Assessment not found.");

    state.quiz = quiz;

    const { data: lesson, error: lessonError } = await db()
      .from(TABLES.lessons)
      .select(`
        id, title, section:lms_sections(id,course_id)
      `)
      .eq("id", quiz.lesson_id)
      .maybeSingle();

    if (lessonError) throw lessonError;
    if (!lesson || lesson.section?.course_id !== state.enrollment.course_id) {
      throw new Error("Assessment does not belong to your enrolled course.");
    }

    state.lesson = lesson;
  }

  async function loadQuestions() {
    const { data, error } = await db()
      .from(TABLES.questions)
      .select(`
        id, quiz_id, question_text, question_type, explanation, points, sort_order
      `)
      .eq("quiz_id", state.quiz.id)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    state.questions = data || [];

    if (!state.questions.length) {
      throw new Error("This assessment does not contain any questions yet.");
    }

    const ids = state.questions.map(q => q.id);

    const optionsResult = await db()
      .from(TABLES.options)
      .select("id, question_id, option_text, sort_order")
      .in("question_id", ids)
      .order("sort_order", { ascending: true });

    if (optionsResult.error) throw optionsResult.error;
    state.options = optionsResult.data || [];
  }

  async function loadAttempts() {
    const { data, error } = await db()
      .from(TABLES.attempts)
      .select("id,attempt_number,score,passed,started_at,completed_at")
      .eq("enrollment_id", state.enrollment.id)
      .eq("quiz_id", state.quiz.id)
      .order("attempt_number", { ascending: false });

    if (error) throw error;

    state.attempts = data || [];
  }

  function attemptLimit() {
    const value = Number(state.quiz.attempt_limit);
    return Number.isFinite(value) && value > 0 ? value : Infinity;
  }

  function attemptsRemaining() {
    const limit = attemptLimit();
    return Number.isFinite(limit) ? Math.max(0, limit - state.attempts.length) : Infinity;
  }

  function renderHeader() {
    $("quizTitle").textContent = state.quiz.title || "Course Assessment";
    $("quizDescription").textContent = state.quiz.description || "";
    $("quizPassingScore").textContent =
      `${Number(state.quiz.passing_score ?? state.enrollment.course?.passing_score ?? 80)}%`;

    $("quizAttemptInfo").textContent =
      Number.isFinite(attemptLimit())
        ? `${state.attempts.length} of ${attemptLimit()} attempts used`
        : `${state.attempts.length} attempts used`;

    $("quizQuestionCount").textContent =
      `${state.questions.length} ${state.questions.length === 1 ? "question" : "questions"}`;

    const back = $("quizBackButton");
    const resultBack = $("quizBackResultButton");
    const url = `lms-course-player.html?course=${encodeURIComponent(state.enrollment.course_id)}&enrollment=${encodeURIComponent(state.enrollment.id)}&lesson=${encodeURIComponent(state.lesson.id)}`;
    back.href = url;
    resultBack.href = url;
  }

  function optionsFor(questionId) {
    return state.options.filter(o => o.question_id === questionId);
  }

  function renderQuestions() {
    $("quizQuestions").innerHTML = state.questions.map((q, index) => {
      const options = optionsFor(q.id);

      return `
        <article class="lms-quiz-question" data-question-id="${esc(q.id)}">
          <div class="quiz-question-header">
            <span>Question ${index + 1}</span>
            <span>${Number(q.points || 1)} ${Number(q.points || 1) === 1 ? "point" : "points"}</span>
          </div>
          <h3>${esc(q.question_text)}</h3>
          <div class="lms-quiz-options">
            ${options.map(option => `
              <label class="lms-quiz-option">
                <input
                  type="radio"
                  name="question_${esc(q.id)}"
                  value="${esc(option.id)}"
                  data-question-id="${esc(q.id)}">
                <span>${esc(option.option_text)}</span>
              </label>
            `).join("")}
          </div>
        </article>
      `;
    }).join("");

    $("quizQuestions").addEventListener("change", event => {
      const input = event.target.closest("input[data-question-id]");
      if (!input) return;
      state.currentAnswers[input.dataset.questionId] = input.value;
      const answered = Object.keys(state.currentAnswers).length;
      $("quizProgressBar").style.width =
        `${Math.round((answered / state.questions.length) * 100)}%`;
    }, { once: true });
  }

  function showError(message) {
    $("lmsQuizLoading").hidden = true;
    $("lmsQuizPlayer").hidden = true;
    $("lmsQuizEmpty").hidden = true;
    $("lmsQuizError").hidden = false;
    $("lmsQuizError").textContent = message;
  }

  async function start() {
    if (attemptsRemaining() <= 0) {
      alert("You have used all available attempts.");
      return;
    }

    state.currentAttemptNumber = state.attempts.length + 1;
    state.currentAnswers = {};

    $("quizIntro").hidden = true;
    $("quizForm").hidden = false;
    $("quizStartButton").disabled = true;

    renderQuestions();
  }

  async function submit(event) {
    event.preventDefault();

    const unanswered = state.questions.filter(q => !state.currentAnswers[q.id]);
    if (unanswered.length) {
      alert(`Please answer all ${unanswered.length} required question${unanswered.length === 1 ? "" : "s"} before submitting.`);
      return;
    }

    $("quizSubmitButton").disabled = true;
    $("quizSubmitButton").textContent = "Submitting…";

    try {
      const { data, error } = await db().functions.invoke(
        "lms-submit-quiz",
        {
          body: {
            enrollmentId: state.enrollment.id,
            quizId: state.quiz.id,
            answers: state.currentAnswers,
            source: "student_quiz_player"
          }
        }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Assessment submission failed.");

      renderResult(data);
    } catch (error) {
      console.error(error);
      $("quizSubmitButton").disabled = false;
      $("quizSubmitButton").textContent = "Submit Assessment";
      alert(error.message || "Unable to submit assessment.");
    }
  }

  function renderResult(result) {
    $("quizForm").hidden = true;
    $("quizIntro").hidden = true;
    $("quizResult").hidden = false;

    const passed = Boolean(result.passed);
    $("quizResult").className = `quiz-result ${passed ? "passed" : "failed"}`;
    $("quizResultIcon").textContent = passed ? "✓" : "!";
    $("quizResultEyebrow").textContent = passed ? "ASSESSMENT PASSED" : "ASSESSMENT NOT PASSED";
    $("quizResultHeading").textContent = passed ? "Great job!" : "Keep going";
    $("quizScore").textContent = `${Number(result.score).toFixed(0)}%`;
    $("quizResultMessage").textContent =
      `You earned ${result.earnedPoints} of ${result.possiblePoints} points. Passing score: ${result.passingScore}%.`;

    $("quizReview").innerHTML = (result.review || []).map(item => `
      <div class="quiz-review-item">
        <strong>${esc(item.questionText)}</strong>
        <small>${item.isCorrect ? "Correct" : "Not correct"}${item.explanation ? ` — ${esc(item.explanation)}` : ""}</small>
      </div>
    `).join("");

    const remaining = Math.max(0, Number(result.attemptLimitRemaining ?? attemptsRemaining() - 1));
    $("quizRetryButton").hidden = passed || remaining <= 0;
    $("quizRetryButton").onclick = () => {
      $("quizResult").hidden = true;
      $("quizStartButton").disabled = false;
      $("quizStartButton").click();
    };

    document.dispatchEvent(new CustomEvent("screenings4u:lms-quiz-completed", {
      detail: result
    }));
  }

  async function init() {
    try {
      await requireUser();
      await loadEnrollment();
      await loadLessonAndQuiz();
      await loadQuestions();
      await loadAttempts();
      renderHeader();

      $("lmsQuizLoading").hidden = true;
      $("lmsQuizPlayer").hidden = false;

      $("quizStartButton").addEventListener("click", () => {
        start().catch(error => alert(error.message));
      });

      $("quizForm").addEventListener("submit", submit);

      if (attemptsRemaining() <= 0) {
        $("quizStartButton").disabled = true;
        $("quizStartButton").textContent = "No Attempts Remaining";
      }
    } catch (error) {
      console.error(error);
      showError(error.message || "Unable to load assessment.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
