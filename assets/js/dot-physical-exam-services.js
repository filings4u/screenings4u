/**
 * screenings4u — DOT Physical Exam Services
 * Location: assets/js/dot-physical-exam-services.js
 *
 * Handles:
 * - Mobile navigation
 * - Mobile dropdowns
 * - FAQ accordion
 * - Basic smooth scrolling
 */

document.addEventListener("DOMContentLoaded", function () {
  initializeMobileNavigation();
  initializeFaqAccordion();
  initializeSmoothScrolling();
});

function initializeMobileNavigation() {
  const navInner = document.getElementById("navInner");
  const mobileToggle = document.getElementById("mobileToggle");
  const nav = document.getElementById("mainNav");

  if (!navInner || !mobileToggle || !nav) {
    return;
  }

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

  const navItems = nav.querySelectorAll(".nav-item");

  navItems.forEach(function (item) {
    const dropdown = item.querySelector(".dropdown");
    const link = item.querySelector(".nav-link");

    if (!dropdown || !link) {
      return;
    }

    link.addEventListener("click", function (event) {
      if (window.innerWidth > 1120) {
        return;
      }

      event.preventDefault();

      navItems.forEach(function (otherItem) {
        if (otherItem !== item) {
          otherItem.classList.remove("open");
        }
      });

      item.classList.toggle("open");
    });
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1120) {
      navInner.classList.remove("menu-open");

      mobileToggle.setAttribute("aria-expanded", "false");
      mobileToggle.setAttribute("aria-label", "Open menu");
      mobileToggle.textContent = "☰";

      navItems.forEach(function (item) {
        item.classList.remove("open");
      });
    }
  });
}

function initializeFaqAccordion() {
  const faqButtons = document.querySelectorAll("[data-faq-toggle]");

  faqButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const faqItem = button.closest(".faq-item");

      if (!faqItem) {
        return;
      }

      const wasActive = faqItem.classList.contains("active");

      document.querySelectorAll(".faq-item.active").forEach(function (item) {
        item.classList.remove("active");

        const itemButton = item.querySelector("[data-faq-toggle]");

        if (itemButton) {
          itemButton.setAttribute("aria-expanded", "false");
        }
      });

      if (!wasActive) {
        faqItem.classList.add("active");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });
}

function initializeSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") {
        return;
      }

      const target = document.querySelector(targetId);

      if (!target) {
        return;
      }

      event.preventDefault();

      const headerOffset = 100;
      const targetPosition =
        target.getBoundingClientRect().top +
        window.pageYOffset -
        headerOffset;

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth"
      });
    });
  });
}