document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI Component Targets
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const searchForm = document.querySelector('form');

    // 1. Mobile Menu Toggle Controller
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenu.classList.toggle('hidden');
            
            // Adjust accessibility properties dynamically
            const isExpanded = !mobileMenu.classList.contains('hidden');
            mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
        });

        // Close mobile nav drawer automatically if clicking anywhere outside
        document.addEventListener('click', (e) => {
            if (!mobileMenu.classList.contains('hidden') && !mobileMenu.contains(e.target) && e.target !== mobileMenuBtn) {
                mobileMenu.classList.add('hidden');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // 2. Interactive Search Form Validation & Routing
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const testType = searchForm.querySelector('select').value;
            const locationInput = searchForm.querySelector('input[type="text"]').value.trim();

            if (!locationInput) {
                alert('Please enter a valid Zip Code or City to find a collection site.');
                return;
            }

            // Build production-ready URL parameters for processing
            const queryParams = new URLSearchParams({
                type: testType,
                location: locationInput
            });

            // Redirect context forward to search results processing interface
            window.location.href = `search-results.html?${queryParams.toString()}`;
        });
    }
});
