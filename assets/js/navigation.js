/**
 * screenings4u — Universal Marketing Navigation
 *
 * Public marketing site only.
 * Customer and employer account access uses portal.screenings4u.com.
 * Admin access remains in the footer.
 */

document.addEventListener("DOMContentLoaded", initializeUniversalNavigation);

function initializeUniversalNavigation() {
  const target = document.getElementById("mainNav");

  if (!target) return;

  target.innerHTML = getNavigationMarkup();

  injectNavigationStyles();
  initializeNavigationBehavior();
  initializeScrollToTop();
}

function getNavigationMarkup() {
  return `
    <div class="nav-item">
      <a class="nav-link" href="index.html">Home</a>
    </div>

    <div class="nav-item">
      <a class="nav-link" href="services.html">Services</a>
    </div>

    <div class="nav-item">
      <a class="nav-link" href="dot-services.html">
        DOT & Transportation <span class="chevron">▼</span>
      </a>

      <div class="dropdown">
        <a href="dot-services.html">DOT Services</a>
        <a href="dot-urine-drug-tests.html">DOT Drug Testing</a>
        <a href="dot-breathalyzer-services.html">DOT Alcohol Testing</a>
        <a href="dot-physical-exam-services.html">DOT Physicals</a>
        <a href="new-entrant-audit.html">New Entrant Audit</a>
      </div>
    </div>

    <div class="nav-item">
      <a class="nav-link" href="business-services.html">
        Employers <span class="chevron">▼</span>
      </a>

      <div class="dropdown">
        <a href="business-services.html">Business Services</a>
        <a href="consulting-services.html">Consulting Services</a>
        <a href="mobile-drug-and-alcohol-testing.html">Mobile Testing</a>
        <a href="background-checks.html">Background Checks</a>
        <a href="drug-alcohol-policy-creation.html">Drug & Alcohol Policy</a>
        <a href="new-entrant-audit.html">New Entrant Audit</a>
      </div>
    </div>

    <div class="nav-item">
      <a class="nav-link" href="personal-drug-and-alcohol-testing.html">
        Personal <span class="chevron">▼</span>
      </a>

      <div class="dropdown">
        <a href="personal-drug-and-alcohol-testing.html">
          Personal Drug & Alcohol Testing
        </a>
        <a href="court-ordered-etg-drug-and-alcohol-testing.html">
          Court-Ordered Testing
        </a>
        <a href="dna-tests-chicago-il.html">
          DNA Tests — Chicago, IL
        </a>
        <a href="non-dot-breathalyzer-services.html">
          NON-DOT Breathalyzer
        </a>
        <a href="nursing-school-drug-tests.html">
          Nursing School Drug Tests
        </a>
      </div>
    </div>

    <div class="nav-item">
      <a class="nav-link" href="dot-specimen-collector-training.html">
        Training <span class="chevron">▼</span>
      </a>

      <div class="dropdown">
        <a href="dot-specimen-collector-training.html">
          DOT Specimen Collector Training
        </a>
        <a href="dot-specimen-collector-training-group-training.html">
          Group Training
        </a>
      </div>
    </div>

    <div class="nav-item">
      <a class="nav-link" href="industries-served.html">Industries</a>
    </div>

    <div class="nav-item">
      <a class="nav-link" href="/resources">
        Resources <span class="chevron">▼</span>
      </a>

      <div class="dropdown">
        <a href="join-our-collector-network.html">
          Collector Network
        </a>

        <a href="contact.html">
          Contact Us
        </a>

        <a href="about-us.html">
          About Us
        </a>

        <a href="house-lab-account-setup.html">
          Lab Accounts
        </a>

        <a href="become-a-clearinghouse-consortium-third-party-administrator.html">
          Become a C/TPA
        </a>

        <!-- <a href="/affiliate">
          Affiliate Program
        </a> -->

        <!-- <a href="/education">
        Education
        </a> -->

        <!-- <a href="/client-stories">
          Client Stories
        </a> -->

       <!-- <a href="start-a-mobile-drug-testing-business.html">
          Mobile Drug Test Business
        </a> -->

        <!-- <a href="/start-a-drug-testing-business">
          Drug Test Business
        </a> -->
      </div>
    </div>
  `;
}

