/* =========================================================
   screenings4u ADMIN NAVIGATION — v2
   Shared navigation for all admin pages
   ========================================================= */

(() => {
  "use strict";

  const root = document.getElementById("adminNavigation");
  if (!root) return;

  const CONFIG = {
    dashboard: "admin-dashboard.html",
    login: "admin-login.html",
    website: "index.html",
    storageKey: "screenings4u-admin-nav-state"
  };

  /*
   * Navigation is intentionally organized around the actual
   * admin/LMS workflow already built:
   *
   * Overview
   * Customers
   * Commerce
   * LMS Content
   * Learners
   * Administration
   *
   * Detail/builder pages remain addressable directly and are
   * automatically associated with their parent section.
   */
  const groups = [
    {
      id: "overview",
      label: "Overview",
      items: [
        {
          label: "Dashboard",
          href: "admin-dashboard.html",
          icon: "dashboard"
        }
      ]
    },

    {
      id: "customers",
      label: "Customers",
      items: [
        {
          label: "Customers",
          href: "admin-customers.html",
          icon: "customers"
        },
        {
          label: "Accounts",
          href: "admin-accounts.html",
          icon: "accounts"
        }
      ]
    },

    {
      id: "commerce",
      label: "Commerce",
      items: [
        {
          label: "Orders",
          href: "admin-orders.html",
          icon: "orders"
        }
      ]
    },

    {
      id: "lms-content",
      label: "LMS Content",
      items: [
        {
          label: "Course Builder",
          href: "admin-lms-course-builder.html",
          icon: "course"
        },
        {
          label: "Lesson Builder",
          href: "admin-lms-lesson-builder.html",
          icon: "lesson"
        },
        {
          label: "Assessment Builder",
          href: "admin-lms-assessment-builder.html",
          icon: "assessment"
        }
      ]
    },

    {
      id: "learners",
      label: "Learners",
      items: [
        {
          label: "Students",
          href: "admin-students.html",
          icon: "students"
        },
        {
          label: "Student Detail",
          href: "admin-student-detail.html",
          icon: "student-detail"
        }
      ]
    },

    {
      id: "administration",
      label: "Administration",
      items: [
        {
          label: "Audit Log",
          href: "admin-audit.html",
          icon: "audit"
        }
      ]
    }
  ];

  const currentPage = normalizePath(window.location.pathname) || CONFIG.dashboard;

  const iconPaths = {
    dashboard: `
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2"></rect>
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2"></rect>
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2"></rect>
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2"></rect>
    `,
    customers: `
      <circle cx="9" cy="8" r="3"></circle>
      <path d="M3.5 20c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5"></path>
      <path d="M16 5.5c1.8.2 3 1.3 3 3s-1.2 2.8-3 3"></path>
      <path d="M17 15c2 .5 3.2 2 3.5 5"></path>
    `,
    accounts: `
      <circle cx="12" cy="8" r="3.2"></circle>
      <path d="M5 21c.5-4.1 2.8-6.5 7-6.5s6.5 2.4 7 6.5"></path>
      <path d="M18.5 4.5v4"></path>
      <path d="M16.5 6.5h4"></path>
    `,
    orders: `
      <path d="M5 4.5h14v15H5z"></path>
      <path d="M8 8h8"></path>
      <path d="M8 12h8"></path>
      <path d="M8 16h5"></path>
    `,
    course: `
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"></path>
      <path d="M4 5.5v16"></path>
      <path d="M8 7h8"></path>
      <path d="M8 11h8"></path>
      <path d="M8 15h6"></path>
    `,
    lesson: `
      <path d="M5 4h14v16H5z"></path>
      <path d="M8 8h8"></path>
      <path d="M8 12h8"></path>
      <path d="M8 16h5"></path>
    `,
    assessment: `
      <rect x="4" y="3" width="16" height="18" rx="2"></rect>
      <path d="m8 9 2 2 4-4"></path>
      <path d="M8 15h8"></path>
    `,
    students: `
      <circle cx="12" cy="8" r="3"></circle>
      <path d="M5 21c.5-4 2.8-6 7-6s6.5 2 7 6"></path>
    `,
    "student-detail": `
      <circle cx="12" cy="8" r="3"></circle>
      <path d="M5 21c.5-4 2.8-6 7-6s6.5 2 7 6"></path>
      <path d="M19 4v4"></path>
      <path d="M17 6h4"></path>
    `,
    audit: `
      <path d="M5 4h14v16H5z"></path>
      <path d="M8 8h8"></path>
      <path d="M8 12h8"></path>
      <path d="M8 16h5"></path>
    `,
    website: `
      <path d="M14 5h5v5"></path>
      <path d="M10 14 19 5"></path>
      <path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"></path>
    `,
    logout: `
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"></path>
      <path d="m14 8 4 4-4 4"></path>
      <path d="M18 12H9"></path>
    `,
    menu: `
      <path d="M4 7h16"></path>
      <path d="M4 12h16"></path>
      <path d="M4 17h16"></path>
    `,
    close: `
      <path d="m6 6 12 12"></path>
      <path d="m18 6-12 12"></path>
    `,
    chevron: `
      <path d="m7 10 5 5 5-5"></path>
    `
  };

  function normalizePath(path) {
    return String(path || "")
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .pop()
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function icon(name, className = "") {
    return `
      <svg
        class="admin-nav-svg ${escapeHtml(className)}"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        ${iconPaths[name] || ""}
      </svg>
    `;
  }

  /*
   * Builder/detail routes can contain query strings. The main
   * navigation page is still the page filename, so:
   * admin-lms-lesson-builder.html?lesson=... remains active.
   */
  function isCurrent(item) {
    return normalizePath(item.href) === currentPage;
  }

  function groupIsActive(group) {
    return group.items.some(isCurrent);
  }

  function getSavedState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch {
      /* Storage is optional. */
    }
  }

  function renderItem(item) {
    const active = isCurrent(item);

    return `
      <a
        href="${escapeHtml(item.href)}"
        class="admin-nav-item ${active ? "active" : ""}"
        ${active ? 'aria-current="page"' : ""}
      >
        <span class="admin-nav-icon">
          ${icon(item.icon)}
        </span>

        <span class="admin-nav-label">
          ${escapeHtml(item.label)}
        </span>
      </a>
    `;
  }

  function renderGroup(group, savedState) {
    const active = groupIsActive(group);

    /*
     * Active sections are always open. Other sections remember
     * the administrator's last open/closed preference.
     */
    const open =
      active ||
      savedState[group.id] === true ||
      (savedState[group.id] === undefined && group.id !== "administration");

    return `
      <section
        class="admin-nav-section ${open ? "open" : ""}"
        data-nav-group="${escapeHtml(group.id)}"
      >
        <button
          type="button"
          class="admin-nav-group-toggle"
          aria-expanded="${open ? "true" : "false"}"
          aria-controls="admin-nav-group-${escapeHtml(group.id)}"
        >
          <span class="admin-nav-group-heading">
            <span class="admin-nav-group-dot" aria-hidden="true"></span>
            <span class="admin-nav-group-label">
              ${escapeHtml(group.label)}
            </span>
          </span>

          <span class="admin-nav-chevron" aria-hidden="true">
            ${icon("chevron")}
          </span>
        </button>

        <div
          id="admin-nav-group-${escapeHtml(group.id)}"
          class="admin-nav-group-items"
          ${open ? "" : "hidden"}
        >
          ${group.items.map(renderItem).join("")}
        </div>
      </section>
    `;
  }

  function render() {
    const savedState = getSavedState();

    root.innerHTML = `
      <div class="admin-nav-shell">

        <div class="admin-nav-mobile-bar">
          <button
            type="button"
            class="admin-nav-mobile-toggle"
            id="adminNavMobileToggle"
            aria-label="Open admin navigation"
            aria-expanded="false"
            aria-controls="adminNavDrawer"
          >
            ${icon("menu")}
          </button>

          <span class="admin-nav-mobile-title">Admin Console</span>
        </div>

        <aside
          class="admin-nav-drawer"
          id="adminNavDrawer"
          aria-label="Admin sidebar"
        >
          <header class="admin-nav-brand">

            <a
              href="${escapeHtml(CONFIG.dashboard)}"
              class="admin-nav-brand-link"
              aria-label="screenings4u Admin Dashboard"
            >
              <span class="admin-nav-brand-logo">
                <img
                  src="images/logo.png"
                  alt="screenings4u"
                  class="admin-nav-logo"
                >
              </span>

              <span class="admin-nav-brand-copy">
                <strong>ADMIN CONSOLE</strong>
                <small>Operations & LMS</small>
              </span>
            </a>

            <button
              type="button"
              class="admin-nav-collapse"
              id="adminNavCollapse"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              ${icon("chevron")}
            </button>
          </header>

          <div class="admin-nav-status">
            <span class="admin-nav-status-dot"></span>
            <span>System Online</span>
          </div>

          <nav
            class="admin-nav-groups"
            aria-label="Admin navigation"
          >
            ${groups.map(group => renderGroup(group, savedState)).join("")}
          </nav>

          <footer class="admin-nav-footer">

            <a
              href="${escapeHtml(CONFIG.website)}"
              class="admin-nav-footer-link"
              target="_blank"
              rel="noopener"
            >
              <span class="admin-nav-footer-icon">
                ${icon("website")}
              </span>
              <span class="admin-nav-footer-label">View Website</span>
            </a>

            <button
              type="button"
              id="adminSignOutButton"
              class="admin-nav-footer-link admin-signout-button"
            >
              <span class="admin-nav-footer-icon">
                ${icon("logout")}
              </span>
              <span class="admin-nav-footer-label">Sign Out</span>
            </button>

          </footer>
        </aside>

        <div
          class="admin-nav-mobile-overlay"
          id="adminNavMobileOverlay"
          aria-hidden="true"
        ></div>

      </div>
    `;

    bind();
  }

  function bind() {
    const savedState = getSavedState();

    root.querySelectorAll(".admin-nav-group-toggle").forEach(toggle => {
      toggle.addEventListener("click", () => {
        const section = toggle.closest(".admin-nav-section");
        if (!section) return;

        const groupId = section.dataset.navGroup;
        const items = section.querySelector(".admin-nav-group-items");
        if (!items) return;

        const nextOpen = !section.classList.contains("open");

        section.classList.toggle("open", nextOpen);
        toggle.setAttribute("aria-expanded", String(nextOpen));
        items.hidden = !nextOpen;

        savedState[groupId] = nextOpen;
        saveState(savedState);
      });
    });

    root.querySelectorAll(".admin-nav-item").forEach(link => {
      link.addEventListener("click", () => {
        closeMobile();
      });
    });

    const collapse = document.getElementById("adminNavCollapse");
    if (collapse) {
      collapse.addEventListener("click", () => {
        document.body.classList.toggle("admin-nav-collapsed");
        collapse.setAttribute(
          "aria-label",
          document.body.classList.contains("admin-nav-collapsed")
            ? "Expand sidebar"
            : "Collapse sidebar"
        );
      });
    }

    const mobileToggle = document.getElementById("adminNavMobileToggle");
    if (mobileToggle) {
      mobileToggle.addEventListener("click", toggleMobile);
    }

    const overlay = document.getElementById("adminNavMobileOverlay");
    if (overlay) {
      overlay.addEventListener("click", closeMobile);
    }

    const signOut = document.getElementById("adminSignOutButton");
    if (signOut) {
      signOut.addEventListener("click", signOutAdmin);
    }

    document.addEventListener("keydown", handleEscape);

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) {
        closeMobile();
      }
    });
  }

  function toggleMobile() {
    const open = document.body.classList.toggle("admin-nav-mobile-open");
    const button = document.getElementById("adminNavMobileToggle");

    if (button) {
      button.setAttribute("aria-expanded", String(open));
      button.innerHTML = icon(open ? "close" : "menu");
    }
  }

  function closeMobile() {
    document.body.classList.remove("admin-nav-mobile-open");

    const button = document.getElementById("adminNavMobileToggle");
    if (button) {
      button.setAttribute("aria-expanded", "false");
      button.innerHTML = icon("menu");
    }
  }

  function handleEscape(event) {
    if (event.key === "Escape") {
      closeMobile();
    }
  }

  async function signOutAdmin() {
    const button = document.getElementById("adminSignOutButton");
    if (!button) return;

    button.disabled = true;
    button.classList.add("is-loading");

    try {
      const client =
        window.screenings4uSupabase ||
        window.supabaseClient ||
        window.supabase;

      if (
        client &&
        client.auth &&
        typeof client.auth.signOut === "function"
      ) {
        await client.auth.signOut();
      }
    } catch (error) {
      console.error("Admin sign out failed:", error);
    } finally {
      window.location.href = CONFIG.login;
    }
  }

  window.Screenings4uAdminNavigation = {
    groups,
    currentPage,
    render
  };

  render();
})();
