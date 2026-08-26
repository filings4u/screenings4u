/**
 * screenings4u — Services Catalog
 *
 * Front-end terminology is SERVICE throughout.
 *
 * This file expects test-price-list.js to expose:
 *
 *   getAllTestServices()
 *
 * Each service should provide the fields used below, including:
 *   id
 *   name
 *   description
 *   category
 *   price
 *   currency
 *   orderType
 */

"use strict";

document.addEventListener(
  "DOMContentLoaded",
  renderServiceCatalog
);

let activeCategory = "All";


/* =========================================================
   RENDER SERVICE CATALOG
========================================================= */

function renderServiceCatalog() {

  const services =
    typeof getAllTestServices === "function"
      ? getAllTestServices()
      : [];

  const filters =
    document.getElementById("filters");

  const catalog =
    document.getElementById("catalog");

  if (!catalog) {
    console.error(
      "Services catalog element #catalog was not found."
    );
    return;
  }

  /*
   * If the service catalog helper is missing, show a useful
   * error instead of leaving the page stuck on "Loading".
   */
  if (
    typeof getAllTestServices !== "function"
  ) {

    catalog.innerHTML = `
      <div class="empty">
        <strong>Services could not be loaded.</strong>
        <p>
          The service catalog could not be initialized.
          Please make sure test-price-list.js is loaded
          before services.js.
        </p>
      </div>
    `;

    if (filters) {
      filters.innerHTML = "";
    }

    console.error(
      "getAllTestServices() is not available. Check test-price-list.js."
    );

    return;
  }

  const categories = [
    "All",
    ...new Set(
      services
        .map(service => service.category)
        .filter(Boolean)
    )
  ];

  if (filters) {

    filters.innerHTML =
      categories
        .map(category => `
          <button
            class="filter ${
              category === "All"
                ? "active"
                : ""
            }"
            type="button"
            data-category="${escapeHtml(category)}"
          >
            ${escapeHtml(category)}
          </button>
        `)
        .join("");

    filters
      .querySelectorAll("[data-category]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            activeCategory =
              button.dataset.category;

            filters
              .querySelectorAll(".filter")
              .forEach(filterButton => {
                filterButton.classList.remove(
                  "active"
                );
              });

            button.classList.add(
              "active"
            );

            renderServiceCards(
              services,
              catalog
            );
          }
        );
      });
  }

  renderServiceCards(
    services,
    catalog
  );
}


/* =========================================================
   RENDER SERVICE CARDS
========================================================= */

function renderServiceCards(
  services,
  catalog
) {

  const filteredServices =
    activeCategory === "All"
      ? services
      : services.filter(
          service =>
            service.category === activeCategory
        );

  if (!filteredServices.length) {

    catalog.innerHTML = `
      <div class="empty">
        No services found in this category.
      </div>
    `;

    return;
  }

  catalog.innerHTML =
    filteredServices
      .map(service => {

        const paid =
          Number(service.price) > 0 &&
          service.orderType !== "contact" &&
          service.orderType !== "custom_form";

        /*
         * Everything routes with ?service=...
         * There is intentionally no ?product=...
         */
        const destination =
          "service.html?service=" +
          encodeURIComponent(
            service.id
          );

        return `
          <article class="card">

            <div class="tag">
              ${escapeHtml(
                service.category ||
                "Service"
              )}
            </div>

            <h3>
              ${escapeHtml(
                service.name || ""
              )}
            </h3>

            <p>
              ${escapeHtml(
                service.description ||
                "Review this service and available options."
              )}
            </p>

            <div class="card-bottom">

              <div class="price">
                ${
                  paid
                    ? formatServicePrice(
                        service.price,
                        service.currency ||
                        "USD"
                      )
                    : "Custom"
                }
              </div>

              <a
                class="link"
                href="${destination}"
              >
                ${
                  paid
                    ? "View & Buy →"
                    : "View Service →"
                }
              </a>

            </div>

          </article>
        `;
      })
      .join("");
}


/* =========================================================
   SERVICE PRICE FORMATTER
========================================================= */

function formatServicePrice(
  amount,
  currency = "USD"
) {

  /*
   * Use the shared formatter when it exists.
   * This keeps the catalog compatible with the current
   * test-price-list.js implementation.
   */
  if (
    typeof formatTestPrice === "function"
  ) {

    return formatTestPrice(
      amount,
      currency
    );
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: String(
        currency || "USD"
      ).toUpperCase()
    }
  ).format(
    Number(amount) || 0
  );
}


/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}