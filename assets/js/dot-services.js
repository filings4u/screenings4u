/**
 * screenings4u — DOT Services Page Controller
 * Location: assets/js/dot-services.js
 */

document.addEventListener("DOMContentLoaded", function () {

  initializeMobileNavigation();
  initializeDotFaq();

});


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

function initializeMobileNavigation() {

  var navInner = document.getElementById("navInner");
  var mobileToggle = document.getElementById("mobileToggle");

  if (!navInner || !mobileToggle) {
    return;
  }

  mobileToggle.addEventListener("click", function () {

    var isOpen = navInner.classList.toggle("menu-open");

    mobileToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    mobileToggle.setAttribute(
      "aria-label",
      isOpen ? "Close menu" : "Open menu"
    );

    mobileToggle.textContent = isOpen ? "✕" : "☰";

  });


  document.querySelectorAll(".nav-item").forEach(function (item) {

    var link = item.querySelector(".nav-link");
    var dropdown = item.querySelector(".dropdown");

    if (!link || !dropdown) {
      return;
    }

    link.addEventListener("click", function (event) {

      if (window.innerWidth <= 1120) {

        event.preventDefault();

        document.querySelectorAll(".nav-item.open").forEach(function (openItem) {

          if (openItem !== item) {
            openItem.classList.remove("open");
          }

        });

        item.classList.toggle("open");

      }

    });

  });


  window.addEventListener("resize", function () {

    if (window.innerWidth > 1120) {

      navInner.classList.remove("menu-open");

      document.querySelectorAll(".nav-item.open").forEach(function (item) {
        item.classList.remove("open");
      });

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

}


/* =========================================================
   DOT FAQ ACCORDION
========================================================= */

function initializeDotFaq() {

  var faqButtons = document.querySelectorAll("[data-faq-toggle]");

  if (!faqButtons.length) {
    return;
  }

  faqButtons.forEach(function (button) {

    button.setAttribute("aria-expanded", "false");

    button.addEventListener("click", function () {

      /*
       * IMPORTANT:
       * The HTML uses .dot-faq-item,
       * not .faq-item.
       */
      var currentItem = button.closest(".dot-faq-item");

      if (!currentItem) {
        return;
      }

      var wasActive = currentItem.classList.contains("active");


      /*
       * Close all open FAQ items
       */
      document.querySelectorAll(".dot-faq-item.active").forEach(function (item) {

        item.classList.remove("active");

        var itemButton = item.querySelector("[data-faq-toggle]");

        if (itemButton) {

          itemButton.setAttribute(
            "aria-expanded",
            "false"
          );

          var itemPlus = itemButton.querySelector(".dot-faq-plus");

          if (itemPlus) {
            itemPlus.textContent = "+";
          }

        }

      });


      /*
       * Open the clicked item
       */
      if (!wasActive) {

        currentItem.classList.add("active");

        button.setAttribute(
          "aria-expanded",
          "true"
        );

        var plus = button.querySelector(".dot-faq-plus");

        if (plus) {
          plus.textContent = "−";
        }

      }

    });

  });

}