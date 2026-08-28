/*
 * ============================================================
 * screenings4u — Universal Marketing Footer
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", initializeUniversalFooter);

function initializeUniversalFooter() {
  const target = document.getElementById("siteFooter");

  if (!target) return;

  injectFooterStyles();

  target.innerHTML = `
    <div class="container footer-shell">

      <!-- =====================================================
           FOOTER BRAND
           ===================================================== -->
      <div class="footer-brand-area">

        <div class="footer-brand">
          <img
            src="images/logo2.png"
            alt="screenings4u"
            class="footer-logo"
          >
        </div>

        <p class="footer-about">
          Nationwide drug and alcohol testing, DOT compliance,
          workplace screening, and professional training through
          one trusted partner.
        </p>

        <div class="footer-contact">

          <a href="tel:7732457009">
            (773) 245-7009
          </a>

          <a href="mailto:support@screenings4u.com">
            support@screenings4u.com
          </a>

          <span>
            8537 S Pulaski Rd, Chicago, IL 60652
          </span>

        </div>

      </div>


      <!-- =====================================================
           FOOTER LINKS
           6 SECTIONS
           ===================================================== -->
      <div class="footer-links-grid">


        <!-- COMPANY -->
        <div class="footer-col">

          <h4>Company</h4>

          <a href="about-us.html">About Us</a>
          <a href="contact.html">Contact Us</a>
          <a href="faq.html">FAQ</a>

        </div>


        <!-- SERVICES -->
        <div class="footer-col">

          <h4>Services</h4>

          <a href="services.html">All Services</a>

          <a href="dot-urine-drug-tests.html">
            DOT Drug Testing
          </a>

          <a href="dot-breathalyzer-services.html">
            DOT Alcohol Testing
          </a>

          <a href="dot-physical-exam-services.html">
            DOT Physicals
          </a>

          <a href="workplace-drug-testing.html">
            Workplace Testing
          </a>

        </div>


        <!-- BUSINESS -->
        <div class="footer-col">

          <h4>Business</h4>

          <a href="business-services.html">
            Business Services
          </a>

          <a href="mobile-drug-and-alcohol-testing.html">
            Mobile Testing
          </a>

          <a href="consulting-services.html">
            Consulting
          </a>

          <a href="background-checks.html">
            Background Checks
          </a>

          <a href="new-entrant-audit.html">
            New Entrant Audit
          </a>

        </div>


        <!-- ACCOUNT ACCESS -->
        <div class="footer-col">

          <h4>Account Access</h4>

          <a
            href="https://portal.screenings4u.com/customer-login.html"
          >
            Customer Login
          </a>

          <a
            href="https://portal.screenings4u.com/employer-login.html"
          >
            Employer Login
          </a>

          <a
            href="https://training.screenings4u.com/training-login.html"
          >
            Access Training
          </a>

        </div>


        <!-- RESOURCES -->
        <div class="footer-col">

          <h4>Resources</h4>

          <a href="blog.html">
            Blog
          </a>

          <a href="training.html">
            Training
          </a>

          <a href="contact.html">
            Support
          </a>

          <a href="industries-served.html">
            Industries Served
          </a>

        </div>


        <!-- LEGAL -->
        <div class="footer-col">

          <h4>Legal</h4>

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

        </div>

      </div>

    </div>


    <!-- =======================================================
         BOTTOM FOOTER
         ======================================================= -->
    <div class="container footer-bottom">


      <!-- LEFT -->
      <div class="footer-bottom-left">

        <div class="footer-bottom-copy">
          © <span id="footerYear"></span> screenings4u.
          All rights reserved.
        </div>

      </div>


      <!-- RIGHT -->
      <div class="footer-bottom-right">

        <a href="terms.html">
          Terms
        </a>

        <span class="footer-separator">|</span>

        <a href="privacy.html">
          Privacy
        </a>

        <span class="footer-separator">|</span>

        <a href="refund-policy.html">
          Refund Policy
        </a>

        <span class="footer-separator">|</span>

        <a
          href="https://portal.screenings4u.com/admin-login.html"
          class="footer-admin-login"
        >
          Admin Login
        </a>

      </div>

    </div>
  `;


  const footerYear = document.getElementById("footerYear");

  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
}


function injectFooterStyles() {

  if (
    document.getElementById(
      "screenings4u-footer-styles"
    )
  ) {
    return;
  }


  const style = document.createElement("style");

  style.id = "screenings4u-footer-styles";


  style.textContent = `

    /* =========================================================
       screenings4u — GLOBAL FOOTER
       ========================================================= */

    #siteFooter {

      --footer-dark: #10284b;
      --footer-blue: #325aa3;
      --footer-orange: #ff6b00;

      --footer-text: #dce6f3;
      --footer-muted: #9fb0c6;
      --footer-link: #c5d2e1;

      display: block;
      width: 100%;

      background: var(--footer-dark);

      color: var(--footer-text);

      padding: 65px 0 30px;

      position: relative;

      overflow: hidden;

      isolation: isolate;

    }


    /* =========================================================
       SUBTLE BACKGROUND ACCENTS
       ========================================================= */

    #siteFooter::before {

      content: "";

      position: absolute;

      width: 420px;
      height: 420px;

      left: -220px;
      top: -240px;

      background: rgba(50, 90, 163, .20);

      border-radius: 50%;

      filter: blur(90px);

      pointer-events: none;

      z-index: -1;

    }


    #siteFooter::after {

      content: "";

      position: absolute;

      width: 350px;
      height: 350px;

      right: -180px;
      bottom: -220px;

      background: rgba(50, 90, 163, .15);

      border-radius: 50%;

      filter: blur(90px);

      pointer-events: none;

      z-index: -1;

    }


    /* =========================================================
       MAIN FOOTER SHELL
       ========================================================= */

    #siteFooter .footer-shell {

      position: relative;

      z-index: 1;

      display: grid;

      grid-template-columns:
        minmax(240px, 1fr)
        2fr;

      gap: 70px;

      padding-bottom: 50px;

    }


    /* =========================================================
       BRAND AREA
       ========================================================= */

    #siteFooter .footer-brand-area {

      display: flex;

      flex-direction: column;

      align-items: flex-start;

    }


    #siteFooter .footer-brand {

      display: flex;

      align-items: flex-start;

      margin-bottom: 18px;

    }


    #siteFooter .footer-logo {

      display: block;

      width: 165px;

      max-width: 100%;

      height: auto;

    }


    #siteFooter .footer-about {

      margin: 0;

      max-width: 360px;

      color: var(--footer-text);

      font-size: 13px;

      line-height: 1.7;

    }


    /* =========================================================
       CONTACT
       ========================================================= */

    #siteFooter .footer-contact {

      display: flex;

      flex-direction: column;

      gap: 9px;

      margin-top: 22px;

    }


    #siteFooter .footer-contact a,
    #siteFooter .footer-contact span {

      color: var(--footer-link);

      font-size: 12px;

      line-height: 1.5;

    }


    #siteFooter .footer-contact a {

      text-decoration: none;

      transition: color .18s ease;

    }


    #siteFooter .footer-contact a:hover {

      color: var(--footer-orange);

    }


    /* =========================================================
       6 FOOTER SECTIONS
       DESKTOP: 3 COLUMNS x 2 ROWS
       ========================================================= */

    #siteFooter .footer-links-grid {

      display: grid;

      grid-template-columns:
        repeat(3, minmax(0, 1fr));

      gap: 40px 45px;

      align-content: start;

    }


    #siteFooter .footer-col {

      display: flex;

      flex-direction: column;

      min-width: 0;

    }


    #siteFooter .footer-col h4 {

      margin: 0 0 16px;

      color: #ffffff;

      font-size: 13px;

      font-weight: 800;

      letter-spacing: .02em;

    }


    #siteFooter .footer-col a {

      display: block;

      width: fit-content;

      max-width: 100%;

      margin: 0 0 10px;

      color: var(--footer-link);

      font-size: 12px;

      line-height: 1.5;

      text-decoration: none;

      transition:
        color .18s ease,
        transform .18s ease;

    }


    #siteFooter .footer-col a:hover {

      color: var(--footer-orange);

      transform: translateX(3px);

    }


    /* =========================================================
       BOTTOM FOOTER
       DESKTOP — ONE HORIZONTAL LINE
       ========================================================= */

    #siteFooter .footer-bottom {

      position: relative;

      z-index: 1;

      border-top:
        1px solid rgba(255, 255, 255, 0.10);

      padding-top: 22px;

      display: flex;

      align-items: center;

      justify-content: space-between;

      gap: 24px;

      text-align: left;

      color: var(--footer-muted);

      font-size: 11px;

    }


    /* LEFT SIDE */

    #siteFooter .footer-bottom-left {

      display: flex;

      align-items: center;

      flex-shrink: 0;

    }


    #siteFooter .footer-bottom-copy {

      color: var(--footer-text);

      font-weight: 600;

      white-space: nowrap;

    }


    /* =========================================================
       RIGHT SIDE — ALL LINKS TOGETHER
       ========================================================= */

    #siteFooter .footer-bottom-right {

      display: flex;

      align-items: center;

      justify-content: flex-end;

      gap: 12px;

      white-space: nowrap;

      margin-left: auto;

    }


    #siteFooter .footer-bottom-right a {

      color: var(--footer-link);

      font-size: 11px;

      text-decoration: none;

      transition: color .18s ease;

    }


    #siteFooter .footer-bottom-right a:hover {

      color: var(--footer-orange);

    }


    #siteFooter .footer-separator {

      color: rgba(255, 255, 255, 0.30);

      font-size: 11px;

      line-height: 1;

      user-select: none;

    }


    #siteFooter .footer-admin-login {

      color: rgba(197, 210, 225, 0.85);

    }


    /* =========================================================
       TABLET
       ========================================================= */

    @media (max-width: 1050px) {

      #siteFooter .footer-shell {

        grid-template-columns: 1fr;

        gap: 45px;

      }


      #siteFooter .footer-brand-area {

        max-width: 600px;

      }


      #siteFooter .footer-links-grid {

        grid-template-columns:
          repeat(3, minmax(0, 1fr));

      }

    }


    /* =========================================================
       MOBILE
       2 COLUMNS x 3 ROWS
       ========================================================= */

    @media (max-width: 768px) {

      #siteFooter {

        padding: 55px 0 28px;

      }


      #siteFooter .footer-shell {

        gap: 40px;

      }


      #siteFooter .footer-brand-area {

        align-items: center;

        text-align: center;

      }


      #siteFooter .footer-about {

        max-width: 500px;

      }


      #siteFooter .footer-contact {

        align-items: center;

      }


      #siteFooter .footer-links-grid {

        grid-template-columns:
          repeat(2, minmax(0, 1fr));

        gap: 34px 25px;

      }


      #siteFooter .footer-col {

        align-items: center;

        text-align: center;

      }


      #siteFooter .footer-col a {

        width: auto;

      }


      #siteFooter .footer-col a:hover {

        transform: none;

      }


      /* BOTTOM FOOTER */

      #siteFooter .footer-bottom {

        flex-direction: column;

        align-items: center;

        justify-content: center;

        text-align: center;

        gap: 14px;

      }


      #siteFooter .footer-bottom-left {

        justify-content: center;

      }


      #siteFooter .footer-bottom-copy {

        white-space: normal;

      }


      #siteFooter .footer-bottom-right {

        justify-content: center;

        flex-wrap: wrap;

        white-space: normal;

        margin-left: 0;

        gap: 10px;

      }

    }


    /* =========================================================
       SMALL MOBILE
       KEEP 2 x 3 AS REQUESTED
       ========================================================= */

    @media (max-width: 420px) {

      #siteFooter .footer-links-grid {

        gap: 30px 16px;

      }


      #siteFooter .footer-col h4 {

        font-size: 12px;

      }


      #siteFooter .footer-col a {

        font-size: 11px;

      }


      #siteFooter .footer-logo {

        width: 145px;

      }


      #siteFooter .footer-bottom-right {

        gap: 8px;

      }

    }

  `;


  document.head.appendChild(style);

}


/* ============================================================
   OPTIONAL GLOBAL REFRESH
   ============================================================ */

window.refreshUniversalFooter =
  initializeUniversalFooter;