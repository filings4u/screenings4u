/* =========================================================
   screenings4u LMS — STEP 11
   Course Completion + Certificate Engine
   =========================================================

   PURPOSE
   -------
   This file is the authoritative browser-side completion coordinator
   for the new LMS.

   Completion is based on LMS records, not on the browser simply
   reaching the last lesson.

   REQUIRED CORE TABLES
   --------------------
   lms_courses
   lms_enrollments
   lms_lessons
   lms_lesson_progress
   lms_quizzes
   lms_quiz_attempts
   lms_certificates

   If your Step 11 certificate table is named differently, change only
   TABLES.certificates below.

   EXPECTED COURSE / ENROLLMENT RELATIONSHIP
   -----------------------------------------
   lms_enrollments.course_id -> lms_courses.id
   lms_lesson_progress.enrollment_id -> lms_enrollments.id
   lms_lesson_progress.lesson_id -> lms_lessons.id
   lms_quiz_attempts.enrollment_id -> lms_enrollments.id
   lms_quiz_attempts.quiz_id -> lms_quizzes.id

   EXPECTED CERTIFICATE FIELDS
   ---------------------------
   id
   enrollment_id
   certificate_number
   issued_at
   certificate_url
   revoked_at
   metadata
   created_at

   URL PARAMETERS
   --------------
   ?enrollment=ENROLLMENT_ID
   ?course=COURSE_ID

   IMPORTANT
   ---------
   The customer must already be authenticated.

   This script is intentionally defensive. It verifies that the
   enrollment belongs to the logged-in customer before reading or
   changing completion state.
*/

