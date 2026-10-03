(() => {
  "use strict";

  const BREAKPOINT = 1080;

  const chevron = `<span class="s4u-chevron" aria-hidden="true"><svg viewBox="0 0 12 8"><path d="M1.5 1.5 6 6l4.5-4.5"/></svg></span>`;

  const desktopMarkup = `
    <nav class="s4u-primary-nav" aria-label="Primary navigation">
      <a class="s4u-nav-link" href="index.html">Home</a>

      <div class="s4u-nav-group">
        <button class="s4u-nav-link s4u-nav-trigger" type="button" aria-expanded="false">Testing ${chevron}</button>
        <div class="s4u-mega-menu" role="menu">
          <div class="s4u-mega-head">
            <div><span>Testing Services</span><strong>Choose the testing service that fits the situation.</strong></div>
            <a href="services.html">View all testing services →</a>
          </div>
          <div class="s4u-mega-grid s4u-mega-grid-4">
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Individuals</span>
              <a href="personal-drug-and-alcohol-testing.html"><strong>Personal Testing</strong><small>Drug and alcohol testing for personal needs.</small></a>
              <a href="court-ordered-etg-drug-and-alcohol-testing.html"><strong>Court-Ordered / EtG</strong><small>Testing for court, monitoring and documentation needs.</small></a>
              <a href="nursing-school-drug-tests.html"><strong>Nursing School Testing</strong><small>Testing for nursing and healthcare programs.</small></a>
              <a href="dna-tests-chicago-il.html"><strong>DNA Testing — Chicago</strong><small>Local DNA collection and testing services.</small></a>
            </div>
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Employers</span>
              <a href="workplace-drug-and-alcohol-testing.html"><strong>Workplace Testing</strong><small>Employer drug and alcohol testing programs.</small></a>
              <a href="mobile-drug-and-alcohol-testing.html"><strong>Mobile & On-Site Testing</strong><small>Bring collection services to the workplace or jobsite.</small></a>
              <a href="post-accident-testing.html"><strong>Post-Accident Testing</strong><small>Coordinate testing after a workplace incident.</small></a>
              <a href="background-checks.html"><strong>Background Checks</strong><small>Screening support for hiring and workforce decisions.</small></a>
            </div>
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Alcohol & Specialty</span>
              <a href="non-dot-breathalyzer-services.html"><strong>NON-DOT Breath Alcohol</strong><small>Breath alcohol testing outside DOT programs.</small></a>
              <a href="dot-breathalyzer-services.html"><strong>DOT Alcohol Testing</strong><small>DOT breath alcohol testing services.</small></a>
              <a href="dot-urine-drug-tests.html"><strong>DOT Urine Drug Testing</strong><small>DOT urine testing for regulated programs.</small></a>
              <a href="dot-physical-exam-services.html"><strong>DOT Physical Exams</strong><small>Physical exam support for covered drivers.</small></a>
            </div>
            <div class="s4u-mega-feature">
              <span class="s4u-mega-label">Need testing at your location?</span>
              <strong>Mobile testing can reduce employee travel and downtime.</strong>
              <p>Request a coordinated workplace, fleet, jobsite or scheduled collection visit.</p>
              <a class="s4u-mega-cta" href="mobile-testing-request.html">Request mobile testing →</a>
            </div>
          </div>
        </div>
      </div>

      <div class="s4u-nav-group">
        <button class="s4u-nav-link s4u-nav-trigger" type="button" aria-expanded="false">Employers ${chevron}</button>
        <div class="s4u-mega-menu" role="menu">
          <div class="s4u-mega-head">
            <div><span>Employer Programs</span><strong>Testing, program review and operational compliance support.</strong></div>
            <a href="business-services.html">View employer services →</a>
          </div>
          <div class="s4u-mega-grid s4u-mega-grid-4">
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Testing Programs</span>
              <a href="workplace-drug-and-alcohol-testing.html"><strong>Workplace Testing</strong><small>Drug and alcohol testing for employers.</small></a>
              <a href="mobile-drug-and-alcohol-testing.html"><strong>Mobile & On-Site Testing</strong><small>Collections at workplaces and jobsites.</small></a>
              <a href="industries-served.html"><strong>Industries Served</strong><small>Testing support across workforce environments.</small></a>
              <a href="drug-testing-management-software.html"><strong>Workforce Management Platforms</strong><small>Choose DOT or NON-DOT program management on the correct website.</small></a>
            </div>
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Program Reviews</span>
              <a href="program-assessment.html"><strong>Program Assessment</strong><small>Review the structure of the current program.</small></a>
              <a href="testing-workflow-review.html"><strong>Testing Workflow Review</strong><small>Evaluate how testing events move through the operation.</small></a>
              <a href="recordkeeping-review.html"><strong>Recordkeeping Review</strong><small>Review organization, access and documentation practices.</small></a>
              <a href="policy-review.html"><strong>Policy Review</strong><small>Review policy language and program components.</small></a>
            </div>
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Compliance Support</span>
              <a href="consulting-services.html"><strong>Compliance Consulting</strong><small>Practical DOT and non-DOT consulting support.</small></a>
              <a href="compliance-guidance.html"><strong>Compliance Guidance</strong><small>Direction when your team is unsure what comes next.</small></a>
              <a href="drug-alcohol-policy-creation.html"><strong>Policy Creation</strong><small>Build drug and alcohol policy documentation.</small></a>
              <a href="house-lab-account-setup.html"><strong>Lab Account Setup</strong><small>Testing infrastructure and laboratory account support.</small></a>
            </div>
            <div class="s4u-mega-feature">
              <span class="s4u-mega-label">Workforce Platforms</span>
              <strong>Use the platform built for your program.</strong>
              <p>Access dedicated DOT and non-DOT workforce services.</p>
              <div class="s4u-mega-feature-links">
                <a href="https://dot.screenings4u.com/" target="_blank" rel="noopener noreferrer">Workforce DOT →</a>
                <a href="https://workforce.screenings4u.com/" target="_blank" rel="noopener noreferrer">Workforce NON DOT →</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="s4u-nav-group">
        <button class="s4u-nav-link s4u-nav-trigger" type="button" aria-expanded="false">Business ${chevron}</button>
        <div class="s4u-mega-menu" role="menu">
          <div class="s4u-mega-head">
            <div><span>Build & Grow</span><strong>Infrastructure, training and growth services for testing businesses.</strong></div>
            <a href="business-services.html">Explore business services →</a>
          </div>
          <div class="s4u-mega-grid s4u-mega-grid-4">
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Start a Business</span>
              <a href="start-a-drug-testing-business.html"><strong>Start a Drug Testing Business</strong><small>Launch packages for a professional testing company.</small></a>
              <a href="start-a-mobile-drug-testing-business.html"><strong>Start a Mobile Testing Business</strong><small>Build a mobile collection business model.</small></a>
              <a href="ctpa-custom-solutions.html"><strong>C/TPA Custom Solutions</strong><small>Choose DOT or NON-DOT C/TPA services on the correct workforce website.</small></a>
            </div>
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Operations</span>
              <a href="house-lab-account-setup.html"><strong>Lab Account Setup</strong><small>Set up testing infrastructure and lab support.</small></a>
              <a href="drug-testing-management-software.html"><strong>Workforce Management Platforms</strong><small>Route to DOT or NON-DOT workforce management.</small></a>
              <a href="specimen_collector_training_supplies.html"><strong>Collector Supplies</strong><small>Collection supplies and training resources.</small></a>
            </div>
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Network & Training</span>
              <a href="join-our-collector-network.html"><strong>Join the Collector Network</strong><small>Apply to join the screenings4u collection network.</small></a>
              <a href="dot-specimen-collector-training.html"><strong>DOT Collector Training</strong><small>Training for DOT specimen collection work.</small></a>
              <a href="dot-specimen-collector-training-group-training.html"><strong>Group Collector Training</strong><small>Training options for teams and organizations.</small></a>
            </div>
            <div class="s4u-mega-feature">
              <span class="s4u-mega-label">Launching a testing company?</span>
              <strong>Build the systems around the service.</strong>
              <p>Compare launch packages for training, lab setup, branding, operations and growth.</p>
              <a class="s4u-mega-cta" href="start-a-drug-testing-business.html">View launch packages →</a>
            </div>
          </div>
        </div>
      </div>

      <div class="s4u-nav-group">
        <button class="s4u-nav-link s4u-nav-trigger" type="button" aria-expanded="false">DOT & Compliance ${chevron}</button>
        <div class="s4u-mega-menu" role="menu">
          <div class="s4u-mega-head">
            <div><span>DOT & Compliance</span><strong>Testing and compliance support for regulated programs.</strong></div>
            <a href="dot-services.html">View DOT services →</a>
          </div>
          <div class="s4u-mega-grid s4u-mega-grid-4">
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">DOT Testing</span>
              <a href="dot-urine-drug-tests.html"><strong>DOT Urine Drug Testing</strong><small>DOT urine drug testing services.</small></a>
              <a href="dot-breathalyzer-services.html"><strong>DOT Alcohol Testing</strong><small>DOT breath alcohol testing services.</small></a>
              <a href="dot-physical-exam-services.html"><strong>DOT Physical Exams</strong><small>Physical exam services for covered drivers.</small></a>
            </div>
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Compliance</span>
              <a href="consulting-services.html"><strong>Compliance Consulting</strong><small>Program, policy, recordkeeping and workflow support.</small></a>
              <a href="fmcsa-dot-new-entrant-audit.html"><strong>FMCSA New Entrant Audit</strong><small>Continue to Workforce DOT for audit preparation and compliance support.</small></a>
              <a href="audit-preparation.html"><strong>Audit Preparation</strong><small>Organize documentation before a review.</small></a>
              <a href="compliance-guidance.html"><strong>Compliance Guidance</strong><small>Practical support for program questions.</small></a>
            </div>
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Policies & Training</span>
              <a href="drug-alcohol-policy-creation.html"><strong>Drug & Alcohol Policy Creation</strong><small>Build workplace testing policy documentation.</small></a>
              <a href="dot-specimen-collector-training.html"><strong>DOT Collector Training</strong><small>DOT specimen collection training.</small></a>
              <a href="What-is-FMCSA-49-CFR-Part-382-Regulation.html"><strong>FMCSA 49 CFR Part 382</strong><small>Learn about the FMCSA testing framework.</small></a>
            </div>
            <div class="s4u-mega-feature">
              <span class="s4u-mega-label">New motor carrier?</span>
              <strong>Prepare before the New Entrant Safety Audit arrives.</strong>
              <p>Review driver, testing, HOS, vehicle and safety records before the audit.</p>
              <a class="s4u-mega-cta" href="fmcsa-dot-new-entrant-audit.html">Explore audit support →</a>
            </div>
          </div>
        </div>
      </div>

      <div class="s4u-nav-group">
        <button class="s4u-nav-link s4u-nav-trigger" type="button" aria-expanded="false">Resources ${chevron}</button>
        <div class="s4u-mega-menu s4u-mega-menu-compact" role="menu">
          <div class="s4u-mega-head">
            <div><span>Resources</span><strong>Answers, company information and support.</strong></div>
          </div>
          <div class="s4u-mega-grid s4u-mega-grid-3">
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Learn</span>
              <a href="blog.html"><strong>Blog</strong><small>Articles and testing information.</small></a>
              <a href="faqs.html"><strong>FAQs</strong><small>Answers to common testing questions.</small></a>
            </div>
            <div class="s4u-mega-column">
              <span class="s4u-mega-label">Company</span>
              <a href="about-us.html"><strong>About Us</strong><small>Learn more about screenings4u.</small></a>
              <a href="contact.html"><strong>Contact Us</strong><small>Talk with our team.</small></a>
            </div>
            <div class="s4u-mega-feature">
              <span class="s4u-mega-label">System Status</span>
              <strong>Check service availability.</strong>
              <p>View current service and platform status information.</p>
              <a class="s4u-mega-cta" href="status.html">View system status →</a>
            </div>
          </div>
        </div>
      </div>
    </nav>`;

  const mobileMarkup = `
    <nav class="s4u-mobile-menu" aria-label="Mobile navigation">
      <a class="s4u-mobile-link" href="index.html">Home</a>

      <div class="s4u-mobile-group">
        <button class="s4u-mobile-link s4u-mobile-trigger" type="button" aria-expanded="false">Testing <span aria-hidden="true">+</span></button>
        <div class="s4u-mobile-submenu">
          <a href="services.html">All Testing Services</a>
          <a href="personal-drug-and-alcohol-testing.html">Personal Testing</a>
          <a href="workplace-drug-and-alcohol-testing.html">Workplace Testing</a>
          <a href="mobile-drug-and-alcohol-testing.html">Mobile & On-Site Testing</a>
          <a href="post-accident-testing.html">Post-Accident Testing</a>
          <a href="court-ordered-etg-drug-and-alcohol-testing.html">Court-Ordered / EtG Testing</a>
          <a href="non-dot-breathalyzer-services.html">NON-DOT Breath Alcohol</a>
          <a href="nursing-school-drug-tests.html">Nursing School Testing</a>
          <a href="background-checks.html">Background Checks</a>
          <a href="dna-tests-chicago-il.html">DNA Testing — Chicago</a>
        </div>
      </div>

      <div class="s4u-mobile-group">
        <button class="s4u-mobile-link s4u-mobile-trigger" type="button" aria-expanded="false">Employers <span aria-hidden="true">+</span></button>
        <div class="s4u-mobile-submenu">
          <a href="business-services.html">Employer Services</a>
          <a href="workplace-drug-and-alcohol-testing.html">Workplace Testing</a>
          <a href="mobile-drug-and-alcohol-testing.html">Mobile & On-Site Testing</a>
          <a href="program-assessment.html">Program Assessment</a>
          <a href="testing-workflow-review.html">Testing Workflow Review</a>
          <a href="recordkeeping-review.html">Recordkeeping Review</a>
          <a href="policy-review.html">Policy Review</a>
          <a href="consulting-services.html">Compliance Consulting</a>
          <a href="compliance-guidance.html">Compliance Guidance</a>
          <a href="drug-alcohol-policy-creation.html">Policy Creation</a>
          <a href="drug-testing-management-software.html">Workforce Management Platforms</a>
          <a href="house-lab-account-setup.html">Lab Account Setup</a>
          <a href="industries-served.html">Industries Served</a>
          <a href="https://dot.screenings4u.com/" target="_blank" rel="noopener noreferrer">Workforce DOT</a>
          <a href="https://workforce.screenings4u.com/" target="_blank" rel="noopener noreferrer">Workforce NON DOT</a>
        </div>
      </div>

      <div class="s4u-mobile-group">
        <button class="s4u-mobile-link s4u-mobile-trigger" type="button" aria-expanded="false">Business <span aria-hidden="true">+</span></button>
        <div class="s4u-mobile-submenu">
          <a href="business-services.html">Business Services</a>
          <a href="start-a-drug-testing-business.html">Start a Drug Testing Business</a>
          <a href="start-a-mobile-drug-testing-business.html">Start a Mobile Testing Business</a>
          <a href="ctpa-custom-solutions.html">C/TPA Custom Solutions</a>
          <a href="house-lab-account-setup.html">Lab Account Setup</a>
          <a href="drug-testing-management-software.html">Workforce Management Platforms</a>
          <a href="join-our-collector-network.html">Collector Network</a>
          <a href="dot-specimen-collector-training.html">DOT Collector Training</a>
        </div>
      </div>

      <div class="s4u-mobile-group">
        <button class="s4u-mobile-link s4u-mobile-trigger" type="button" aria-expanded="false">DOT & Compliance <span aria-hidden="true">+</span></button>
        <div class="s4u-mobile-submenu">
          <a href="dot-services.html">DOT Services</a>
          <a href="dot-urine-drug-tests.html">DOT Urine Drug Testing</a>
          <a href="dot-breathalyzer-services.html">DOT Alcohol Testing</a>
          <a href="dot-physical-exam-services.html">DOT Physical Exams</a>
          <a href="consulting-services.html">Compliance Consulting</a>
          <a href="fmcsa-dot-new-entrant-audit.html">FMCSA New Entrant Audit</a>
          <a href="audit-preparation.html">Audit Preparation</a>
          <a href="compliance-guidance.html">Compliance Guidance</a>
          <a href="drug-alcohol-policy-creation.html">Policy Creation</a>
          <a href="dot-specimen-collector-training.html">DOT Collector Training</a>
        </div>
      </div>

      <div class="s4u-mobile-group">
        <button class="s4u-mobile-link s4u-mobile-trigger" type="button" aria-expanded="false">Resources <span aria-hidden="true">+</span></button>
        <div class="s4u-mobile-submenu">
          <a href="blog.html">Blog</a>
          <a href="faqs.html">FAQs</a>
          <a href="about-us.html">About Us</a>
          <a href="contact.html">Contact Us</a>
          <a href="status.html">System Status</a>
        </div>
      </div>

      <div class="s4u-mobile-actions">
        <a class="s4u-btn s4u-btn-secondary" href="https://customers.screenings4u.com/login.html">Sign In</a>
        <a class="s4u-btn s4u-btn-primary" href="services.html">Order a Test</a>
      </div>
    </nav>`;

  const closeDesktopGroups = except => {
    document.querySelectorAll(".s4u-nav-group.is-open").forEach(group => {
      if (group !== except) {
        group.classList.remove("is-open");
        group.querySelector(".s4u-nav-trigger")?.setAttribute("aria-expanded", "false");
      }
    });
  };

  const markCurrent = root => {
    const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    root.querySelectorAll("a[href]").forEach(link => {
      const href = link.getAttribute("href") || "";
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      const file = href.split("?")[0].split("#")[0].split("/").pop().toLowerCase();
      if (file === current) link.classList.add("is-current");
    });
  };

  const render = () => {
    const target = document.getElementById("siteHeader");
    if (!target || target.dataset.ready === "1") return;
    target.dataset.ready = "1";

    target.innerHTML = `
      <header class="s4u-site-header">
        <div class="s4u-nav-card">
          <a class="s4u-brand" href="index.html" aria-label="screenings4u home">
            <img src="images/logo.png" alt="screenings4u" width="1261" height="237">
          </a>
          ${desktopMarkup}
          <div class="s4u-nav-actions">
            <a class="s4u-signin" href="https://customers.screenings4u.com/login.html">Sign In</a>
            <a class="s4u-order" href="services.html">Order a Test</a>
          </div>
          <button class="s4u-menu-toggle" id="s4uShellToggle" type="button" aria-expanded="false" aria-controls="s4uShellMobileNav" aria-label="Open menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>
      <div class="s4u-mobile-drawer" id="s4uShellMobileNav" aria-hidden="true">${mobileMarkup}</div>`;

    markCurrent(target);

    const toggle = document.getElementById("s4uShellToggle");
    const drawer = document.getElementById("s4uShellMobileNav");

    const setMobileOpen = open => {
      drawer?.classList.toggle("is-open", open);
      drawer?.setAttribute("aria-hidden", String(!open));
      toggle?.classList.toggle("is-open", open);
      toggle?.setAttribute("aria-expanded", String(open));
      toggle?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("s4u-shell-menu-open", open);
      if (!open) {
        drawer?.querySelectorAll(".s4u-mobile-group.is-open").forEach(group => {
          group.classList.remove("is-open");
          group.querySelector(".s4u-mobile-trigger")?.setAttribute("aria-expanded", "false");
        });
      }
    };

    toggle?.addEventListener("click", event => {
      event.preventDefault();
      setMobileOpen(!drawer?.classList.contains("is-open"));
    });

    target.querySelectorAll(".s4u-nav-group").forEach(group => {
      const trigger = group.querySelector(".s4u-nav-trigger");
      const menu = group.querySelector(".s4u-mega-menu");

      const openGroup = () => {
        if (window.innerWidth <= BREAKPOINT) return;
        closeDesktopGroups(group);
        group.classList.add("is-open");
        trigger?.setAttribute("aria-expanded", "true");
      };

      trigger?.addEventListener("mouseenter", openGroup);
      menu?.addEventListener("mouseenter", openGroup);

      trigger?.addEventListener("focus", openGroup);

      trigger?.addEventListener("click", event => {
        if (window.innerWidth <= BREAKPOINT) return;
        event.preventDefault();
        event.stopPropagation();
        const isOpen = group.classList.contains("is-open");
        closeDesktopGroups(null);
        if (!isOpen) {
          group.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });

      menu?.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => closeDesktopGroups(null));
      });
    });

    target.addEventListener("click", event => {
      const mobileTrigger = event.target.closest(".s4u-mobile-trigger");
      if (mobileTrigger) {
        const group = mobileTrigger.closest(".s4u-mobile-group");
        const willOpen = !group.classList.contains("is-open");
        drawer.querySelectorAll(".s4u-mobile-group.is-open").forEach(item => {
          if (item !== group) {
            item.classList.remove("is-open");
            item.querySelector(".s4u-mobile-trigger")?.setAttribute("aria-expanded", "false");
          }
        });
        group.classList.toggle("is-open", willOpen);
        mobileTrigger.setAttribute("aria-expanded", String(willOpen));
        return;
      }

      if (event.target.closest(".s4u-mobile-submenu a, .s4u-mobile-actions a, .s4u-mobile-menu > a")) setMobileOpen(false);
    });

    document.addEventListener("click", event => {
      if (!target.contains(event.target)) closeDesktopGroups(null);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeDesktopGroups(null);
        setMobileOpen(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > BREAKPOINT) setMobileOpen(false);
      else closeDesktopGroups(null);
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();