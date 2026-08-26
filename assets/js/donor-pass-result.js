/**
 * screenings4u — Donor Pass Result
 *
 * Loads a paid order by S4U tracking number/order UUID,
 * loads the assigned donor testing location,
 * and renders the donor pass.
 *
 * S4U tracking number is the customer-facing identifier.
 * The order UUID is retained internally for reliable lookup.
 */

"use strict";

document.addEventListener("DOMContentLoaded", initDonorPassResult);

async function initDonorPassResult() {
  const params = new URLSearchParams(window.location.search);

  const orderId = String(
    params.get("order") || ""
  ).trim();

  const tracking = String(
    params.get("tracking") || ""
  ).trim();

  if (!tracking && !orderId) {
    showNotice(
      "No S4U tracking number or order was provided.",
      "error"
    );
    return;
  }

  document
    .getElementById("printButton")
    ?.addEventListener("click", () => {
      window.print();
    });

  document
    .getElementById("downloadButton")
    ?.addEventListener("click", downloadDonorPass);

  try {
    const order = await loadOrder(
      tracking,
      orderId
    );

    const actualTracking =
      order.tracking_number || tracking;

    const location = await loadLocation(
      order.id,
      actualTracking
    );

    renderOrder(
      order,
      actualTracking
    );

    renderLocation(location);

    /*
     * Keep the URL carrying both identifiers.
     * This makes refreshes and future delivery
     * workflows more reliable.
     */
    updatePageUrl(
      order.id,
      actualTracking
    );
  } catch (error) {
    console.error(
      "Donor pass load error:",
      error
    );

    showNotice(
      error?.message ||
        "Unable to load your donor pass.",
      "error"
    );
  }
}

/*
 * =========================================================
 * SUPABASE CLIENT
 * =========================================================
 */

