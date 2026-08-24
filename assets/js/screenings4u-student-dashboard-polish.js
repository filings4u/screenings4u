
/* =========================================================
   screenings4u LMS — Student Dashboard Polish
   Enhancement layer for Step 7.
   Load AFTER step-7-lms-dashboard-wired.js.
   ========================================================= */

(() => {
  "use strict";

  const BLUE = "#325aa3";

  const $ = id => document.getElementById(id);

  function dashboard() {
    return window.Screenings4uLMSStudent || null;
  }

  function enrollments() {
    return dashboard()?.state?.enrollments || [];
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function percent(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month:"short",
      day:"numeric",
      year:"numeric"
    });
  }

  function courseStatus(enrollment) {
    if (enrollment.status === "completed") return "Completed";
    const p = percent(enrollment.progress_percent);
    return p > 0 ? "In Progress" : "Not Started";
  }

  function addHero() {
    if (document.querySelector(".s4u-dashboard-hero")) return;

    const main = document.querySelector(".client-main");
    const header = document.querySelector(".client-header");
    if (!main || !header) return;

    const hero = document.createElement("section");
    hero.className = "s4u-dashboard-hero";
    hero.innerHTML = `
      <p class="eyebrow">TRAINING PORTAL</p>
      <h1>My Training</h1>
      <p>Access your purchased training courses, track your progress, and continue exactly where you left off.</p>
      <div class="s4u-dashboard-hero-actions">
        <a class="s4u-dashboard-button primary" href="#my-courses">View My Courses</a>
        <a class="s4u-dashboard-button secondary" href="client-dashboard.html">← My Dashboard</a>
      </div>
    `;

    header.replaceWith(hero);
  }

  function addToolbar() {
    if (document.querySelector(".s4u-dashboard-toolbar")) return;

    const root = $("lmsStudentCourses");
    if (!root) return;

    const section = root.closest("section") || root.parentElement;
    if (!section) return;

    section.id = "my-courses";
    section.classList.add("s4u-dashboard-section");

    const toolbar = document.createElement("div");
    toolbar.className = "s4u-dashboard-toolbar";
    toolbar.innerHTML = `
      <div class="s4u-dashboard-toolbar-copy">
        <p class="eyebrow">MY COURSES</p>
        <h2>Training Courses</h2>
      </div>
      <div class="s4u-dashboard-search">
        <input
          id="s4uDashboardSearchProxy"
          type="search"
          placeholder="Search your courses..."
          autocomplete="off"
        >
      </div>
    `;

    root.parentElement.insertBefore(toolbar, root);

    const proxy = $("s4uDashboardSearchProxy");
    const original = $("lmsCourseSearch");

    if (original) {
      original.style.display = "none";

      proxy.addEventListener("input", e => {
        original.value = e.target.value;
        original.dispatchEvent(new Event("input", { bubbles:true }));
      });
    }
  }

  function polishSummary() {
    const summary = $("lmsTrainingSummary");
    if (!summary) return;

    summary.setAttribute("aria-label", "Training summary");
  }

  function enrichCards() {
    const rows = enrollments();
    const byId = new Map(rows.map(x => [String(x.id), x]));

    document.querySelectorAll(".lms-course-card").forEach(card => {
      const id = card.dataset.enrollmentId;
      const enrollment = byId.get(String(id));
      if (!enrollment) return;

      const course = enrollment.course || {};
      const status = courseStatus(enrollment);
      card.dataset.status = status.toLowerCase().replace(/\s+/g, "-");

      const body = card.querySelector(".lms-course-card-body");
      if (!body) return;

      let meta = body.querySelector(".s4u-course-meta");

      if (!meta) {
        meta = document.createElement("div");
        meta.className = "s4u-course-meta";

        const enrolled = formatDate(enrollment.enrolled_at);
        const lastActivity = formatDate(enrollment.last_activity_at);

        if (enrolled) {
          const span = document.createElement("span");
          span.textContent = `Enrolled ${enrolled}`;
          meta.appendChild(span);
        }

        if (lastActivity) {
          const span = document.createElement("span");
          span.textContent = `Last activity ${lastActivity}`;
          meta.appendChild(span);
        }

        if (enrollment.status === "completed" &&
            course.certificate_enabled) {
          const span = document.createElement("span");
          span.className = "s4u-course-certificate";
          span.textContent = "Certificate eligible";
          meta.appendChild(span);
        }

        const progress = percent(enrollment.progress_percent);
        if (progress > 0 && progress < 100) {
          const span = document.createElement("span");
          span.textContent = `${progress}% complete`;
          meta.appendChild(span);
        }

        const button = body.querySelector(".lms-course-open");
        if (button) {
          button.classList.add("s4u-course-open");
          button.parentElement.insertBefore(meta, button);
        } else {
          body.appendChild(meta);
        }
      }

      const button = body.querySelector(".lms-course-open");
      if (button) {
        button.classList.add("s4u-course-open");

        if (status === "Completed") {
          button.textContent = "Review Course";
        } else if (status === "In Progress") {
          button.textContent = "Continue Course";
        } else {
          button.textContent = "Start Course";
        }
      }
    });
  }

  function improveEmptyState() {
    const empty = $("lmsStudentEmpty");
    if (!empty || empty.dataset.s4uPolished) return;

    empty.dataset.s4uPolished = "true";
    empty.classList.add("s4u-dashboard-empty");

    if (!empty.textContent.trim()) {
      empty.innerHTML = `
        <strong>No training courses yet.</strong>
        <p>Purchased training courses will appear here once your enrollment is available.</p>
      `;
    }
  }

  function improveError() {
    const error = $("lmsStudentError");
    if (!error || error.dataset.s4uPolished) return;
    error.dataset.s4uPolished = "true";
    error.classList.add("s4u-dashboard-error");
  }

  function observeCourses() {
    const root = $("lmsStudentCourses");
    if (!root || root.dataset.s4uObserver) return;

    root.dataset.s4uObserver = "true";

    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        enrichCards();
        improveEmptyState();
        improveError();
      });
    });

    observer.observe(root, {
      childList:true,
      subtree:true
    });
  }

  function init() {
    addHero();
    addToolbar();
    polishSummary();
    observeCourses();

    const refresh = () => {
      polishSummary();
      enrichCards();
      improveEmptyState();
      improveError();
    };

    refresh();
    setTimeout(refresh, 300);
    setTimeout(refresh, 1000);

    document.addEventListener(
      "screenings4u:lms-progress-updated",
      () => setTimeout(refresh, 100)
    );
  }

  window.Screenings4uLMSDashboardPolish = {
    refresh: () => {
      addHero();
      addToolbar();
      polishSummary();
      enrichCards();
      improveEmptyState();
      improveError();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();
