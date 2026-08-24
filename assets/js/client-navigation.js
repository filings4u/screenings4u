/**
 * screenings4u — Universal Client Navigation
 * Fixed / polished version
 *
 * Keeps one navigation system across the customer portal.
 */
(function () {
  "use strict";

  const BREAKPOINT = 900;

  const DEFAULT_CONFIG = {
    loginPage: "client-login.html",
    dashboardPage: "client-dashboard.html",
    accountPage: "client-account.html",
    ordersPage: "client-orders.html",
    orderDetailPage: "client-order-detail.html",
    trainingPage: "client-training.html",
    trainingCoursePage: "client-training-course.html",
    trainingPlayerPage: "client-training-player.html",
    certificatesPage: "client-certificates.html",
    websitePage: "index.html"
  };

  function getConfig() {
    return Object.assign({}, DEFAULT_CONFIG, window.SCREENINGS4U_CLIENT_CONFIG || {});
  }

  function initializeClientNavigation() {
    const navigation = document.getElementById("clientNavigation");
    if (!navigation) return;

    // Prevent duplicate event bindings when refreshClientNavigation() is called.
    navigation.innerHTML = getClientNavigationMarkup();

    setActiveNavigationPage();
    initializeMobileNavigation();
    initializeSignOut();
  }

  function icon(name) {
    const icons = {
      dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-8h-6v8Zm0-16v4h6V4h-6Z"/></svg>',
      orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 4v2h8V7H8Zm0 4v2h8v-2H8Zm0 4v2h5v-2H8Z"/></svg>',
      training: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2V5Zm16 0a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2V5ZM7 7h2v2H7V7Zm0 4h2v2H7v-2Zm8-4h2v2h-2V7Zm0 4h2v2h-2v-2Z"/></svg>',
      certificates: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 14.2 5.2l3.1-.1.8 3 2.6 1.7-1.5 2.7.8 3-2.8 1.3-1.1 2.9-3-.7L12 21l-2.1-2-3 .7-1.1-2.9L3 15.5l.8-3-1.5-2.7L4.9 8l.8-3 3.1.1L12 3Zm-1 11.2-2-2-1.4 1.4L11 16l5.4-5.4L15 9.2 11 14.2Z"/></svg>',
      account: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"/></svg>',
      external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6h-2V7.4l-7.3 7.3-1.4-1.4L16.6 6H14V4ZM5 6h5v2H7v9h9v-3h2v5H5V6Z"/></svg>',
      logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4h8a2 2 0 0 1 2 2v3h-2V6h-8v12h8v-3h2v3a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2.3 5.3 1.4 1.4-1.9 1.9H20v2h-8.2l1.9 1.9-1.4 1.4L8 13l4.3-3.7Z"/></svg>'
    };
    return icons[name] || "";
  }

  function navLink(href, page, label, iconName, extraPages) {
    const pages = [page].concat(extraPages || []);
    return `
      <a href="${escapeHtml(href)}"
         class="client-navigation-link"
         data-client-pages="${pages.map(escapeHtml).join("|")}">
        <span class="client-navigation-icon">${icon(iconName)}</span>
        <span class="client-navigation-text">${escapeHtml(label)}</span>
      </a>`;
  }

  function getClientNavigationMarkup() {
    const c = getConfig();

    return `
      <div class="client-navigation-inner">
        <a class="client-logo" href="${escapeHtml(c.dashboardPage)}" aria-label="screenings4u Client Portal">
          <img src="images/logo.png" alt="screenings4u">
          <span class="client-logo-divider" aria-hidden="true"></span>
          <span class="client-logo-portal">CLIENT PORTAL</span>
        </a>

        <button type="button"
                id="clientMobileToggle"
                class="client-mobile-toggle"
                aria-label="Open client menu"
                aria-controls="clientNavigationMenu"
                aria-expanded="false">
          <span class="client-mobile-bars" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>

        <div id="clientNavigationMenu" class="client-navigation-menu">
          <div class="client-navigation-label">CLIENT PORTAL</div>
          ${navLink(c.dashboardPage, c.dashboardPage, "Dashboard", "dashboard")}
          ${navLink(c.ordersPage, c.ordersPage, "My Orders", "orders", [c.orderDetailPage])}
          ${navLink(c.trainingPage, c.trainingPage, "My Training", "training", [c.trainingCoursePage, c.trainingPlayerPage])}
          ${navLink(c.certificatesPage, c.certificatesPage, "Certificates", "certificates")}
          ${navLink(c.accountPage, c.accountPage, "My Account", "account")}
        </div>

        <div class="client-navigation-actions">
          <a href="${escapeHtml(c.websitePage)}" class="client-view-site">
            ${icon("external")}<span>View Website</span>
          </a>
          <button type="button" id="clientSignOutButton" class="client-sign-out">
            ${icon("logout")}<span>Sign Out</span>
          </button>
        </div>
      </div>
    `;
  }

  function normalizePage(value) {
    let page = String(value || "").trim().toLowerCase();
    page = page.split("?")[0].split("#")[0];
    page = page.split("/").pop();
    return page || "client-dashboard.html";
  }

  function setActiveNavigationPage() {
    const currentPage = normalizePage(window.location.pathname);
    const links = document.querySelectorAll(".client-navigation-link");

    links.forEach(link => {
      const pages = String(link.getAttribute("data-client-pages") || "")
        .split("|")
        .map(normalizePage)
        .filter(Boolean);
      link.classList.toggle("active", pages.includes(currentPage));
      if (pages.includes(currentPage)) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function initializeMobileNavigation() {
    const toggle = document.getElementById("clientMobileToggle");
    const menu = document.getElementById("clientNavigationMenu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", function () {
      const open = !menu.classList.contains("client-menu-open");
      menu.classList.toggle("client-menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close client menu" : "Open client menu");
      toggle.classList.toggle("is-open", open);
    });

    menu.querySelectorAll(".client-navigation-link").forEach(link => {
      link.addEventListener("click", closeMobileMenu);
    });

    document.addEventListener("click", function (event) {
      const nav = document.getElementById("clientNavigation");
      if (window.innerWidth <= BREAKPOINT && nav && !nav.contains(event.target)) {
        closeMobileMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMobileMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > BREAKPOINT) closeMobileMenu();
    });
  }

  function closeMobileMenu() {
    const toggle = document.getElementById("clientMobileToggle");
    const menu = document.getElementById("clientNavigationMenu");
    if (menu) menu.classList.remove("client-menu-open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open client menu");
      toggle.classList.remove("is-open");
    }
  }

  async function initializeSignOut() {
    const button = document.getElementById("clientSignOutButton");
    if (!button) return;

    button.addEventListener("click", async function () {
      if (button.disabled) return;
      button.disabled = true;
      button.classList.add("is-loading");
      button.querySelector("span")?.replaceChildren(document.createTextNode("Signing Out…"));

      try {
        if (window.screenings4uSupabase?.auth) {
          await window.screenings4uSupabase.auth.signOut();
        } else if (typeof window.signOutClient === "function") {
          await window.signOutClient();
        } else if (window.supabase?.createClient && window.SCREENINGS4U_SUPABASE_URL && window.SCREENINGS4U_SUPABASE_ANON_KEY) {
          const client = window.supabase.createClient(
            window.SCREENINGS4U_SUPABASE_URL,
            window.SCREENINGS4U_SUPABASE_ANON_KEY
          );
          await client.auth.signOut();
        }
      } catch (error) {
        console.error("Client sign out failed:", error);
      } finally {
        window.location.href = getConfig().loginPage;
      }
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.refreshClientNavigation = initializeClientNavigation;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeClientNavigation, { once: true });
  } else {
    initializeClientNavigation();
  }
})();
