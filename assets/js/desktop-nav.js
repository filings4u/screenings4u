(() => {
  "use strict";
  const markup = `
    <div class="nav-item"><a class="nav-link" href="index.html">Home</a></div>
    <div class="nav-item"><a class="nav-link" href="services.html">Services</a></div>
    <div class="nav-item"><a class="nav-link" href="dot-services.html">DOT &amp; Transportation <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="dot-services.html">DOT Services</a><a href="dot-urine-drug-tests.html">DOT Drug Testing</a><a href="dot-breathalyzer-services.html">DOT Alcohol Testing</a><a href="dot-physical-exam-services.html">DOT Physicals</a><a href="new-entrant-audit.html">New Entrant Audit</a></div></div>
    <div class="nav-item"><a class="nav-link" href="business-services.html">Employers <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="business-services.html">Business Services</a><a href="consulting-services.html">Consulting Services</a><a href="mobile-drug-and-alcohol-testing.html">Mobile Testing</a><a href="background-checks.html">Background Checks</a><a href="drug-alcohol-policy-creation.html">Drug &amp; Alcohol Policy</a><a href="new-entrant-audit.html">New Entrant Audit</a><a href="audit-preparation.html">Audit Preparation</a><a href="testing-workflow-review.html">Workflow Review</a></div></div>
    <div class="nav-item"><a class="nav-link" href="personal-drug-and-alcohol-testing.html">Personal <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="personal-drug-and-alcohol-testing.html">Personal Drug &amp; Alcohol Testing</a><a href="court-ordered-etg-drug-and-alcohol-testing.html">Court-Ordered Testing</a><a href="dna-tests-chicago-il.html">DNA Tests — Chicago, IL</a><a href="non-dot-breathalyzer-services.html">NON-DOT Breathalyzer</a><a href="nursing-school-drug-tests.html">Nursing School Drug Tests</a></div></div>
    <div class="nav-item"><a class="nav-link" href="dot-specimen-collector-training.html">Training <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="dot-specimen-collector-training.html">DOT Specimen Collector Training</a><a href="dot-specimen-collector-training-group-training.html">Group Training</a><a href="specimen_collector_training_supplies.html">Collector Training Supplies</a></div></div>
    <div class="nav-item"><a class="nav-link" href="industries-served.html">Industries</a></div>
    <div class="nav-item"><a class="nav-link" href="compliance-guidance.html">Resources <span class="chevron" aria-hidden="true">▼</span></a><div class="dropdown"><a href="join-our-collector-network.html">Collector Network</a><a href="contact.html">Contact Us</a><a href="about-us.html">About Us</a><a href="faqs.html">FAQs</a><a href="blog.html">Blog</a><a href="house-lab-account-setup.html">Lab Accounts</a><a href="become-a-clearinghouse-consortium-third-party-administrator.html">Become a C/TPA</a><a href="compliance-guidance.html">Compliance Guidance</a></div></div>`;
  function init(){
    const nav=document.getElementById('desktopNav');
    if(!nav) return console.error('desktopNav target missing');
    nav.innerHTML=markup;
    const menu=document.querySelector('.nav-account-menu');
    const button=menu?.querySelector('.nav-login');
    button?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=!menu.classList.contains('open');menu.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));});
    document.addEventListener('click',e=>{if(menu&&!menu.contains(e.target)){menu.classList.remove('open');button?.setAttribute('aria-expanded','false');}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu?.classList.remove('open');button?.setAttribute('aria-expanded','false');}});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
