/**
 * screenings4u
 * Client Dashboard
 *
 * Location:
 * assets/js/client-dashboard.js
 *
 * Handles:
 * - Client authentication
 * - Customer profile (client_profiles)
 * - Order summary
 * - Recent orders (orders.user_id)
 * - Training enrollments (training_enrollments.user_id)
 * - Training progress
 * - Completed courses
 */

(function () {
  "use strict";

  let supabaseClient = null;
  let currentUser = null;
  let currentProfile = null;

  let orders = [];
  let enrollments = [];
  let certificates = [];


  /* =========================================================
     INITIALIZE
  ========================================================= */

  async function initializeClientDashboard() {

    try {

      supabaseClient = getSupabaseClient();

      if (!supabaseClient) {
        throw new Error(
          "Client portal could not be initialized."
        );
      }

      const authenticated =
        await checkAuthentication();

      if (!authenticated) {
        return;
      }

      await loadDashboardData();

      renderDashboard();

    } catch (error) {

      console.error(
        "Client dashboard initialization error:",
        error
      );

      showToast(
        error.message ||
        "Unable to load your dashboard.",
        "error"
      );

    }

  }


  /* =========================================================
     SUPABASE CLIENT
  ========================================================= */

  function getSupabaseClient() {

    if (window.screenings4uSupabase) {
      return window.screenings4uSupabase;
    }

    if (
      window.supabase &&
      window.SCREENINGS4U_SUPABASE_URL &&
      window.SCREENINGS4U_SUPABASE_ANON_KEY
    ) {

      window.screenings4uSupabase =
        window.supabase.createClient(
          window.SCREENINGS4U_SUPABASE_URL,
          window.SCREENINGS4U_SUPABASE_ANON_KEY
        );

      return window.screenings4uSupabase;
    }

    return null;
  }


  /* =========================================================
     AUTHENTICATION
  ========================================================= */

  async function checkAuthentication() {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (
      !data ||
      !data.session ||
      !data.session.user
    ) {

      window.location.href =
        "client-login.html";

      return false;
    }

    currentUser =
      data.session.user;

    return true;
  }


  /* =========================================================
     LOAD DASHBOARD DATA
  ========================================================= */

  async function loadDashboardData() {

    await loadProfile();
    await loadOrders();
    await loadEnrollments();
    await loadCertificates();

  }


  /* =========================================================
     PROFILE
  ========================================================= */

  async function loadProfile() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("client_profiles")
        .select("*")
        .eq(
          "id",
          currentUser.id
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    currentProfile =
      data || {
        id: currentUser.id,
        email: currentUser.email
      };

  }


  /* =========================================================
     ORDERS
  ========================================================= */

  async function loadOrders() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("orders")
        .select(`
          *,
          order_items (
            *
          )
        `)
        .eq(
          "user_id",
          currentUser.id
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }

    orders =
      Array.isArray(data)
        ? data
        : [];

  }


  /* =========================================================
     TRAINING ENROLLMENTS
  ========================================================= */

  async function loadEnrollments() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("lms_enrollments")
        .select(`
          *,
          course:lms_courses (
            *
          )
        `)
        .eq(
          "user_id",
          currentUser.id
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }

    enrollments =
      Array.isArray(data)
        ? data
        : [];

  }


  /* =========================================================
     CERTIFICATES
  ========================================================= */

  async function loadCertificates() {

    if (!enrollments.length) {
      certificates = [];
      return;
    }

    const enrollmentIds = enrollments
      .map(function (enrollment) {
        return enrollment.id;
      })
      .filter(Boolean);

    if (!enrollmentIds.length) {
      certificates = [];
      return;
    }

    const {
      data,
      error
    } =
      await supabaseClient
        .from("lms_certificates")
        .select("*")
        .in(
          "enrollment_id",
          enrollmentIds
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }

    certificates =
      Array.isArray(data)
        ? data
        : [];

  }

  /* =========================================================
     RENDER DASHBOARD
  ========================================================= */

  function renderDashboard() {

    renderIdentity();
    renderSummary();
    renderActiveTraining();
    renderRecentOrders();
    renderCompletedCourses();

  }


  /* =========================================================
     IDENTITY
  ========================================================= */

  function renderIdentity() {

    const name =
      getCustomerName();


    setText(
      "dashboardWelcome",
      `Welcome back, ${name}.`
    );


    const identity =
      document.getElementById(
        "clientIdentity"
      );


    if (!identity) {
      return;
    }


    identity.innerHTML = `
      <div class="client-identity-avatar">
        ${escapeHtml(
          getInitials(name)
        )}
      </div>

      <div class="client-identity-text">

        <strong>
          ${escapeHtml(name)}
        </strong>

        <span>
          ${escapeHtml(
            currentUser.email ||
            ""
          )}
        </span>

      </div>
    `;

  }


  /* =========================================================
     SUMMARY
  ========================================================= */

  function renderSummary() {

    const activeEnrollments =
      enrollments.filter(
        function (enrollment) {

          return !isEnrollmentComplete(
            enrollment
          );

        }
      );


    const completedEnrollments =
      enrollments.filter(
        function (enrollment) {

          return isEnrollmentComplete(
            enrollment
          );

        }
      );


    setText(
      "summaryOrders",
      orders.length
    );


    setText(
      "summaryTraining",
      activeEnrollments.length
    );


    setText(
      "summaryCompleted",
      completedEnrollments.length
    );


    setText(
      "summaryAccountStatus",
      currentProfile &&
      currentProfile.is_active === false
        ? "Inactive"
        : "Active"
    );

  }


  /* =========================================================
     ACTIVE TRAINING
  ========================================================= */

  function renderActiveTraining() {

    const container =
      document.getElementById(
        "activeTraining"
      );


    if (!container) {
      return;
    }


    const active =
      enrollments.filter(
        function (enrollment) {

          return !isEnrollmentComplete(
            enrollment
          );

        }
      );


    if (!active.length) {

      container.innerHTML = `
        <div class="client-empty-state">
          <strong>No active training courses.</strong>

          <p>
            Purchased training courses will appear here
            when your enrollment is available.
          </p>
        </div>
      `;

      return;
    }


    container.innerHTML =
      active
        .slice(0, 4)
        .map(
          renderTrainingCard
        )
        .join("");

  }


  /* =========================================================
     TRAINING CARD
  ========================================================= */

  function renderTrainingCard(
    enrollment
  ) {

    const course =
      enrollment.course ||
      {};


    const title =
      course.title ||
      enrollment.course_title ||
      "Training Course";


    const progress =
      getEnrollmentProgress(
        enrollment
      );


    const enrollmentId =
      enrollment.id ||
      "";


    return `
      <article class="training-dashboard-card">

        <div class="training-dashboard-card-content">

          <div class="training-dashboard-card-heading">

            <div>

              <p class="eyebrow">
                TRAINING COURSE
              </p>

              <h3>
                ${escapeHtml(title)}
              </h3>

            </div>

            <span class="training-progress-number">
              ${progress}%
            </span>

          </div>


          <div class="training-progress-track">

            <div
              class="training-progress-fill"
              style="width: ${progress}%"
            ></div>

          </div>


          <div class="training-progress-meta">

            <span>
              ${progress}% Complete
            </span>

            <span>
              ${escapeHtml(
                getEnrollmentStatus(
                  enrollment
                )
              )}
            </span>

          </div>

        </div>


        <a
          href="lms-course-player.html?course=${encodeURIComponent(enrollment.course_id)}&enrollment=${encodeURIComponent(
            enrollmentId
          )}"
          class="client-primary-button"
        >
          ${progress > 0
            ? "Continue Training"
            : "Start Training"}
        </a>

      </article>
    `;

  }


  /* =========================================================
     RECENT ORDERS
  ========================================================= */

  function renderRecentOrders() {

    const container =
      document.getElementById(
        "recentOrders"
      );


    if (!container) {
      return;
    }


    const recent =
      orders.slice(0, 5);


    if (!recent.length) {

      container.innerHTML = `
        <div class="client-empty-state">
          <strong>No orders yet.</strong>

          <p>
            Your orders will appear here after you make a purchase.
          </p>
        </div>
      `;

      return;
    }


    container.innerHTML = `
      <table class="client-table">

        <thead>

          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th></th>
          </tr>

        </thead>

        <tbody>

          ${recent
            .map(
              renderOrderRow
            )
            .join("")}

        </tbody>

      </table>
    `;

  }


  /* =========================================================
     ORDER ROW
  ========================================================= */

  function renderOrderRow(
    order
  ) {

    return `
      <tr>

        <td>
          <strong>
            ${escapeHtml(
              getOrderNumber(order)
            )}
          </strong>
        </td>

        <td>
          ${formatDate(
            order.created_at
          )}
        </td>

        <td>
          ${formatCurrency(
            getOrderTotal(order)
          )}
        </td>

        <td>
          ${renderStatusBadge(
            order.payment_status ||
            "pending"
          )}
        </td>

        <td>
          ${renderStatusBadge(
            order.status ||
            order.order_status ||
            "pending"
          )}
        </td>

        <td>

          <a
            href="client-order-detail.html?id=${encodeURIComponent(
              order.id
            )}"
            class="client-table-link"
          >
            View
          </a>

        </td>

      </tr>
    `;

  }


  /* =========================================================
     COMPLETED COURSES
  ========================================================= */

  function renderCompletedCourses() {

    const container =
      document.getElementById(
        "completedCourses"
      );


    if (!container) {
      return;
    }


    const completed =
      enrollments.filter(
        function (enrollment) {

          return isEnrollmentComplete(
            enrollment
          );

        }
      );


    if (!completed.length) {

      container.innerHTML = `
        <div class="client-empty-state">
          <strong>No completed courses yet.</strong>

          <p>
            Completed training and certificates will appear here.
          </p>
        </div>
      `;

      return;
    }


    container.innerHTML =
      completed
        .slice(0, 4)
        .map(
          function (enrollment) {

            const course =
              enrollment.course ||
              {};


            const certificate =
              certificates.find(
                function (item) {

                  return (
                    String(
                      item.enrollment_id ||
                      ""
                    ) ===
                    String(
                      enrollment.id
                    )
                  );

                }
              );


            return `
              <article class="completed-course-card">

                <div>

                  <p class="eyebrow">
                    COMPLETED
                  </p>

                  <h3>
                    ${escapeHtml(
                      course.title ||
                      enrollment.course_title ||
                      "Training Course"
                    )}
                  </h3>

                  <span>
                    Completed
                    ${formatDate(
                      enrollment.completed_at ||
                      enrollment.updated_at
                    )}
                  </span>

                </div>

                ${
                  certificate
                    ? `
                      <a
                        href="lms-certificate.html?enrollment=${encodeURIComponent(enrollment.id)}"
                        class="client-secondary-button"
                      >
                        Certificate
                      </a>
                    `
                    : `
                      <span class="certificate-pending">
                        Certificate Processing
                      </span>
                    `
                }

              </article>
            `;

          }
        )
        .join("");

  }


  /* =========================================================
     ENROLLMENT PROGRESS
  ========================================================= */

  function getEnrollmentProgress(
    enrollment
  ) {

    if (
      enrollment.progress_percent !==
      undefined &&
      enrollment.progress_percent !==
      null
    ) {

      return clampPercent(
        Number(
          enrollment.progress_percent
        )
      );

    }


    if (
      enrollment.progress !==
      undefined &&
      enrollment.progress !==
      null
    ) {

      return clampPercent(
        Number(
          enrollment.progress
        )
      );

    }


    if (
      enrollment.percent_complete !==
      undefined &&
      enrollment.percent_complete !==
      null
    ) {

      return clampPercent(
        Number(
          enrollment.percent_complete
        )
      );

    }


    if (
      isEnrollmentComplete(
        enrollment
      )
    ) {
      return 100;
    }


    return 0;

  }


  /* =========================================================
     ENROLLMENT COMPLETE
  ========================================================= */

  function isEnrollmentComplete(
    enrollment
  ) {

    if (!enrollment) {
      return false;
    }


    if (
      enrollment.completed_at
    ) {
      return true;
    }


    const status =
      String(
        enrollment.status ||
        enrollment.enrollment_status ||
        ""
      ).toLowerCase();


    return (
      status === "completed" ||
      status === "complete"
    );

  }


  /* =========================================================
     ENROLLMENT STATUS
  ========================================================= */

  function getEnrollmentStatus(
    enrollment
  ) {

    if (
      isEnrollmentComplete(
        enrollment
      )
    ) {
      return "Completed";
    }


    const status =
      enrollment.status ||
      enrollment.enrollment_status ||
      "Active";


    return capitalize(
      String(status)
    );

  }


  /* =========================================================
     ORDER HELPERS
  ========================================================= */

  function getOrderNumber(
    order
  ) {

    return (
      order.order_number ||
      order.order_no ||
      order.order_id ||
      order.id ||
      "Order"
    );

  }


  function getOrderTotal(
    order
  ) {

    const value =
      order.total ??
      order.total_amount ??
      order.amount ??
      0;


    const numeric =
      Number(value);


    return Number.isFinite(
      numeric
    )
      ? numeric
      : 0;

  }


  /* =========================================================
     STATUS BADGE
  ========================================================= */

  function renderStatusBadge(
    status
  ) {

    const normalized =
      String(
        status ||
        "pending"
      )
        .toLowerCase()
        .replace(
          /\s+/g,
          "-"
        );


    return `
      <span class="client-status-badge status-${escapeHtml(
        normalized
      )}">
        ${escapeHtml(
          capitalize(
            String(status || "Pending")
          )
        )}
      </span>
    `;

  }


  /* =========================================================
     NAME
  ========================================================= */

  function getCustomerName() {

    if (
      currentProfile &&
      currentProfile.first_name
    ) {

      return [
        currentProfile.first_name,
        currentProfile.last_name
      ]
        .filter(Boolean)
        .join(" ");

    }


    return (
      currentUser &&
      currentUser.email
        ? currentUser.email.split("@")[0]
        : "Client"
    );

  }


  /* =========================================================
     INITIALS
  ========================================================= */

  function getInitials(
    value
  ) {

    if (!value) {
      return "C";
    }


    const parts =
      String(value)
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    if (parts.length === 1) {

      return parts[0]
        .substring(0, 2)
        .toUpperCase();

    }


    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();

  }


  /* =========================================================
     DATE
  ========================================================= */

  function formatDate(
    value
  ) {

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
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );

  }


  /* =========================================================
     CURRENCY
  ========================================================= */

  function formatCurrency(
    value
  ) {

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(
      Number(value) || 0
    );

  }


  /* =========================================================
     PERCENT
  ========================================================= */

  function clampPercent(
    value
  ) {

    if (
      !Number.isFinite(value)
    ) {
      return 0;
    }


    return Math.min(
      100,
      Math.max(
        0,
        Math.round(value)
      )
    );

  }


  /* =========================================================
     TEXT
  ========================================================= */

  function setText(
    id,
    value
  ) {

    const element =
      document.getElementById(id);


    if (element) {

      element.textContent =
        value === null ||
        value === undefined
          ? "—"
          : String(value);

    }

  }


  /* =========================================================
     ESCAPE HTML
  ========================================================= */

  function escapeHtml(
    value
  ) {

    return String(
      value === null ||
      value === undefined
        ? ""
        : value
    )
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


  /* =========================================================
     CAPITALIZE
  ========================================================= */

  function capitalize(
    value
  ) {

    const text =
      String(value || "");


    if (!text) {
      return "";
    }


    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
    );

  }


  /* =========================================================
     TOAST
  ========================================================= */

  function showToast(
    message,
    type
  ) {

    const toast =
      document.getElementById(
        "clientToast"
      );


    if (!toast) {

      console.log(message);

      return;

    }


    toast.textContent =
      message;


    toast.className =
      "client-toast show " +
      (
        type === "error"
          ? "error"
          : "success"
      );


    window.clearTimeout(
      showToast.timeout
    );


    showToast.timeout =
      window.setTimeout(
        function () {

          toast.classList.remove(
            "show"
          );

        },
        4000
      );

  }


  /* =========================================================
     DOM READY
  ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeClientDashboard
    );

  } else {

    initializeClientDashboard();

  }

})();