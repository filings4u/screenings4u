/*
 * screenings4u — Universal Marketing Footer
 *
 * Global marketing footer.
 * Dark blue treatment used consistently across the marketing site.
 */

document.addEventListener("DOMContentLoaded", initializeUniversalFooter);

function initializeUniversalFooter() {
  const target = document.getElementById("siteFooter");

  if (!target) return;

  injectFooterStyles();

  target.innerHTML = `
    <div class="container footer-grid">

      <div>
        <div class="footer-brand">
          <img src="images/logo2.png" alt="screenings4u" class="footer-logo">
        </div>

        <p class="footer-about">
          Nationwide drug and alcohol testing, DOT compliance services,
          workplace screening and professional training through one trusted partner.
        </p>

        <div class="footer-contact">
          <a href="tel:7732457009">(773) 245-7009</a>
          <a href="mailto:support@screenings4u.com">support@screenings4u.com</a>
          <span>8537 S Pulaski Rd, Chicago, IL 60652</span>
        </div>
      </div>

      <div class="footer-col">
        <h4>Services</h4>
        <a href="services.html">All Services</a>
        <a href="dot-urine-drug-tests.html">DOT Urine Tests</a>
        <a href="dot-breathalyzer-services.html">DOT Breath Alcohol</a>
        <a href="dot-physical-exam-services.html">DOT Physicals</a>
        <a href="dot-specimen-collector-training.html">Training</a>
      </div>

      <div class="footer-col">
        <h4>Business</h4>
        <a href="business-services.html">Business Services</a>
        <a href="mobile-drug-and-alcohol-testing.html">Mobile Testing</a>
        <a href="consulting-services.html">Consulting</a>
        <a href="background-checks.html">Background Checks</a>
        <a href="new-entrant-audit.html">New Entrant Audit</a>
      </div>

      <div class="footer-col">
        <h4>Company</h4>
        <a href="industries-served.html">Industries</a>
        <a href="contact.html">Contact</a>
        <a href="client-dashboard.html">Client Login</a>
      </div>

    </div>

    <div class="container footer-bottom">
      <span>
        © 2026 screenings4u. All rights reserved.
        A Subsidiary of Roseland Companies, LLC.
      </span>

      <span>Trust. Transparency. Compliance.</span>
    </div>
  `;
}

function injectFooterStyles() {
  if (document.getElementById("screenings4u-footer-styles")) return;

  const style = document.createElement("style");

  style.id = "screenings4u-footer-styles";

  style.textContent = `
    /* =========================================================
       screenings4u — GLOBAL FOOTER
       Dark blue treatment matching the index page
       ========================================================= */

    #siteFooter {
      --footer-blue-dark: #10284b;
      --footer-blue-deep: #17335f;
      --footer-blue: #24467f;
      --footer-text: #d5e1ef;
      --footer-muted: #9aacc3;
      --footer-link: #b7c6d8;

      display: block;
      width: 100%;
      background: var(--footer-blue-dark) !important;
      background-color: var(--footer-blue-dark) !important;
      color: var(--footer-text);

      padding: 70px 0 25px;

      position: relative;
      overflow: hidden;
      isolation: isolate;
    }

    /*
     * Keep the footer a solid dark blue.
     * These subtle blue glows sit behind the content and do not
     * turn the footer into the lighter blue seen on other pages.
     */
    #siteFooter::before {
      content: "";
      position: absolute;
      width: 360px;
      height: 360px;
      left: -180px;
      top: -190px;

      background: rgba(36, 70, 127, .22);
      border-radius: 50%;
      filter: blur(80px);

      pointer-events: none;
      z-index: -1;
    }

    #siteFooter::after {
      content: "";
      position: absolute;
      width: 300px;
      height: 300px;
      right: -150px;
      bottom: -180px;

      background: rgba(36, 70, 127, .16);
      border-radius: 50%;
      filter: blur(75px);

      pointer-events: none;
      z-index: -1;
    }

    #siteFooter .footer-grid {
      position: relative;
      z-index: 1;

      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr 1fr;
      gap: 35px;

      padding-bottom: 45px;
    }

    #siteFooter .footer-brand {
      display: flex;
      align-items: flex-start;
      margin-bottom: 15px;
    }

    #siteFooter .footer-logo {
      display: block;
      width: 150px;
      max-width: 100%;
      height: auto;
    }

    #siteFooter .footer-about {
      color: var(--footer-text);
      font-size: 12px;
      line-height: 1.7;
      max-width: 360px;
      margin: 0;
    }

    #siteFooter .footer-contact {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 20px;
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
      color: #fff;
    }

    #siteFooter .footer-col {
      display: flex;
      flex-direction: column;
    }

    #siteFooter .footer-col h4 {
      color: #fff;
      font-size: 13px;
      margin: 0 0 15px;
      font-weight: 800;
    }

    #siteFooter .footer-col a {
      display: block;
      color: var(--footer-link);
      font-size: 12px;
      margin: 9px 0;
      text-decoration: none;
      transition: color .18s ease, transform .18s ease;
    }

    #siteFooter .footer-col a:hover {
      color: #fff;
      transform: translateX(2px);
    }

    #siteFooter .footer-bottom {
      position: relative;
      z-index: 1;

      border-top: 1px solid rgba(255, 255, 255, .09);

      padding: 20px 0 0;

      display: flex;
      justify-content: space-between;
      align-items: center;

      gap: 20px;

      color: #7186a2;
      font-size: 10px;
    }

    @media(max-width:900px) {
      #siteFooter .footer-grid {
        grid-template-columns: 1.5fr 1fr 1fr;
      }

      #siteFooter .footer-grid > div:first-child {
        grid-column: 1 / -1;
      }
    }

    @media(max-width:768px) {
      #siteFooter {
        padding: 55px 0 25px;
      }

      #siteFooter .footer-grid {
        grid-template-columns: 1fr 1fr;
        gap: 30px 25px;
      }

      #siteFooter .footer-grid > div:first-child {
        grid-column: 1 / -1;
      }

      #siteFooter .footer-bottom {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    @media(max-width:480px) {
      #siteFooter .footer-grid {
        grid-template-columns: 1fr;
      }

      #siteFooter .footer-grid > div:first-child {
        grid-column: auto;
      }
    }
  `;

  document.head.appendChild(style);
}

window.refreshUniversalFooter = initializeUniversalFooter;