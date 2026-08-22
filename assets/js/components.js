/**
 * Global Architecture Component System
 * screenings4u Clean Structural Layout Router & Injector
 */

document.addEventListener("DOMContentLoaded", () => {
    deployHeaderComponent();
    deployFooterComponent();
});

function deployHeaderComponent() {
    const headerNode = document.createElement("header");
    headerNode.className = "app-global-header";
    headerNode.innerHTML = `
        <div class="header-utility-bar">
            <div class="container-constrained utility-flex">
                <span>📍 Operating Nationwide | SAMHSA Certified Collections</span>
                <a href="tel:7732457009" class="utility-phone">📞 Immediate Support: (773) 245-7009</a>
            </div>
        </div>
        <div class="container-constrained main-nav-row">
            screenings<span class="brand-mark">4</span>u</a>
            <button class="mobile-menu-trigger" aria-label="Toggle Navigation Stack">☰</button>
            <nav class="navigation-link-stack">
                <div class="dropdown-trigger-node">
                    <button class="dropdown-btn">Testing Formats ▾</button>
                    <div class="dropdown-panel-menu">
                        <a href="/pages/urine-drug-tests.html">Urine Testing Panels</a>
                        <a href="/pages/oral-drug-testing.html">Oral Fluid Screens</a>
                        <a href="/pages/hair-follicle-tests.html">Hair Follicle Analysis</a>
                        <a href="/pages/etg-alcohol-tests.html">EtG Alcohol Testing</a>
                    </div>
                </div>
                <div class="dropdown-trigger-node">
                    <button class="dropdown-btn">DOT Compliance ▾</button>
                    <div class="dropdown-panel-menu">
                        <a href="/pages/dot-services.html">All DOT Protocols</a>
                        <a href="/pages/dot-consortia.html">Random Pool Consortium</a>
                        <a href="/pages/owner-operator.html">Owner Operator Management</a>
                        <a href="/pages/driver-qualification.html">Driver Qualification Files</a>
                    </div>
                </div>
                <a href="/pages/dot-specimen-collector-training.html" class="static-nav-link">Collector Training</a>
            </nav>
            <div class="header-action-block">
                <a href="https://screenings4u.com" class="btn-core structure-blue small-btn">Client Portal</a>
                <a href="/index.html#marketplace" class="btn-core action-orange small-btn">Order Pass</a>
            </div>
        </div>
    `;
    document.body.insertBefore(headerNode, document.body.firstChild);
    bindMobileHeaderInteractions();
}

function deployFooterComponent() {
    const footerNode = document.createElement("footer");
    footerNode.className = "app-global-footer";
    footerNode.innerHTML = `
        <div class="container-constrained footer-grid-layout">
            <div class="footer-brand-summary">
                <h3>screenings<span class="brand-mark">4</span>u</h3>
                <p>Advanced compliance engine streamlining workplace screening delivery infrastructure across all federal and private commercial channels.</p>
            </div>
            <div class="footer-link-group">
                <h4>Compliance Matrix</h4>
                <a href="/pages/dot-drug-tests.html">DOT Drug Tests</a>
                <a href="/pages/dot-breathalyzer.html">DOT Breathalyzer</a>
                <a href="/pages/new-entrant-audit.html">New Entrant Audits</a>
                <a href="/pages/driver-qualification.html">DQF Management</a>
            </div>
            <div class="footer-contact-summary">
                <h4>Central Operations</h4>
                <p>8537 S Pulaski Rd<br>Chicago, IL 60652</p>
                <p><strong>Hours:</strong> Mon - Fri, 8AM - 8PM CST</p>
                <p><strong>Email:</strong> support@screenings4u.com</p>
            </div>
        </div>
        <div class="footer-bottom-bar">
            <div class="container-constrained bottom-bar-flex">
                <p>&copy; 2026 screenings4u. All rights reserved. A Subsidiary of Roseland Companies, LLC.</p>
                <div class="legal-links">
                    <a href="#">FCRA</a> | <a href="#">Privacy</a> | <a href="#">Terms of Service</a>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(footerNode);
}

function bindMobileHeaderInteractions() {
    const trigger = document.querySelector(".mobile-menu-trigger");
    const layoutStack = document.querySelector(".navigation-link-stack");
    if (trigger && layoutStack) {
        trigger.addEventListener("click", () => {
            layoutStack.classList.toggle("stack-expanded");
            trigger.textContent = layoutStack.classList.contains("stack-expanded") ? "✕" : "☰";
        });
    }
}
