/* =========================================================
   screenings4u LMS — Student My Courses
   ========================================================= */

(() => {
  "use strict";

  const TABLES = {
    enrollments: "lms_enrollments",
    courses: "lms_courses",
    media: "lms_media"
  };

  const state = {
    user: null,
    enrollments: [],
    filtered: [],
    search: ""
  };

  function client() {
    const supabaseClient =
      window.screenings4uSupabase ||
      window.supabaseClient ||
      window.supabase;

    if (!supabaseClient || typeof supabaseClient.from !== "function") {
      throw new Error(
        "Supabase client is not available. Check client-config.js."
      );
    }

    return supabaseClient;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function progressValue(enrollment) {
    return Math.min(
      100,
      Math.max(0, number(enrollment.progress_percent))
    );
  }

  function elements() {
    return {
      root: document.getElementById("lmsStudentCourses"),
      loading: document.getElementById("lmsStudentLoading"),
      empty: document.getElementById("lmsStudentEmpty"),
      error: document.getElementById("lmsStudentError"),
      search: document.getElementById("lmsCourseSearch"),
      summary: document.getElementById("lmsTrainingSummary")
    };
  }

  function show(node, visible) {
    if (node) node.hidden = !visible;
  }

  function formatDate(value) {
    if (!value) return "Not started";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  async function requireUser() {
    const { data, error } = await client().auth.getUser();

    if (error) throw error;

    if (!data?.user) {
      throw new Error(
        "You must be signed in to view your training courses."
      );
    }

    state.user = data.user;
    return data.user;
  }

  async function loadEnrollments() {
    if (!state.user) {
      await requireUser();
    }

    const { data, error } = await client()
      .from(TABLES.enrollments)
      .select(`
        id,
        user_id,
        course_id,
        order_item_id,
        status,
        progress_percent,
        enrolled_at,
        started_at,
        completed_at,
        last_activity_at,
        course:${TABLES.courses}(
          id,
          slug,
          title,
          short_description,
          description,
          thumbnail_media_id,
          status,
          passing_score,
          certificate_enabled,
          video_completion_percent
        )
      `)
      .eq("user_id", state.user.id)
      .in("status", ["active", "completed"])
      .order("last_activity_at", {
        ascending: false,
        nullsFirst: false
      });

    if (error) throw error;

    const enrolled = (data || []).filter(
      enrollment =>
        enrollment.course &&
        enrollment.course.status === "published"
    );

    const mediaIds = [
      ...new Set(
        enrolled
          .map(item => item.course?.thumbnail_media_id)
          .filter(Boolean)
      )
    ];

    let mediaMap = new Map();

    if (mediaIds.length) {
      const { data: media, error: mediaError } = await client()
        .from(TABLES.media)
        .select(`
          id,
          original_filename,
          thumbnail_url,
          playback_url
        `)
        .in("id", mediaIds);

      if (mediaError) {
        console.warn(
          "Unable to load course thumbnails:",
          mediaError
        );
      } else {
        mediaMap = new Map(
          (media || []).map(item => [item.id, item])
        );
      }
    }

    state.enrollments = enrolled.map(enrollment => ({
      ...enrollment,
      thumbnail:
        mediaMap.get(enrollment.course.thumbnail_media_id) || null
    }));

    state.filtered = [...state.enrollments];

    renderSummary();
    renderCourses();

    return state.enrollments;
  }

  function courseStatus(enrollment) {
    if (enrollment.status === "completed") {
      return {
        label: "Completed",
        className: "completed"
      };
    }

    const progress = progressValue(enrollment);

    if (progress <= 0) {
      return {
        label: "Not Started",
        className: "not-started"
      };
    }

    return {
      label: "In Progress",
      className: "in-progress"
    };
  }

  function filterCourses() {
    const query = state.search.trim().toLowerCase();

    if (!query) {
      state.filtered = [...state.enrollments];
      return;
    }

    state.filtered = state.enrollments.filter(enrollment => {
      const course = enrollment.course || {};

      return [
        course.title,
        course.short_description,
        course.description
      ]
        .filter(Boolean)
        .some(value =>
          String(value).toLowerCase().includes(query)
        );
    });
  }

  function courseAction(enrollment) {
    const params = new URLSearchParams({
      course: enrollment.course.id,
      enrollment: enrollment.id
    });

    return `lms-course-player.html?${params.toString()}`;
  }

  function renderSummary() {
    const summary = elements().summary;
    if (!summary) return;

    const total = state.enrollments.length;

    const completed = state.enrollments.filter(
      item => item.status === "completed"
    ).length;

    const inProgress = state.enrollments.filter(
      item =>
        item.status === "active" &&
        progressValue(item) > 0
    ).length;

    const notStarted = state.enrollments.filter(
      item =>
        item.status === "active" &&
        progressValue(item) <= 0
    ).length;

    summary.innerHTML = `
      <article class="lms-summary-card">
        <span>My Courses</span>
        <strong>${total}</strong>
      </article>

      <article class="lms-summary-card">
        <span>In Progress</span>
        <strong>${inProgress}</strong>
      </article>

      <article class="lms-summary-card">
        <span>Not Started</span>
        <strong>${notStarted}</strong>
      </article>

      <article class="lms-summary-card">
        <span>Completed</span>
        <strong>${completed}</strong>
      </article>
    `;
  }

  function renderCourses() {
    const { root, loading, empty } = elements();

    show(loading, false);

    if (!state.filtered.length) {
      root.innerHTML = "";
      show(empty, true);
      return;
    }

    show(empty, false);

    root.innerHTML = state.filtered
      .map(enrollment => {
        const course = enrollment.course;
        const progress = progressValue(enrollment);
        const status = courseStatus(enrollment);
        const action = courseAction(enrollment);
        const thumbnail = enrollment.thumbnail?.thumbnail_url;

        const image = thumbnail
          ? `
            <img
              class="lms-course-card-image"
              src="${esc(thumbnail)}"
              alt=""
              loading="lazy"
            >
          `
          : `
            <div
              class="lms-course-card-image lms-course-card-placeholder"
              aria-hidden="true"
            >
              SCREENINGS4U TRAINING
            </div>
          `;

        const actionLabel =
          progress >= 100
            ? "Review Course"
            : progress > 0
              ? "Continue Course"
              : "Start Course";

        return `
          <article class="lms-course-card">
            ${image}

            <div class="lms-course-card-body">

              <span class="lms-course-card-status ${status.className}">
                ${esc(status.label)}
              </span>

              <h3>${esc(course.title)}</h3>

              <p class="lms-course-card-description">
                ${esc(
                  course.short_description ||
                  course.description ||
                  "Training course"
                )}
              </p>

              <div class="lms-course-progress">
                <div class="lms-course-progress-header">
                  <span>Progress</span>
                  <strong>${progress.toFixed(0)}%</strong>
                </div>

                <div
                  class="lms-course-progress-track"
                  aria-hidden="true"
                >
                  <span style="width:${progress}%"></span>
                </div>
              </div>

              <div class="lms-course-meta">
                <span>
                  ${esc(
                    progress > 0
                      ? `Last activity ${formatDate(enrollment.last_activity_at)}`
                      : `Enrolled ${formatDate(enrollment.enrolled_at)}`
                  )}
                </span>

                ${
                  course.certificate_enabled
                    ? "<span>Certificate</span>"
                    : ""
                }
              </div>

              <div class="lms-course-actions">
                <a
                  class="client-primary-button"
                  href="${esc(action)}"
                >
                  ${actionLabel}
                </a>
              </div>

            </div>
          </article>
        `;
      })
      .join("");
  }

  function setError(message) {
    const { error, loading } = elements();

    if (error) {
      error.textContent = message;
      show(error, true);
    }

    show(loading, false);
  }

  function clearError() {
    const { error } = elements();

    if (error) {
      error.textContent = "";
      show(error, false);
    }
  }

  function bindSearch() {
    const search = elements().search;

    if (!search) return;

    search.addEventListener("input", event => {
      state.search = event.target.value || "";
      filterCourses();
      renderCourses();
    });
  }

  function listenForProgressUpdates() {
    document.addEventListener(
      "screenings4u:lms-progress-updated",
      async () => {
        try {
          await loadEnrollments();
        } catch (error) {
          console.error(
            "Unable to refresh course progress:",
            error
          );
        }
      }
    );

    window.addEventListener("pageshow", () => {
      loadEnrollments().catch(error => {
        console.error(
          "Unable to refresh courses:",
          error
        );
      });
    });
  }

  async function init() {
    const { loading, empty } = elements();

    show(loading, true);
    show(empty, false);
    clearError();

    try {
      await requireUser();
      await loadEnrollments();

      bindSearch();
      listenForProgressUpdates();

    } catch (error) {
      console.error(
        "Unable to load student training:",
        error
      );

      setError(
        error?.message ||
        "We could not load your training courses."
      );
    }
  }

  window.Screenings4uLMSStudent = {
    state,
    init,
    loadEnrollments,
    renderCourses
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
