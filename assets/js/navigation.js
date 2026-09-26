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
      <div class="nav-item"><a class="nav-link" href="services.html">Drug &amp; Alcohol Testing <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="services.html">All Testing Services</a><a href="personal-drug-and-alcohol-testing.html">Personal Testing</a><a href="workplace-drug-and-alcohol-testing.html">Workplace Testing</a><a href="mobile-drug-and-alcohol-testing.html">Mobile &amp; On-Site Testing</a><a href="post-accident-testing.html">Post-Accident Testing</a><a href="dot-urine-drug-tests.html">DOT Drug Testing</a><a href="dot-breathalyzer-services.html">DOT Alcohol Testing</a><a href="non-dot-breathalyzer-services.html">Non-DOT Alcohol Testing</a><a href="court-ordered-etg-drug-and-alcohol-testing.html">Court-Ordered / EtG Testing</a></div></div>
      <div class="nav-item"><a class="nav-link" href="background-checks.html">Background Checks</a></div>
      <div class="nav-item"><a class="nav-link" href="industries-served.html">Industries</a></div>
      <div class="nav-item"><a class="nav-link" href="join-our-collector-network.html">Collector Network</a></div>
      <div class="nav-item"><a class="nav-link" href="blog.html">Resources <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="blog.html">Blog</a><a href="faqs.html">FAQs</a><a href="contact.html">Contact Us</a><a href="about-us.html">About Us</a></div></div>
      <div class="nav-item mobile-account-nav"><a class="nav-link" href="https://customers.screenings4u.com/login.html">Customer Login</a></div>
      <div class="mobile-nav-actions"><a class="btn btn-orange" href="services.html">Order a Test</a><a class="btn btn-outline" href="https://customers.screenings4u.com/login.html">Customer Login</a></div>`

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
