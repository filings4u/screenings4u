/**
 * screenings4u
 * DOT Urine Drug Tests Page Controller
 * Location: assets/js/dot-urine-drug-tests.js
 */

document.addEventListener("DOMContentLoaded", () => {
  initMobileNavigation();
  initFaqAccordion();
});

/**
 * Mobile navigation
 */
function initMobileNavigation() {
  const navInner = document.getElementById("navInner");
  const mobileToggle = document.getElementById("mobileToggle");

  if (!navInner || !mobileToggle) return;

  mobileToggle.addEventListener("click", () => {
    const isOpen = navInner.classList.toggle("menu-open");

    mobileToggle.setAttribute("aria-expanded", String(isOpen));
    mobileToggle.setAttribute(
      "aria-label",
      isOpen ? "Close menu" : "Open menu"
    );
  });

  const dropdownParents = navInner.querySelectorAll(".nav-item");

  dropdownParents.forEach((item) => {
    const link = item.querySelector(".nav-link");
    const dropdown = item.querySelector(".dropdown");

    if (!link || !dropdown) return;

    link.addEventListener("click", (event) => {
      if (window.innerWidth > 1120) return;

      event.preventDefault();

      dropdownParents.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.classList.remove("open");
        }
      });

      item.classList.toggle("open");
    });
  });

  document.addEventListener("click", (event) => {
    if (!navInner.contains(event.target)) {
      navInner.classList.remove("menu-open");

      dropdownParents.forEach((item) => {
        item.classList.remove("open");
      });

      mobileToggle.setAttribute("aria-expanded", "false");
      mobileToggle.setAttribute("aria-label", "Open menu");
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1120) {
      navInner.classList.remove("menu-open");

      dropdownParents.forEach((item) => {
        item.classList.remove("open");
      });

      mobileToggle.setAttribute("aria-expanded", "false");
      mobileToggle.setAttribute("aria-label", "Open menu");
    }
  });
}

/**
 * FAQ accordion
 */
function initFaqAccordion() {
  const faqButtons = document.querySelectorAll("[data-faq-toggle]");

  if (!faqButtons.length) return;

  faqButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const faqItem = button.closest(".faq-item");

      if (!faqItem) return;

      const wasActive = faqItem.classList.contains("active");

      document.querySelectorAll(".faq-item.active").forEach((item) => {
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

    button.setAttribute("aria-expanded", "false");
  });
}