/**
 * =========================================================
 * screenings4u — Universal Footer
 * =========================================================
 *
 * Location: assets/js/footer.js
 *
 * Purpose:
 * - Keeps the site footer in one file.
 * - Every page only needs:
 *
 *   <footer id="siteFooter"></footer>
 *
 * - The footer is then generated automatically.
 * - Footer links can be updated here once and reflected site-wide.
 */

/**
 * =========================================================
 * INITIALIZE FOOTER
 * =========================================================
 */

document.addEventListener("DOMContentLoaded", function () {
  initializeUniversalFooter();
});


function initializeUniversalFooter() {

  const target = document.getElementById("siteFooter");

  if (!target) {
    console.warn(
      "footer.js: Could not find the #siteFooter footer target."
    );
    return;
  }

  /*
   * Inject all footer CSS
   */
  injectFooterStyles();

  /*
   * Render footer markup
   */
  target.innerHTML = getFooterMarkup();
}


/**
 * =========================================================
 * FOOTER STYLES
 * =========================================================
 *
 * All footer styling is kept inside footer.js so the footer
 * remains completely self-contained.
 */

function injectFooterStyles() {

  /*
   * Prevent duplicate style injection when the footer is
   * refreshed dynamically.
   */

  if (document.getElementById("screenings4u-footer-styles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "screenings4u-footer-styles";

  style.textContent = `

    /* =====================================================
       FOOTER
       ===================================================== */

    footer {
      background: var(--blue-darker);
      color: #cbd8e8;
      padding: 65px 0 0;
    }


    /* =====================================================
       FOOTER GRID
       ===================================================== */

    .footer-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr 1fr;
      gap: 35px;
      padding-bottom: 45px;
    }


    /* =====================================================
       FOOTER BRAND
       ===================================================== */

    .footer-brand {
      display: flex;
      align-items: flex-start;
      margin-bottom: 0;
    }


    /* =====================================================
       FOOTER LOGO
       ===================================================== */

 .footer-brand img,
.footer-logo {
  display: block;
  width: 150px;
  max-width: 100%;
  height: auto;
  object-fit: contain;
  margin-bottom: 15px;
  filter: none;
}


    /* =====================================================
       FOOTER ABOUT
       ===================================================== */

    .footer-about {
      font-size: 12px;
      line-height: 1.7;
      max-width: 360px;
      margin: 0;
      color: #cbd8e8;
    }


    /* =====================================================
       FOOTER CONTACT
       ===================================================== */

    .footer-contact {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 20px;
    }


    .footer-contact a,
    .footer-contact span {
      color: #b7c6d8;
      font-size: 12px;
      line-height: 1.5;
    }


    .footer-contact a {
      text-decoration: none;
    }


    .footer-contact a:hover {
      color: #fff;
    }


    /* =====================================================
       FOOTER COLUMNS
       ===================================================== */

    .footer-col {
      display: flex;
      flex-direction: column;
    }


    /* =====================================================
       FOOTER COLUMN HEADINGS
       ===================================================== */

    .footer-col h4 {
      color: #fff;
      font-size: 13px;
      margin: 0 0 15px;
      font-weight: 600;
    }


    /* =====================================================
       FOOTER LINKS
       ===================================================== */

    .footer-col a {
      display: block;
      color: #b7c6d8;
      font-size: 12px;
      margin: 9px 0;
      text-decoration: none;
      transition:
        color 0.2s ease,
        transform 0.2s ease;
    }


    .footer-col a:hover {
      color: #fff;
      transform: translateX(2px);
    }


    /* =====================================================
       FOOTER BOTTOM
       ===================================================== */

    .footer-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 20px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      font-size: 10px;
      color: #9fb1c5;
    }


    .footer-bottom span {
      line-height: 1.5;
    }


    /* =====================================================
       TABLET
       ===================================================== */

    @media (max-width: 900px) {

      .footer-grid {
        grid-template-columns: 1.5fr 1fr 1fr;
        gap: 30px;
      }

      .footer-grid > div:first-child {
        grid-column: 1 / -1;
      }

    }


    /* =====================================================
       MOBILE
       ===================================================== */

    @media (max-width: 768px) {

      footer {
        padding-top: 50px;
      }

      .footer-grid {
        grid-template-columns: 1fr 1fr;
        gap: 30px 25px;
        padding-bottom: 35px;
      }

      .footer-grid > div:first-child {
        grid-column: 1 / -1;
      }

      .footer-brand img,
      .footer-logo {
        width: 150px;
        margin-bottom: 15px;
      }

      .footer-bottom {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

    }


    /* =====================================================
       SMALL MOBILE
       ===================================================== */

    @media (max-width: 480px) {

      footer {
        padding-top: 45px;
      }

      .footer-grid {
        grid-template-columns: 1fr;
        gap: 28px;
      }

      .footer-grid > div:first-child {
        grid-column: auto;
      }

      .footer-brand img,
      .footer-logo {
        width: 145px;
      }

      .footer-about {
        max-width: 100%;
      }

      .footer-bottom {
        font-size: 10px;
        padding: 18px 0;
      }

    }

  `;

  document.head.appendChild(style);
}


/**
 * =========================================================
 * FOOTER MARKUP
 * =========================================================
 */

function getFooterMarkup() {

  return `

    <div class="container footer-grid">

      <!-- ================================================
           BRAND / CONTACT
           ================================================ -->

      <div>

        <div class="footer-brand">

          <img
            src="images/logo2.png"
            alt="screenings4u"
            class="footer-logo"
          >

        </div>

        <p class="footer-about">

          A dedicated marketplace for drug and alcohol testing services,
          designed to streamline workplace safety, personal testing and
          compliance through digital workflows and nationwide collection access.

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


      <!-- ================================================
           TESTING
           ================================================ -->

      <div class="footer-col">

        <h4>Testing</h4>

        <a href="urine-drug-tests.html">
          Urine Drug Tests
        </a>

        <a href="hair-follicle-tests.html">
          Hair Drug Tests
        </a>

        <a href="oral-drug-tests.html">
          Oral Fluid Tests
        </a>

        <a href="personal-drug-and-alcohol-testing.html">
          Personal Testing
        </a>

        <a href="dot-breathalyzer-services.html">
          Alcohol Testing
        </a>

      </div>


      <!-- ================================================
           DOT & EMPLOYERS
           ================================================ -->

      <div class="footer-col">

        <h4>DOT & Employers</h4>

        <a href="dot-services.html">
          DOT Services
        </a>

        <a href="dot-physical-exam-services.html">
          DOT Physicals
        </a>

        <a href="post-accident-testing.html">
          Post-Accident
        </a>

        <a href="workplace-drug-and-alcohol-testing.html">
          Workplace Testing
        </a>

        <a href="consulting-services.html">
          Consulting
        </a>

      </div>


      <!-- ================================================
           COMPANY
           ================================================ -->

      <div class="footer-col">

        <h4>Company</h4>

        <a href="about.html">
          About
        </a>

        <a href="resources.html">
          Resources
        </a>

        <a href="contact.html">
          Contact
        </a>

        <a href="privacy.html">
          Privacy
        </a>

        <a href="terms.html">
          Terms
        </a>

      </div>

    </div>


    <!-- ================================================
         FOOTER BOTTOM
         ================================================ -->

    <div class="container footer-bottom">

      <span>
        © 2026 screenings4u. All rights reserved.
        A Subsidiary of Roseland Companies, LLC.
      </span>

      <span>
        Trust. Transparency. Compliance.
      </span>

    </div>

  `;

}


/**
 * =========================================================
 * OPTIONAL PUBLIC REFRESH FUNCTION
 * =========================================================
 *
 * If the footer ever needs to be rebuilt dynamically:
 *
 *   window.refreshUniversalFooter();
 */

window.refreshUniversalFooter = function () {

  initializeUniversalFooter();

};