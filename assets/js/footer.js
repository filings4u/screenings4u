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
            Our team can help with personal, workplace, mobile, post-accident, DOT, and non-DOT drug and alcohol testing.
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
            Nationwide drug and alcohol testing for individuals, employers, and workplace testing events through one trusted partner.
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
            <a href="dot-breathalyzer-services.html">DOT Alcohol Testing</a>
            
            <a href="workplace-drug-and-alcohol-testing.html">
              Workplace Testing
            </a>
          </div>


          <div class="footer-col">
            <h4>Workplace Testing</h4>
            <a href="workplace-drug-and-alcohol-testing.html">Workplace Testing</a>
            <a href="mobile-drug-and-alcohol-testing.html">Mobile &amp; On-Site Testing</a>
            <a href="post-accident-testing.html">Post-Accident Testing</a>
          </div>


          <div class="footer-col">
            <h4>Customer Access</h4>
            <a href="https://customers.screenings4u.com/login.html">Customer Login</a>
            <a href="services.html">Order a Test</a>
            <a href="contact.html">Testing Support</a>
            <a href="join-our-collector-network.html">Collector Network</a>
          </div>

        </nav>

      </div>


      <div class="container footer-bottom">

        <div class="footer-bottom-copy">

          <span class="footer-copyright">
            © <span id="footerYear"></span>
            screenings4u. All rights reserved.
          </span>

          <span class="footer-subsidiary">
            A Subsidiary of
            <a
              href="https://www.roselandcompanies.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Roseland Companies, LLC
            </a>
          </span>

        </div>


        <nav
          class="footer-legal-links"
          aria-label="Legal links"
        >

          <a href="terms.html">Terms of Use</a>
          <a href="privacy.html">Privacy Policy</a>
          <a href="refund-policy.html">Refund Policy</a>
          <a href="cookie-policy.html">Cookie Policy</a>
          <a href="accessibility.html">Accessibility</a>
          <a href="disclaimer.html">Disclaimer</a>

        </nav>


        <a
          href="https://portals.screenings4u.com/admin-login.html"
          class="footer-admin-login"
        >
          Admin Login
        </a>

      </div>
    `;

  const y = document.getElementById("footerYear");

  if (y) {
    y.textContent = new Date().getFullYear();
  }
}

window.refreshUniversalFooter = initS4UFooter;