document.addEventListener("DOMContentLoaded", initS4UFooter);

function initS4UFooter() {
  const target = document.getElementById("siteFooter");
  if (!target) return;

  const hasPageCTA = !!document.querySelector(
    "main .cta, main [class*='final-cta'], main [class*='closing-cta']"
  );

  const cta = hasPageCTA
    ? ""
    : `
      <div class="container footer-cta">
        <div class="footer-cta-copy">
          <span class="footer-cta-label">Nationwide Testing Support</span>
          <strong>Need help choosing the right service?</strong>
          <p>
            Our team can help with individual testing, employer programs,
            DOT compliance, and training.
          </p>
        </div>

        <div class="footer-cta-actions">
          <a
            class="footer-button footer-button-secondary"
            href="contact.html"
          >
            Contact Our Team
          </a>

          <a
            class="footer-button footer-button-primary"
            href="services.html"
          >
            Order a Test
          </a>
        </div>
      </div>
    `;

  target.innerHTML =
    cta +
    `
      <div class="container footer-shell">

        <div class="footer-brand-area">

          <a
            class="footer-brand"
            href="index.html"
            aria-label="screenings4u home"
          >
            <img
              src="images/logo2.png"
              alt="screenings4u"
              class="footer-logo"
              width="1261"
              height="237"
              loading="lazy"
              decoding="async"
            >
          </a>

          <p class="footer-about">
            Nationwide drug and alcohol testing, DOT compliance,
            workplace screening, and professional training through
            one trusted partner.
          </p>

          <div class="footer-contact">

            <a href="tel:7732457009">
              <span class="footer-contact-icon" aria-hidden="true">☎</span>
              <span>(773) 245-7009</span>
            </a>

            <a href="mailto:support@screenings4u.com">
              <span class="footer-contact-icon" aria-hidden="true">✉</span>
              <span>support@screenings4u.com</span>
            </a>

          </div>

          <span class="footer-availability">
            Serving customers nationwide
          </span>

        </div>


        <nav
          class="footer-links-grid"
          aria-label="Footer navigation"
        >

          <div class="footer-col">
            <h4>Company</h4>

            <a href="about-us.html">About Us</a>
            <a href="contact.html">Contact Us</a>
            <a href="faqs.html">FAQs</a>
            <a href="blog.html">Blog</a>
            <a href="industries-served.html">Industries Served</a>
          </div>


          <div class="footer-col">
            <h4>Testing Services</h4>

            <a href="services.html">All Services</a>
            <a href="dot-urine-drug-tests.html">DOT Drug Testing</a>
            <a href="dot-breathalyzer-services.html">
              DOT Alcohol Testing
            </a>
            <a href="dot-physical-exam-services.html">DOT Physicals</a>
            <a href="workplace-drug-and-alcohol-testing.html">
              Workplace Testing
            </a>
          </div>


          <div class="footer-col">
            <h4>For Business</h4>

            <a href="business-services.html">Business Services</a>
            <a href="mobile-drug-and-alcohol-testing.html">
              Mobile Testing
            </a>
            <a href="consulting-services.html">Consulting</a>
            <a href="background-checks.html">Background Checks</a>
            <a href="new-entrant-audit.html">New Entrant Audit</a>
          </div>


          <div class="footer-col">
            <h4>Account &amp; Training</h4>

            <a href="https://portal.screenings4u.com/customer-login.html">
              Customer Login
            </a>

            <a href="https://portal.screenings4u.com/employer-login.html">
              Employer Login
            </a>

            <a href="https://training.screenings4u.com">
              Access Training
            </a>

            <a href="dot-specimen-collector-training.html">
              Training Courses
            </a>

            <a href="contact.html">
              Support
            </a>
          </div>

        </nav>

      </div>


      <div class="container footer-bottom">

        <div class="footer-bottom-copy">

          <span>
            © <span id="footerYear"></span>
            screenings4u. All rights reserved.
          </span>

          <span class="footer-subsidiary">
            A Subsidiary of
            <a
              href="https://www.roselandcompanies.com/"
              target="_blank"
              rel="noopener noreferrer"
              style="color:#ff6b00 !important;"
            >
              Roseland Companies, LLC
            </a>
          </span>

        </div>


        <nav
          class="footer-legal-links"
          aria-label="Legal links"
        >

          <a href="terms.html">
            Terms of Use
          </a>

          <a href="privacy.html">
            Privacy Policy
          </a>

          <a href="refund-policy.html">
            Refund Policy
          </a>

          <a href="cookie-policy.html">
            Cookie Policy
          </a>

          <a href="accessibility.html">
            Accessibility
          </a>

          <a href="disclaimer.html">
            Disclaimer
          </a>

          <a
            href="https://portal.screenings4u.com/admin-login.html"
            class="footer-admin-login"
          >
            Admin Login
          </a>

        </nav>

      </div>
    `;

  const y = document.getElementById("footerYear");

  if (y) {
    y.textContent = new Date().getFullYear();
  }
}

window.refreshUniversalFooter = initS4UFooter;