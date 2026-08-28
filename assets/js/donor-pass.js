/**
 * ============================================================
 * screenings4u — Donor Pass Result
 * ============================================================
 *
 * IMPORTANT:
 * This page is only a temporary status/location display.
 * The official donor pass is created manually by the screenings4u
 * team and will be uploaded to the customer's portal account.
 * The customer will receive an email notification when it is available.
 *
 * This script does NOT create or automate a CRL donor pass.
 */

"use strict";

document.addEventListener("DOMContentLoaded", initDonorPassResult);

async function initDonorPassResult() {
  const params = new URLSearchParams(window.location.search);

  const orderId = String(params.get("order") || "").trim();
  const tracking = String(params.get("tracking") || "").trim();

  if (!tracking && !orderId) {
    showNotice(
      "No S4U tracking number or order was provided.",
      "error"
    );
    return;
  }

  document
    .getElementById("printButton")
    ?.addEventListener("click", () => window.print());

  document
    .getElementById("downloadButton")
    ?.addEventListener("click", downloadDonorPass);

  try {
    const order = await loadOrder(tracking, orderId);

    const actualTracking =
      order.tracking_number || tracking;

    renderOrder(order, actualTracking);

    updatePageUrl(order.id, actualTracking);

    /*
     * A donor pass is no longer treated as something this public
     * page automatically generates or downloads.
     *
     * The team manually prepares the donor pass and uploads the
     * completed document to the customer's portal account.
     */
    showNotice(
      "Your order has been received. Your donor pass will be prepared and uploaded to your customer account when it is available.",
      "info"
    );

  } catch (error) {
    console.error("Donor pass load error:", error);

    showNotice(
      error?.message ||
        "Unable to load your order information.",
      "error"
    );
  }
}

/* ============================================================
   SUPABASE CLIENT
   ============================================================ */

async function loadExternalScript(src, test) {
  if (typeof test === "function" && test()) {
    return;
  }

  await new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-screenings4u-loader="${src}"]`
    );

    if (existing) {
      existing.addEventListener("load", resolve, {
        once: true
      });

      existing.addEventListener("error", reject, {
        once: true
      });

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

  if (window.screenings4uSupabase) {
    return window.screenings4uSupabase;
  }

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

    return window.__screenings4uDonorPassClient;
  }

  throw new Error(
    "The customer account connection could not be initialized."
  );
}

/* ============================================================
   LOAD ORDER
   ============================================================ */

async function loadOrder(tracking, orderId) {
  const client =
    await getSupabaseClient();

  let data = null;
  let error = null;

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

  if (
    data.payment_status !== "paid"
  ) {
    throw new Error(
      "Your order is not available until payment has been confirmed."
    );
  }

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

/* ============================================================
   RENDER ORDER
   ============================================================ */

function renderOrder(order, tracking) {
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
    order.customer_last_name
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
    Array.isArray(order.order_items)
      ? order.order_items[0]
      : null;

  /*
   * Service terminology only.
   * product_name has been intentionally removed.
   */
  const serviceName =
    item?.metadata?.service_name ||
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

/* ============================================================
   DOWNLOAD / PRINT
   ============================================================ */

function downloadDonorPass() {
  /*
   * The official donor pass is uploaded to the customer portal.
   * Do not pretend that this page generates a CRL donor pass.
   */
  showNotice(
    "When your donor pass is ready, it will be available in your customer account documents.",
    "info"
  );
}

/* ============================================================
   KEEP BOTH IDENTIFIERS IN THE URL
   ============================================================ */

function updatePageUrl(orderId, tracking) {
  if (!orderId && !tracking) {
    return;
  }

  const params =
    new URLSearchParams();

  if (orderId) {
    params.set("order", orderId);
  }

  if (tracking) {
    params.set("tracking", tracking);
  }

  const newUrl =
    window.location.pathname +
    "?" +
    params.toString();

  window.history.replaceState(
    {},
    "",
    newUrl
  );
}

/* ============================================================
   NOTICE
   ============================================================ */

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
