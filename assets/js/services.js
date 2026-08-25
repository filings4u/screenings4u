/**
 * screenings4u — Services Catalog
 */

document.addEventListener("DOMContentLoaded", () => {
  renderServiceCatalog();
});

let activeCategory = "All";

function renderServiceCatalog() {
  const products = getAllTestProducts();
  const categories = ["All", ...new Set(products.map((p) => p.category).filter(Boolean))];
  const filters = document.getElementById("filters");
  const catalog = document.getElementById("catalog");

  if (!filters || !catalog) return;

  filters.innerHTML = categories.map((category) => `
    <button
      class="filter ${category === "All" ? "active" : ""}"
      type="button"
      data-category="${escapeHtml(category)}"
    >${escapeHtml(category)}</button>
  `).join("");

  filters.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      filters.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      renderCards(products, catalog);
    });
  });

  renderCards(products, catalog);
}

function renderCards(products, catalog) {
  const filtered = activeCategory === "All"
    ? products
    : products.filter((p) => p.category === activeCategory);

  catalog.innerHTML = filtered.map((product) => {
    const paid = Number(product.price) > 0 && product.orderType !== "contact" && product.orderType !== "custom_form";
    const destination = `service.html?service=${encodeURIComponent(product.id)}`;

    return `
      <article class="card">
        <div class="tag">${escapeHtml(product.category || "Service")}</div>
        <h3>${escapeHtml(product.name || "")}</h3>
        <p>${escapeHtml(product.description || "Review this service and available options.")}</p>
        <div class="card-bottom">
          <div class="price">${paid ? formatTestPrice(product.price, product.currency || "USD") : "Custom"}</div>
          <a class="link" href="${destination}">
            ${paid ? "View & Buy →" : "View Service →"}
          </a>
        </div>
      </article>
    `;
  }).join("");

  if (!filtered.length) {
    catalog.innerHTML = `<div class="empty">No services found in this category.</div>`;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