function injectNavigationStyles() {
  if (document.getElementById("screenings4u-nav-styles")) return;

  const style = document.createElement("style");

  style.id = "screenings4u-nav-styles";

  style.textContent = `
    .nav-account-menu {
      position: relative;
    }

    .nav-login {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 48px;
      padding: 0 20px;
      border: 1px solid #325aa3;
      border-radius: 8px;
      background: #325aa3;
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 800;
      text-decoration: none;
      white-space: nowrap;
      transition:
        background .2s ease,
        border-color .2s ease,
        transform .2s ease;
    }

    .nav-login:hover,
    .nav-account-menu.open .nav-login {
      background: #24467f;
      border-color: #24467f;
      transform: translateY(-1px);
    }

    .nav-login-chevron {
      font-size: 9px;
      transition: transform .2s ease;
    }

    .nav-account-menu.open .nav-login-chevron {
      transform: rotate(180deg);
    }

    .nav-account-dropdown {
      position: absolute;
      top: calc(100% + 9px);
      right: 0;
      min-width: 205px;
      padding: 8px;
      background: #ffffff;
      border: 1px solid #d9e3f0;
      border-radius: 12px;
      box-shadow: 0 18px 45px rgba(23, 51, 95, .14);
      opacity: 0;
      visibility: hidden;
      transform: translateY(6px);
      transition:
        opacity .18s ease,
        visibility .18s ease,
        transform .18s ease;
      z-index: 1200;
    }

    .nav-account-menu:hover .nav-account-dropdown,
    .nav-account-menu:focus-within .nav-account-dropdown,
    .nav-account-menu.open .nav-account-dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .nav-account-dropdown a {
      display: block;
      padding: 11px 12px;
      border-radius: 8px;
      color: #334d70;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition:
        background .18s ease,
        color .18s ease;
    }

    .nav-account-dropdown a:hover {
      background: #f4f7fc;
      color: #325aa3;
    }

    /* Resources dropdown can contain more links. */
    .nav-item .dropdown {
      max-height: calc(100vh - 120px);
      overflow-y: auto;
    }

    @media (max-width: 1120px) {
      .nav-account-menu {
        width: 100%;
      }

      .nav-login {
        width: 100%;
      }

      .nav-account-dropdown {
        position: static;
        display: none;
        width: 100%;
        min-width: 0;
        margin-top: 8px;
        opacity: 1;
        visibility: visible;
        transform: none;
        box-shadow: none;
      }

      .nav-account-menu.open .nav-account-dropdown {
        display: block;
      }

      .nav-account-menu:hover .nav-account-dropdown,
      .nav-account-menu:focus-within .nav-account-dropdown {
        display: none;
      }

      .nav-account-menu.open:hover .nav-account-dropdown {
        display: block;
      }

      .nav-item .dropdown {
        max-height: none;
        overflow: visible;
      }
    }
  `;

  document.head.appendChild(style);
}

