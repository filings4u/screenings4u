/**
 * screenings4u — Universal Marketing Navigation
 *
 * Marketing site only:
 * - No customer authentication
 * - Services is the central service catalog
 * - Dashboard Login points to the protected admin/client dashboard
 * - No legacy/admin-only pages appear in public navigation
 */

document.addEventListener("DOMContentLoaded", initializeUniversalNavigation);

function initializeUniversalNavigation() {
  const target = document.getElementById("mainNav");
  if (!target) return;

  target.innerHTML = getNavigationMarkup();
  injectNavigationStyles();
  initializeNavigationBehavior();
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
        <a href="dot-urine-drug-tests.html">DOT Urine Drug Tests</a>
        <a href="dot-breathalyzer-services.html">DOT Breathalyzer</a>
        <a href="dot-physical-exam-services.html">DOT Physicals</a>
        <a href="post-accident-testing.html">Post-Accident Testing</a>
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
        <a href="personal-drug-and-alcohol-testing.html">Personal Drug & Alcohol Testing</a>
        <a href="court-ordered-etg-drug-and-alcohol-testing.html">Court-Ordered Testing</a>
        <a href="dna-tests-chicago-il.html">DNA Tests — Chicago, IL</a>
        <a href="non-dot-breathalyzer-services.html">NON-DOT Breathalyzer</a>
        <a href="nursing-school-drug-tests.html">Nursing School Drug Tests</a>
      </div>
    </div>

    <div class="nav-item">
      <a class="nav-link" href="dot-specimen-collector-training.html">
        Training <span class="chevron">▼</span>
      </a>
      <div class="dropdown">
        <a href="dot-specimen-collector-training.html">DOT Specimen Collector Training</a>
        <a href="dot-specimen-collector-training-group-training.html">Group Training</a>
      </div>
    </div>

    <div class="nav-item">
      <a class="nav-link" href="industries-served.html">Industries</a>
    </div>

    <div class="nav-item">
      <a class="nav-link" href="contact.html">Contact</a>
    </div>


  `;
}

function injectNavigationStyles() {
  if (document.getElementById("screenings4u-nav-styles")) return;

  const style = document.createElement("style");
  style.id = "screenings4u-nav-styles";
  style.textContent = `
    .nav-login {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:38px;
      padding:0 14px;
      border-radius:8px;
      background:#325aa3;
      color:#fff !important;
      font-weight:800;
      text-decoration:none;
      white-space:nowrap;
      transition:background .2s ease, transform .2s ease;
    }
    .nav-login:hover {
      background:#24467f;
      transform:translateY(-1px);
    }
    @media (max-width:1120px) {
      .nav-login {
        display:flex;
        width:100%;
        margin-top:8px;
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
        if (other !== item) other.classList.remove("open");
      });
      item.classList.toggle("open");
    });
  });

  if (navInner && mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      const open = navInner.classList.toggle("menu-open");
      mobileToggle.setAttribute("aria-expanded", String(open));
      mobileToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileToggle.textContent = open ? "✕" : "☰";
    });
  }

  document.addEventListener("click", (event) => {
    if (!navInner || navInner.contains(event.target)) return;
    navInner.classList.remove("menu-open");
    navItems.forEach((item) => item.classList.remove("open"));
    if (mobileToggle) {
      mobileToggle.setAttribute("aria-expanded", "false");
      mobileToggle.setAttribute("aria-label", "Open menu");
      mobileToggle.textContent = "☰";
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1120) {
      navInner?.classList.remove("menu-open");
      navItems.forEach((item) => item.classList.remove("open"));
      if (mobileToggle) {
        mobileToggle.setAttribute("aria-expanded", "false");
        mobileToggle.setAttribute("aria-label", "Open menu");
        mobileToggle.textContent = "☰";
      }
    }
  });
}

window.refreshUniversalNavigation = initializeUniversalNavigation;
