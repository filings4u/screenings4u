/**
 * screenings4u
 * DOT Breath Alcohol Services
 *
 * Handles:
 * - Mobile navigation
 * - Mobile dropdowns
 * - FAQ accordion
 * - Checkout routing
 *
 * The checkout page remains universal.
 * Product selection is passed through:
 *
 * checkout.html?product=PRODUCT_ID
 */

document.addEventListener("DOMContentLoaded", function () {
  initializeMobileNavigation();
  initializeFaqAccordion();
  initializeCheckoutLinks();
});

/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

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
      item.classList.toggle("open");
    });
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1120) {
      navInner.classList.remove("menu-open");

      mobileToggle.setAttribute(
        "aria-expanded",
        "false"
      );

      navItems.forEach(function (item) {
        item.classList.remove("open");
      });
    }
  });
}

/* =========================================================
   FAQ ACCORDION
   ========================================================= */

function initializeFaqAccordion() {
  const faqButtons = document.querySelectorAll(
    "[data-faq-toggle]"
  );

  faqButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const faqItem = button.closest(".faq-item");

      if (!faqItem) {
        return;
      }

      const wasActive =
        faqItem.classList.contains("active");

      document.querySelectorAll(".faq-item").forEach(
        function (item) {
          item.classList.remove("active");
        }
      );

      if (!wasActive) {
        faqItem.classList.add("active");
      }
    });
  });
}

/* =========================================================
   CHECKOUT LINKS
   ========================================================= */

/**
 * Every paid order button is routed through the same
 * universal checkout page.
 *
 * Example:
 *
 * checkout.html?product=dot_breathalyzer_essential
 *
 * The checkout.js file reads the product ID and loads the
 * corresponding product from test-price-list.js.
 *
 * Enterprise/custom-pricing buttons should NOT use this
 * function. They should link directly to the custom form.
 */

function initializeCheckoutLinks() {
  const checkoutLinks = document.querySelectorAll(
    "[data-checkout-product]"
  );

  checkoutLinks.forEach(function (link) {
    const productId =
      link.getAttribute("data-checkout-product");

    if (!productId) {
      return;
    }

    link.href =
      "checkout.html?product=" +
      encodeURIComponent(productId);
  });
}