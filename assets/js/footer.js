/* screenings4u — Universal Marketing Footer */
document.addEventListener("DOMContentLoaded", initializeUniversalFooter);

function initializeUniversalFooter() {
  const target = document.getElementById("siteFooter");
  if (!target) return;
  injectFooterStyles();

  target.innerHTML = `
    <div class="container footer-cta">
      <div class="footer-cta-copy">
        <span class="footer-cta-label">Nationwide Testing Support</span>
        <strong>Need help choosing the right service?</strong>
        <p>Our team can help with individual testing, employer programs, DOT compliance, and training.</p>
      </div>
      <div class="footer-cta-actions">
        <a class="footer-button footer-button-secondary" href="contact.html">Contact Our Team</a>
        <a class="footer-button footer-button-primary" href="services.html">Order a Test</a>
      </div>
    </div>

    <div class="container footer-shell">
      <div class="footer-brand-area">
        <a class="footer-brand" href="index.html" aria-label="screenings4u home">
          <img src="images/logo2.png" alt="screenings4u" class="footer-logo">
        </a>
        <p class="footer-about">Nationwide drug and alcohol testing, DOT compliance, workplace screening, and professional training through one trusted partner.</p>
        <div class="footer-contact" aria-label="Contact screenings4u">
          <a href="tel:7732457009"><span class="footer-contact-icon" aria-hidden="true">☎</span><span>(773) 245-7009</span></a>
          <a href="mailto:support@screenings4u.com"><span class="footer-contact-icon" aria-hidden="true">✉</span><span>support@screenings4u.com</span></a>
        </div>
        <span class="footer-availability">Serving customers nationwide</span>
      </div>

      <nav class="footer-links-grid" aria-label="Footer navigation">
        <div class="footer-col"><h4>Company</h4><a href="about-us.html">About Us</a><a href="contact.html">Contact Us</a><a href="faqs.html">FAQs</a><a href="blog.html">Blog</a><a href="industries-served.html">Industries Served</a></div>
        <div class="footer-col"><h4>Testing Services</h4><a href="services.html">All Services</a><a href="dot-urine-drug-tests.html">DOT Drug Testing</a><a href="dot-breathalyzer-services.html">DOT Alcohol Testing</a><a href="dot-physical-exam-services.html">DOT Physicals</a><a href="workplace-drug-testing.html">Workplace Testing</a></div>
        <div class="footer-col"><h4>For Business</h4><a href="business-services.html">Business Services</a><a href="mobile-drug-and-alcohol-testing.html">Mobile Testing</a><a href="consulting-services.html">Consulting</a><a href="background-checks.html">Background Checks</a><a href="new-entrant-audit.html">New Entrant Audit</a></div>
        <div class="footer-col"><h4>Account &amp; Training</h4><a href="https://portal.screenings4u.com/customer-login.html">Customer Login</a><a href="https://portal.screenings4u.com/employer-login.html">Employer Login</a><a href="https://training.screenings4u.com/training-login.html">Access Training</a><a href="training.html">Training Courses</a><a href="contact.html">Support</a></div>
      </nav>
    </div>

    <div class="container footer-bottom">
      <div class="footer-bottom-copy">© <span id="footerYear"></span> screenings4u. All rights reserved.</div>
      <nav class="footer-legal-links" aria-label="Legal links"><a href="terms.html">Terms of Use</a><a href="privacy.html">Privacy Policy</a><a href="refund-policy.html">Refund Policy</a><a href="cookie-policy.html">Cookie Policy</a><a href="accessibility.html">Accessibility</a><a href="disclaimer.html">Disclaimer</a></nav>
      <a href="https://portal.screenings4u.com/admin-login.html" class="footer-admin-login">Admin Login</a>
    </div>`;

  const footerYear = document.getElementById("footerYear");
  if (footerYear) footerYear.textContent = new Date().getFullYear();
}

