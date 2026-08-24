
/* screenings4u LMS — Course Player Polish
   Enhancement layer. Load AFTER lms-course-player.js.
   It does not replace the existing player engine.
*/
(() => {
  "use strict";

  const BLUE = "#325aa3";

  const $ = id => document.getElementById(id);

  function getPlayer() {
    return window.Screenings4uLMSPlayer || null;
  }

  function state() {
    const p = getPlayer();
    return p?.state || {};
  }

  function lessons() {
    const s = state();
    if (Array.isArray(s.lessons)) return s.lessons;
    return [];
  }

  function currentLesson() {
    const s = state();
    return s.currentLesson ||
      lessons().find(x =>
        x.id === s.currentLessonId
      ) || null;
  }

  function progressRows() {
    const s = state();
    if (Array.isArray(s.progress)) return s.progress;
    if (s.lessonProgress instanceof Map) return [...s.lessonProgress.values()];
    return [];
  }

  function rowFor(lessonId) {
    return progressRows().find(x => String(x.lesson_id) === String(lessonId)) || null;
  }

  function isComplete(lessonId) {
    const row = rowFor(lessonId);
    return !!row && (Number(row.progress_percent) >= 100 || !!row.completed_at);
  }

  function coursePercent() {
    const list = lessons();
    if (!list.length) return 0;
    const done = list.filter(x => isComplete(x.id)).length;
    return Math.round(done / list.length * 100);
  }

  function currentIndex() {
    const current = currentLesson();
    return current ? lessons().findIndex(x => x.id === current.id) : -1;
  }

  function ensureProgressBar() {
    if (document.querySelector(".s4u-player-progress-wrap")) return;

    const header = document.querySelector(".lms-player-header");
    if (!header) return;

    const wrap = document.createElement("div");
    wrap.className = "s4u-player-progress-wrap";
    wrap.innerHTML = `<div class="s4u-player-progress-bar" id="s4uPlayerProgressBar"></div>`;
    header.appendChild(wrap);
  }

  function ensureMobileToggle() {
    if (document.querySelector(".s4u-mobile-outline-toggle")) return;

    const main = document.querySelector(".lms-player-main");
    const sidebar = $("courseSidebar");
    if (!main || !sidebar) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "s4u-mobile-outline-toggle";
    button.innerHTML = "☰ Course Content";
    button.setAttribute("aria-expanded", "false");

    const first = main.firstElementChild;
    main.insertBefore(button, first || null);

    button.addEventListener("click", () => {
      const open = document.body.classList.toggle("s4u-sidebar-open");
      button.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", e => {
      if (!document.body.classList.contains("s4u-sidebar-open")) return;
      if (e.target.closest(".s4u-mobile-outline-toggle") || e.target.closest("#courseSidebar")) return;
      document.body.classList.remove("s4u-sidebar-open");
      button.setAttribute("aria-expanded", "false");
    });
  }

  function ensureSidebarProgress() {
    const sidebar = $("courseSidebar");
    if (!sidebar || document.querySelector(".s4u-sidebar-progress")) return;

    const heading = sidebar.querySelector(".sidebar-heading");
    if (!heading) return;

    const node = document.createElement("div");
    node.className = "s4u-sidebar-progress";
    node.innerHTML = `
      <div class="s4u-sidebar-progress-top">
        <span>Your progress</span>
        <span id="s4uSidebarProgressText">0%</span>
      </div>
      <div class="s4u-sidebar-progress-track">
        <div class="s4u-sidebar-progress-fill" id="s4uSidebarProgressFill"></div>
      </div>
    `;
    heading.insertAdjacentElement("afterend", node);
  }

  function ensureLessonMeta() {
    const header = document.querySelector(".lesson-header");
    if (!header || $("s4uLessonMeta")) return;

    const meta = document.createElement("div");
    meta.id = "s4uLessonMeta";
    meta.className = "s4u-lesson-meta";
    meta.innerHTML = `
      <span class="s4u-active-meta" id="s4uLessonPosition">Lesson</span>
      <span id="s4uLessonRequiredMeta">Required</span>
    `;

    const description = $("lessonDescription");
    if (description) {
      description.insertAdjacentElement("afterend", meta);
    } else {
      header.appendChild(meta);
    }
  }

  function ensureResumeNotice() {
    const content = $("lessonContent");
    if (!content || $("s4uResumeNotice")) return;

    const node = document.createElement("div");
    node.id = "s4uResumeNotice";
    node.className = "s4u-player-resume";
    node.hidden = true;
    content.insertAdjacentElement("beforebegin", node);
  }

  function updateUI() {
    ensureProgressBar();
    ensureMobileToggle();
    ensureSidebarProgress();
    ensureLessonMeta();
    ensureResumeNotice();

    const percent = coursePercent();

    const bar = $("s4uPlayerProgressBar");
    if (bar) bar.style.width = `${percent}%`;

    const sidebarText = $("s4uSidebarProgressText");
    const sidebarFill = $("s4uSidebarProgressFill");
    if (sidebarText) sidebarText.textContent = `${percent}%`;
    if (sidebarFill) sidebarFill.style.width = `${percent}%`;

    const courseProgress = $("courseProgress");
    if (courseProgress && !courseProgress.textContent.includes("%")) {
      courseProgress.textContent = `${percent}% complete`;
    }

    const current = currentLesson();
    if (!current) return;

    const idx = currentIndex();
    const position = $("s4uLessonPosition");
    if (position) {
      position.textContent = idx >= 0
        ? `Lesson ${idx + 1} of ${lessons().length}`
        : "Current lesson";
    }

    const required = $("s4uLessonRequiredMeta");
    if (required) {
      required.textContent = current.is_required === false ? "Optional" : "Required";
    }

    const status = $("lessonCompletionStatus");
    if (status) {
      const complete = isComplete(current.id);
      status.textContent = complete
        ? "✓ Lesson completed"
        : "Lesson in progress";
      status.classList.toggle("s4u-completion-status-complete", complete);
    }

    const prev = $("previousLessonButton");
    const next = $("nextLessonButton");

    if (prev) {
      const hasPrev = idx > 0;
      prev.disabled = !hasPrev;
      prev.title = hasPrev ? `Previous: ${lessons()[idx - 1].title}` : "First lesson";
    }

    if (next) {
      const hasNext = idx >= 0 && idx < lessons().length - 1;
      next.disabled = !hasNext;
      next.title = hasNext ? `Next: ${lessons()[idx + 1].title}` : "Last lesson";
    }

    updateResume(current);
  }

  function updateResume(current) {
    const notice = $("s4uResumeNotice");
    if (!notice) return;

    const row = rowFor(current.id);
    const seconds = Number(row?.last_position_seconds || 0);

    if (!seconds || seconds < 5 || isComplete(current.id)) {
      notice.hidden = true;
      return;
    }

    notice.hidden = false;
    notice.textContent = `You're resuming this lesson from ${formatTime(seconds)}. Your progress is saved automatically.`;
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    }
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }

  function enhanceVideos() {
    document.querySelectorAll(
      ".student-content-video, #currentLessonVideoPlayer, .lms-player-video-wrapper video"
    ).forEach(video => {
      video.setAttribute("playsinline", "");
      video.setAttribute("preload", "metadata");
    });

    document.querySelectorAll(
      ".student-content-video, .lms-player-video-wrapper iframe"
    ).forEach(node => {
      const parent = node.closest(".student-content-block");
      if (!parent || parent.dataset.s4uVideoEnhanced) return;
      parent.dataset.s4uVideoEnhanced = "true";

      const label = parent.querySelector("h3");
      if (label) label.classList.add("s4u-video-label");
    });
  }

  function enhanceCompleteView() {
    const view = $("courseCompleteView");
    if (!view || view.dataset.s4uEnhanced) return;

    view.dataset.s4uEnhanced = "true";

    const actions = document.createElement("div");
    actions.className = "s4u-course-complete-actions";

    const cert = $("certificateButton");
    if (cert) {
      actions.appendChild(cert);
    }

    const course = state().course;
    const enrollment = state().enrollment;

    const dashboard = document.createElement("a");
    dashboard.className = "player-button secondary";
    dashboard.href = enrollment?.id
      ? `student-dashboard.html?enrollment=${encodeURIComponent(enrollment.id)}`
      : "student-dashboard.html";
    dashboard.textContent = "Back to My Courses";

    const children = [...view.children];
    if (cert) {
      actions.appendChild(dashboard);
      view.appendChild(actions);
    } else {
      actions.appendChild(dashboard);
      view.appendChild(actions);
    }
  }

  function observePlayerChanges() {
    const lessonView = $("lessonView");
    if (!lessonView || lessonView.dataset.s4uObserver) return;

    lessonView.dataset.s4uObserver = "true";

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => {
        updateUI();
        enhanceVideos();
        enhanceCompleteView();
      });
    });

    observer.observe(lessonView, {
      subtree: true,
      childList: true,
      attributes: true
    });
  }

  function bindEvents() {
    document.addEventListener("screenings4u:lms-progress-updated", () => {
      window.setTimeout(updateUI, 50);
    });

    document.addEventListener("screenings4u:lms-lesson-opened", () => {
      document.body.classList.remove("s4u-sidebar-open");
      window.setTimeout(updateUI, 80);
    });

    document.addEventListener("screenings4u:lms-completion-ready", () => {
      window.setTimeout(updateUI, 80);
    });

    document.addEventListener("keydown", e => {
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) return;
      if (e.key === "ArrowLeft") $("previousLessonButton")?.click();
      if (e.key === "ArrowRight") $("nextLessonButton")?.click();
    });

    $("exitCourseButton")?.addEventListener("click", () => {
      const s = state();
      const id = s.enrollment?.id;
      location.href = id
        ? `student-dashboard.html?enrollment=${encodeURIComponent(id)}`
        : "student-dashboard.html";
    });
  }

  function init() {
    ensureProgressBar();
    ensureMobileToggle();
    ensureSidebarProgress();
    ensureLessonMeta();
    ensureResumeNotice();
    bindEvents();
    observePlayerChanges();

    const run = () => {
      updateUI();
      enhanceVideos();
      enhanceCompleteView();
    };

    run();
    window.setTimeout(run, 300);
    window.setTimeout(run, 1000);
  }

  window.Screenings4uLMSPlayerPolish = {
    refresh: updateUI,
    progress: coursePercent,
    currentLesson,
    lessons
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
