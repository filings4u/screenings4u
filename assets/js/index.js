/**
 * Homepage Interface State Matrix Controller
 * screenings4u Functional Application Pipeline Engine
 */

document.addEventListener("DOMContentLoaded", () => {
    executeMarketplaceMatrixRender();
});

const infrastructureCatalog = [
    {
        title: "Urine Testing Solutions",
        description: "Standard workplace, compliance, and pre-employment testing matrices. Fully certified 5, 9, 10, and 12-panel non-DOT and DOT screening protocols.",
        destinationPage: "pages/urine-drug-tests.html"
    },
    {
        title: "Oral Fluid Testing Panels",
        description: "100% observed fluid drug testing panels engineered for fast turnaround and accurate identification of immediate recent drug usage windows.",
        destinationPage: "pages/oral-drug-testing.html"
    },
    {
        title: "Hair Follicle Analysis",
        description: "Extended long-term testing configurations delivering a secure 90-day drug use history overview for corporate executive positioning and court audits.",
        destinationPage: "pages/hair-follicle-tests.html"
    },
    {
        title: "EtG & Alcohol Diagnostics",
        description: "Regulated DOT breath alcohol monitoring and non-DOT forensic urine EtG diagnostic biomarker analysis tracking safety-sensitive workloads.",
        destinationPage: "pages/etg-alcohol-tests.html"
    },
    {
        title: "Federal DOT Compliance Suite",
        description: "Complete business fleet protection modules encompassing FMCSA random consortium pool configuration setups, DQF auditing, and physical scheduling.",
        destinationPage: "pages/dot-services.html"
    },
    {
        title: "DOT Collector Certification",
        description: "Comprehensive multi-tier professional specimen collector training frameworks ranging from core compliance setups up to train-the-trainer credentials.",
        destinationPage: "pages/dot-specimen-collector-training.html"
    }
];

function executeMarketplaceMatrixRender() {
    const gridTargetView = document.getElementById("coreServiceGridTarget");
    if (!gridTargetView) return;

    gridTargetView.innerHTML = infrastructureCatalog.map(catalogItem => `
        <article class="app-premium-card">
            <div>
                <h3>${catalogItem.title}</h3>
                <p>${catalogItem.description}</p>
            </div>
            <div>
                <a href="${catalogItem.destinationPage}" class="app-card-anchor-link">
                    Explore Testing Matrix <span>&rarr;</span>
                </a>
            </div>
        </article>
    `).join('');
}
