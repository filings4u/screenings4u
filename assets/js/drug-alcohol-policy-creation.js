/**
 * screenings4u — Drug Alcohol Policy Creation Page Controller
 * Handles page-specific interactions only.
 * Global navigation and footer behavior remain in:
 *   assets/js/navigation.js
 *   assets/js/footer.js
 */

document.addEventListener('DOMContentLoaded', function () {
  initializePage();
});

function initializePage() {
  initializeFaqAccordion();
  initializeSmoothScroll();
}

function initializeFaqAccordion() {
  const faqButtons = document.querySelectorAll('[data-faq-toggle]');

  faqButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const item = button.closest('.faq-item');
      if (!item) return;

      const isOpen = item.classList.contains('active');

      document.querySelectorAll('.faq-item.active').forEach(function (activeItem) {
        activeItem.classList.remove('active');

        const activeButton = activeItem.querySelector('[data-faq-toggle]');
        if (activeButton) {
          activeButton.setAttribute('aria-expanded', 'false');

          const plus = activeButton.querySelector('.faq-plus');
          if (plus) plus.textContent = '+';
        }
      });

      if (!isOpen) {
        item.classList.add('active');
        button.setAttribute('aria-expanded', 'true');

        const plus = button.querySelector('.faq-plus');
        if (plus) plus.textContent = '−';
      }
    });
  });
}

function initializeSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      const targetId = link.getAttribute('href');

      if (!targetId || targetId === '#') {
        return;
      }

      const target = document.querySelector(targetId);

      if (!target) {
        return;
      }

      event.preventDefault();

      const header = document.querySelector('.site-header');
      const headerOffset = header ? header.offsetHeight : 0;

      const targetPosition =
        target.getBoundingClientRect().top +
        window.pageYOffset -
        headerOffset -
        12;

      window.scrollTo({
        top: Math.max(0, targetPosition),
        behavior: 'smooth'
      });

      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', targetId);
      }
    });
  });
}