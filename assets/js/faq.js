(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-faq-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = button.closest('.faq-item');
        if (!item) return;
        const opening = !item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach((other) => {
          other.classList.remove('active');
          const b = other.querySelector('[data-faq-toggle]');
          const p = other.querySelector('.faq-plus');
          if (b) b.setAttribute('aria-expanded', 'false');
          if (p) p.textContent = '+';
        });
        if (opening) {
          item.classList.add('active');
          button.setAttribute('aria-expanded', 'true');
          const plus = item.querySelector('.faq-plus');
          if (plus) plus.textContent = '−';
        }
      });
    });
  });
})();
