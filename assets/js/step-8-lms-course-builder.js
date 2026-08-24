/* =========================================================
   screenings4u LMS — STEP 8
   Complete Admin Course Builder
   =========================================================

   PURPOSE
   -------
   Step 8 is the administrative content-management layer for the
   new LMS.

   The builder is intentionally separate from the storefront.

   STOREFRONT:
      products / orders / order_items

   LMS CONTENT:
      lms_courses
      lms_sections
      lms_lessons
      lms_lesson_assets
      lms_quizzes
      lms_quiz_questions
      lms_quiz_options

   CUSTOMER ACCESS:
      lms_enrollments

   This file expects the Step 8 HTML to provide the following IDs:

      lmsCourseBuilder
      courseId
      courseTitle
      courseSlug
      courseShortDescription
      courseDescription
      coursePublished
      courseCertificateEnabled
      saveCourseButton
      courseSections
      addSectionButton
      courseBuilderMessage

   Section modal/form IDs:

      sectionModal
      sectionId
      sectionTitle
      sectionDescription
      sectionOrder
      sectionPublished
      saveSectionButton
      deleteSectionButton
      closeSectionModal

   Lesson modal/form IDs:

      lessonModal
      lessonId
      lessonSectionId
      lessonTitle
      lessonDescription
      lessonType
      lessonOrder
      lessonRequired
      lessonPublished
      lessonContent
      lessonVideoUrl
      lessonVideoDuration
      lessonFileUrl
      saveLessonButton
      deleteLessonButton
      closeLessonModal

   Asset form IDs:

      assetModal
      assetId
      assetLessonId
      assetTitle
      assetType
      assetUrl
      assetStoragePath
      assetDescription
      assetDownloadable
      assetOpenNewTab
      saveAssetButton
      deleteAssetButton
      closeAssetModal

   Quiz form IDs:

      quizModal
      quizLessonId
      quizTitle
      quizDescription
      quizPassingScore
      quizMaxAttempts
      quizPublished
      saveQuizButton
      closeQuizModal

   The script is deliberately defensive: missing optional elements do
   not stop the rest of the builder from initializing.
*/

