/**
 * screenings4u — Generic Service Detail Page
 */

document.addEventListener("DOMContentLoaded", renderService);

function renderService() {
  const id = new URLSearchParams(window.location.search).get("service");
  const target = document.getElementById("service");
  if (!target) return;

  const product = getTestProduct(id);

  if (!product) {
    target.innerHTML = `
      <div class="error">
        <strong>Service not found.</strong>
        <p>Please return to the services catalog and select an available service.</p>
        <a class="btn btn-outline" href="services.html">Back to Services</a>
      </div>
    `;
    return;
  }

  const paid =
    Number(product.price) > 0 &&
    product.orderType !== "contact" &&
    product.orderType !== "custom_form";

  const destination = paid
    ? `checkout.html?service=${encodeURIComponent(product.id)}`
    : "contact.html";

  const actionLabel = paid ? "Continue to Secure Checkout →" : "Request Information →";

  document.title = `${product.name} | screenings4u`;

  target.innerHTML = `
    <div class="layout">
      <section class="card">
        <div class="eyebrow">${escapeHtml(product.category || "Service")}</div>
        <h1>${escapeHtml(product.name || "")}</h1>
        <p class="lead">${escapeHtml(product.description || "")}</p>
        ${paid ? `<div class="price">${formatTestPrice(product.price, product.currency || "USD")}</div>` : `<div class="price">Custom</div>`}

        <div class="actions">
          <a class="btn btn-orange" href="${destination}">${actionLabel}</a>
          <a class="btn btn-outline" href="services.html">View All Services</a>
        </div>

        <h2>What's Included</h2>
        <ul>
          ${(product.features || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>

        ${
          (product.drugs || []).length
            ? `<h2>Testing Panel</h2><ul>${product.drugs.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
            : ""
        }
      </section>

      <aside class="card meta">
        <div class="meta-row">
          <div class="label">Service</div>
          <div class="value">${escapeHtml(product.shortName || product.name || "")}</div>
        </div>
        <div class="meta-row">
          <div class="label">Category</div>
          <div class="value">${escapeHtml(product.category || "")}</div>
        </div>
        <div class="meta-row">
          <div class="label">Specimen</div>
          <div class="value">${escapeHtml(product.specimen || "N/A")}</div>
        </div>
        <div class="meta-row">
          <div class="label">Results / Access</div>
          <div class="value">${escapeHtml(product.results || "See service details")}</div>
        </div>
      </aside>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