function injectFooterStyles() {
  if (document.getElementById("screenings4u-footer-styles")) return;
  const style = document.createElement("style");
  style.id = "screenings4u-footer-styles";
  style.textContent = `
    #siteFooter{--footer-dark:#10284b;--footer-deep:#17335f;--footer-blue:#325aa3;--footer-orange:#ff6b00;--footer-orange-dark:#d95800;--footer-text:#e8eff9;--footer-muted:#9fb0c6;--footer-link:#c5d2e1;display:block;width:100%;padding:0 0 24px;position:relative;overflow:hidden;isolation:isolate;background:linear-gradient(145deg,var(--footer-dark),var(--footer-deep));color:var(--footer-text)}
    #siteFooter::before,#siteFooter::after{content:"";position:absolute;border-radius:50%;pointer-events:none;z-index:-1}#siteFooter::before{width:430px;height:430px;left:-260px;bottom:-270px;background:rgba(50,90,163,.24);filter:blur(80px)}#siteFooter::after{width:360px;height:360px;right:-210px;top:90px;background:rgba(255,107,0,.09);filter:blur(85px)}
    #siteFooter .footer-cta{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:36px;padding-top:34px;padding-bottom:34px;border-bottom:1px solid rgba(255,255,255,.11)}#siteFooter .footer-cta-copy{min-width:0}#siteFooter .footer-cta-label{display:block;margin-bottom:7px;color:#ffb47d;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}#siteFooter .footer-cta strong{display:block;color:#fff;font-size:clamp(20px,2.3vw,29px);line-height:1.15;letter-spacing:-.025em}#siteFooter .footer-cta p{margin:8px 0 0;max-width:720px;color:var(--footer-muted);font-size:12px;line-height:1.65}#siteFooter .footer-cta-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto}
    #siteFooter .footer-button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 17px;border:1px solid transparent;border-radius:9px;font-size:11px;font-weight:800;text-decoration:none;transition:transform .18s ease,background .18s ease,border-color .18s ease}#siteFooter .footer-button:hover{transform:translateY(-1px)}#siteFooter .footer-button-primary{background:var(--footer-orange);color:#fff}#siteFooter .footer-button-primary:hover{background:var(--footer-orange-dark)}#siteFooter .footer-button-secondary{border-color:rgba(255,255,255,.24);background:rgba(255,255,255,.06);color:#fff}#siteFooter .footer-button-secondary:hover{border-color:rgba(255,255,255,.4);background:rgba(255,255,255,.1)}
    #siteFooter .footer-shell{position:relative;z-index:1;display:grid;grid-template-columns:minmax(245px,.9fr) minmax(0,2.1fr);gap:65px;padding-top:45px;padding-bottom:42px}#siteFooter .footer-brand-area{display:flex;flex-direction:column;align-items:flex-start}#siteFooter .footer-brand{display:inline-flex;align-items:center;margin-bottom:15px}#siteFooter .footer-logo{display:block;width:165px;max-width:100%;height:auto}#siteFooter .footer-about{margin:0;max-width:360px;color:var(--footer-text);font-size:12px;line-height:1.7}
    #siteFooter .footer-contact{display:grid;gap:8px;margin-top:19px}#siteFooter .footer-contact a{display:inline-flex;align-items:center;gap:9px;width:fit-content;color:var(--footer-link);font-size:12px;text-decoration:none;transition:color .18s ease}#siteFooter .footer-contact a:hover{color:#fff}#siteFooter .footer-contact-icon{display:grid;place-items:center;width:25px;height:25px;border:1px solid rgba(255,255,255,.13);border-radius:7px;color:#ffb47d;font-size:11px}#siteFooter .footer-availability{display:inline-flex;align-items:center;gap:7px;margin-top:17px;color:var(--footer-muted);font-size:10px;font-weight:700;letter-spacing:.025em}#siteFooter .footer-availability::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--footer-orange);box-shadow:0 0 0 4px rgba(255,107,0,.13)}
    #siteFooter .footer-links-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px;align-content:start}#siteFooter .footer-col{min-width:0}#siteFooter .footer-col h4{margin:0 0 14px;color:#fff;font-size:12px;font-weight:800;letter-spacing:.02em}#siteFooter .footer-col a{display:block;width:fit-content;max-width:100%;margin:0 0 8px;color:var(--footer-link);font-size:11px;line-height:1.5;text-decoration:none;transition:color .18s ease,transform .18s ease}#siteFooter .footer-col a:hover{color:#fff;transform:translateX(3px)}
    #siteFooter .footer-bottom{position:relative;z-index:1;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px;padding-top:21px;border-top:1px solid rgba(255,255,255,.1);color:var(--footer-muted);font-size:10px}#siteFooter .footer-bottom-copy{color:var(--footer-text);font-weight:600}#siteFooter .footer-legal-links{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 18px}#siteFooter .footer-legal-links a,#siteFooter .footer-admin-login{color:var(--footer-link);font-size:10px;text-decoration:none;transition:color .18s ease}#siteFooter .footer-legal-links a:hover,#siteFooter .footer-admin-login:hover{color:var(--footer-orange)}#siteFooter .footer-admin-login{justify-self:end}
    @media(max-width:1100px){#siteFooter .footer-shell{grid-template-columns:1fr;gap:35px}#siteFooter .footer-brand-area{max-width:620px}#siteFooter .footer-bottom{grid-template-columns:1fr;justify-items:center;text-align:center;gap:11px}#siteFooter .footer-admin-login{justify-self:center}}
    @media(max-width:768px){#siteFooter{padding-bottom:21px}#siteFooter .footer-cta{align-items:stretch;flex-direction:column;gap:20px;padding-top:28px;padding-bottom:28px}#siteFooter .footer-cta-actions{display:grid;grid-template-columns:1fr 1fr}#siteFooter .footer-shell{gap:30px;padding-top:36px;padding-bottom:34px}#siteFooter .footer-brand-area{align-items:flex-start;text-align:left}#siteFooter .footer-links-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:27px 20px}#siteFooter .footer-col{text-align:left}#siteFooter .footer-col a:hover{transform:none}#siteFooter .footer-legal-links{gap:7px 14px}}
    @media(max-width:430px){#siteFooter .footer-cta-actions{grid-template-columns:1fr}#siteFooter .footer-links-grid{gap:24px 14px}#siteFooter .footer-col h4{font-size:11px}#siteFooter .footer-col a{margin-bottom:7px;font-size:10.5px}#siteFooter .footer-logo{width:148px}}
  `;
  document.head.appendChild(style);
}

window.refreshUniversalFooter = initializeUniversalFooter;