(() => {
  "use strict";

  const TABLES = {
    courses: "lms_courses",
    sections: "lms_sections",
    lessons: "lms_lessons",
    assets: "lms_lesson_assets",
    quizzes: "lms_quizzes",
    questions: "lms_quiz_questions",
    options: "lms_quiz_options"
  };

  const state = {
    courseId: null,
    course: null,
    sections: [],
    lessons: [],
    assets: [],
    quizzes: [],
    questions: [],
    options: [],
    editingSectionId: null,
    editingLessonId: null,
    editingAssetId: null,
    editingQuizId: null,
    saving: false
  };

  function db() {
    const supabaseClient =
      window.supabaseClient ||
      window.supabase;

    if (!supabaseClient || typeof supabaseClient.from !== "function") {
      throw new Error(
        "Supabase client is not available."
      );
    }

    return supabaseClient;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function value(id) {
    return el(id)?.value ?? "";
  }

  function checked(id) {
    return Boolean(el(id)?.checked);
  }

  function setValue(id, v) {
    const node = el(id);
    if (node) node.value = v ?? "";
  }

  function setChecked(id, v) {
    const node = el(id);
    if (node) node.checked = Boolean(v);
  }

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(text) {
    return String(text || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
  }

  function showModal(id, open = true) {
    const modal = el(id);
    if (!modal) return;

    modal.classList.toggle("open", open);
    modal.hidden = !open;
    modal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function closeAllModals() {
    [
      "sectionModal",
      "lessonModal",
      "assetModal",
      "quizModal"
    ].forEach(id => showModal(id, false));
  }

  function message(text, type = "info") {
    const target = el("courseBuilderMessage");

    if (!target) {
      console[type === "error" ? "error" : "log"](text);
      return;
    }

    target.textContent = text;
    target.dataset.type = type;
    target.classList.add("visible");

    window.clearTimeout(message.timer);

    message.timer = window.setTimeout(() => {
      target.classList.remove("visible");
    }, 4000);
  }

  async function requireAdminSession() {
    const client = db();

    if (!client.auth?.getUser) {
      return null;
    }

    const { data, error } = await client.auth.getUser();

    if (error) throw error;

    if (!data?.user) {
      throw new Error(
        "You must be signed in to manage LMS courses."
      );
    }

    return data.user;
  }

  function getCourseIdFromUrl() {
    const params = new URLSearchParams(window.location.search);

    return (
      params.get("course") ||
      params.get("course_id") ||
      params.get("id") ||
      ""
    );
  }

  function normalizeLessonType(type) {
    const allowed = [
      "content",
      "video",
      "document",
      "download",
      "link",
      "audio",
      "embed",
      "quiz"
    ];

    return allowed.includes(type)
      ? type
      : "content";
  }

  async function loadCourse() {
    if (!state.courseId) {
      resetBuilder();
      return null;
    }

    const { data, error } = await db()
      .from(TABLES.courses)
      .select("*")
      .eq("id", state.courseId)
      .single();

    if (error) throw error;

    state.course = data;

    setValue("courseId", data.id);
    setValue("courseTitle", data.title);
    setValue("courseSlug", data.slug);
    setValue(
      "courseShortDescription",
      data.short_description
    );
    setValue(
      "courseDescription",
      data.description
    );
    setChecked(
      "coursePublished",
      data.is_published
    );
    setChecked(
      "courseCertificateEnabled",
      data.certificate_enabled
    );

    return data;
  }

  function resetBuilder() {
    state.courseId = null;
    state.course = null;
    state.sections = [];
    state.lessons = [];
    state.assets = [];
    state.quizzes = [];
    state.questions = [];
    state.options = [];

    setValue("courseId", "");
    setValue("courseTitle", "");
    setValue("courseSlug", "");
    setValue("courseShortDescription", "");
    setValue("courseDescription", "");
    setChecked("coursePublished", false);
    setChecked("courseCertificateEnabled", true);

    renderCurriculum();
  }

  async function saveCourse(event) {
    event?.preventDefault();

    if (state.saving) return;

    const title = value("courseTitle").trim();

    if (!title) {
      message("Course title is required.", "error");
      return;
    }

    state.saving = true;

    const button = el("saveCourseButton");
    const originalText = button?.textContent;

    if (button) {
      button.disabled = true;
      button.textContent = "Saving...";
    }

    try {
      const existingId =
        value("courseId").trim() ||
        state.courseId ||
        null;

      let slug =
        value("courseSlug").trim() ||
        slugify(title);

      if (!slug) {
        throw new Error(
          "A valid course slug could not be generated."
        );
      }

      const payload = {
        title,
        slug,
        short_description:
          value("courseShortDescription").trim() || null,
        description:
          value("courseDescription").trim() || null,
        is_published: checked("coursePublished"),
        certificate_enabled:
          checked("courseCertificateEnabled")
      };

      let result;

      if (existingId) {
        result = await db()
          .from(TABLES.courses)
          .update(payload)
          .eq("id", existingId)
          .select("*")
          .single();
      } else {
        result = await db()
          .from(TABLES.courses)
          .insert(payload)
          .select("*")
          .single();
      }

      if (result.error) throw result.error;

      state.course = result.data;
      state.courseId = result.data.id;

      setValue("courseId", result.data.id);
      setValue("courseSlug", result.data.slug);

      updateUrl(result.data.id);

      message(
        existingId
          ? "Course saved."
          : "Course created.",
        "success"
      );

      await loadCurriculum();

      document.dispatchEvent(
        new CustomEvent(
          "screenings4u:lms-course-saved",
          {
            detail: {
              course: result.data
            }
          }
        )
      );

      return result.data;

    } catch (error) {
      console.error(
        "Unable to save LMS course:",
        error
      );

      message(
        error?.message ||
        "Unable to save course.",
        "error"
      );

      throw error;

    } finally {
      state.saving = false;

      if (button) {
        button.disabled = false;
        button.textContent =
          originalText || "Save Course";
      }
    }
  }

  function updateUrl(courseId) {
    try {
      const url = new URL(window.location.href);

      url.searchParams.set(
        "course",
        courseId
      );

      window.history.replaceState(
        {},
        "",
        url.toString()
      );
    } catch {
      /* URL rewriting is optional. */
    }
  }

  async function loadCurriculum() {
    if (!state.courseId) {
      renderCurriculum();
      return;
    }

    const [
      sectionsResult,
      lessonsResult,
      assetsResult,
      quizzesResult
    ] = await Promise.all([
      db()
        .from(TABLES.sections)
        .select("*")
        .eq("course_id", state.courseId)
        .order("sort_order", {
          ascending: true
        }),

      db()
        .from(TABLES.lessons)
        .select("*")
        .eq("course_id", state.courseId)
        .order("sort_order", {
          ascending: true
        }),

      db()
        .from(TABLES.assets)
        .select("*")
        .eq("course_id", state.courseId)
        .order("sort_order", {
          ascending: true
        }),

      db()
        .from(TABLES.quizzes)
        .select("*")
        .eq("course_id", state.courseId)
        .order("created_at", {
          ascending: true
        })
    ]);

    if (sectionsResult.error) {
      /*
        If your Step 8 schema uses a module/section table name
        different from lms_sections, this is the one place to
        change it.
      */
      throw sectionsResult.error;
    }

    if (lessonsResult.error) {
      throw lessonsResult.error;
    }

    if (assetsResult.error) {
      throw assetsResult.error;
    }

    if (quizzesResult.error) {
      throw quizzesResult.error;
    }

    state.sections = sectionsResult.data || [];
    state.lessons = lessonsResult.data || [];
    state.assets = assetsResult.data || [];
    state.quizzes = quizzesResult.data || [];

    renderCurriculum();
  }

  function sectionLessons(sectionId) {
    return state.lessons
      .filter(
        lesson => lesson.section_id === sectionId
      )
      .sort(
        (a, b) =>
          num(a.sort_order) -
          num(b.sort_order)
      );
  }

  function lessonAssets(lessonId) {
    return state.assets
      .filter(
        asset => asset.lesson_id === lessonId
      )
      .sort(
        (a, b) =>
          num(a.sort_order) -
          num(b.sort_order)
      );
  }

  function lessonQuiz(lessonId) {
    return state.quizzes.find(
      quiz => quiz.lesson_id === lessonId
    );
  }

  function renderCurriculum() {
    const root = el("courseSections");

    if (!root) return;

    if (!state.courseId) {
      root.innerHTML = `
        <div class="empty-state">
          Save the course before adding sections.
        </div>
      `;
      return;
    }

    if (!state.sections.length) {
      root.innerHTML = `
        <div class="empty-state">
          No sections yet. Add the first section to begin building
          the course.
        </div>
      `;
      return;
    }

    root.innerHTML = state.sections
      .map(section => {
        const lessons =
          sectionLessons(section.id);

        return `
          <section
            class="lms-builder-section"
            data-section-id="${escapeHtml(section.id)}"
          >
            <header class="lms-builder-section-header">

              <div>
                <span class="lms-builder-section-number">
                  Section ${num(section.sort_order) + 1}
                </span>

                <h3>
                  ${escapeHtml(section.title)}
                </h3>

                ${
                  section.description
                    ? `<p>${escapeHtml(section.description)}</p>`
                    : ""
                }

                <span class="lms-builder-status">
                  ${
                    section.is_published
                      ? "Published"
                      : "Draft"
                  }
                </span>
              </div>

              <div class="lms-builder-actions">

                <button
                  type="button"
                  data-action="edit-section"
                  data-id="${escapeHtml(section.id)}"
                >
                  Edit Section
                </button>

                <button
                  type="button"
                  data-action="add-lesson"
                  data-id="${escapeHtml(section.id)}"
                >
                  Add Lesson
                </button>

                <button
                  type="button"
                  data-action="delete-section"
                  data-id="${escapeHtml(section.id)}"
                >
                  Delete
                </button>

              </div>

            </header>

            <div class="lms-builder-section-body">

              ${
                lessons.length
                  ? lessons.map(renderLesson).join("")
                  : `
                    <div class="empty-state">
                      This section has no lessons yet.
                    </div>
                  `
              }

            </div>
          </section>
        `;
      })
      .join("");
  }

  function renderLesson(lesson) {
    const assets =
      lessonAssets(lesson.id);

    const quiz =
      lessonQuiz(lesson.id);

    const type =
      normalizeLessonType(
        lesson.lesson_type
      );

    return `
      <article
        class="lms-builder-lesson"
        data-lesson-id="${escapeHtml(lesson.id)}"
      >

        <div class="lms-builder-lesson-main">

          <div class="lms-builder-lesson-order">
            ${num(lesson.sort_order) + 1}
          </div>

          <div>

            <h4>
              ${escapeHtml(lesson.title)}
            </h4>

            <div class="lms-builder-lesson-meta">
              <span>${escapeHtml(type)}</span>
              <span>
                ${lesson.is_required ? "Required" : "Optional"}
              </span>
              <span>
                ${lesson.is_published ? "Published" : "Draft"}
              </span>
            </div>

            ${
              lesson.description
                ? `
                  <p>
                    ${escapeHtml(
                      lesson.description
                    )}
                  </p>
                `
                : ""
            }

            ${
              lesson.video_url
                ? `
                  <div class="lms-builder-content-chip">
                    Video linked
                  </div>
                `
                : ""
            }

            ${
              assets.length
                ? `
                  <div class="lms-builder-content-chip">
                    ${assets.length}
                    ${
                      assets.length === 1
                        ? "asset"
                        : "assets"
                    }
                  </div>
                `
                : ""
            }

            ${
              quiz
                ? `
                  <div class="lms-builder-content-chip">
                    Quiz
                    ${
                      quiz.is_published
                        ? "published"
                        : "draft"
                    }
                  </div>
                `
                : ""
            }

          </div>

        </div>

        <div class="lms-builder-actions">

          <button
            type="button"
            data-action="edit-lesson"
            data-id="${escapeHtml(lesson.id)}"
          >
            Edit
          </button>

          <button
            type="button"
            data-action="add-asset"
            data-id="${escapeHtml(lesson.id)}"
          >
            Add File / Link
          </button>

          <button
            type="button"
            data-action="edit-quiz"
            data-id="${escapeHtml(lesson.id)}"
          >
            ${
              quiz
                ? "Edit Quiz"
                : "Add Quiz"
            }
          </button>

          <button
            type="button"
            data-action="delete-lesson"
            data-id="${escapeHtml(lesson.id)}"
          >
            Delete
          </button>

        </div>

      </article>
    `;
  }

  async function saveSection(event) {
    event?.preventDefault();

    if (!state.courseId) {
      message(
        "Save the course before adding a section.",
        "error"
      );
      return;
    }

    const title = value("sectionTitle").trim();

    if (!title) {
      message(
        "Section title is required.",
        "error"
      );
      return;
    }

    const sectionId =
      state.editingSectionId ||
      value("sectionId").trim() ||
      null;

    const payload = {
      course_id: state.courseId,
      title,
      description:
        value("sectionDescription").trim() || null,
      sort_order:
        Math.max(
          0,
          num(value("sectionOrder"))
        ),
      is_published:
        checked("sectionPublished")
    };

    try {
      let result;

      if (sectionId) {
        result = await db()
          .from(TABLES.sections)
          .update(payload)
          .eq("id", sectionId)
          .select("*")
          .single();
      } else {
        result = await db()
          .from(TABLES.sections)
          .insert(payload)
          .select("*")
          .single();
      }

      if (result.error) throw result.error;

      showModal("sectionModal", false);
      state.editingSectionId = null;

      message(
        sectionId
          ? "Section saved."
          : "Section created.",
        "success"
      );

      await loadCurriculum();

    } catch (error) {
      console.error(
        "Unable to save section:",
        error
      );

      message(
        error?.message ||
        "Unable to save section.",
        "error"
      );
    }
  }

  function openNewSection() {
    state.editingSectionId = null;

    setValue("sectionId", "");
    setValue(
      "sectionTitle",
      ""
    );
    setValue(
      "sectionDescription",
      ""
    );

    setValue(
      "sectionOrder",
      state.sections.length
    );

    setChecked(
      "sectionPublished",
      false
    );

    showModal("sectionModal");
  }

  function openEditSection(id) {
    const section =
      state.sections.find(
        item => item.id === id
      );

    if (!section) return;

    state.editingSectionId = id;

    setValue("sectionId", section.id);
    setValue("sectionTitle", section.title);
    setValue(
      "sectionDescription",
      section.description
    );
    setValue(
      "sectionOrder",
      section.sort_order
    );
    setChecked(
      "sectionPublished",
      section.is_published
    );

    showModal("sectionModal");
  }

  async function deleteSection(id) {
    const section =
      state.sections.find(
        item => item.id === id
      );

    if (!section) return;

    if (
      !window.confirm(
        `Delete section "${section.title}" and all of its lessons?`
      )
    ) {
      return;
    }

    try {
      const { error } = await db()
        .from(TABLES.sections)
        .delete()
        .eq("id", id);

      if (error) throw error;

      message(
        "Section deleted.",
        "success"
      );

      await loadCurriculum();

    } catch (error) {
      console.error(
        "Unable to delete section:",
        error
      );

      message(
        error?.message ||
        "Unable to delete section.",
        "error"
      );
    }
  }

  async function saveLesson(event) {
    event?.preventDefault();

    if (!state.courseId) {
      message(
        "Save the course first.",
        "error"
      );
      return;
    }

    const title =
      value("lessonTitle").trim();

    if (!title) {
      message(
        "Lesson title is required.",
        "error"
      );
      return;
    }

    const sectionId =
      value("lessonSectionId").trim();

    if (!sectionId) {
      message(
        "A section is required.",
        "error"
      );
      return;
    }

    const lessonId =
      state.editingLessonId ||
      value("lessonId").trim() ||
      null;

    const payload = {
      course_id: state.courseId,
      section_id: sectionId,
      title,
      description:
        value("lessonDescription").trim() ||
        null,
      lesson_type:
        normalizeLessonType(
          value("lessonType")
        ),
      sort_order:
        Math.max(
          0,
          num(value("lessonOrder"))
        ),
      is_required:
        checked("lessonRequired"),
      is_published:
        checked("lessonPublished"),
      content:
        value("lessonContent").trim() ||
        null,
      video_url:
        value("lessonVideoUrl").trim() ||
        null,
      video_duration_seconds:
        num(value("lessonVideoDuration")) ||
        null,
      file_url:
        value("lessonFileUrl").trim() ||
        null
    };

    try {
      let result;

      if (lessonId) {
        result = await db()
          .from(TABLES.lessons)
          .update(payload)
          .eq("id", lessonId)
          .select("*")
          .single();
      } else {
        result = await db()
          .from(TABLES.lessons)
          .insert(payload)
          .select("*")
          .single();
      }

      if (result.error) throw result.error;

      showModal("lessonModal", false);
      state.editingLessonId = null;

      message(
        lessonId
          ? "Lesson saved."
          : "Lesson created.",
        "success"
      );

      await loadCurriculum();

    } catch (error) {
      console.error(
        "Unable to save lesson:",
        error
      );

      message(
        error?.message ||
        "Unable to save lesson.",
        "error"
      );
    }
  }

  function openNewLesson(sectionId) {
    const lessons =
      sectionLessons(sectionId);

    state.editingLessonId = null;

    setValue("lessonId", "");
    setValue(
      "lessonSectionId",
      sectionId
    );
    setValue(
      "lessonTitle",
      ""
    );
    setValue(
      "lessonDescription",
      ""
    );
    setValue(
      "lessonType",
      "content"
    );
    setValue(
      "lessonOrder",
      lessons.length
    );
    setChecked(
      "lessonRequired",
      true
    );
    setChecked(
      "lessonPublished",
      false
    );
    setValue(
      "lessonContent",
      ""
    );
    setValue(
      "lessonVideoUrl",
      ""
    );
    setValue(
      "lessonVideoDuration",
      ""
    );
    setValue(
      "lessonFileUrl",
      ""
    );

    showModal("lessonModal");
  }

  function openEditLesson(id) {
    const lesson =
      state.lessons.find(
        item => item.id === id
      );

    if (!lesson) return;

    state.editingLessonId = id;

    setValue(
      "lessonId",
      lesson.id
    );
    setValue(
      "lessonSectionId",
      lesson.section_id
    );
    setValue(
      "lessonTitle",
      lesson.title
    );
    setValue(
      "lessonDescription",
      lesson.description
    );
    setValue(
      "lessonType",
      normalizeLessonType(
        lesson.lesson_type
      )
    );
    setValue(
      "lessonOrder",
      lesson.sort_order
    );
    setChecked(
      "lessonRequired",
      lesson.is_required
    );
    setChecked(
      "lessonPublished",
      lesson.is_published
    );
    setValue(
      "lessonContent",
      lesson.content
    );
    setValue(
      "lessonVideoUrl",
      lesson.video_url
    );
    setValue(
      "lessonVideoDuration",
      lesson.video_duration_seconds
    );
    setValue(
      "lessonFileUrl",
      lesson.file_url
    );

    showModal("lessonModal");
  }

  async function deleteLesson(id) {
    const lesson =
      state.lessons.find(
        item => item.id === id
      );

    if (!lesson) return;

    if (
      !window.confirm(
        `Delete lesson "${lesson.title}"?`
      )
    ) {
      return;
    }

    try {
      const { error } = await db()
        .from(TABLES.lessons)
        .delete()
        .eq("id", id);

      if (error) throw error;

      message(
        "Lesson deleted.",
        "success"
      );

      await loadCurriculum();

    } catch (error) {
      console.error(
        "Unable to delete lesson:",
        error
      );

      message(
        error?.message ||
        "Unable to delete lesson.",
        "error"
      );
    }
  }

  async function saveAsset(event) {
    event?.preventDefault();

    const lessonId =
      value("assetLessonId").trim();

    if (!lessonId) {
      message(
        "A lesson is required.",
        "error"
      );
      return;
    }

    const title =
      value("assetTitle").trim();

    const assetUrl =
      value("assetUrl").trim();

    const storagePath =
      value("assetStoragePath").trim();

    if (!title) {
      message(
        "Asset title is required.",
        "error"
      );
      return;
    }

    if (!assetUrl && !storagePath) {
      message(
        "Provide an asset URL or storage path.",
        "error"
      );
      return;
    }

    const assetId =
      state.editingAssetId ||
      value("assetId").trim() ||
      null;

    const lesson =
      state.lessons.find(
        item => item.id === lessonId
      );

    const existingAssets =
      lessonAssets(lessonId);

    const payload = {
      course_id: state.courseId,
      lesson_id: lessonId,
      title,
      asset_type:
        value("assetType") || "document",
      url: assetUrl || null,
      storage_path:
        storagePath || null,
      description:
        value("assetDescription").trim() ||
        null,
      is_downloadable:
        checked("assetDownloadable"),
      open_in_new_tab:
        checked("assetOpenNewTab"),
      sort_order:
        assetId
          ? num(
              existingAssets.find(
                item => item.id === assetId
              )?.sort_order
            )
          : existingAssets.length
    };

    try {
      let result;

      if (assetId) {
        result = await db()
          .from(TABLES.assets)
          .update(payload)
          .eq("id", assetId)
          .select("*")
          .single();
      } else {
        result = await db()
          .from(TABLES.assets)
          .insert(payload)
          .select("*")
          .single();
      }

      if (result.error) throw result.error;

      showModal("assetModal", false);
      state.editingAssetId = null;

      message(
        assetId
          ? "Asset saved."
          : "Asset added.",
        "success"
      );

      await loadCurriculum();

    } catch (error) {
      console.error(
        "Unable to save asset:",
        error
      );

      message(
        error?.message ||
        "Unable to save asset.",
        "error"
      );
    }
  }

  function openNewAsset(lessonId) {
    state.editingAssetId = null;

    setValue("assetId", "");
    setValue(
      "assetLessonId",
      lessonId
    );
    setValue(
      "assetTitle",
      ""
    );
    setValue(
      "assetType",
      "document"
    );
    setValue(
      "assetUrl",
      ""
    );
    setValue(
      "assetStoragePath",
      ""
    );
    setValue(
      "assetDescription",
      ""
    );
    setChecked(
      "assetDownloadable",
      true
    );
    setChecked(
      "assetOpenNewTab",
      true
    );

    showModal("assetModal");
  }

  function openEditAsset(id) {
    const asset =
      state.assets.find(
        item => item.id === id
      );

    if (!asset) return;

    state.editingAssetId = id;

    setValue(
      "assetId",
      asset.id
    );
    setValue(
      "assetLessonId",
      asset.lesson_id
    );
    setValue(
      "assetTitle",
      asset.title
    );
    setValue(
      "assetType",
      asset.asset_type
    );
    setValue(
      "assetUrl",
      asset.url
    );
    setValue(
      "assetStoragePath",
      asset.storage_path
    );
    setValue(
      "assetDescription",
      asset.description
    );
    setChecked(
      "assetDownloadable",
      asset.is_downloadable
    );
    setChecked(
      "assetOpenNewTab",
      asset.open_in_new_tab
    );

    showModal("assetModal");
  }

  async function deleteAsset(id) {
    const asset =
      state.assets.find(
        item => item.id === id
      );

    if (!asset) return;

    if (
      !window.confirm(
        `Delete asset "${asset.title}"?`
      )
    ) {
      return;
    }

    try {
      const { error } = await db()
        .from(TABLES.assets)
        .delete()
        .eq("id", id);

      if (error) throw error;

      message(
        "Asset deleted.",
        "success"
      );

      await loadCurriculum();

    } catch (error) {
      console.error(
        "Unable to delete asset:",
        error
      );

      message(
        error?.message ||
        "Unable to delete asset.",
        "error"
      );
    }
  }

  async function saveQuiz(event) {
    event?.preventDefault();

    const lessonId =
      value("quizLessonId").trim();

    if (!lessonId) {
      message(
        "A lesson is required for a quiz.",
        "error"
      );
      return;
    }

    const title =
      value("quizTitle").trim() ||
      "Lesson Quiz";

    const quizId =
      state.editingQuizId ||
      value("quizId").trim() ||
      null;

    const payload = {
      course_id: state.courseId,
      lesson_id: lessonId,
      title,
      description:
        value("quizDescription").trim() ||
        null,
      passing_score:
        Math.min(
          100,
          Math.max(
            0,
            num(
              value("quizPassingScore"),
              80
            )
          )
        ),
      max_attempts:
        Math.max(
          0,
          num(
            value("quizMaxAttempts"),
            0
          )
        ) || null,
      is_published:
        checked("quizPublished")
    };

    try {
      let result;

      if (quizId) {
        result = await db()
          .from(TABLES.quizzes)
          .update(payload)
          .eq("id", quizId)
          .select("*")
          .single();
      } else {
        result = await db()
          .from(TABLES.quizzes)
          .insert(payload)
          .select("*")
          .single();
      }

      if (result.error) throw result.error;

      showModal("quizModal", false);
      state.editingQuizId = null;

      message(
        quizId
          ? "Quiz saved."
          : "Quiz created.",
        "success"
      );

      await loadCurriculum();

    } catch (error) {
      console.error(
        "Unable to save quiz:",
        error
      );

      message(
        error?.message ||
        "Unable to save quiz.",
        "error"
      );
    }
  }

  function openQuiz(lessonId) {
    const quiz =
      lessonQuiz(lessonId);

    state.editingQuizId =
      quiz?.id || null;

    setValue(
      "quizId",
      quiz?.id || ""
    );
    setValue(
      "quizLessonId",
      lessonId
    );
    setValue(
      "quizTitle",
      quiz?.title || "Lesson Quiz"
    );
    setValue(
      "quizDescription",
      quiz?.description || ""
    );
    setValue(
      "quizPassingScore",
      quiz?.passing_score ?? 80
    );
    setValue(
      "quizMaxAttempts",
      quiz?.max_attempts ?? ""
    );
    setChecked(
      "quizPublished",
      quiz?.is_published || false
    );

    showModal("quizModal");
  }

  /*
    Move lessons/sections with simple adjacent ordering.

    This avoids destructive delete/reinsert operations and preserves
    lesson IDs, progress records, quiz attempts, and asset links.
  */

  async function moveSection(id, direction) {
    const index =
      state.sections.findIndex(
        section => section.id === id
      );

    if (index < 0) return;

    const targetIndex =
      index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= state.sections.length
    ) {
      return;
    }

    const current =
      state.sections[index];

    const target =
      state.sections[targetIndex];

    try {
      const currentOrder =
        current.sort_order;

      const targetOrder =
        target.sort_order;

      const first =
        await db()
          .from(TABLES.sections)
          .update({
            sort_order: -999999
          })
          .eq("id", current.id);

      if (first.error) throw first.error;

      const second =
        await db()
          .from(TABLES.sections)
          .update({
            sort_order: currentOrder
          })
          .eq("id", target.id);

      if (second.error) throw second.error;

      const third =
        await db()
          .from(TABLES.sections)
          .update({
            sort_order: targetOrder
          })
          .eq("id", current.id);

      if (third.error) throw third.error;

      await loadCurriculum();

    } catch (error) {
      console.error(
        "Unable to move section:",
        error
      );

      message(
        error?.message ||
        "Unable to move section.",
        "error"
      );
    }
  }

  async function moveLesson(id, direction) {
    const current =
      state.lessons.find(
        lesson => lesson.id === id
      );

    if (!current) return;

    const siblings =
      sectionLessons(
        current.section_id
      );

    const index =
      siblings.findIndex(
        lesson => lesson.id === id
      );

    const targetIndex =
      index + direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= siblings.length
    ) {
      return;
    }

    const target =
      siblings[targetIndex];

    try {
      const currentOrder =
        current.sort_order;

      const targetOrder =
        target.sort_order;

      let result =
        await db()
          .from(TABLES.lessons)
          .update({
            sort_order: -999999
          })
          .eq("id", current.id);

      if (result.error) throw result.error;

      result =
        await db()
          .from(TABLES.lessons)
          .update({
            sort_order: currentOrder
          })
          .eq("id", target.id);

      if (result.error) throw result.error;

      result =
        await db()
          .from(TABLES.lessons)
          .update({
            sort_order: targetOrder
          })
          .eq("id", current.id);

      if (result.error) throw result.error;

      await loadCurriculum();

    } catch (error) {
      console.error(
        "Unable to move lesson:",
        error
      );

      message(
        error?.message ||
        "Unable to move lesson.",
        "error"
      );
    }
  }

  function bindCurriculumActions() {
    const root = el("courseSections");

    if (!root) return;

    root.addEventListener(
      "click",
      async event => {
        const button =
          event.target.closest(
            "[data-action]"
          );

        if (!button) return;

        const action =
          button.dataset.action;

        const id =
          button.dataset.id;

        if (action === "edit-section") {
          openEditSection(id);
          return;
        }

        if (action === "add-lesson") {
          openNewLesson(id);
          return;
        }

        if (action === "delete-section") {
          await deleteSection(id);
          return;
        }

        if (action === "edit-lesson") {
          openEditLesson(id);
          return;
        }

        if (action === "delete-lesson") {
          await deleteLesson(id);
          return;
        }

        if (action === "add-asset") {
          openNewAsset(id);
          return;
        }

        if (action === "edit-asset") {
          openEditAsset(id);
          return;
        }

        if (action === "delete-asset") {
          await deleteAsset(id);
          return;
        }

        if (action === "edit-quiz") {
          openQuiz(id);
          return;
        }

        if (action === "move-section-up") {
          await moveSection(id, -1);
          return;
        }

        if (action === "move-section-down") {
          await moveSection(id, 1);
          return;
        }

        if (action === "move-lesson-up") {
          await moveLesson(id, -1);
          return;
        }

        if (action === "move-lesson-down") {
          await moveLesson(id, 1);
          return;
        }
      }
    );
  }

  function bindModalButtons() {
    el("addSectionButton")
      ?.addEventListener(
        "click",
        openNewSection
      );

    el("saveSectionButton")
      ?.closest("form")
      ?.addEventListener(
        "submit",
        saveSection
      );

    el("saveLessonButton")
      ?.closest("form")
      ?.addEventListener(
        "submit",
        saveLesson
      );

    el("saveAssetButton")
      ?.closest("form")
      ?.addEventListener(
        "submit",
        saveAsset
      );

    el("saveQuizButton")
      ?.closest("form")
      ?.addEventListener(
        "submit",
        saveQuiz
      );

    [
      ["closeSectionModal", "sectionModal"],
      ["closeLessonModal", "lessonModal"],
      ["closeAssetModal", "assetModal"],
      ["closeQuizModal", "quizModal"]
    ].forEach(([buttonId, modalId]) => {
      el(buttonId)?.addEventListener(
        "click",
        () => showModal(modalId, false)
      );
    });

    [
      "sectionModal",
      "lessonModal",
      "assetModal",
      "quizModal"
    ].forEach(modalId => {
      el(modalId)?.addEventListener(
        "click",
        event => {
          if (
            event.target.matches(
              "[data-close-modal]"
            )
          ) {
            showModal(
              modalId,
              false
            );
          }
        }
      );
    });

    document.addEventListener(
      "keydown",
      event => {
        if (event.key === "Escape") {
          closeAllModals();
        }
      }
    );
  }

  function bindCourseForm() {
    const form =
      el("courseForm");

    if (form) {
      form.addEventListener(
        "submit",
        saveCourse
      );
    }

    /*
      Some Step 8 pages use a button instead of a form.
      Supporting both prevents a save-button mismatch.
    */

    el("saveCourseButton")
      ?.addEventListener(
        "click",
        event => {
          if (
            form &&
            event.currentTarget.type === "submit"
          ) {
            return;
          }

          saveCourse(event);
        }
      );
  }

  function bindSlugGenerator() {
    const title =
      el("courseTitle");

    const slug =
      el("courseSlug");

    if (!title || !slug) return;

    title.addEventListener(
      "blur",
      () => {
        if (!slug.value.trim()) {
          slug.value =
            slugify(title.value);
        }
      }
    );
  }

  async function init() {
    try {
      await requireAdminSession();

      state.courseId =
        getCourseIdFromUrl() ||
        value("courseId").trim() ||
        null;

      bindCourseForm();
      bindSlugGenerator();
      bindCurriculumActions();
      bindModalButtons();

      if (state.courseId) {
        await loadCourse();
        await loadCurriculum();
      } else {
        resetBuilder();
      }

    } catch (error) {
      console.error(
        "Unable to initialize LMS course builder:",
        error
      );

      message(
        error?.message ||
        "Unable to initialize the course builder.",
        "error"
      );
    }
  }

  window.Screenings4uLMSBuilder = {
    state,

    loadCourse,
    loadCurriculum,

    saveCourse,
    saveSection,
    saveLesson,
    saveAsset,
    saveQuiz,

    openNewSection,
    openEditSection,
    openNewLesson,
    openEditLesson,
    openNewAsset,
    openEditAsset,
    openQuiz,

    deleteSection,
    deleteLesson,
    deleteAsset,

    moveSection,
    moveLesson,

    renderCurriculum
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