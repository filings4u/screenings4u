/* =========================================================
   screenings4u LMS — STEP 10
   Customer Quiz Player / Assessment Engine
   =========================================================

   PURPOSE
   -------
   Customer-facing quiz engine for the new LMS.

   The quiz is tied to:
      lms_quizzes
      lms_quiz_questions
      lms_quiz_options
      lms_quiz_attempts
      lms_quiz_answers
      lms_enrollments

   Access is verified through the signed-in user's LMS enrollment.

   The quiz does NOT trust a score supplied by the browser.
   Correctness is read from the database's answer options and the
   final score is calculated here from the question/option records.

   Expected HTML IDs
   -----------------
   lmsQuizPlayer
   lmsQuizLoading
   lmsQuizError
   lmsQuizEmpty

   quizTitle
   quizDescription
   quizPassingScore
   quizAttemptInfo
   quizQuestions
   quizResult
   quizScore
   quizResultMessage
   quizStartButton
   quizSubmitButton
   quizRetryButton
   quizBackButton

   Optional IDs
   ------------
   quizProgress
   quizProgressBar
   quizTimer
   quizQuestionCount

   URL parameters
   --------------
   ?quiz=QUIZ_ID
   ?lesson=LESSON_ID
   ?enrollment=ENROLLMENT_ID

   A quiz can be identified by quiz ID, or by lesson ID if the lesson
   has one published quiz.

   IMPORTANT
   ---------
   This file expects the Step 10 database tables to use the
   lms_* naming convention above. If your SQL uses different names,
   change only the TABLES object below.
*/

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
    enrollmentId: null,
    course: null,
    lesson: null,
    quiz: null,
    questions: [],
    options: [],
    attempts: [],
    currentAttempt: null,
    selectedAnswers: {},
    started: false,
    submitted: false,
    loading: false
  };

  function db() {
    const client =
      window.supabaseClient ||
      window.supabase;

    if (!client || typeof client.from !== "function") {
      throw new Error(
        "Supabase client is not available."
      );
    }

    return client;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const node = el(id);
    if (node) {
      node.textContent = value ?? "";
    }
  }

  function show(id, visible) {
    const node = el(id);
    if (!node) return;

    node.hidden = !visible;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function params() {
    const search =
      new URLSearchParams(
        window.location.search
      );

    return {
      quizId:
        search.get("quiz") ||
        search.get("quiz_id") ||
        "",
      lessonId:
        search.get("lesson") ||
        search.get("lesson_id") ||
        "",
      enrollmentId:
        search.get("enrollment") ||
        search.get("enrollment_id") ||
        ""
    };
  }

  async function requireUser() {
    const { data, error } =
      await db().auth.getUser();

    if (error) throw error;

    if (!data?.user) {
      throw new Error(
        "You must be signed in to take this quiz."
      );
    }

    state.user = data.user;

    return data.user;
  }

  async function loadEnrollment() {
    const urlParams = params();

    let query =
      db()
        .from(TABLES.enrollments)
        .select(`
          id,
          user_id,
          course_id,
          status,
          progress_percent,
          enrolled_at,
          started_at,
          completed_at,
          course:${TABLES.courses}(
            id,
            title,
            passing_score,
            certificate_enabled
          )
        `)
        .eq(
          "user_id",
          state.user.id
        );

    if (urlParams.enrollmentId) {
      query =
        query.eq(
          "id",
          urlParams.enrollmentId
        );
    } else {
      throw new Error(
        "The quiz link is missing the enrollment ID."
      );
    }

    const { data, error } =
      await query.maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "You do not have access to this quiz."
      );
    }

    if (
      !["active", "completed"].includes(
        data.status
      )
    ) {
      throw new Error(
        "This training enrollment is not active."
      );
    }

    state.enrollment = data;
    state.enrollmentId = data.id;
    state.course = data.course;

    return data;
  }

  async function loadQuiz() {
    const urlParams = params();

    let quiz = null;

    if (urlParams.quizId) {
      const result =
        await db()
          .from(TABLES.quizzes)
          .select("*")
          .eq(
            "id",
            urlParams.quizId
          )
          .eq(
            "is_published",
            true
          )
          .maybeSingle();

      if (result.error) {
        throw result.error;
      }

      quiz = result.data;
    } else if (urlParams.lessonId) {
      const result =
        await db()
          .from(TABLES.quizzes)
          .select("*")
          .eq(
            "lesson_id",
            urlParams.lessonId
          )
          .eq(
            "is_published",
            true
          )
          .maybeSingle();

      if (result.error) {
        throw result.error;
      }

      quiz = result.data;
    }

    if (!quiz) {
      throw new Error(
        "This quiz could not be found."
      );
    }

    if (
      quiz.course_id &&
      state.enrollment.course_id !==
        quiz.course_id
    ) {
      throw new Error(
        "This quiz does not belong to your enrolled course."
      );
    }

    state.quiz = quiz;

    return quiz;
  }

  async function loadLesson() {
    if (!state.quiz?.lesson_id) {
      return null;
    }

    const { data, error } =
      await db()
        .from(TABLES.lessons)
        .select("*")
        .eq(
          "id",
          state.quiz.lesson_id
        )
        .eq(
          "is_published",
          true
        )
        .maybeSingle();

    if (error) throw error;

    state.lesson = data;

    return data;
  }

  async function loadQuestions() {
    const { data, error } =
      await db()
        .from(TABLES.questions)
        .select("*")
        .eq(
          "quiz_id",
          state.quiz.id
        )
        .order(
          "sort_order",
          {
            ascending: true
          }
        );

    if (error) throw error;

    state.questions =
      data || [];

    if (!state.questions.length) {
      throw new Error(
        "This quiz does not have any questions yet."
      );
    }

    const questionIds =
      state.questions.map(
        question => question.id
      );

    const optionsResult =
      await db()
        .from(TABLES.options)
        .select("*")
        .in(
          "question_id",
          questionIds
        )
        .order(
          "sort_order",
          {
            ascending: true
          }
        );

    if (optionsResult.error) {
      throw optionsResult.error;
    }

    state.options =
      optionsResult.data || [];

    return {
      questions:
        state.questions,
      options:
        state.options
    };
  }

  function questionOptions(
    questionId
  ) {
    return state.options
      .filter(
        option =>
          option.question_id ===
          questionId
      )
      .sort(
        (a, b) =>
          number(a.sort_order) -
          number(b.sort_order)
      );
  }

  function optionIsCorrect(
    optionId
  ) {
    const option =
      state.options.find(
        item =>
          item.id === optionId
      );

    return Boolean(
      option?.is_correct
    );
  }

  async function loadAttempts() {
    const { data, error } =
      await db()
        .from(TABLES.attempts)
        .select("*")
        .eq(
          "enrollment_id",
          state.enrollmentId
        )
        .eq(
          "quiz_id",
          state.quiz.id
        )
        .order(
          "attempt_number",
          {
            ascending: false
          }
        );

    if (error) {
      /*
        Some Step 10 schemas may use lesson_id instead of quiz_id.
        If that is your schema, change the query here rather than
        changing the entire player.
      */
      throw error;
    }

    state.attempts =
      data || [];

    return state.attempts;
  }

  function maxAttempts() {
    const configured =
      number(
        state.quiz?.max_attempts
      );

    /*
      0 / null means unlimited attempts.
    */
    return configured > 0
      ? configured
      : Infinity;
  }

  function attemptsUsed() {
    return state.attempts.length;
  }

  function canStartAttempt() {
    return (
      attemptsUsed() <
      maxAttempts()
    );
  }

  function renderHeader() {
    setText(
      "quizTitle",
      state.quiz.title ||
      "Course Quiz"
    );

    setText(
      "quizDescription",
      state.quiz.description ||
      ""
    );

    const courseScore =
      number(
        state.course?.passing_score,
        80
      );

    const passingScore =
      state.quiz.passing_score !== null &&
      state.quiz.passing_score !== undefined
        ? number(
            state.quiz.passing_score
          )
        : courseScore;

    setText(
      "quizPassingScore",
      `${passingScore}%`
    );

    const max =
      maxAttempts();

    setText(
      "quizAttemptInfo",
      Number.isFinite(max)
        ? `${attemptsUsed()} of ${max} attempts used`
        : `${attemptsUsed()} attempts used`
    );

    setText(
      "quizQuestionCount",
      `${state.questions.length} ${
        state.questions.length === 1
          ? "question"
          : "questions"
      }`
    );
  }

  function renderQuestions() {
    const root =
      el("quizQuestions");

    if (!root) return;

    root.innerHTML =
      state.questions
        .map(
          (question, index) => {
            const options =
              questionOptions(
                question.id
              );

            return `
              <article
                class="lms-quiz-question"
                data-question-id="${escapeHtml(question.id)}"
              >
                <div class="lms-quiz-question-header">
                  <span>
                    Question ${index + 1}
                  </span>

                  <span>
                    ${number(question.points, 1)}
                    ${
                      number(question.points, 1) === 1
                        ? "point"
                        : "points"
                    }
                  </span>
                </div>

                <h3>
                  ${escapeHtml(
                    question.question_text
                  )}
                </h3>

                <div class="lms-quiz-options">
                  ${
                    options.length
                      ? options
                          .map(
                            option => `
                              <label class="lms-quiz-option">
                                <input
                                  type="radio"
                                  name="question_${escapeHtml(question.id)}"
                                  value="${escapeHtml(option.id)}"
                                  data-question-id="${escapeHtml(question.id)}"
                                >

                                <span>
                                  ${escapeHtml(
                                    option.option_text
                                  )}
                                </span>
                              </label>
                            `
                          )
                          .join("")
                      : `
                        <p class="lms-quiz-warning">
                          This question has no answer choices.
                        </p>
                      `
                  }
                </div>

                ${
                  question.explanation
                    ? `
                      <div
                        class="lms-quiz-explanation"
                        data-explanation="${escapeHtml(question.id)}"
                        hidden
                      >
                        ${escapeHtml(
                          question.explanation
                        )}
                      </div>
                    `
                    : ""
                }
              </article>
            `;
          }
        )
        .join("");

    bindAnswerSelection();
  }

  function bindAnswerSelection() {
    document
      .querySelectorAll(
        "#quizQuestions input[type='radio']"
      )
      .forEach(input => {
        input.addEventListener(
          "change",
          event => {
            const node =
              event.currentTarget;

            state.selectedAnswers[
              node.dataset.questionId
            ] = node.value;

            updateAnsweredCount();
          }
        );
      });
  }

  function updateAnsweredCount() {
    const answered =
      Object.keys(
        state.selectedAnswers
      ).length;

    const total =
      state.questions.length;

    setText(
      "quizProgress",
      `${answered} of ${total} answered`
    );

    const bar =
      el("quizProgressBar");

    if (bar) {
      const percent =
        total
          ? Math.round(
              (answered / total) * 100
            )
          : 0;

      bar.style.width =
        `${percent}%`;

      bar.setAttribute(
        "aria-valuenow",
        String(percent)
      );
    }
  }

  async function startAttempt() {
    if (!canStartAttempt()) {
      showQuizResult(
        null,
        false,
        `You have reached the maximum number of attempts for this quiz.`
      );

      return null;
    }

    if (state.currentAttempt) {
      return state.currentAttempt;
    }

    const attemptNumber =
      attemptsUsed() + 1;

    const payload = {
      enrollment_id:
        state.enrollmentId,
      quiz_id:
        state.quiz.id,
      lesson_id:
        state.quiz.lesson_id ||
        state.lesson?.id ||
        null,
      attempt_number:
        attemptNumber,
      started_at:
        new Date().toISOString()
    };

    const { data, error } =
      await db()
        .from(TABLES.attempts)
        .insert(payload)
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    state.currentAttempt =
      data;

    state.started = true;

    show(
      "quizStartButton",
      false
    );

    show(
      "quizSubmitButton",
      true
    );

    show(
      "quizQuestions",
      true
    );

    updateAnsweredCount();

    return data;
  }

  function requireAllQuestionsAnswered() {
    const unanswered =
      state.questions.filter(
        question =>
          !state.selectedAnswers[
            question.id
          ]
      );

    if (!unanswered.length) {
      return true;
    }

    showQuizMessage(
      `Please answer all ${unanswered.length} remaining question${
        unanswered.length === 1
          ? ""
          : "s"
      } before submitting.`,
      "error"
    );

    const first =
      document.querySelector(
        `[data-question-id="${CSS.escape(unanswered[0].id)}"]`
      );

    first?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    return false;
  }

  function calculateScore() {
    let earned = 0;
    let possible = 0;

    const answers = [];

    state.questions.forEach(
      question => {
        const points =
          number(
            question.points,
            1
          );

        possible += points;

        const selectedId =
          state.selectedAnswers[
            question.id
          ] || null;

        const correct =
          selectedId
            ? optionIsCorrect(
                selectedId
              )
            : false;

        if (correct) {
          earned += points;
        }

        answers.push({
          question_id:
            question.id,
          selected_option_id:
            selectedId,
          is_correct:
            correct
        });
      }
    );

    const score =
      possible > 0
        ? Math.round(
            (earned / possible) *
              100 *
              100
          ) / 100
        : 0;

    const passingScore =
      state.quiz.passing_score !== null &&
      state.quiz.passing_score !== undefined
        ? number(
            state.quiz.passing_score
          )
        : number(
            state.course?.passing_score,
            80
          );

    return {
      earned,
      possible,
      score,
      passingScore,
      passed:
        score >= passingScore,
      answers
    };
  }

  async function saveAnswers(
    attemptId,
    answers
  ) {
    /*
      Answers are written individually so a database error identifies
      the exact operation that failed.
    */

    for (
      const answer of answers
    ) {
      const { error } =
        await db()
          .from(TABLES.answers)
          .upsert(
            {
              attempt_id:
                attemptId,
              question_id:
                answer.question_id,
              selected_option_id:
                answer.selected_option_id,
              is_correct:
                answer.is_correct
            },
            {
              onConflict:
                "attempt_id,question_id"
            }
          );

      if (error) {
        throw error;
      }
    }
  }

  async function submitAttempt() {
    if (
      !state.currentAttempt ||
      state.submitted
    ) {
      return;
    }

    if (
      !requireAllQuestionsAnswered()
    ) {
      return;
    }

    state.loading = true;

    try {
      const result =
        calculateScore();

      await saveAnswers(
        state.currentAttempt.id,
        result.answers
      );

      const { data, error } =
        await db()
          .from(TABLES.attempts)
          .update({
            score:
              result.score,
            passed:
              result.passed,
            completed_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            state.currentAttempt.id
          )
          .select("*")
          .single();

      if (error) {
        throw error;
      }

      state.currentAttempt =
        data;

      state.submitted = true;

      await loadAttempts();

      await updateLessonAfterQuiz(
        result.passed
      );

      showQuizResult(
        result,
        true
      );

    } catch (error) {
      console.error(
        "Unable to submit quiz:",
        error
      );

      showQuizMessage(
        error?.message ||
        "Unable to submit the quiz.",
        "error"
      );

    } finally {
      state.loading = false;
    }
  }

  async function updateLessonAfterQuiz(
    passed
  ) {
    if (
      !passed ||
      !state.lesson
    ) {
      return;
    }

    /*
      Step 10 does not directly write lesson progress because Step 9
      owns that progress engine.

      If the Step 9 player is present on the page, ask it to save 100%.
      Otherwise update lms_lesson_progress directly.
    */

    if (
      window.Screenings4uLMSPlayer
        ?.saveLessonProgress
    ) {
      await window.Screenings4uLMSPlayer
        .saveLessonProgress(
          state.lesson.id,
          100,
          0,
          true
        );

      return;
    }

    const { data: existing,
      error: existingError } =
      await db()
        .from("lms_lesson_progress")
        .select("*")
        .eq(
          "enrollment_id",
          state.enrollmentId
        )
        .eq(
          "lesson_id",
          state.lesson.id
        )
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const payload = {
      enrollment_id:
        state.enrollmentId,
      lesson_id:
        state.lesson.id,
      progress_percent:
        100,
      last_position_seconds:
        0,
      completed_at:
        new Date().toISOString(),
      last_activity_at:
        new Date().toISOString()
    };

    let result;

    if (existing) {
      result =
        await db()
          .from("lms_lesson_progress")
          .update(payload)
          .eq(
            "id",
            existing.id
          );
    } else {
      payload.started_at =
        new Date().toISOString();

      result =
        await db()
          .from("lms_lesson_progress")
          .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    await updateEnrollmentProgress();
  }

  async function updateEnrollmentProgress() {
    const { data: progressRows,
      error } =
      await db()
        .from("lms_lesson_progress")
        .select(
          "lesson_id,progress_percent,completed_at"
        )
        .eq(
          "enrollment_id",
          state.enrollmentId
        );

    if (error) {
      throw error;
    }

    const { data: requiredLessons,
      error: lessonError } =
      await db()
        .from(TABLES.lessons)
        .select(
          "id,is_required"
        )
        .eq(
          "course_id",
          state.enrollment.course_id
        )
        .eq(
          "is_published",
          true
        );

    if (lessonError) {
      throw lessonError;
    }

    const required =
      (requiredLessons || [])
        .filter(
          lesson =>
            lesson.is_required !== false
        );

    const completed =
      required.filter(
        lesson => {
          const row =
            (progressRows || [])
              .find(
                progress =>
                  progress.lesson_id ===
                  lesson.id
              );

          return (
            number(
              row?.progress_percent
            ) >= 100 ||
            Boolean(
              row?.completed_at
            )
          );
        }
      ).length;

    const percent =
      required.length
        ? Math.round(
            (completed /
              required.length) *
              10000
          ) / 100
        : 0;

    const payload = {
      progress_percent:
        percent,
      last_activity_at:
        new Date().toISOString()
    };

    if (
      percent >= 100
    ) {
      payload.completed_at =
        state.enrollment.completed_at ||
        new Date().toISOString();

      payload.status =
        "completed";
    }

    const { data, error:
      updateError } =
      await db()
        .from(TABLES.enrollments)
        .update(payload)
        .eq(
          "id",
          state.enrollmentId
        )
        .select("*")
        .single();

    if (updateError) {
      throw updateError;
    }

    state.enrollment =
      {
        ...state.enrollment,
        ...data
      };

    document.dispatchEvent(
      new CustomEvent(
        "screenings4u:lms-progress-updated",
        {
          detail: {
            enrollmentId:
              state.enrollmentId,
            progressPercent:
              percent,
            completed:
              percent >= 100
          }
        }
      )
    );
  }

  function showQuizResult(
    result,
    submitted,
    messageText
  ) {
    show(
      "quizResult",
      true
    );

    show(
      "quizQuestions",
      false
    );

    show(
      "quizSubmitButton",
      false
    );

    show(
      "quizRetryButton",
      false
    );

    if (
      !submitted ||
      !result
    ) {
      setText(
        "quizResultMessage",
        messageText ||
        ""
      );

      return;
    }

    setText(
      "quizScore",
      `${result.score}%`
    );

    if (result.passed) {
      setText(
        "quizResultMessage",
        `Passed. Your score was ${result.score}%, and the required passing score is ${result.passingScore}%.`
      );

      showQuizMessage(
        "Quiz passed. Your lesson progress has been updated.",
        "success"
      );

      if (
        Number.isFinite(
          maxAttempts()
        ) &&
        attemptsUsed() <
          maxAttempts()
      ) {
        /*
          Retakes are still offered when configured. A passed quiz does
          not force the student to retake it.
        */
        show(
          "quizRetryButton",
          true
        );
      }

    } else {
      setText(
        "quizResultMessage",
        `Not passed. Your score was ${result.score}%, and the required passing score is ${result.passingScore}%.`
      );

      if (
        canStartAttempt()
      ) {
        show(
          "quizRetryButton",
          true
        );
      }
    }

    document
      .querySelectorAll(
        "[data-explanation]"
      )
      .forEach(node => {
        node.hidden = false;
      });

    const submitButton =
      el("quizSubmitButton");

    if (submitButton) {
      submitButton.disabled =
        true;
    }
  }

  function showQuizMessage(
    text,
    type = "info"
  ) {
    const node =
      el("quizResultMessage");

    if (!node) {
      console[type === "error" ? "error" : "log"](
        text
      );
      return;
    }

    node.textContent =
      text;

    node.dataset.type =
      type;
  }

  function resetForRetry() {
    state.currentAttempt =
      null;

    state.selectedAnswers =
      {};

    state.started =
      false;

    state.submitted =
      false;

    show(
      "quizResult",
      false
    );

    show(
      "quizQuestions",
      false
    );

    show(
      "quizSubmitButton",
      false
    );

    show(
      "quizRetryButton",
      false
    );

    show(
      "quizStartButton",
      canStartAttempt()
    );

    renderHeader();
  }

  function bindEvents() {
    el("quizStartButton")
      ?.addEventListener(
        "click",
        async () => {
          try {
            await startAttempt();
          } catch (error) {
            console.error(
              "Unable to start quiz:",
              error
            );

            showQuizMessage(
              error?.message ||
              "Unable to start the quiz.",
              "error"
            );
          }
        }
      );

    el("quizSubmitButton")
      ?.addEventListener(
        "click",
        submitAttempt
      );

    el("quizRetryButton")
      ?.addEventListener(
        "click",
        resetForRetry
      );

    el("quizBackButton")
      ?.addEventListener(
        "click",
        event => {
          if (
            event.currentTarget
              .tagName
              .toLowerCase() ===
            "a"
          ) {
            return;
          }

          history.back();
        }
      );
  }

  async function init() {
    state.loading = true;

    show(
      "lmsQuizLoading",
      true
    );

    show(
      "lmsQuizError",
      false
    );

    show(
      "lmsQuizEmpty",
      false
    );

    try {
      await requireUser();
      await loadEnrollment();
      await loadQuiz();
      await loadLesson();
      await loadQuestions();
      await loadAttempts();

      renderHeader();
      renderQuestions();
      updateAnsweredCount();

      show(
        "lmsQuizLoading",
        false
      );

      if (
        !canStartAttempt()
      ) {
        showQuizResult(
          null,
          false,
          "You have reached the maximum number of attempts for this quiz."
        );
      } else {
        show(
          "quizStartButton",
          true
        );

        show(
          "quizQuestions",
          false
        );

        show(
          "quizSubmitButton",
          false
        );

        show(
          "quizResult",
          false
        );
      }

      bindEvents();

    } catch (error) {
      console.error(
        "Unable to initialize LMS quiz:",
        error
      );

      show(
        "lmsQuizLoading",
        false
      );

      setText(
        "lmsQuizError",
        error?.message ||
        "We could not load this quiz."
      );

      show(
        "lmsQuizError",
        true
      );

    } finally {
      state.loading = false;
    }
  }

  window.Screenings4uLMSQuiz = {
    state,

    init,

    loadEnrollment,
    loadQuiz,
    loadLesson,
    loadQuestions,
    loadAttempts,

    startAttempt,
    submitAttempt,

    calculateScore,
    updateEnrollmentProgress,

    resetForRetry
  };

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();