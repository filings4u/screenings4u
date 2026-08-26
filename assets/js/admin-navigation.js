/* =========================================================
   screenings4u ADMIN NAVIGATION
   Shared admin sidebar
   ========================================================= */

(() => {
  "use strict";

  const root = document.getElementById("adminNavigation");
  if (!root) return;

  const CONFIG = {
    dashboard: "admin-dashboard.html",
    login: "admin-login.html",
    website: "index.html",

    storageKey: "screenings4u-admin-sidebar-collapsed"
  };

  /*
   * ONLY TOP-LEVEL ADMIN PAGES BELONG HERE.
   *
   * Internal/detail/builder pages are intentionally excluded.
   */
  const pages = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "admin-dashboard.html",
      icon: "dashboard"
    },
    {
      id: "customers",
      label: "Customers",
      href: "admin-customers.html",
      icon: "customers"
    },
    {
      id: "accounts",
      label: "Accounts",
      href: "admin-accounts.html",
      icon: "accounts"
    },
    {
      id: "orders",
      label: "Orders",
      href: "admin-orders.html",
      icon: "orders"
    },
    {
      id: "dotConsortium",
      label: "DOT Consortium",
      icon: "dot",
      dropdown: true,
      children: [
        { id: "dotOverview", label: "Overview", href: "admin-dot-consortium.html" },
        { id: "dotEmployers", label: "Employers", href: "admin-dot-employers.html" },
        { id: "dotDrivers", label: "Drivers", href: "admin-dot-drivers.html" },
        { id: "dotRandom", label: "Random Selection", href: "admin-dot-random.html" },
        { id: "dotTests", label: "DOT Testing", href: "admin-dot-tests.html" },
        { id: "dotMis", label: "MIS Reports", href: "admin-dot-mis.html" },
        { id: "dotCertificates", label: "Certificates", href: "admin-dot-certificates.html" }
      ]
    },
    {
      id: "training",
      label: "Training",
      icon: "training",
      dropdown: true,
      children: [
        {
          id: "courses",
          label: "Courses",
          href: "admin-lms-courses.html"
        },
        {
          id: "courseManager",
          label: "Course Manager",
          href: "admin-lms-course-manager.html"
        },
        {
          id: "students",
          label: "Students",
          href: "admin-students.html"
        },
        {
          id: "studentProgress",
          label: "Student Progress",
          href: "admin-student-progress.html"
        }
      ]
    },
    {
      id: "audit",
      label: "Audit Log",
      href: "admin-audit.html",
      icon: "audit"
    }
  ];

  const currentPage = normalizePath(window.location.pathname);

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

    dot: `
      <path d="M12 3 4 7l8 4 8-4-8-4z"></path>
      <path d="M6 10v5c1.8 1.5 3.8 2.3 6 2.3s4.2-.8 6-2.3v-5"></path>
      <path d="M20 8v6"></path>
    `,

    students: `
      <circle cx="12" cy="8" r="3"></circle>
      <path d="M5 21c.5-4 2.8-6 7-6s6.5 2 7 6"></path>
    `,

    training: `
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"></path>
      <path d="M4 5.5V21"></path>
      <path d="M8 7h8"></path>
      <path d="M8 11h8"></path>
    `,

    courseManager: `
      <path d="M4 5h16v14H4z"></path>
      <path d="M8 9h8"></path>
      <path d="M8 13h5"></path>
      <path d="m16 15 2 2 3-4"></path>
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

    collapse: `
      <path d="m15 6-6 6 6 6"></path>
    `,

    expand: `
      <path d="m9 6 6 6-6 6"></path>
    `,

    menu: `
      <path d="M4 7h16"></path>
      <path d="M4 12h16"></path>
      <path d="M4 17h16"></path>
    `,

    close: `
      <path d="m6 6 12 12"></path>
      <path d="m18 6-12 12"></path>
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

  function isActive(page) {
    if (page.href) {
      return normalizePath(page.href) === currentPage;
    }

    if (Array.isArray(page.children)) {
      return page.children.some(child =>
        normalizePath(child.href) === currentPage
      );
    }

    return false;
  }

  function isTrainingChildActive(page) {
    return normalizePath(page.href) === currentPage;
  }

  function getCollapsedState() {
    try {
      return localStorage.getItem(CONFIG.storageKey) === "true";
    } catch {
      return false;
    }
  }

  function setCollapsedState(collapsed) {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        String(collapsed)
      );
    } catch {
      /* Local storage is optional. */
    }
  }

  function renderPages() {
    return pages.map(page => {
      const active = isActive(page);

      if (page.dropdown && Array.isArray(page.children)) {
        return `
          <div class="admin-nav-dropdown ${active ? "active" : ""}">
            <button
              type="button"
              class="admin-nav-item admin-nav-dropdown-toggle ${active ? "active" : ""}"
              aria-expanded="${active ? "true" : "false"}"
              aria-controls="adminNavDropdown-${escapeHtml(page.id)}"
            >
              <span class="admin-nav-icon">
                ${icon(page.icon)}
              </span>

              <span class="admin-nav-label">
                ${escapeHtml(page.label)}
              </span>

              <span class="admin-nav-chevron">
                ${icon(active ? "collapse" : "expand")}
              </span>
            </button>

            <div
              class="admin-nav-submenu"
              id="adminNavDropdown-${escapeHtml(page.id)}"
              ${active ? "" : "hidden"}
              style="display: ${active ? "grid" : "none"};"
            >
              ${page.children.map(child => {
                const childActive = isTrainingChildActive(child);

                return `
                  <a
                    href="${escapeHtml(child.href)}"
                    class="admin-nav-subitem ${childActive ? "active" : ""}"
                    ${childActive ? 'aria-current="page"' : ""}
                  >
                    <span class="admin-nav-subitem-dot"></span>
                    <span class="admin-nav-subitem-label">
                      ${escapeHtml(child.label)}
                    </span>
                  </a>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }

      return `
        <a
          href="${escapeHtml(page.href)}"
          class="admin-nav-item ${active ? "active" : ""}"
          ${active ? 'aria-current="page"' : ""}
        >
          <span class="admin-nav-icon">
            ${icon(page.icon)}
          </span>

          <span class="admin-nav-label">
            ${escapeHtml(page.label)}
          </span>
        </a>
      `;
    }).join("");
  }

  function render() {
    const collapsed = getCollapsedState();

    if (collapsed) {
      document.body.classList.add("admin-nav-collapsed");
    } else {
      document.body.classList.remove("admin-nav-collapsed");
    }

    root.innerHTML = `
      <div class="admin-nav-shell">

        <!-- =================================================
             MOBILE BAR
             ================================================= -->

        <div class="admin-nav-mobile-bar">

          <button
            type="button"
            class="admin-nav-mobile-toggle"
            id="adminNavMobileToggle"
            aria-label="Open admin navigation"
            aria-expanded="false"
          >
            ${icon("menu")}
          </button>

          <div class="admin-nav-mobile-brand">
            <img
              src="images/logo.png"
              alt="screenings4u"
            >
            <span>Admin Console</span>
          </div>

        </div>


        <!-- =================================================
             SIDEBAR
             ================================================= -->

        <aside
          class="admin-nav-drawer"
          id="adminNavDrawer"
          aria-label="Admin sidebar"
        >

          <!-- BRAND -->

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
              aria-label="Hide sidebar"
              title="Hide sidebar"
            >
              ${icon("collapse")}
            </button>

          </header>


          <!-- STATUS -->

          <div class="admin-nav-status">
            <span class="admin-nav-status-dot"></span>
            <span>System Online</span>
          </div>


          <!-- NAVIGATION -->

          <nav
            class="admin-nav-groups"
            aria-label="Admin navigation"
          >

            <div class="admin-nav-page-list">
              ${renderPages()}
            </div>

          </nav>


          <!-- FOOTER -->

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

              <span class="admin-nav-footer-label">
                View Website
              </span>

            </a>


            <button
              type="button"
              id="adminSignOutButton"
              class="admin-nav-footer-link admin-signout-button"
            >

              <span class="admin-nav-footer-icon">
                ${icon("logout")}
              </span>

              <span class="admin-nav-footer-label">
                Logout
              </span>

            </button>

          </footer>

        </aside>


        <!-- =================================================
             COLLAPSED SIDEBAR CHAT BUBBLE
             ================================================= -->

        <button
          type="button"
          class="admin-nav-expand-widget"
          id="adminNavExpandWidget"
          aria-label="Show sidebar"
          title="Show sidebar"
        >
          <span class="admin-nav-expand-widget-logo">
            <img src="images/logo.png" alt="">
          </span>
          <span class="admin-nav-expand-widget-icon" aria-hidden="true">
            ${icon("menu")}
          </span>
        </button>


        <!-- =================================================
             MOBILE OVERLAY
             ================================================= -->

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

    /* Hide sidebar */
    const collapse = document.getElementById("adminNavCollapse");
    if (collapse) {
      collapse.addEventListener("click", () => setSidebarCollapsed(true));
    }

    /* Show sidebar chat bubble */
    const expandWidget =
      document.getElementById("adminNavExpandWidget");

    if (expandWidget) {
      expandWidget.addEventListener("click", () => {
        setSidebarCollapsed(false);
      });
    }


    /*
     * Mobile menu
     */
    const mobileToggle =
      document.getElementById("adminNavMobileToggle");

    if (mobileToggle) {
      mobileToggle.addEventListener(
        "click",
        toggleMobile
      );
    }


    /*
     * Mobile overlay
     */
    const overlay =
      document.getElementById("adminNavMobileOverlay");

    if (overlay) {
      overlay.addEventListener(
        "click",
        closeMobile
      );
    }


    /*
     * Training dropdown
     *
     * Rules:
     * 1. Training opens/closes when its header is clicked.
     * 2. Clicking a Training submenu link navigates normally;
     *    the destination page is a Training child, so render()
     *    opens Training again automatically.
     * 3. Clicking any other top-level page closes Training before
     *    navigation. The destination page also renders it closed.
     */
    root
      .querySelectorAll(".admin-nav-dropdown-toggle")
      .forEach(toggle => {
        toggle.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();

          const dropdown = toggle.closest(".admin-nav-dropdown");
          if (!dropdown) return;

          const submenu = dropdown.querySelector(".admin-nav-submenu");
          if (!submenu) return;

          const isOpen = dropdown.classList.contains("open");

          // Close every dropdown first.
          root.querySelectorAll(".admin-nav-dropdown").forEach(item => {
            item.classList.remove("open");

            const itemSubmenu = item.querySelector(".admin-nav-submenu");
            const itemToggle = item.querySelector(".admin-nav-dropdown-toggle");

            if (itemSubmenu) {
              itemSubmenu.hidden = true;
              itemSubmenu.style.display = "none";
            }

            if (itemToggle) {
              itemToggle.setAttribute("aria-expanded", "false");
              const itemChevron = itemToggle.querySelector(".admin-nav-chevron");
              if (itemChevron) itemChevron.innerHTML = icon("expand");
            }
          });

          // If it was closed, open it. If it was already open, leave it closed.
          if (!isOpen) {
            dropdown.classList.add("open");
            submenu.hidden = false;
            submenu.style.display = "grid";
            toggle.setAttribute("aria-expanded", "true");

            const chevron = toggle.querySelector(".admin-nav-chevron");
            if (chevron) chevron.innerHTML = icon("collapse");
          }
        });
      });


    /*
     * Navigation links
     *
     * We don't store the active page.
     * The URL determines the active page.
     *
     * This guarantees that when the administrator
     * navigates to another page, the previous page
     * immediately stops being highlighted.
     */
    root
      .querySelectorAll("a.admin-nav-item, .admin-nav-subitem")
      .forEach(link => {
        link.addEventListener("click", () => {
          closeMobile();

          // Training submenu links intentionally do not close the dropdown.
          // The destination page will reopen Training because it is a child page.
          if (link.classList.contains("admin-nav-subitem")) {
            return;
          }

          // Any other top-level page closes Training before navigation.
          root.querySelectorAll(".admin-nav-dropdown").forEach(item => {
            item.classList.remove("open");

            const submenu = item.querySelector(".admin-nav-submenu");
            const toggle = item.querySelector(".admin-nav-dropdown-toggle");

            if (submenu) {
              submenu.hidden = true;
              submenu.style.display = "none";
            }

            if (toggle) {
              toggle.setAttribute("aria-expanded", "false");
              const chevron = toggle.querySelector(".admin-nav-chevron");
              if (chevron) chevron.innerHTML = icon("expand");
            }
          });
        });
      });


    /*
     * Logout
     */
    const signOut =
      document.getElementById("adminSignOutButton");

    if (signOut) {
      signOut.addEventListener(
        "click",
        signOutAdmin
      );
    }


    /*
     * Keyboard support
     */
    document.addEventListener(
      "keydown",
      handleEscape
    );


    /*
     * Desktop/mobile transition
     */
    window.addEventListener(
      "resize",
      handleResize
    );
  }


  function setSidebarCollapsed(collapsed) {

    document.body.classList.toggle(
      "admin-nav-collapsed",
      collapsed
    );

    setCollapsedState(collapsed);
  }


  function toggleMobile() {

    const open =
      document.body.classList.toggle(
        "admin-nav-mobile-open"
      );

    const button =
      document.getElementById(
        "adminNavMobileToggle"
      );

    if (button) {

      button.setAttribute(
        "aria-expanded",
        String(open)
      );

      button.innerHTML =
        icon(open ? "close" : "menu");

    }
  }


  function closeMobile() {

    document.body.classList.remove(
      "admin-nav-mobile-open"
    );

    const button =
      document.getElementById(
        "adminNavMobileToggle"
      );

    if (button) {

      button.setAttribute(
        "aria-expanded",
        "false"
      );

      button.innerHTML =
        icon("menu");
    }
  }


  function handleEscape(event) {

    if (event.key === "Escape") {
      closeMobile();
    }
  }


  function handleResize() {

    if (window.innerWidth > 900) {
      closeMobile();
    }
  }


  async function signOutAdmin() {

    const button =
      document.getElementById(
        "adminSignOutButton"
      );

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
        let session = null;
        try {
          const sessionResult = await client.auth.getSession();
          session = sessionResult?.data?.session || null;
        } catch {}

        try {
          await client.rpc("write_audit_event", {
            p_action: "logout",
            p_entity_type: "admin_session",
            p_entity_id: session?.user?.id || null,
            p_details: { description: "Administrator signed out" }
          });
        } catch (auditError) {
          console.warn("Unable to write logout audit event:", auditError);
        }

        await client.auth.signOut();
      }

    } catch (error) {

      console.error(
        "Admin sign out failed:",
        error
      );

    } finally {

      window.location.href =
        CONFIG.login;

    }
  }


  /*
   * Public API
   */
  window.Screenings4uAdminNavigation = {
    pages,
    currentPage,
    render,
    setSidebarCollapsed
  };


  render();

})();