function initializeNavigationBehavior() {
  const navInner = document.getElementById("navInner");
  const mobileToggle = document.getElementById("mobileToggle");
  const nav = document.getElementById("mainNav");

  if (!nav) return;

  const navItems = nav.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    const dropdown = item.querySelector(".dropdown");
    const link = item.querySelector(".nav-link");

    if (!dropdown || !link) return;

    link.addEventListener("click", (event) => {
      if (window.innerWidth > 1120) return;

      event.preventDefault();

      navItems.forEach((other) => {
        if (other !== item) {
          other.classList.remove("open");
        }
      });

      item.classList.toggle("open");
    });
  });

  const accountMenu =
    document.querySelector(".nav-account-menu");

  const accountButton =
    document.querySelector(".nav-login");

  if (accountMenu && accountButton) {
    accountButton.addEventListener("click", (event) => {
      if (window.innerWidth > 1120) return;

      event.preventDefault();
      event.stopPropagation();

      accountMenu.classList.toggle("open");

      accountButton.setAttribute(
        "aria-expanded",
        String(accountMenu.classList.contains("open"))
      );
    });
  }

  if (navInner && mobileToggle) {
    mobileToggle.addEventListener("click", (event) => {
      event.stopPropagation();

      const open =
        navInner.classList.toggle("menu-open");

      mobileToggle.setAttribute(
        "aria-expanded",
        String(open)
      );

      mobileToggle.setAttribute(
        "aria-label",
        open ? "Close menu" : "Open menu"
      );

      mobileToggle.textContent =
        open ? "✕" : "☰";

      if (!open) {
        navItems.forEach((item) =>
          item.classList.remove("open")
        );

        accountMenu?.classList.remove("open");

        accountButton?.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (
      navInner &&
      navInner.contains(event.target)
    ) {
      return;
    }

    navInner?.classList.remove("menu-open");

    navItems.forEach((item) =>
      item.classList.remove("open")
    );

    accountMenu?.classList.remove("open");

    accountButton?.setAttribute(
      "aria-expanded",
      "false"
    );

    if (mobileToggle) {
      mobileToggle.setAttribute(
        "aria-expanded",
        "false"
      );

      mobileToggle.setAttribute(
        "aria-label",
        "Open menu"
      );

      mobileToggle.textContent = "☰";
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1120) {
      navInner?.classList.remove("menu-open");

      navItems.forEach((item) =>
        item.classList.remove("open")
      );

      accountMenu?.classList.remove("open");

      accountButton?.setAttribute(
        "aria-expanded",
        "false"
      );

      if (mobileToggle) {
        mobileToggle.setAttribute(
          "aria-expanded",
          "false"
        );

        mobileToggle.setAttribute(
          "aria-label",
          "Open menu"
        );

        mobileToggle.textContent = "☰";
      }
    }
  });
}

window.refreshUniversalNavigation =
  initializeUniversalNavigation;


function initializeScrollToTop() {
  if (document.getElementById("s4uScrollToTop")) return;

  const button = document.createElement("button");

  button.id = "s4uScrollToTop";
  button.className = "s4u-scroll-top";
  button.type = "button";
  button.setAttribute("aria-label", "Scroll to top");
  button.setAttribute("title", "Back to top");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 19V5"></path>
      <path d="m6 11 6-6 6 6"></path>
    </svg>
  `;

  document.body.appendChild(button);
  injectScrollToTopStyles();

  let ticking = false;

  const updateVisibility = () => {
    button.classList.toggle(
      "is-visible",
      window.scrollY > 500
    );

    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;

      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    },
    { passive: true }
  );

  button.addEventListener("click", () => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth"
    });
  });

  updateVisibility();
}


function injectScrollToTopStyles() {
  if (document.getElementById("screenings4u-scroll-top-styles")) return;

  const style = document.createElement("style");

  style.id = "screenings4u-scroll-top-styles";
  style.textContent = `
    .s4u-scroll-top {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 1400;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      padding: 0;
      border: 1px solid rgba(255,255,255,.28);
      border-radius: 50%;
      background: #ff6b00;
      color: #ffffff;
      box-shadow: 0 14px 34px rgba(23,51,95,.24);
      opacity: 0;
      visibility: hidden;
      transform: translateY(12px);
      cursor: pointer;
      transition:
        opacity .2s ease,
        visibility .2s ease,
        transform .2s ease,
        background .2s ease;
    }

    .s4u-scroll-top.is-visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .s4u-scroll-top:hover {
      background: #325aa3;
      transform: translateY(-2px);
    }

    .s4u-scroll-top:focus-visible {
      outline: 3px solid rgba(50,90,163,.3);
      outline-offset: 3px;
    }

    .s4u-scroll-top svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    @media (max-width: 620px) {
      .s4u-scroll-top {
        right: 16px;
        bottom: 16px;
        width: 44px;
        height: 44px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .s4u-scroll-top {
        transition: none;
      }
    }
  `;

  document.head.appendChild(style);
}
