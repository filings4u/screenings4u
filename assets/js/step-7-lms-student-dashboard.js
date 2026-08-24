/* =========================================================
   screenings4u LMS — Step 7
   Customer Training Dashboard
   =========================================================

   PURPOSE
   -------
   This script powers the customer-facing LMS dashboard.

   The dashboard does NOT display the entire training catalog.

   It displays only courses for which the signed-in customer has
   an active LMS enrollment.

   Source of access:
       lms_enrollments.user_id
       +
       lms_enrollments.course_id

   Course information:
       lms_courses

   This keeps training access separate from the general website
   product catalog while still allowing purchases to create LMS
   enrollments through Step 6.
*/

(() => {
  "use strict";

  const TABLES = {
    enrollments: "lms_enrollments",
    courses: "lms_courses"
  };

  const state = {
    user: null,
    enrollments: [],
    filtered: [],
    search: ""
  };

  function client() {
    const supabaseClient =
      window.supabaseClient ||
      window.supabase;

    if (!supabaseClient || typeof supabaseClient.from !== "function") {
      throw new Error(
        "Supabase client is not available. Load admin/site configuration before this script."
      );
    }

    return supabaseClient;
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
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getElements() {
    return {
      root: document.getElementById("lmsStudentCourses"),
      loading: document.getElementById("lmsStudentLoading"),
      empty: document.getElementById("lmsStudentEmpty"),
      error: document.getElementById("lmsStudentError"),
      search: document.getElementById("lmsCourseSearch"),
      summary: document.getElementById("lmsTrainingSummary")
    };
  }

  function show(element, visible) {
    if (!element) return;
    element.hidden = !visible;
  }

  function setError(message) {
    const elements = getElements();

    if (elements.error) {
      elements.error.textContent = message;
      show(elements.error, true);
    }

    show(elements.loading, false);
  }

  function clearError() {
    const elements = getElements();

    if (elements.error) {
      elements.error.textContent = "";
      show(elements.error, false);
    }
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
          passing_score,
          certificate_enabled,
          status
        )
      `)
      .eq("user_id", state.user.id)
      .in("status", ["active", "completed"])
      .order("last_activity_at", {
        ascending: false,
        nullsFirst: false
      });

    if (error) throw error;

    state.enrollments = (data || []).filter(
      enrollment => enrollment.course
    );

    state.filtered = [...state.enrollments];

    return state.enrollments;
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

  function progressValue(enrollment) {
    return Math.min(
      100,
      Math.max(
        0,
        number(enrollment.progress_percent)
      )
    );
  }

  function courseStatus(enrollment) {
    if (enrollment.status === "completed") {
      return "Completed";
    }

    const progress = progressValue(enrollment);

    if (progress <= 0) {
      return "Not Started";
    }

    return "In Progress";
  }

  function courseAction(enrollment) {
    const course = enrollment.course || {};

    /*
      The player URL intentionally uses the enrollment/course ID
      rather than trusting a title.
    */

    const params = new URLSearchParams({
      course: course.id,
      enrollment: enrollment.id
    });

    return `lms-course-player.html?${params.toString()}`;
  }

  function renderSummary() {
    const elements = getElements();

    if (!elements.summary) return;

    const total = state.enrollments.length;

    const completed = state.enrollments.filter(
      enrollment => enrollment.status === "completed"
    ).length;

    const inProgress = state.enrollments.filter(
      enrollment =>
        enrollment.status === "active" &&
        progressValue(enrollment) > 0
    ).length;

    const notStarted = state.enrollments.filter(
      enrollment =>
        enrollment.status === "active" &&
        progressValue(enrollment) <= 0
    ).length;

    elements.summary.innerHTML = `
      <div class="lms-summary-card">
        <span>My Courses</span>
        <strong>${total}</strong>
      </div>

      <div class="lms-summary-card">
        <span>In Progress</span>
        <strong>${inProgress}</strong>
      </div>

      <div class="lms-summary-card">
        <span>Not Started</span>
        <strong>${notStarted}</strong>
      </div>

      <div class="lms-summary-card">
        <span>Completed</span>
        <strong>${completed}</strong>
      </div>
    `;
  }

  function renderCourses() {
    const elements = getElements();

    if (!elements.root) {
      throw new Error(
        "Missing #lmsStudentCourses element."
      );
    }

    show(elements.loading, false);
    clearError();

    if (!state.filtered.length) {
      elements.root.innerHTML = "";
      show(elements.empty, true);
      return;
    }

    show(elements.empty, false);

    elements.root.innerHTML = state.filtered
      .map(enrollment => {
        const course = enrollment.course;
        const progress = progressValue(enrollment);
        const status = courseStatus(enrollment);
        const action = courseAction(enrollment);

        const image = `
          <div
            class="lms-course-card-image lms-course-card-placeholder"
            aria-hidden="true"
          >
            TRAINING
          </div>
        `;

        return `
          <article
            class="lms-course-card"
            data-enrollment-id="${escapeHtml(enrollment.id)}"
          >
            ${image}

            <div class="lms-course-card-body">
              <div class="lms-course-card-status">
                ${escapeHtml(status)}
              </div>

              <h3>
                ${escapeHtml(course.title)}
              </h3>

              ${
                course.short_description
                  ? `<p>${escapeHtml(course.short_description)}</p>`
                  : ""
              }

              <div class="lms-course-progress">
                <div class="lms-course-progress-header">
                  <span>Progress</span>
                  <strong>${progress}%</strong>
                </div>

                <div
                  class="lms-course-progress-track"
                  aria-hidden="true"
                >
                  <span style="width:${progress}%"></span>
                </div>
              </div>

              <a
                class="primary-button lms-course-open"
                href="${escapeHtml(action)}"
              >
                ${
                  progress >= 100
                    ? "Review Course"
                    : progress > 0
                      ? "Continue Course"
                      : "Start Course"
                }
              </a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function bindSearch() {
    const elements = getElements();

    if (!elements.search) return;

    elements.search.addEventListener("input", event => {
      state.search = event.target.value || "";
      filterCourses();
      renderCourses();
    });
  }

  function listenForProgressUpdates() {
    /*
      The course player can dispatch this event after saving progress.
      Reloading here keeps the dashboard current when the customer
      returns from the player.
    */

    document.addEventListener(
      "screenings4u:lms-progress-updated",
      async () => {
        try {
          await loadEnrollments();
          renderSummary();
          filterCourses();
          renderCourses();
        } catch (error) {
          console.error(
            "Unable to refresh LMS progress:",
            error
          );
        }
      }
    );
  }

  async function init() {
    const elements = getElements();

    show(elements.loading, true);
    show(elements.empty, false);
    clearError();

    try {
      await requireUser();
      await loadEnrollments();

      renderSummary();
      filterCourses();
      renderCourses();

      bindSearch();
      listenForProgressUpdates();

    } catch (error) {
      console.error(
        "Unable to load customer training:",
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