(() => {
  "use strict";

  const TABLES = {
    courses: "lms_courses",
    enrollments: "lms_enrollments",
    lessons: "lms_lessons",
    lessonProgress: "lms_lesson_progress",
    contentBlocks: "lms_content_blocks",
    assessments: "lms_assessments",
    assessmentAttempts: "lms_assessment_attempts",
    certificates: "lms_certificates"
  };

  const state = {
    user: null,
    enrollment: null,
    course: null,
    lessons: [],
    lessonProgress: [],
    quizzes: [],
    quizAttempts: [],
    certificate: null,
    completion: {
      requiredLessons: 0,
      completedLessons: 0,
      requiredQuizzes: 0,
      passedQuizzes: 0,
      lessonsComplete: false,
      quizzesComplete: false,
      eligible: false,
      courseCompleted: false
    },
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

  function getElement(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const node = getElement(id);
    if (node) {
      node.textContent = value ?? "";
    }
  }

  function show(id, visible) {
    const node = getElement(id);
    if (!node) return;
    node.hidden = !visible;
  }

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function getUrlParameters() {
    const search =
      new URLSearchParams(
        window.location.search
      );

    return {
      enrollmentId:
        search.get("enrollment") ||
        search.get("enrollment_id") ||
        "",

      courseId:
        search.get("course") ||
        search.get("course_id") ||
        ""
    };
  }

  async function requireUser() {
    const { data, error } =
      await db().auth.getUser();

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error(
        "You must be signed in to access your training."
      );
    }

    state.user = data.user;

    return data.user;
  }

  async function loadEnrollment() {
    const params =
      getUrlParameters();

    if (!params.enrollmentId) {
      throw new Error(
        "The training link is missing the enrollment ID."
      );
    }

    const { data, error } =
      await db()
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
            certificate_enabled,
            slug
          )
        `)
        .eq(
          "id",
          params.enrollmentId
        )
        .eq(
          "user_id",
          state.user.id
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "This training enrollment could not be found."
      );
    }

    if (
      params.courseId &&
      data.course_id !==
        params.courseId
    ) {
      throw new Error(
        "This enrollment does not belong to the requested course."
      );
    }

    state.enrollment = data;
    state.course = data.course;

    return data;
  }

  async function loadLessons() {
    const { data: sections, error: sectionError } =
      await db()
        .from("lms_sections")
        .select("id")
        .eq("course_id", state.enrollment.course_id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

    if (sectionError) throw sectionError;

    const sectionIds = (sections || []).map(section => section.id);

    if (!sectionIds.length) {
      state.lessons = [];
      return state.lessons;
    }

    const { data, error } =
      await db()
        .from(TABLES.lessons)
        .select(`
          id,
          section_id,
          title,
          is_required,
          completion_required,
          status,
          sort_order
        `)
        .in("section_id", sectionIds)
        .eq("status", "published")
        .order("sort_order", { ascending: true });

    if (error) throw error;

    state.lessons = data || [];
    return state.lessons;
  }

  async function loadLessonProgress() {
    const { data, error } =
      await db()
        .from(TABLES.lessonProgress)
        .select(`
          id,
          enrollment_id,
          lesson_id,
          progress_percent,
          last_position_seconds,
          started_at,
          completed_at
        `)
        .eq(
          "enrollment_id",
          state.enrollment.id
        );

    if (error) {
      throw error;
    }

    state.lessonProgress =
      data || [];

    return state.lessonProgress;
  }

  async function loadQuizzes() {
    /*
      Current LMS assessments are attached to lesson content blocks.
      Keep the state property name for compatibility with the rest of
      this completion coordinator.
    */
    const lessonIds = state.lessons.map(lesson => lesson.id);

    if (!lessonIds.length) {
      state.quizzes = [];
      return state.quizzes;
    }

    const { data: blocks, error: blockError } =
      await db()
        .from(TABLES.contentBlocks)
        .select("id, lesson_id, block_type, settings, is_required, sort_order")
        .in("lesson_id", lessonIds)
        .in("block_type", ["quiz", "knowledge_check"])
        .order("sort_order", { ascending: true });

    if (blockError) throw blockError;

    const linked = (blocks || [])
      .map(block => ({
        block,
        assessmentId: block.settings?.assessment_id || null
      }))
      .filter(item => item.assessmentId);

    if (!linked.length) {
      state.quizzes = [];
      return state.quizzes;
    }

    const assessmentIds = [...new Set(linked.map(item => item.assessmentId))];

    const { data: assessments, error: assessmentError } =
      await db()
        .from(TABLES.assessments)
        .select(`
          id,
          lesson_id,
          title,
          passing_score,
          max_attempts,
          status,
          require_pass
        `)
        .in("id", assessmentIds)
        .eq("status", "published");

    if (assessmentError) throw assessmentError;

    const byId = new Map((assessments || []).map(assessment => [assessment.id, assessment]));

    state.quizzes = linked
      .map(item => {
        const assessment = byId.get(item.assessmentId);
        if (!assessment) return null;

        return {
          ...assessment,
          is_required:
            item.block.is_required !== false &&
            assessment.require_pass !== false,
          block_id: item.block.id
        };
      })
      .filter(Boolean);

    return state.quizzes;
  }

  async function loadQuizAttempts() {
    if (!state.quizzes.length) {
      state.quizAttempts = [];
      return state.quizAttempts;
    }

    const assessmentIds = state.quizzes.map(item => item.id);

    const { data, error } =
      await db()
        .from(TABLES.assessmentAttempts)
        .select(`
          id,
          enrollment_id,
          assessment_id,
          attempt_number,
          score,
          passed,
          started_at,
          completed_at
        `)
        .eq("enrollment_id", state.enrollment.id)
        .in("assessment_id", assessmentIds);

    if (error) throw error;

    state.quizAttempts = (data || []).map(attempt => ({
      ...attempt,
      quiz_id: attempt.assessment_id
    }));

    return state.quizAttempts;
  }

  function progressForLesson(
    lessonId
  ) {
    return state.lessonProgress.find(
      row =>
        row.lesson_id ===
        lessonId
    );
  }

  function lessonIsComplete(
    lesson
  ) {
    const progress =
      progressForLesson(
        lesson.id
      );

    return Boolean(
      progress &&
      (
        number(
          progress.progress_percent
        ) >= 100 ||
        progress.completed_at
      )
    );
  }

  function getRequiredLessons() {
    return state.lessons.filter(
      lesson =>
        lesson.is_required !== false
    );
  }

  function getRequiredQuizzes() {
    return state.quizzes.filter(
      quiz =>
        quiz.is_required !== false
    );
  }

  function latestAttemptForQuiz(
    quizId
  ) {
    return state.quizAttempts
      .filter(
        attempt =>
          attempt.quiz_id ===
          quizId
      )
      .sort(
        (a, b) =>
          number(
            b.attempt_number
          ) -
          number(
            a.attempt_number
          )
      )[0] || null;
  }

  function quizIsPassed(
    quizId
  ) {
    return Boolean(
      state.quizAttempts.some(
        attempt =>
          attempt.quiz_id ===
            quizId &&
          attempt.passed === true
      )
    );
  }

  function calculateCompletion() {
    const requiredLessons =
      getRequiredLessons();

    const completedLessons =
      requiredLessons.filter(
        lesson =>
          lessonIsComplete(
            lesson
          )
      );

    const requiredQuizzes =
      getRequiredQuizzes();

    const passedQuizzes =
      requiredQuizzes.filter(
        quiz =>
          quizIsPassed(
            quiz.id
          )
      );

    const lessonsComplete =
      completedLessons.length ===
      requiredLessons.length;

    const quizzesComplete =
      passedQuizzes.length ===
      requiredQuizzes.length;

    const eligible =
      lessonsComplete &&
      (
        state.course?.require_required_assessments === false
          ? true
          : quizzesComplete
      );

    state.completion = {
      requiredLessons:
        requiredLessons.length,

      completedLessons:
        completedLessons.length,

      requiredQuizzes:
        requiredQuizzes.length,

      passedQuizzes:
        passedQuizzes.length,

      lessonsComplete,

      quizzesComplete,

      eligible,

      courseCompleted:
        state.enrollment.status ===
        "completed"
    };

    return state.completion;
  }

  async function refreshState() {
    await loadLessons();
    await loadLessonProgress();
    await loadQuizzes();
    await loadQuizAttempts();

    return calculateCompletion();
  }

  function generateCertificateNumber() {
    /*
      Human-readable certificate number.

      Example:
      S4U-2026-8F3A91C2

      The database UNIQUE constraint remains the final protection
      against duplicates.
    */
    const year =
      new Date()
        .getFullYear();

    const random =
      Math.random()
        .toString(36)
        .slice(2, 10)
        .toUpperCase();

    return `S4U-${year}-${random}`;
  }

  async function getExistingCertificate() {
    const { data, error } =
      await db()
        .from(TABLES.certificates)
        .select(`
          id,
          enrollment_id,
          certificate_number,
          issued_at,
          certificate_media_id,
          revoked_at,
          metadata,
          created_at
        `)
        .eq(
          "enrollment_id",
          state.enrollment.id
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    state.certificate =
      data || null;

    return state.certificate;
  }

  async function markEnrollmentCompleted() {
    const now =
      new Date().toISOString();

    const update = {
      status: "completed",
      progress_percent: 100,
      completed_at:
        state.enrollment.completed_at ||
        now,
      last_activity_at: now
    };

    const { data, error } =
      await db()
        .from(TABLES.enrollments)
        .update(update)
        .eq(
          "id",
          state.enrollment.id
        )
        .eq(
          "user_id",
          state.user.id
        )
        .select(`
          id,
          user_id,
          course_id,
          status,
          progress_percent,
          enrolled_at,
          started_at,
          completed_at,
          last_activity_at
        `)
        .single();

    if (error) {
      throw error;
    }

    state.enrollment = {
      ...state.enrollment,
      ...data
    };

    state.completion.courseCompleted =
      true;

    return data;
  }

  async function issueCertificate() {
    if (!state.enrollment) {
      throw new Error(
        "Training enrollment has not been loaded."
      );
    }

    await refreshState();

    if (
      !state.completion.eligible
    ) {
      throw new Error(
        "The course is not complete. All required lessons and required quizzes must be completed and passed before a certificate can be issued."
      );
    }

    if (
      state.course &&
      state.course.certificate_enabled === false
    ) {
      throw new Error(
        "Certificates are disabled for this course."
      );
    }

    await markEnrollmentCompleted();

    const existing =
      await getExistingCertificate();

    if (existing) {
      /*
        Do not create another certificate for the same enrollment.
      */
      return existing;
    }

    const certificateNumber =
      generateCertificateNumber();

    const payload = {
      enrollment_id:
        state.enrollment.id,

      certificate_number:
        certificateNumber,

      issued_at:
        new Date().toISOString(),

      metadata: {
        course_id:
          state.enrollment.course_id,

        course_title:
          state.course?.title ||
          null,

        user_id:
          state.user.id,

        generated_by:
          "screenings4u-lms"
      }
    };

    const { data, error } =
      await db()
        .from(TABLES.certificates)
        .insert(payload)
        .select(`
          id,
          enrollment_id,
          certificate_number,
          issued_at,
          certificate_media_id,
          revoked_at,
          metadata,
          created_at
        `)
        .single();

    if (error) {
      /*
        If another request created the certificate at the same time,
        retrieve it rather than generating a second record.
      */
      if (
        error.code === "23505"
      ) {
        const existingAfterConflict =
          await getExistingCertificate();

        if (
          existingAfterConflict
        ) {
          return existingAfterConflict;
        }
      }

      throw error;
    }

    state.certificate =
      data;

    return data;
  }

  async function verifyAndComplete() {
    await requireUser();
    await loadEnrollment();

    await refreshState();
    await getExistingCertificate();

    if (
      state.completion.eligible
    ) {
      if (
        !state.certificate
      ) {
        return await issueCertificate();
      }

      if (
        state.enrollment.status !==
        "completed"
      ) {
        await markEnrollmentCompleted();
      }
    }

    renderCompletion();

    return {
      completion:
        state.completion,
      certificate:
        state.certificate,
      enrollment:
        state.enrollment
    };
  }

  async function revokeCertificate(
    certificateId
  ) {
    if (!certificateId) {
      throw new Error(
        "Certificate ID is required."
      );
    }

    const { data, error } =
      await db()
        .from(TABLES.certificates)
        .update({
          revoked_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          certificateId
        )
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    state.certificate =
      data;

    renderCertificate();

    return data;
  }

  function certificateIsValid() {
    return Boolean(
      state.certificate &&
      !state.certificate.revoked_at
    );
  }

  function renderCompletion() {
    const c =
      state.completion;

    setText(
      "requiredLessonCount",
      String(
        c.requiredLessons
      )
    );

    setText(
      "completedLessonCount",
      String(
        c.completedLessons
      )
    );

    setText(
      "requiredQuizCount",
      String(
        c.requiredQuizzes
      )
    );

    setText(
      "passedQuizCount",
      String(
        c.passedQuizzes
      )
    );

    setText(
      "courseCompletionPercent",
      c.eligible
        ? "100%"
        : state.enrollment
          ? `${number(
              state.enrollment.progress_percent
            )}%`
          : "0%"
    );

    show(
      "courseCompletionComplete",
      c.eligible
    );

    show(
      "courseCompletionIncomplete",
      !c.eligible
    );

    renderCertificate();
  }

  function renderCertificate() {
    const certificate =
      state.certificate;

    if (!certificate) {
      show(
        "certificatePanel",
        false
      );

      return;
    }

    show(
      "certificatePanel",
      true
    );

    setText(
      "certificateNumber",
      certificate.certificate_number
    );

    setText(
      "certificateIssuedDate",
      formatDate(
        certificate.issued_at
      )
    );

    if (
      certificate.revoked_at
    ) {
      setText(
        "certificateStatus",
        "Revoked"
      );

      show(
        "certificateDownloadButton",
        false
      );

      return;
    }

    setText(
      "certificateStatus",
      "Valid"
    );

    const download =
      getElement(
        "certificateDownloadButton"
      );

    if (download) {
      if (
        null
      ) {
        download.href =
          null;

        download.hidden =
          false;
      } else {
        download.hidden =
          true;
      }
    }
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    );
  }

  function bindEvents() {
    getElement(
      "verifyCompletionButton"
    )?.addEventListener(
      "click",
      async () => {
        try {
          setBusy(
            "verifyCompletionButton",
            true
          );

          const result =
            await verifyAndComplete();

          if (
            result.certificate
          ) {
            showMessage(
              "Your course is complete and your certificate is available.",
              "success"
            );
          } else if (
            result.completion.eligible
          ) {
            showMessage(
              "Your course is complete.",
              "success"
            );
          } else {
            showMessage(
              "Your course is not complete yet.",
              "info"
            );
          }

        } catch (error) {
          console.error(
            "Unable to verify completion:",
            error
          );

          showMessage(
            error?.message ||
            "Unable to verify course completion.",
            "error"
          );

        } finally {
          setBusy(
            "verifyCompletionButton",
            false
          );
        }
      }
    );
  }

  function setBusy(
    id,
    busy
  ) {
    const button =
      getElement(id);

    if (!button) return;

    button.disabled =
      Boolean(busy);

    if (busy) {
      button.dataset.originalText =
        button.textContent;

      button.textContent =
        "Checking...";
    } else if (
      button.dataset.originalText
    ) {
      button.textContent =
        button.dataset.originalText;
    }
  }

  function showMessage(
    text,
    type = "info"
  ) {
    /*
      This deliberately uses the LMS UI rather than browser alert().
    */
    const toast =
      getElement(
        "lmsCompletionToast"
      );

    if (toast) {
      toast.textContent =
        text;

      toast.dataset.type =
        type;

      toast.classList.add(
        "show"
      );

      window.clearTimeout(
        toast._timer
      );

      toast._timer =
        window.setTimeout(
          () => {
            toast.classList.remove(
              "show"
            );
          },
          5000
        );

      return;
    }

    /*
      If the page does not provide the LMS toast, dispatch an event so
      the site's global modal/toast system can handle it.
    */
    document.dispatchEvent(
      new CustomEvent(
        "screenings4u:lms-message",
        {
          detail: {
            message: text,
            type
          }
        }
      )
    );
  }

  async function init() {
    state.loading = true;

    try {
      await requireUser();
      await loadEnrollment();
      await refreshState();
      await getExistingCertificate();

      /*
        If the course is already eligible, this safely completes the
        enrollment and creates the certificate if it does not exist.
      */
      if (
        state.completion.eligible
      ) {
        await markEnrollmentCompleted();

        if (
          state.course?.certificate_enabled !==
            false &&
          !state.certificate
        ) {
          await issueCertificate();
        }
      }

      renderCompletion();

      bindEvents();

      document.dispatchEvent(
        new CustomEvent(
          "screenings4u:lms-completion-ready",
          {
            detail: {
              enrollment:
                state.enrollment,
              course:
                state.course,
              completion:
                state.completion,
              certificate:
                state.certificate
            }
          }
        )
      );

    } catch (error) {
      console.error(
        "Unable to initialize LMS completion engine:",
        error
      );

      showMessage(
        error?.message ||
        "Unable to load course completion information.",
        "error"
      );

    } finally {
      state.loading = false;
    }
  }

  /*
    Public API for the customer dashboard, course player, certificate
    page, and future admin tools.
  */
  window.Screenings4uLMSCompletion = {
    state,

    init,

    requireUser,
    loadEnrollment,
    loadLessons,
    loadLessonProgress,
    loadQuizzes,
    loadQuizAttempts,

    refreshState,
    calculateCompletion,

    verifyAndComplete,
    markEnrollmentCompleted,

    getExistingCertificate,
    issueCertificate,

    certificateIsValid,
    revokeCertificate,

    renderCompletion,
    renderCertificate
  };

  if (
    document.readyState ===
    "loading"
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