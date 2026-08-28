/* ============================================================
   screenings4u — FAQ Accordion
   Use on:
   - program-assessment.html
   - policy-review.html
   - recordkeeping-review.html
   - audit-preparation.html
   - testing-workflow-review.html
   - compliance-guidance.html
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  const faqButtons = document.querySelectorAll("[data-faq-toggle]");

  if (!faqButtons.length) return;

  faqButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const faqItem = button.closest(".faq-item");
      if (!faqItem) return;

      const answer = faqItem.querySelector(".faq-answer");
      const plus = button.querySelector(".faq-plus");
      const isOpen = button.getAttribute("aria-expanded") === "true";

      // Close all other FAQ items.
      faqButtons.forEach(function (otherButton) {
        if (otherButton === button) return;

        const otherItem = otherButton.closest(".faq-item");
        const otherAnswer = otherItem
          ? otherItem.querySelector(".faq-answer")
          : null;
        const otherPlus = otherButton.querySelector(".faq-plus");

        otherButton.setAttribute("aria-expanded", "false");

        if (otherItem) {
          otherItem.classList.remove("is-open");
        }

        if (otherAnswer) {
          otherAnswer.style.maxHeight = "0px";
        }

        if (otherPlus) {
          otherPlus.textContent = "+";
        }
      });

      // Toggle the selected FAQ.
      if (isOpen) {
        button.setAttribute("aria-expanded", "false");
        faqItem.classList.remove("is-open");

        if (answer) {
          answer.style.maxHeight = "0px";
        }

        if (plus) {
          plus.textContent = "+";
        }
      } else {
        button.setAttribute("aria-expanded", "true");
        faqItem.classList.add("is-open");

        if (answer) {
          answer.style.maxHeight = answer.scrollHeight + "px";
        }

        if (plus) {
          plus.textContent = "−";
        }
      }
    });
  });

  // Recalculate the open answer height when the window is resized.
  window.addEventListener("resize", function () {
    document
      .querySelectorAll('.faq-question[aria-expanded="true"]')
      .forEach(function (button) {
        const faqItem = button.closest(".faq-item");
        const answer = faqItem
          ? faqItem.querySelector(".faq-answer")
          : null;

        if (answer) {
          answer.style.maxHeight = answer.scrollHeight + "px";
        }
      });
  });
});