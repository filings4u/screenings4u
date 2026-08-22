/**
 * screenings4u - Post-Accident Testing Page Controller
 * Location: assets/js/post-accident-testing.js
 */

document.addEventListener('DOMContentLoaded', () => {
  initPostAccidentTestingPage();
});

function initPostAccidentTestingPage() {
  initFaq();
  initMobileNavigation();
}

/* FAQ accordion */
function initFaq() {
  const questions = document.querySelectorAll('[data-faq-toggle]');

  questions.forEach((question) => {
    question.addEventListener('click', () => {
      const item = question.closest('.faq-item');
      if (!item) return;

      const wasActive = item.classList.contains('active');

      document.querySelectorAll('.faq-item.active').forEach((activeItem) => {
        activeItem.classList.remove('active');
        const activeButton = activeItem.querySelector('[data-faq-toggle]');
        if (activeButton) activeButton.setAttribute('aria-expanded', 'false');
      });

      if (!wasActive) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* Mobile navigation fallback.
   navigation.js can still populate the main navigation normally. */
function initMobileNavigation() {
  const navInner = document.getElementById('navInner');
  const mobileToggle = document.getElementById('mobileToggle');

  if (!navInner || !mobileToggle) return;

  mobileToggle.addEventListener('click', () => {
    const isOpen = navInner.classList.toggle('menu-open');
    mobileToggle.setAttribute('aria-expanded', String(isOpen));
    mobileToggle.textContent = isOpen ? '✕' : '☰';
  });

  document.querySelectorAll('.nav-item').forEach((item) => {
    const trigger = item.querySelector('.nav-link');
    const dropdown = item.querySelector('.dropdown');

    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (event) => {
      if (window.innerWidth > 1120) return;

      event.preventDefault();

      document.querySelectorAll('.nav-item.open').forEach((openItem) => {
        if (openItem !== item) openItem.classList.remove('open');
      });

      item.classList.toggle('open');
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1120) {
      navInner.classList.remove('menu-open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.textContent = '☰';
      document.querySelectorAll('.nav-item.open').forEach((item) => item.classList.remove('open'));
    }
  });
}