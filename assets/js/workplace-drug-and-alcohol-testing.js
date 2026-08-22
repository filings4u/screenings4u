/**
 * screenings4u page controller
 */
document.addEventListener('DOMContentLoaded', () => {
  initMobileNavigation();
  initFaq();
  initAnchorLinks();
});

function initMobileNavigation() {
  const navInner = document.getElementById('navInner');
  const toggle = document.getElementById('mobileToggle');
  if (!navInner || !toggle) return;

  toggle.addEventListener('click', () => {
    const open = navInner.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.textContent = open ? '✕' : '☰';
  });

  document.querySelectorAll('.nav-item > .nav-link').forEach(link => {
    link.addEventListener('click', event => {
      const item = link.closest('.nav-item');
      const dropdown = item?.querySelector('.dropdown');
      if (dropdown && window.innerWidth <= 1120) {
        event.preventDefault();
        item.classList.toggle('open');
      }
    });
  });

  document.addEventListener('click', event => {
    if (!navInner.contains(event.target) && window.innerWidth <= 1120) {
      closeMobileMenu(navInner, toggle);
    }
  });
}

function closeMobileMenu(navInner, toggle) {
  navInner.classList.remove('menu-open');
  toggle?.setAttribute('aria-expanded', 'false');
  if (toggle) {
    toggle.setAttribute('aria-label', 'Open menu');
    toggle.textContent = '☰';
  }
  document.querySelectorAll('.nav-item.open').forEach(item => item.classList.remove('open'));
}

function initFaq() {
  document.querySelectorAll('[data-faq-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      if (!item) return;
      const open = item.classList.toggle('active');
      button.setAttribute('aria-expanded', String(open));
      const icon = button.querySelector('.faq-plus');
      if (icon) icon.textContent = open ? '−' : '+';
    });
  });
}

function initAnchorLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}