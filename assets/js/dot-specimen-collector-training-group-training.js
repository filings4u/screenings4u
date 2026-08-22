/**
 * screenings4u - DOT Specimen Collector Group Training Page Controller
 * Location: assets/js/group-training.js
 *
 * Handles page-specific interactions only.
 * Global navigation and footer behavior remain in:
 *   assets/js/navigation.js
 *   assets/js/footer.js
 */

document.addEventListener('DOMContentLoaded', function () {
  initializeGroupTrainingPage();
});

function initializeGroupTrainingPage() {
  initializeFaqAccordion();
  initializeSmoothScroll();
}

/**
 * FAQ accordion
 * Keeps one FAQ item open at a time.
 */
function initializeFaqAccordion() {
  const faqButtons = document.querySelectorAll('[data-faq-toggle]');

  if (!faqButtons.length) {
    return;
  }

  faqButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const item = button.closest('.faq-item');

      if (!item) {
        return;
      }

      const isOpen = item.classList.contains('active');

      document.querySelectorAll('.faq-item.active').forEach(function (activeItem) {
        activeItem.classList.remove('active');

        const activeButton = activeItem.querySelector('[data-faq-toggle]');

        if (activeButton) {
          activeButton.setAttribute('aria-expanded', 'false');

          const activePlus = activeButton.querySelector('.faq-plus');

          if (activePlus) {
            activePlus.textContent = '+';
          }
        }
      });

      if (!isOpen) {
        item.classList.add('active');
        button.setAttribute('aria-expanded', 'true');

        const plus = button.querySelector('.faq-plus');

        if (plus) {
          plus.textContent = '−';
        }
      }
    });
  });
}

/**
 * Smooth scrolling for same-page anchors.
 */
function initializeSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  if (!anchorLinks.length) {
    return;
  }

  anchorLinks.forEach(function (link) {
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