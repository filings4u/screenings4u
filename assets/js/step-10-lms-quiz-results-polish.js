(() => {
  "use strict";

  /*
   * Customer-facing quiz RESULTS polish.
   * Reads the authoritative current quiz attempt from lms_quiz_attempts.
   * Does not recalculate or override the quiz player's score.
   */

  const T = {
    attempts: "lms_quiz_attempts",
    quizzes: "lms_quizzes",
    lessons: "lms_lessons",
    enrollments: "lms_enrollments"
  };

  const S = {
    user: null,
    enrollment: null,
    quiz: null,
    attempts: [],
    latest: null
  };

  const $ = id => document.getElementById(id);

  function db() {
    const c = window.supabaseClient || window.supabase || window.screenings4uSupabase;
    if (!c?.from) throw new Error("Supabase client is not available.");
    return c;
  }

  function p() {
    const q = new URLSearchParams(location.search);
    return {
      quiz: q.get("quiz") || "",
      lesson: q.get("lesson") || "",
      enrollment: q.get("enrollment") || q.get("enrollment_id") || ""
    };
  }

  async function initData() {
    const x = p();

    const { data: ud, error: ue } = await db().auth.getUser();
    if (ue) throw ue;
    if (!ud?.user) throw new Error("You must be signed in to view quiz results.");
    S.user = ud.user;

    if (!x.enrollment || !x.quiz) return false;

    const { data: enrollment, error: ee } = await db().from(T.enrollments)
      .select("id,user_id,course_id,status")
      .eq("id", x.enrollment)
      .eq("user_id", S.user.id)
      .maybeSingle();

    if (ee) throw ee;
    if (!enrollment) throw new Error("Your quiz enrollment could not be verified.");
    S.enrollment = enrollment;

    const { data: quiz, error: qe } = await db().from(T.quizzes)
      .select("id,lesson_id,title,description,passing_score,attempt_limit,is_required")
      .eq("id", x.quiz)
      .maybeSingle();

    if (qe) throw qe;
    if (!quiz) throw new Error("This quiz could not be found.");
    S.quiz = quiz;

    const { data: attempts, error: ae } = await db().from(T.attempts)
      .select("id,quiz_id,attempt_number,score,passed,started_at,completed_at")
      .eq("enrollment_id", S.enrollment.id)
      .eq("quiz_id", S.quiz.id)
      .order("attempt_number", { ascending: false });

    if (ae) throw ae;
    S.attempts = attempts || [];
    S.latest = S.attempts[0] || null;

    return true;
  }

  function maxAttempts() {
    const value = Number(S.quiz?.attempt_limit);
    return Number.isFinite(value) && value > 0 ? value : Infinity;
  }

  function canRetry() {
    return S.attempts.length < maxAttempts();
  }

  function makePanel() {
    if ($("s4uQuizResultsPolished")) return $("s4uQuizResultsPolished");

    const anchor = $("quizResult") || $("quizResults") || document.querySelector("[data-quiz-result]");
    if (!anchor) return null;

    const p = document.createElement("section");
    p.id = "s4uQuizResultsPolished";
    p.className = "s4u-quiz-results";
    anchor.appendChild(p);
    return p;
  }

  function render() {
    const panel = makePanel();
    if (!panel || !S.latest) return;

    const passed = S.latest.passed === true;
    const score = Number(S.latest.score) || 0;
    const required = Number(S.quiz?.passing_score) || 80;
    const remaining = Math.max(0, maxAttempts() - S.attempts.length);

    panel.classList.toggle("passed", passed);
    panel.classList.toggle("failed", !passed);

    panel.innerHTML = `
      <div class="s4u-quiz-result-header">
        <div class="s4u-quiz-result-copy">
          <span class="s4u-eyebrow">${passed ? "ASSESSMENT PASSED" : "ASSESSMENT NOT PASSED"}</span>
          <h2>${passed ? "Great work — you passed!" : "You're close. Give it another try."}</h2>
          <p>${passed
            ? "Your passing result has been recorded. You can continue with your training."
            : "Review the lesson material, then retry the quiz when you're ready."}</p>
        </div>

        <div class="s4u-quiz-score-ring ${passed ? "passed" : "failed"}"
             style="--score:${Math.max(0, Math.min(100, score)) * 3.6}deg">
          <strong>${score}%</strong>
          <span>score</span>
        </div>
      </div>

      <div class="s4u-quiz-result-stats">
        <div><span>Passing score</span><strong>${required}%</strong></div>
        <div><span>Attempt</span><strong>${S.latest.attempt_number || S.attempts.length}</strong></div>
        <div><span>Status</span><strong>${passed ? "Passed" : "Not passed"}</strong></div>
      </div>

      <div class="s4u-quiz-result-message ${passed ? "success" : "notice"}">
        ${passed
          ? "This quiz is now satisfied for course completion."
          : remaining === Infinity
            ? "You may retry this quiz."
            : remaining > 0
              ? `${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
              : "You have reached the maximum number of attempts."}
      </div>

      <div class="s4u-quiz-result-actions">
        ${passed
          ? `<a class="s4u-primary-button" href="${coursePlayerUrl()}">Continue Course</a>`
          : canRetry()
            ? `<button class="s4u-primary-button" type="button" id="s4uQuizRetryPolished">Retry Quiz</button>`
            : ""}
        <button class="s4u-secondary-button" type="button" id="s4uQuizReviewPolished">Review Results</button>
      </div>

      <div class="s4u-quiz-attempt-history">
        <span class="s4u-eyebrow">ATTEMPT HISTORY</span>
        ${S.attempts.slice(0, 5).map(a => `
          <div class="s4u-attempt-row">
            <span>Attempt ${a.attempt_number || "—"}</span>
            <strong>${Number(a.score) || 0}%</strong>
            <em class="${a.passed ? "pass" : "fail"}">${a.passed ? "Passed" : "Not passed"}</em>
          </div>
        `).join("")}
      </div>
    `;

    $("s4uQuizRetryPolished")?.addEventListener("click", () => {
      if (window.Screenings4uLMSQuiz?.resetForRetry) {
        window.Screenings4uLMSQuiz.resetForRetry();
        $("quizQuestions")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        location.reload();
      }
    });

    $("s4uQuizReviewPolished")?.addEventListener("click", () => {
      document.querySelector("[data-explanation]")?.scrollIntoView({
        behavior: "smooth", block: "start"
      });
    });
  }

  function coursePlayerUrl() {
    const x = p();
    const path = location.pathname.toLowerCase();
    const base = path.includes("quiz") ? path.replace(/quiz[^/]*$/i, "") : path;
    const clean = base.endsWith("/") ? base : `${base}/`;
    return `${clean}course-player.html?enrollment=${encodeURIComponent(x.enrollment)}`;
  }

  function bind() {
    document.addEventListener("screenings4u:lms-quiz-completed", () => {
      initData().then(render).catch(console.error);
    });
  }

  async function start() {
    try {
      const ok = await initData();
      if (ok) render();
    } catch (err) {
      console.error("Quiz results polish failed:", err);
    }
  }

  window.Screenings4uLMSQuizResultsPolished = {
    state: S, init: start, render, refresh: start
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { bind(); start(); }, { once: true });
  } else {
    bind();
    start();
  }
})();
