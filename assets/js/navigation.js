/**
 * screenings4u — Universal Navigation
 * Location: assets/js/navigation.js
 *
 * Purpose:
 * - Keeps the main navigation in one file.
 * - Every page only needs the navigation target:
 *
 *     <nav id="mainNav" aria-label="Main navigation"></nav>
 *
 * - Automatically builds the navigation inside #mainNav.
 * - Handles desktop dropdowns.
 * - Handles mobile navigation.
 * - Keeps navigation links consistent across the entire site.
 */

document.addEventListener("DOMContentLoaded", function () {
  initializeUniversalNavigation();
});

function initializeUniversalNavigation() {
  const target = document.getElementById("mainNav");

  if (!target) {
    console.warn(
      "navigation.js: Could not find the #mainNav navigation target."
    );
    return;
  }

  target.innerHTML = getNavigationMarkup();
  initializeNavigationBehavior();
}

/**
 * =========================================================
 * NAVIGATION MARKUP
 * =========================================================
 */

function getNavigationMarkup() {
  return `
    <div class="nav-item">
      <a class="nav-link" href="index.html">
        Home
      </a>
    </div>

    <!-- =====================================================
         DOT & TRANSPORTATION
         ===================================================== -->

    <div class="nav-item">
      <a class="nav-link" href="dot-services.html">
        DOT & Transportation <span class="chevron">▼</span>
      </a>

      <div class="dropdown">
        <a href="dot-services.html">
          DOT Services
        </a>

        <a href="dot-urine-drug-tests.html">
          DOT Urine Drug Tests
        </a>

        <a href="dot-breathalyzer-services.html">
          DOT Breathalyzer
        </a>

        <a href="dot-physical-exam-services.html">
          DOT Physicals
        </a>

        <a href="post-accident-testing.html">
          Post-Accident Testing
        </a>

        <a href="new-entrant-audit.html">
          New Entrant Audit
        </a>
      </div>
    </div>

    <!-- =====================================================
         EMPLOYERS
         ===================================================== -->

    <div class="nav-item">
      <a class="nav-link" href="workplace-drug-and-alcohol-testing.html">
        Employers <span class="chevron">▼</span>
      </a>

      <div class="dropdown">
        <a href="workplace-drug-and-alcohol-testing.html">
          Workplace Testing
        </a>

        <a href="consulting-services.html">
          Consulting Services
        </a>

        <a href="business-services.html">
          Business Services
        </a>

        <a href="mobile-drug-and-alcohol-testing.html">
          Mobile Testing
        </a>
      </div>
    </div>

    <!-- =====================================================
         PERSONAL
         ===================================================== -->

    <div class="nav-item">
      <a class="nav-link" href="personal-drug-and-alcohol-testing.html">
        Personal <span class="chevron">▼</span>
      </a>

      <div class="dropdown">

        <a href="personal-drug-and-alcohol-testing.html">
          Personal Drug & Alcohol Testing
        </a>

        <a href="court-ordered-etg-drug-and-alcohol-testing.html">
          Court-Ordered Drug & Alcohol Testing
        </a>

        <a href="dna-tests-chicago-il.html">
          DNA Tests — Chicago, IL
        </a>

        <a href="non-dot-breathalyzer-services.html">
          NON DOT Breathalyzer Services
        </a>

        <a href="nursing-school-drug-tests.html">
          Nursing School Drug Tests
        </a>

      </div>
    </div>

    <!-- =====================================================
         TRAINING
         ===================================================== -->

    <div class="nav-item">
      <a class="nav-link" href="dot-specimen-collector-training.html">
        Training <span class="chevron">▼</span>
      </a>

      <div class="dropdown">

        <a href="dot-specimen-collector-training.html">
          DOT Specimen Collector Training
        </a>

        <a href="group-training.html">
          Group Training
        </a>

      </div>
    </div>

    <!-- =====================================================
         RESOURCES
         ===================================================== -->

    <div class="nav-item">
      <a class="nav-link" href="resources.html">
        Resources
      </a>
    </div>

    <!-- =====================================================
         ABOUT
         ===================================================== -->

    <div class="nav-item">
      <a class="nav-link" href="about.html">
        About
      </a>
    </div>

    <!-- =====================================================
         CONTACT
         ===================================================== -->

    <div class="nav-item">
      <a class="nav-link" href="contact.html">
        Contact
      </a>
    </div>
  `;
}

/**
 * =========================================================
 * NAVIGATION BEHAVIOR
 * =========================================================
 */

function initializeNavigationBehavior() {
  const navInner = document.getElementById("navInner");
  const mobileToggle = document.getElementById("mobileToggle");
  const nav = document.getElementById("mainNav");

  if (!nav) {
    return;
  }

  const navItems = nav.querySelectorAll(".nav-item");

  /*
   * Desktop dropdowns are controlled by CSS hover/focus.
   * Mobile dropdowns are controlled here.
   */

  navItems.forEach(function (item) {
    const dropdown = item.querySelector(".dropdown");
    const link = item.querySelector(".nav-link");

    if (!dropdown || !link) {
      return;
    }

    link.addEventListener("click", function (event) {
      /*
       * Desktop:
       * Allow the parent link to navigate normally.
       */
      if (window.innerWidth > 1120) {
        return;
      }

      /*
       * Mobile:
       * Open/close the dropdown instead of navigating
       * when the parent has submenu items.
       */
      event.preventDefault();

      navItems.forEach(function (otherItem) {
        if (otherItem !== item) {
          otherItem.classList.remove("open");
        }
      });

      item.classList.toggle("open");
    });
  });

  /*
   * Mobile menu button.
   */

  if (navInner && mobileToggle) {
    mobileToggle.addEventListener("click", function () {
      const menuOpen = navInner.classList.toggle("menu-open");

      mobileToggle.setAttribute(
        "aria-expanded",
        menuOpen ? "true" : "false"
      );

      mobileToggle.setAttribute(
        "aria-label",
        menuOpen ? "Close menu" : "Open menu"
      );

      mobileToggle.textContent = menuOpen ? "✕" : "☰";
    });
  }

  /*
   * Reset mobile navigation when returning to desktop.
   */

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1120) {
      if (navInner) {
        navInner.classList.remove("menu-open");
      }

      if (mobileToggle) {
        mobileToggle.setAttribute("aria-expanded", "false");
        mobileToggle.setAttribute("aria-label", "Open menu");
        mobileToggle.textContent = "☰";
      }

      navItems.forEach(function (item) {
        item.classList.remove("open");
      });
    }
  });
}

/**
 * =========================================================
 * OPTIONAL PUBLIC REFRESH FUNCTION
 * =========================================================
 *
 * If navigation ever needs to be rebuilt dynamically:
 *
 *     window.refreshUniversalNavigation();
 *
 */

window.refreshUniversalNavigation = function () {
  const target = document.getElementById("mainNav");

  if (!target) {
    return;
  }

  target.innerHTML = getNavigationMarkup();
  initializeNavigationBehavior();
};