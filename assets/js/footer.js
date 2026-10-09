(() => {
  "use strict";
  function init(){
    const target=document.getElementById("siteFooter");
    if(!target||target.dataset.ready==="1")return;
    target.dataset.ready="1";
    const hasPageCTA=!!document.querySelector("main .cta, main [class*='final-cta'], main [class*='closing-cta']");
    const cta=hasPageCTA?"":`<div class="footer-cta"><div class="footer-cta-copy"><span class="footer-cta-label">Nationwide Testing Support</span><strong>Need help choosing the right testing service?</strong><p>Our team can help with personal, workplace, mobile, DOT, post-accident and compliance testing needs.</p></div><div class="footer-cta-actions"><a class="footer-button footer-button-secondary" href="contact.html">Contact Our Team</a><a class="footer-button footer-button-primary" href="services.html">Order a Test</a></div></div>`;
    target.innerHTML=cta+`
      <div class="footer-shell">
        <div class="footer-brand-area">
          <a class="footer-brand" href="index.html" aria-label="screenings4u home"><img src="images/logo2.webp" alt="screenings4u" class="footer-logo" width="1261" height="237" loading="lazy" decoding="async"></a>
          <p class="footer-about">Nationwide drug and alcohol testing, workplace screening, DOT support, background checks, mobile testing and compliance services through one trusted partner.</p>
          <div class="footer-contact"><a href="tel:7732457009"><span class="footer-contact-icon">☎</span><span>(773) 245-7009</span></a><a href="mailto:support@screenings4u.com"><span class="footer-contact-icon">✉</span><span>support@screenings4u.com</span></a></div>
          <span class="footer-availability">Serving customers nationwide</span>
        </div>
        <nav class="footer-links-grid" aria-label="Footer navigation">
          <div class="footer-col"><h4>Testing</h4><a href="services.html">All Testing Services</a><a href="personal-drug-and-alcohol-testing.html">Personal Testing</a><a href="workplace-drug-and-alcohol-testing.html">Workplace Testing</a><a href="mobile-drug-and-alcohol-testing.html">Mobile &amp; On-Site</a><a href="post-accident-testing.html">Post-Accident Testing</a></div>
          <div class="footer-col"><h4>DOT &amp; Compliance</h4><a href="dot-services.html">DOT Services</a><a href="dot-urine-drug-tests.html">DOT Drug Testing</a><a href="dot-breathalyzer-services.html">DOT Alcohol Testing</a><a href="dot-physical-exam-services.html">DOT Physical Exams</a><a href="consulting-services.html">Compliance Consulting</a></div>
          <div class="footer-col"><h4>Business</h4><a href="business-services.html">Business Services</a><a href="drug-testing-management-software.html">Management Software</a><a href="industries-served.html">Industries Served</a><a href="house-lab-account-setup.html">Lab Account Setup</a><a href="join-our-collector-network.html">Collector Network</a></div>
          <div class="footer-col"><h4>Company</h4><a href="about-us.html">About Us</a><a href="contact.html">Contact Us</a><a href="faqs.html">FAQs</a><a href="blog.html">Blog</a><a href="https://customers.screenings4u.com/login.html">Customer Login</a></div><div class="footer-col footer-family"><h4>screenings4u Family</h4><a href="https://screenings4u.com/" target="_blank" rel="noopener noreferrer">screenings4u.com</a><a href="https://workforce.screenings4u.com/" target="_blank" rel="noopener noreferrer">workforce.screenings4u.com</a><a href="https://training.screenings4u.com/" target="_blank" rel="noopener noreferrer">training.screenings4u.com</a><a href="https://dot.screenings4u.com/" target="_blank" rel="noopener noreferrer">dot.screenings4u.com</a></div>
        </nav>
      </div>
      <div class="footer-bottom">
        <div class="footer-bottom-copy"><span>© <span id="footerYear"></span> screenings4u, LLC. All rights reserved.</span><span class="footer-subsidiary">A Subsidiary of <a href="https://www.roselandcompanies.com/" target="_blank" rel="noopener noreferrer">Roseland Companies, LLC</a></span></div>
        <nav class="footer-legal-links" aria-label="Legal links"><a href="terms.html">Terms</a><a href="privacy.html">Privacy</a><a href="refund-policy.html">Refund</a><a href="cookie-policy.html">Cookies</a><a href="accessibility.html">Accessibility</a><a href="disclaimer.html">Disclaimer</a></nav>
        <a class="footer-admin-login" href="https://portals.screenings4u.com/admin-login.html">Admin Login</a>
      </div>`;
    const year=document.getElementById("footerYear");if(year)year.textContent=String(new Date().getFullYear());
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
  window.refreshUniversalFooter=init;
})();
