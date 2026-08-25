/**
 * screenings4u — Universal Marketing Footer
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
      <span>© 2026 screenings4u. All rights reserved. A Subsidiary of Roseland Companies, LLC.</span>
      <span>Trust. Transparency. Compliance.</span>
    </div>
  `;
}

function injectFooterStyles() {
  if (document.getElementById("screenings4u-footer-styles")) return;

  const style = document.createElement("style");
  style.id = "screenings4u-footer-styles";
  style.textContent = `
    footer{background:var(--blue-darker,#24467f);color:#cbd8e8;padding:65px 0 0}
    .footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:35px;padding-bottom:45px}
    .footer-brand{display:flex;align-items:flex-start}
    .footer-logo{display:block;width:150px;max-width:100%;height:auto;margin-bottom:15px}
    .footer-about{font-size:12px;line-height:1.7;max-width:360px;margin:0;color:#cbd8e8}
    .footer-contact{display:flex;flex-direction:column;gap:8px;margin-top:20px}
    .footer-contact a,.footer-contact span{color:#b7c6d8;font-size:12px;line-height:1.5}
    .footer-contact a{text-decoration:none}
    .footer-contact a:hover{color:#fff}
    .footer-col{display:flex;flex-direction:column}
    .footer-col h4{color:#fff;font-size:13px;margin:0 0 15px;font-weight:700}
    .footer-col a{display:block;color:#b7c6d8;font-size:12px;margin:9px 0;text-decoration:none}
    .footer-col a:hover{color:#fff}
    .footer-bottom{border-top:1px solid rgba(255,255,255,.1);padding:20px 0;display:flex;justify-content:space-between;align-items:center;gap:20px;font-size:10px;color:#9fb1c5}
    @media(max-width:900px){.footer-grid{grid-template-columns:1.5fr 1fr 1fr}.footer-grid>div:first-child{grid-column:1/-1}}
    @media(max-width:768px){.footer-grid{grid-template-columns:1fr 1fr;gap:30px 25px}.footer-grid>div:first-child{grid-column:1/-1}.footer-bottom{flex-direction:column;align-items:flex-start}}
    @media(max-width:480px){.footer-grid{grid-template-columns:1fr}.footer-grid>div:first-child{grid-column:auto}}
  `;
  document.head.appendChild(style);
}

window.refreshUniversalFooter = initializeUniversalFooter;
