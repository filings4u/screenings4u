(() => {
  "use strict";

  const MOBILE_BREAKPOINT = 1120;

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  ready(initNavigation);

  function initNavigation() {
    const navInner = document.getElementById("navInner");
    const nav = document.getElementById("mainNav");
    const toggle = document.getElementById("mobileToggle");

    if (!navInner || !nav || !toggle) {
      console.error("Screenings4U navigation target missing", {
        navInner: !!navInner,
        mainNav: !!nav,
        mobileToggle: !!toggle
      });
      return;
    }

    if (nav.dataset.s4uInitialized === "1") return;
    nav.dataset.s4uInitialized = "1";

    nav.innerHTML = `
      <div class="nav-item"><a class="nav-link" href="index.html">Home</a></div>
      <div class="nav-item"><a class="nav-link" href="services.html">Services</a></div>
      <div class="nav-item"><a class="nav-link" href="dot-services.html">DOT &amp; Transportation <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="dot-services.html">DOT Services</a><a href="dot-urine-drug-tests.html">DOT Drug Testing</a><a href="dot-breathalyzer-services.html">DOT Alcohol Testing</a><a href="dot-physical-exam-services.html">DOT Physicals</a><a href="new-entrant-audit.html">New Entrant Audit</a></div></div>
      <div class="nav-item"><a class="nav-link" href="business-services.html">Employers <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="business-services.html">Business Services</a><a href="consulting-services.html">Consulting Services</a><a href="mobile-drug-and-alcohol-testing.html">Mobile Testing</a><a href="background-checks.html">Background Checks</a><a href="drug-alcohol-policy-creation.html">Drug &amp; Alcohol Policy</a><a href="new-entrant-audit.html">New Entrant Audit</a><a href="audit-preparation.html">Audit Preparation</a><a href="testing-workflow-review.html">Workflow Review</a></div></div>
      <div class="nav-item"><a class="nav-link" href="personal-drug-and-alcohol-testing.html">Personal <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="personal-drug-and-alcohol-testing.html">Personal Drug &amp; Alcohol Testing</a><a href="court-ordered-etg-drug-and-alcohol-testing.html">Court-Ordered Testing</a><a href="dna-tests-chicago-il.html">DNA Tests — Chicago, IL</a><a href="non-dot-breathalyzer-services.html">NON-DOT Breathalyzer</a><a href="nursing-school-drug-tests.html">Nursing School Drug Tests</a></div></div>
      <div class="nav-item"><a class="nav-link" href="dot-specimen-collector-training.html">Training <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="dot-specimen-collector-training.html">DOT Specimen Collector Training</a><a href="dot-specimen-collector-training-group-training.html">Group Training</a><a href="specimen_collector_training_supplies.html">Collector Training Supplies</a></div></div>
      <div class="nav-item"><a class="nav-link" href="industries-served.html">Industries</a></div>
      <div class="nav-item"><a class="nav-link" href="compliance-guidance.html">Resources <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="join-our-collector-network.html">Collector Network</a><a href="contact.html">Contact Us</a><a href="about-us.html">About Us</a><a href="faqs.html">FAQs</a><a href="blog.html">Blog</a><a href="house-lab-account-setup.html">Lab Accounts</a><a href="become-a-clearinghouse-consortium-third-party-administrator.html">Become a C/TPA</a><a href="compliance-guidance.html">Compliance Guidance</a></div></div>
      <div class="nav-item mobile-account-nav"><a class="nav-link" href="#account-logins">Account Login <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="https://portal.screenings4u.com/customer-login.html">Customer Login</a><a href="https://portal.screenings4u.com/employer-login.html">Employer Login</a></div></div>
      <div class="mobile-nav-actions"><a class="btn btn-orange" href="services.html">Order a Test</a><a class="btn btn-outline" href="https://portal.screenings4u.com/customer-login.html">Customer Login</a><a class="btn btn-outline" href="https://portal.screenings4u.com/employer-login.html">Employer Login</a></div>`;

    function setMenu(open) {
      navInner.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      toggle.textContent = open ? "✕" : "☰";
      document.body.classList.toggle("s4u-menu-open", open && window.innerWidth <= MOBILE_BREAKPOINT);
      if (!open) closeDropdowns();
    }

    function closeDropdowns(except = null) {
      nav.querySelectorAll(".nav-item.open").forEach(item => {
        if (item !== except) item.classList.remove("open");
      });
    }

    toggle.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      setMenu(!navInner.classList.contains("menu-open"));
    });

    nav.addEventListener("click", event => {
      const link = event.target.closest(".nav-item > .nav-link");
      if (!link || window.innerWidth > MOBILE_BREAKPOINT) return;
      const item = link.closest(".nav-item");
      const dropdown = item?.querySelector(":scope > .dropdown");
      if (!dropdown) {
        setMenu(false);
        return;
      }
      event.preventDefault();
      const willOpen = !item.classList.contains("open");
      closeDropdowns(item);
      item.classList.toggle("open", willOpen);
    });

    const accountMenu = navInner.querySelector(".nav-account-menu");
    const accountButton = navInner.querySelector(".nav-login");
    accountButton?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const open = !accountMenu.classList.contains("open");
      accountMenu.classList.toggle("open", open);
      accountButton.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", event => {
      if (!navInner.contains(event.target)) setMenu(false);
      if (accountMenu && !accountMenu.contains(event.target)) {
        accountMenu.classList.remove("open");
        accountButton?.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        setMenu(false);
        accountMenu?.classList.remove("open");
        accountButton?.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) setMenu(false);
    }, { passive: true });

    initScrollTop();
  }

  function initScrollTop() {
    if (document.getElementById("s4uScrollToTop")) return;
    const button = document.createElement("button");
    button.id = "s4uScrollToTop";
    button.className = "s4u-scroll-top";
    button.type = "button";
    button.setAttribute("aria-label", "Back to top");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"></path><path d="m6 11 6-6 6 6"></path></svg>';
    document.body.appendChild(button);
    const update = () => button.classList.toggle("is-visible", window.scrollY > 500);
    window.addEventListener("scroll", update, { passive: true });
    button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
    update();
  }
})();
