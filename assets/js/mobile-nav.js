(() => {
  "use strict";
  const markup = `
    <div class="mobile-nav-item"><a class="mobile-nav-link" href="index.html">Home</a></div>
    <div class="mobile-nav-item"><a class="mobile-nav-link" href="services.html">Drug &amp; Alcohol Testing <span class="chevron" aria-hidden="true">▼</span></a><div class="mobile-dropdown"><a href="services.html">All Testing Services</a><a href="personal-drug-and-alcohol-testing.html">Personal Testing</a><a href="workplace-drug-and-alcohol-testing.html">Workplace Testing</a><a href="mobile-drug-and-alcohol-testing.html">Mobile &amp; On-Site Testing</a><a href="post-accident-testing.html">Post-Accident Testing</a><a href="dot-urine-drug-tests.html">DOT Drug Testing</a><a href="dot-breathalyzer-services.html">DOT Alcohol Testing</a><a href="non-dot-breathalyzer-services.html">Non-DOT Alcohol Testing</a><a href="court-ordered-etg-drug-and-alcohol-testing.html">Court-Ordered / EtG Testing</a></div></div>
    <div class="mobile-nav-item"><a class="mobile-nav-link" href="industries-served.html">Industries</a></div>
    <div class="mobile-nav-item"><a class="mobile-nav-link" href="join-our-collector-network.html">Collector Network</a></div>
    <div class="mobile-nav-item"><a class="mobile-nav-link" href="blog.html">Resources <span class="chevron" aria-hidden="true">▼</span></a><div class="mobile-dropdown"><a href="blog.html">Blog</a><a href="faqs.html">FAQs</a><a href="contact.html">Contact Us</a><a href="about-us.html">About Us</a></div></div>
    <div class="mobile-nav-actions"><a class="btn btn-orange" href="services.html">Order a Test</a><a class="btn btn-outline" href="https://customers.screenings4u.com/login.html">Customer Login</a></div>`;
  function init(){
    const nav=document.getElementById('mobileNav');
    const toggle=document.getElementById('mobileToggle');
    if(!nav||!toggle) return console.error('Screenings4U mobile navigation target missing',{mobileNav:!!nav,mobileToggle:!!toggle});
    nav.innerHTML=markup;
    const setOpen=open=>{nav.classList.toggle('is-open',open);nav.setAttribute('aria-hidden',String(!open));toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');toggle.textContent=open?'✕':'☰';document.body.classList.toggle('s4u-mobile-nav-open',open);if(!open) nav.querySelectorAll('.mobile-nav-item.open').forEach(i=>i.classList.remove('open'));};
    toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setOpen(!nav.classList.contains('is-open'));});
    nav.addEventListener('click',e=>{const link=e.target.closest('.mobile-nav-item>.mobile-nav-link');if(!link)return;const item=link.closest('.mobile-nav-item');const dd=item?.querySelector(':scope>.mobile-dropdown');if(!dd){setOpen(false);return;}e.preventDefault();const willOpen=!item.classList.contains('open');nav.querySelectorAll('.mobile-nav-item.open').forEach(i=>{if(i!==item)i.classList.remove('open')});item.classList.toggle('open',willOpen);});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('is-open')){setOpen(false);toggle.focus();}});
    window.addEventListener('resize',()=>{if(window.innerWidth>1120)setOpen(false)},{passive:true});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