async function loadExternalScript(src, test) {
  if (typeof test === "function" && test()) {
    return;
  }

  await new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-screenings4u-loader="${src}"]`
    );

    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");

    script.src = src;
    script.async = false;
    script.dataset.screenings4uLoader = src;

    script.onload = resolve;
    script.onerror = () => {
      reject(
        new Error(
          `Unable to load required script: ${src}`
        )
      );
    };

    document.head.appendChild(script);
  });
}

async function getSupabaseClient() {
  /*
   * Preferred shared application client.
   */
  if (
    typeof window.getScreenings4uSupabase ===
    "function"
  ) {
    const client =
      await window.getScreenings4uSupabase();

    if (client) {
      return client;
    }
  }

  /*
   * Existing global client fallback.
   */
  if (window.screenings4uSupabase) {
    return window.screenings4uSupabase;
  }

  /*
   * This page must be able to work even when the shared
   * supabase-client.js is not loaded. Load the public site
   * configuration and browser Supabase SDK directly.
   */
  await loadExternalScript(
    "assets/js/site-config.js",
    () =>
      Boolean(
        window.SCREENINGS4U_SUPABASE_URL &&
        window.SCREENINGS4U_SUPABASE_ANON_KEY
      )
  );

  await loadExternalScript(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    () =>
      Boolean(
        window.supabase &&
        typeof window.supabase.createClient ===
          "function"
      )
  );

  const supabaseUrl =
    window.SCREENINGS4U_SUPABASE_URL ||
    window.SUPABASE_URL ||
    "";

  const supabaseAnonKey =
    window.SCREENINGS4U_SUPABASE_ANON_KEY ||
    window.SUPABASE_ANON_KEY ||
    "";

  if (
    window.supabase &&
    typeof window.supabase.createClient ===
      "function" &&
    supabaseUrl &&
    supabaseAnonKey
  ) {
    if (
      !window.__screenings4uDonorPassClient
    ) {
      window.__screenings4uDonorPassClient =
        window.supabase.createClient(
          supabaseUrl,
          supabaseAnonKey
        );
    }

    return (
      window.__screenings4uDonorPassClient
    );
  }

  throw new Error(
    "The customer account connection could not be initialized. " +
    "The public Supabase configuration or browser SDK could not be loaded."
  );
}

/*
 * =========================================================
 * LOAD ORDER
 * =========================================================
 */

async function loadOrder(
  tracking,
  orderId
) {
  const client =
    await getSupabaseClient();

  let data = null;
  let error = null;

  /*
   * Prefer the UUID when it is available.
   */
  if (orderId) {
    const result = await client
      .from("orders")
      .select(`
        id,
        tracking_number,
        order_number,
        customer_email,
        customer_first_name,
        customer_last_name,
        payment_status,
        status,
        order_items (
          id,
          quantity,
          metadata
        )
      `)
      .eq("id", orderId)
      .maybeSingle();

    data = result.data;
    error = result.error;
  }

  /*
   * Fall back to S4U tracking number.
   */
  if (
    !data &&
    !error &&
    tracking
  ) {
    const result = await client
      .from("orders")
      .select(`
        id,
        tracking_number,
        order_number,
        customer_email,
        customer_first_name,
        customer_last_name,
        payment_status,
        status,
        order_items (
          id,
          quantity,
          metadata
        )
      `)
      .eq(
        "tracking_number",
        tracking
      )
      .maybeSingle();

    data = result.data;
    error = result.error;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "We could not find an order for that S4U tracking number."
    );
  }

  /*
   * Donor passes are only available after
   * Stripe payment has been confirmed by the
   * backend/webhook.
   */
  if (
    data.payment_status !== "paid"
  ) {
    throw new Error(
      "Your donor pass is not available until payment has been confirmed."
    );
  }

  /*
   * If both identifiers were supplied, verify
   * they belong to the same order.
   */
  if (
    tracking &&
    data.tracking_number &&
    data.tracking_number !== tracking
  ) {
    throw new Error(
      "The S4U tracking number does not match the selected order."
    );
  }

  return data;
}

/*
 * =========================================================
 * LOAD DONOR LOCATION
 * =========================================================
 */

async function loadLocation(
  orderId,
  tracking
) {
  const client =
    await getSupabaseClient();

  /*
   * The donor-location table is protected by RLS.
   * Use the customer-facing SECURITY DEFINER RPC
   * so the result page can retrieve only the
   * location belonging to this verified paid order.
   */
  const {
    data,
    error,
  } = await client.rpc(
    "get_customer_donor_location",
    {
      p_order_id: orderId,
      p_tracking_number: tracking
    }
  );

  if (error) {
    console.error(
      "Donor location RPC error:",
      error
    );

    throw new Error(
      error.message ||
      "Unable to load your testing location."
    );
  }

  if (!data || !data.length) {
    throw new Error(
      "A testing location has not been assigned to this order yet."
    );
  }

  return data[0];
}

/*
 * =========================================================
 * RENDER ORDER
 * =========================================================
 */

function renderOrder(
  order,
  tracking
) {
  const trackingElement =
    document.getElementById(
      "trackingNumber"
    );

  if (trackingElement) {
    trackingElement.textContent =
      order.tracking_number ||
      tracking ||
      "—";
  }

  const customerName = [
    order.customer_first_name,
    order.customer_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const customerElement =
    document.getElementById(
      "customerName"
    );

  if (customerElement) {
    customerElement.textContent =
      customerName ||
      "Customer";
  }

  const item =
    Array.isArray(
      order.order_items
    )
      ? order.order_items[0]
      : null;

  const serviceName =
    item?.metadata?.service_name ||
    item?.metadata?.product_name ||
    item?.metadata?.serviceName ||
    "Purchased service";

  const serviceElement =
    document.getElementById(
      "serviceName"
    );

  if (serviceElement) {
    serviceElement.textContent =
      serviceName;
  }
}

/*
 * =========================================================
 * RENDER LOCATION
 * =========================================================
 */

function renderLocation(
  location
) {
  const locationName =
    location.location_name ||
    (
      location.source === "crl"
        ? "CRL Testing Location"
        : "Selected Testing Location"
    );

  const locationNameElement =
    document.getElementById(
      "locationName"
    );

  if (locationNameElement) {
    locationNameElement.textContent =
      locationName;
  }

  const address = [
    location.address_line_1,
    location.address_line_2,
    [
      location.city,
      location.state,
    ]
      .filter(Boolean)
      .join(", "),
    location.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  const addressElement =
    document.getElementById(
      "locationAddress"
    );

  if (addressElement) {
    addressElement.textContent =
      address;
  }

  const phoneElement =
    document.getElementById(
      "locationPhone"
    );

  if (phoneElement) {
    phoneElement.textContent =
      location.phone
        ? "Phone: " +
          location.phone
        : "";
  }

  const instructionsElement =
    document.getElementById(
      "instructionsText"
    );

  if (instructionsElement) {
    instructionsElement.textContent =
      location.instructions ||
      "Follow the testing facility's instructions when you arrive.";
  }
}

/*
 * =========================================================
 * DOWNLOAD / PRINT
 * =========================================================
 */

function downloadDonorPass() {
  /*
   * Until the final PDF/email/SMS delivery system
   * is implemented, use the browser print dialog.
   *
   * The customer can select:
   * Save as PDF
   */
  window.print();
}

/*
 * =========================================================
 * KEEP BOTH IDENTIFIERS IN THE URL
 * =========================================================
 */

function updatePageUrl(
  orderId,
  tracking
) {
  if (!orderId && !tracking) {
    return;
  }

  const params =
    new URLSearchParams();

  if (orderId) {
    params.set(
      "order",
      orderId
    );
  }

  if (tracking) {
    params.set(
      "tracking",
      tracking
    );
  }

  const newUrl =
    window.location.pathname +
    "?" +
    params.toString();

  /*
   * Do not reload the page.
   */
  window.history.replaceState(
    {},
    "",
    newUrl
  );
}

/*
 * =========================================================
 * NOTICE
 * =========================================================
 */

function showNotice(
  message,
  type = "error"
) {
  const notice =
    document.getElementById(
      "resultNotice"
    );

  if (!notice) {
    return;
  }

  notice.className =
    "notice " + type;

  notice.textContent =
    message;

  notice.style.display =
    "block";
}