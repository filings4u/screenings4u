(function () {
  "use strict";

  let client;
  let user;
  let quiz = null;
  let lesson = null;
  let questions = [];
  let enrollmentId = null;
  let submitted = false;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      client = window.getScreenings4uSupabase
        ? window.getScreenings4uSupabase()
        : window.screenings4uSupabase;

      if (!client) {
        throw new Error("Supabase client is not configured.");
      }

      const { data, error } =
        await client.auth.getSession();

      if (error) throw error;

      if (!data.session) {
        window.location.href = "client-login.html";
        return;
      }

      user = data.session.user;

      const params =
        new URLSearchParams(window.location.search);

      const quizId =
        params.get("id") ||
        params.get("quiz");

      enrollmentId =
        params.get("enrollment") ||
        params.get("enrollment_id") ||
        null;

      if (!quizId) {
        throw new Error("No quiz was specified.");
      }

      await loadQuiz(quizId);

      /*
       * training_quiz_questions belongs to a lesson, not directly
       * to a quiz. The quiz must therefore provide lesson_id.
       */
      if (!quiz.lesson_id) {
        throw new Error(
          "This quiz is not connected to a training lesson."
        );
      }

      await loadLesson(quiz.lesson_id);
      await resolveEnrollment();

      await loadQuestions(quiz.lesson_id);

      renderQuiz();

      const form =
        document.getElementById("quizForm");

      if (form) {
        form.addEventListener(
          "submit",
          submitQuiz
        );

        form.addEventListener(
          "change",
          updateProgress
        );

        form.addEventListener(
          "input",
          updateProgress
        );
      }

    } catch (error) {
      console.error(
        "Client quiz error:",
        error
      );

      showLoadingError(
        error.message ||
        "Unable to load this quiz."
      );
    }
  }

  async function loadQuiz(id) {
    const { data, error } =
      await client
        .from("training_quizzes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error("Quiz not found.");
    }

    quiz = data;
  }

  async function loadLesson(lessonId) {
    const { data, error } =
      await client
        .from("training_lessons")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "The training lesson for this quiz could not be found."
      );
    }

    lesson = data;
  }

  async function resolveEnrollment() {
    if (enrollmentId) {
      const { data, error } =
        await client
          .from("training_enrollments")
          .select("id, user_id, course_id")
          .eq("id", enrollmentId)
          .eq("user_id", user.id)
          .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Your enrollment could not be verified."
        );
      }

      /*
       * If the lesson exposes course_id, make sure the enrollment
       * belongs to the same course.
       */
      if (
        lesson?.course_id &&
        String(data.course_id) !==
          String(lesson.course_id)
      ) {
        throw new Error(
          "This quiz is not part of your enrolled course."
        );
      }

      enrollmentId = data.id;
      return;
    }

    /*
     * No enrollment was supplied in the URL.
     * If the lesson has a course_id, find the authenticated
     * client's enrollment for that course.
     */
    if (lesson?.course_id) {
      const { data, error } =
        await client
          .from("training_enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", lesson.course_id)
          .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "You are not enrolled in this training course."
        );
      }

      enrollmentId = data.id;
      return;
    }

    throw new Error(
      "No training enrollment was provided for this quiz."
    );
  }

  async function loadQuestions(lessonId) {
    const { data, error } =
      await client
        .from("training_quiz_questions")
        .select(`
          id,
          lesson_id,
          question_text,
          explanation,
          sort_order,
          points,
          training_quiz_options (
            id,
            question_id,
            option_text,
            is_correct,
            sort_order
          )
        `)
        .eq("lesson_id", lessonId)
        .order("sort_order", {
          ascending: true
        });

    if (error) throw error;

    questions =
      (data || []).map(function (question) {
        return {
          id: question.id,
          text: question.question_text,
          explanation: question.explanation || "",
          points: Number(question.points) || 1,
          choices:
            (question.training_quiz_options || [])
              .sort(function (a, b) {
                return (
                  Number(a.sort_order) -
                  Number(b.sort_order)
                );
              })
              .map(function (option) {
                return {
                  id: option.id,
                  value: option.id,
                  label: option.option_text,
                  correct:
                    option.is_correct === true
                };
              })
        };
      });

    if (!questions.length) {
      throw new Error(
        "This quiz does not have any questions yet."
      );
    }
  }

  function renderQuiz() {
    const title =
      quiz.title ||
      quiz.name ||
      "Knowledge Check";

    const description =
      quiz.description ||
      "Answer each question and submit your quiz when you are finished.";

    const titleElement =
      document.getElementById("quizTitle");

    if (titleElement) {
      titleElement.textContent = title;
    }

    const descriptionElement =
      document.getElementById("quizDescription");

    if (descriptionElement) {
      descriptionElement.textContent = description;
    }

    const loading =
      document.getElementById("quizLoading");

    if (loading) {
      loading.hidden = true;
    }

    const form =
      document.getElementById("quizForm");

    if (!form) {
      throw new Error(
        "Quiz form was not found on this page."
      );
    }

    form.hidden = false;

    const container =
      document.getElementById("quizQuestions");

    if (!container) {
      throw new Error(
        "Quiz question container was not found."
      );
    }

    container.innerHTML =
      questions
        .map(function (question, index) {
          return renderQuestion(
            question,
            index
          );
        })
        .join("");

    updateProgress();

    const back =
      document.getElementById("backToCourse");

    if (back && enrollmentId) {
      back.href =
        "client-training-course.html?id=" +
        encodeURIComponent(enrollmentId);
    }
  }

  function renderQuestion(
    question,
    index
  ) {
    const number = index + 1;
    const inputName =
      "question_" + question.id;

    return `
      <article
        class="quiz-question"
        data-question-id="${escapeHtml(question.id)}">

        <div class="quiz-question-heading">
          <span class="quiz-question-number">
            ${number}
          </span>

          <div>
            <p class="quiz-question-label">
              Question ${number}
            </p>

            <h2>
              ${escapeHtml(question.text)}
              <span class="quiz-required">*</span>
            </h2>
          </div>
        </div>

        <div class="quiz-answer-list">
          ${question.choices
            .map(function (choice, choiceIndex) {
              return renderRadio(
                inputName,
                choice.id,
                choice.label,
                choiceIndex
              );
            })
            .join("")}
        </div>
      </article>
    `;
  }

  function renderRadio(
    name,
    value,
    label,
    index
  ) {
    const id =
      name +
      "_" +
      index +
      "_" +
      slug(label);

    return `
      <label
        class="quiz-answer"
        for="${escapeHtml(id)}">

        <input
          id="${escapeHtml(id)}"
          type="radio"
          name="${escapeHtml(name)}"
          value="${escapeHtml(value)}"
          required>

        <span class="quiz-answer-indicator"></span>

        <span class="quiz-answer-text">
          ${escapeHtml(label)}
        </span>
      </label>
    `;
  }

  async function submitQuiz(event) {
    event.preventDefault();

    if (submitted) return;

    clearMessage();

    const form =
      document.getElementById("quizForm");

    if (!form) return;

    if (!form.reportValidity()) {
      showMessage(
        "Please answer all questions.",
        "error"
      );

      scrollToFirstUnanswered();
      return;
    }

    const answers =
      collectAnswers();

    if (
      answers.some(function (answer) {
        return !answer.selected_option_id;
      })
    ) {
      showMessage(
        "Please answer all questions.",
        "error"
      );

      scrollToFirstUnanswered();
      return;
    }

    const button =
      document.getElementById(
        "submitQuizButton"
      );

    if (button) {
      button.disabled = true;
      button.textContent = "Submitting...";
    }

    try {
      const result =
        gradeQuiz(answers);

      await saveAttempt(
        answers,
        result
      );

      submitted = true;

      renderResult(result);

    } catch (error) {
      console.error(
        "Quiz submission error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to submit quiz.",
        "error"
      );

      if (button) {
        button.disabled = false;
        button.textContent =
          "Submit Quiz";
      }
    }
  }

  function collectAnswers() {
    return questions.map(function (question) {
      const inputName =
        "question_" + question.id;

      const selected =
        document.querySelector(
          'input[name="' +
          CSS.escape(inputName) +
          '"]:checked'
        );

      return {
        question_id: question.id,
        selected_option_id:
          selected
            ? selected.value
            : null
      };
    });
  }

  function gradeQuiz(answers) {
    let earned = 0;
    let possible = 0;

    const reviewed =
      answers.map(function (answer) {
        const question =
          questions.find(function (item) {
            return String(item.id) ===
              String(answer.question_id);
          });

        const points =
          Number(question?.points) || 1;

        possible += points;

        const selected =
          question?.choices.find(function (choice) {
            return String(choice.id) ===
              String(answer.selected_option_id);
          });

        const correct =
          selected?.correct === true;

        if (correct) {
          earned += points;
        }

        return {
          question_id:
            answer.question_id,

          selected_option_id:
            answer.selected_option_id,

          is_correct:
            correct,

          points: points
        };
      });

    const percentage =
      possible > 0
        ? Math.round(
            (earned / possible) * 10000
          ) / 100
        : 0;

    const passingScore =
      Number(
        quiz.passing_score ??
        quiz.pass_score ??
        quiz.passing_percentage ??
        70
      );

    return {
      earned,
      possible,
      percentage,
      passingScore,
      passed:
        percentage >= passingScore,
      reviewed
    };
  }

  async function saveAttempt(
    answers,
    result
  ) {
    if (!enrollmentId) {
      throw new Error(
        "Your training enrollment could not be determined."
      );
    }

    /*
     * training_quiz_attempts does NOT have quiz_id or profile_id.
     * It is identified by enrollment_id + lesson_id + attempt_number.
     */
    const { data: previousAttempts, error: attemptLookupError } =
      await client
        .from("training_quiz_attempts")
        .select("attempt_number")
        .eq("enrollment_id", enrollmentId)
        .eq("lesson_id", quiz.lesson_id)
        .order("attempt_number", {
          ascending: false
        })
        .limit(1);

    if (attemptLookupError) {
      throw attemptLookupError;
    }

    const nextAttemptNumber =
      previousAttempts?.length
        ? Number(
            previousAttempts[0].attempt_number
          ) + 1
        : 1;

    const attemptPayload = {
      enrollment_id:
        enrollmentId,

      lesson_id:
        quiz.lesson_id,

      attempt_number:
        nextAttemptNumber,

      score:
        result.percentage,

      passed:
        result.passed,

      completed_at:
        new Date().toISOString()
    };

    const {
      data: attempt,
      error: attemptError
    } = await client
      .from("training_quiz_attempts")
      .insert(attemptPayload)
      .select("id")
      .single();

    if (attemptError) {
      throw attemptError;
    }

    if (!attempt?.id) {
      throw new Error(
        "The quiz attempt was not created."
      );
    }

    /*
     * training_quiz_answers is a separate table.
     * Save one answer row per question.
     */
    const answerRows =
      result.reviewed.map(function (answer) {
        return {
          attempt_id:
            attempt.id,

          question_id:
            answer.question_id,

          selected_option_id:
            answer.selected_option_id,

          is_correct:
            answer.is_correct
        };
      });

    const {
      error: answersError
    } = await client
      .from("training_quiz_answers")
      .insert(answerRows);

    if (answersError) {
      /*
       * Do not leave an incomplete attempt behind when the
       * answer rows cannot be saved.
       */
      await client
        .from("training_quiz_attempts")
        .delete()
        .eq("id", attempt.id);

      throw answersError;
    }
  }

  function renderResult(result) {
    const form =
      document.getElementById(
        "quizForm"
      );

    const resultBox =
      document.getElementById(
        "quizResult"
      );

    if (!form || !resultBox) {
      return;
    }

    form.hidden = true;
    resultBox.hidden = false;

    const passed =
      result.passed;

    resultBox.innerHTML = `
      <div class="quiz-result-icon ${
        passed
          ? "quiz-result-success"
          : "quiz-result-retry"
      }">
        ${passed ? "✓" : "!"}
      </div>

      <p class="eyebrow">
        ${
          passed
            ? "QUIZ PASSED"
            : "QUIZ NOT PASSED"
        }
      </p>

      <h2>
        ${
          passed
            ? "Great job!"
            : "Keep Going"
        }
      </h2>

      <p class="quiz-result-score">
        ${result.percentage}%
      </p>

      <p>
        You earned
        <strong>${result.earned}</strong>
        of
        <strong>${result.possible}</strong>
        possible points.
      </p>

      <p class="quiz-result-passing">
        Passing score:
        ${result.passingScore}%
      </p>

      <div class="quiz-result-actions">
        ${
          passed && enrollmentId
            ? `
              <a
                class="client-primary-button"
                href="client-training-course.html?id=${encodeURIComponent(
                  enrollmentId
                )}">
                Return to Course
              </a>
            `
            : `
              <button
                id="retryQuizButton"
                class="client-primary-button"
                type="button">
                Retake Quiz
              </button>
            `
        }

        <a
          class="client-secondary-button"
          href="client-training.html">
          My Training
        </a>
      </div>
    `;

    document
      .getElementById("retryQuizButton")
      ?.addEventListener(
        "click",
        resetQuiz
      );
  }

  function resetQuiz() {
    submitted = false;

    const result =
      document.getElementById(
        "quizResult"
      );

    if (result) {
      result.hidden = true;
    }

    const form =
      document.getElementById(
        "quizForm"
      );

    if (form) {
      form.hidden = false;
      form.reset();
    }

    const button =
      document.getElementById(
        "submitQuizButton"
      );

    if (button) {
      button.disabled = false;
      button.textContent =
        "Submit Quiz";
    }

    clearMessage();
    updateProgress();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function updateProgress() {
    const answered =
      questions.filter(function (question) {
        const name =
          "question_" + question.id;

        return Boolean(
          document.querySelector(
            'input[name="' +
            CSS.escape(name) +
            '"]:checked'
          )
        );
      }).length;

    const total =
      questions.length;

    const percent =
      total
        ? Math.round(
            (answered / total) * 100
          )
        : 0;

    const count =
      document.getElementById(
        "quizQuestionCount"
      );

    if (count) {
      count.textContent =
        answered +
        " of " +
        total +
        " answered";
    }

    const percentElement =
      document.getElementById(
        "quizProgressPercent"
      );

    if (percentElement) {
      percentElement.textContent =
        percent + "%";
    }

    const bar =
      document.getElementById(
        "quizProgressBar"
      );

    if (bar) {
      bar.style.width =
        percent + "%";
    }
  }

  function scrollToFirstUnanswered() {
    const first =
      questions.find(function (question) {
        const name =
          "question_" + question.id;

        return !document.querySelector(
          'input[name="' +
          CSS.escape(name) +
          '"]:checked'
        );
      });

    if (!first) return;

    const element =
      document.querySelector(
        '[data-question-id="' +
        CSS.escape(
          String(first.id)
        ) +
        '"]'
      );

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }

  function showLoadingError(message) {
    const loading =
      document.getElementById(
        "quizLoading"
      );

    if (!loading) return;

    loading.hidden = false;

    loading.innerHTML = `
      <strong>
        Unable to load quiz.
      </strong>

      <p>
        ${escapeHtml(message)}
      </p>

      <p>
        <a href="client-training.html">
          Return to My Training
        </a>
      </p>
    `;
  }

  function showMessage(
    message,
    type
  ) {
    const element =
      document.getElementById(
        "quizMessage"
      );

    if (!element) return;

    element.textContent =
      message;

    element.className =
      "form-message " + type;
  }

  function clearMessage() {
    const element =
      document.getElementById(
        "quizMessage"
      );

    if (!element) return;

    element.textContent = "";
    element.className =
      "form-message";
  }

  function slug(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(0, 40);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

})();