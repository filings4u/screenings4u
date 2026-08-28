/**
 * ============================================================
 * screenings4u - Court-Ordered Drug & Alcohol Testing
 * Page Controller
 * Location:
 * assets/js/court-ordered-etg-drug-and-alcohol-testing.js
 * ============================================================
 */

(function () {
  "use strict";

  function initializePage() {
    initializeFaq();
    initializeSmoothScroll();
  }

  /* ============================================================
     FAQ ACCORDION
     ============================================================ */

  function initializeFaq() {
    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-faq-toggle]");

      if (!button) return;

      var item = button.closest(".faq-item");

      if (!item) return;

      event.preventDefault();

      var wasOpen = item.classList.contains("active");

      document
        .querySelectorAll(".faq-item.active")
        .forEach(function (openItem) {
          openItem.classList.remove("active");

          var openButton = openItem.querySelector(
            "[data-faq-toggle]"
          );

          if (openButton) {
            openButton.setAttribute(
              "aria-expanded",
              "false"
            );

            var openPlus =
              openButton.querySelector(".faq-plus");

            if (openPlus) {
              openPlus.textContent = "+";
            }
          }
        });

      if (!wasOpen) {
        item.classList.add("active");

        button.setAttribute(
          "aria-expanded",
          "true"
        );

        var plus =
          button.querySelector(".faq-plus");

        if (plus) {
          plus.textContent = "−";
        }
      }
    });
  }

  /* ============================================================
     SMOOTH SCROLL
     ============================================================ */

  function initializeSmoothScroll() {
    document.addEventListener("click", function (event) {
      var link = event.target.closest(
        'a[href^="#"]'
      );

      if (!link) return;

      var targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      var target;

      try {
        target = document.querySelector(targetId);
      } catch (error) {
        return;
      }

      if (!target) return;

      event.preventDefault();

      var header =
        document.querySelector(".site-header") ||
        document.querySelector(".nav");

      var headerHeight =
        header ? header.offsetHeight : 0;

      var targetTop =
        target.getBoundingClientRect().top +
        window.pageYOffset -
        headerHeight -
        16;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth"
      });

      if (
        window.history &&
        window.history.replaceState
      ) {
        window.history.replaceState(
          null,
          "",
          targetId
        );
      }
    });
  }

  /* ============================================================
     INITIALIZE
     ============================================================ */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializePage
    );
  } else {
    initializePage();
  }
})();