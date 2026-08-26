/**
 * screenings4u — Generic Service Detail Page
 *
 * SERVICE-ONLY FRONTEND
 *
 * URL:
 *   service.html?service=SERVICE_ID
 *
 * This page intentionally uses service terminology throughout.
 */

"use strict";

document.addEventListener(
  "DOMContentLoaded",
  renderService
);


/* =========================================================
   RENDER SERVICE
========================================================= */

function renderService() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const serviceId =
    params.get("service");

  const target =
    document.getElementById("service");

  if (!target) {
    return;
  }


  /* -------------------------------------------------------
     Validate service ID
  ------------------------------------------------------- */

  if (!serviceId) {

    renderServiceError(
      target,
      "No service was selected.",
      "Please return to the services catalog and select a service."
    );

    return;
  }


  /* -------------------------------------------------------
     Load service
  ------------------------------------------------------- */

  if (
    typeof getTestService !== "function"
  ) {

    renderServiceError(
      target,
      "Service catalog unavailable.",
      "The service catalog could not be loaded. Please refresh the page and try again."
    );

    console.error(
      "getTestService() is not available. Make sure test-price-list.js loads before service.js."
    );

    return;
  }


  const service =
    getTestService(
      serviceId
    );


  if (!service) {

    renderServiceError(
      target,
      "Service not found.",
      "Please return to the services catalog and select an available service."
    );

    return;
  }


  /* -------------------------------------------------------
     Determine checkout behavior
  ------------------------------------------------------- */

  const paid =
    Number(service.price) > 0 &&
    service.orderType !== "contact" &&
    service.orderType !== "custom_form";


  const destination =
    paid
      ? "checkout.html?service=" +
        encodeURIComponent(
          service.id
        )
      : "contact.html";


  const actionLabel =
    paid
      ? "Continue to Secure Checkout →"
      : "Request Information →";


  document.title =
    (service.name || "Service") +
    " | screenings4u";


  /* -------------------------------------------------------
     Features
  ------------------------------------------------------- */

  const features =
    Array.isArray(service.features)
      ? service.features
      : [];


  const drugs =
    Array.isArray(service.drugs)
      ? service.drugs
      : [];


  const featuresHtml =
    features.length
      ? features
          .map(
            item => `
              <li>
                ${escapeHtml(item)}
              </li>
            `
          )
          .join("")
      : `
          <li>
            See service details.
          </li>
        `;


  const drugsHtml =
    drugs.length
      ? `
          <h2>Testing Panel</h2>

          <ul>
            ${drugs
              .map(
                item => `
                  <li>
                    ${escapeHtml(item)}
                  </li>
                `
              )
              .join("")}
          </ul>
        `
      : "";


  /* -------------------------------------------------------
     Render page
  ------------------------------------------------------- */

  target.innerHTML = `
    <div class="layout">

      <section class="card">

        <div class="eyebrow">
          ${escapeHtml(
            service.category ||
            "Service"
          )}
        </div>

        <h1>
          ${escapeHtml(
            service.name || ""
          )}
        </h1>

        <p class="lead">
          ${escapeHtml(
            service.description || ""
          )}
        </p>

        ${
          paid
            ? `
              <div class="price">
                ${formatServicePrice(
                  service.price,
                  service.currency ||
                  "USD"
                )}
              </div>
            `
            : `
              <div class="price">
                Custom
              </div>
            `
        }

        <div class="actions">

          <a
            class="btn btn-orange"
            href="${destination}"
          >
            ${actionLabel}
          </a>

          <a
            class="btn btn-outline"
            href="services.html"
          >
            View All Services
          </a>

        </div>


        <h2>
          What's Included
        </h2>

        <ul>
          ${featuresHtml}
        </ul>

        ${drugsHtml}

      </section>


      <aside class="card meta">

        <div class="meta-row">

          <div class="label">
            Service
          </div>

          <div class="value">
            ${escapeHtml(
              service.shortName ||
              service.name ||
              ""
            )}
          </div>

        </div>


        <div class="meta-row">

          <div class="label">
            Category
          </div>

          <div class="value">
            ${escapeHtml(
              service.category ||
              ""
            )}
          </div>

        </div>


        <div class="meta-row">

          <div class="label">
            Specimen
          </div>

          <div class="value">
            ${escapeHtml(
              service.specimen ||
              "N/A"
            )}
          </div>

        </div>


        <div class="meta-row">

          <div class="label">
            Results / Access
          </div>

          <div class="value">
            ${escapeHtml(
              service.results ||
              "See service details"
            )}
          </div>

        </div>

      </aside>

    </div>
  `;
}


/* =========================================================
   SERVICE ERROR
========================================================= */

function renderServiceError(
  target,
  heading,
  message
) {

  target.innerHTML = `
    <div class="error">

      <strong>
        ${escapeHtml(heading)}
      </strong>

      <p>
        ${escapeHtml(message)}
      </p>

      <a
        class="btn btn-outline"
        href="services.html"
      >
        Back to Services
      </a>

    </div>
  `;
}


/* =========================================================
   SERVICE PRICE FORMATTER
========================================================= */

function formatServicePrice(
  amount,
  currency = "USD"
) {

  /*
   * Keep compatibility with the shared price formatter
   * while removing the service page's dependency on any
   * product terminology.
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