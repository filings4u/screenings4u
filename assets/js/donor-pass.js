/**
 * screenings4u — Donor Pass Location
 *
 * Current mode:
 * - USPS address validation is enabled.
 * - CRL testing-location integration will be added later.
 * - The S4U tracking number is preserved throughout the workflow.
 */

"use strict";

document.addEventListener("DOMContentLoaded", initDonorPassLocation);

async function initDonorPassLocation() {
  const params = new URLSearchParams(window.location.search);

  const orderId = String(
    params.get("order") ||
    params.get("order_id") ||
    ""
  ).trim();

  const tracking = String(
    params.get("tracking") ||
    params.get("tracking_number") ||
    ""
  ).trim();

  // IMPORTANT: render the tracking number immediately when it is
  // available in the URL. If only the order UUID is supplied,
  // the database lookup below will resolve the tracking number.
  const trackingEl = document.getElementById("trackingNumber");
  if (trackingEl) {
    trackingEl.textContent = tracking || "Loading...";
  }

  if (!tracking && !orderId) {
    showNotice(
      "No S4U tracking number or order was provided.",
      "error"
    );
    disableForm();
    return;
  }

  const form = document.getElementById("donorPassForm");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  formatZip();

  try {
    const order = await loadPaidOrderWithRetry(
      tracking,
      orderId
    );

    // Always prefer the database value once the order has loaded.
    const actualTracking =
      order.tracking_number || tracking;

    if (trackingEl) {
      trackingEl.textContent =
        actualTracking || "—";
    }

    const item = Array.isArray(order.order_items)
      ? order.order_items[0]
      : null;

    const serviceEl =
      document.getElementById("serviceName");

    if (serviceEl) {
      serviceEl.textContent =
        item?.metadata?.service_name ||
        item?.metadata?.product_name ||
        item?.metadata?.serviceName ||
        "Your purchased service";
    }

    // Preserve both identifiers for the rest of the workflow.
    const back =
      document.getElementById("backButton");

    if (back) {
      back.href =
        "order-confirmation.html?order=" +
        encodeURIComponent(order.id || orderId) +
        "&tracking=" +
        encodeURIComponent(actualTracking);
    }

    const existing =
      await loadExistingLocation(order.id);

    if (existing) {
      populateLocation(existing);
    }
  } catch (error) {
    console.error(
      "Donor pass location initialization error:",
      error
    );

    // Do not erase the tracking number if the secondary
    // order lookup fails.
    showNotice(
      error?.message ||
      "Unable to load your order.",
      "error"
    );
  }
}

async function getSupabaseClient() {
  /*
   * Use the site's shared Supabase client when available.
   * This is the preferred path because it keeps configuration
   * centralized in the screenings4u site.
   */
  if (typeof window.getScreenings4uSupabase === "function") {
    const client = await window.getScreenings4uSupabase();

    if (client) {
      return client;
    }
  }

  /*
   * Support an already-created global client.
   */
  if (window.screenings4uSupabase) {
    return window.screenings4uSupabase;
  }

  /*
   * Fallback: create the public browser client directly.
   *
   * IMPORTANT:
   * SCREENINGS4U_SUPABASE_ANON_KEY must be the PUBLIC anon/publishable
   * key only. Never expose the Supabase service-role key here.
   */
  const supabaseLib = window.supabase;

  const supabaseUrl =
    window.SCREENINGS4U_SUPABASE_URL ||
    window.SUPABASE_URL ||
    "";

  const supabaseAnonKey =
    window.SCREENINGS4U_SUPABASE_ANON_KEY ||
    window.SUPABASE_ANON_KEY ||
    "";

  if (
    supabaseLib &&
    typeof supabaseLib.createClient === "function" &&
    supabaseUrl &&
    supabaseAnonKey
  ) {
    if (!window.__screenings4uDonorPassClient) {
      window.__screenings4uDonorPassClient =
        supabaseLib.createClient(
          supabaseUrl,
          supabaseAnonKey
        );
    }

    return window.__screenings4uDonorPassClient;
  }

  throw new Error(
    "The customer account connection could not be initialized. " +
    "Make sure site-config.js contains SCREENINGS4U_SUPABASE_URL " +
    "and SCREENINGS4U_SUPABASE_ANON_KEY, and that Supabase JS is loaded."
  );
}

async function loadOrder(tracking) {
  const client = await getSupabaseClient();

  const { data, error } = await client
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
    .eq("tracking_number", tracking)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("We could not find an order for that tracking number.");
  }

  if (data.payment_status !== "paid") {
    throw new Error(
      "Your payment is still being confirmed. Please wait a moment and try again."
    );
  }

  return data;
}

async function loadPaidOrderWithRetry(
  tracking,
  orderId
) {
  /*
   * Stripe payment confirmation and the webhook update to
   * orders.payment_status can happen a moment apart.
   *
   * Give the webhook a short window to mark the order paid.
   *
   * The lookup supports either:
   *   - S4U tracking number
   *   - internal order UUID
   *
   * If both are supplied, the returned order is verified
   * against both identifiers.
   */
  const maxAttempts = 8;
  const delayMs = 1000;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    const client =
      await getSupabaseClient();

    let query = client
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
      `);

    if (orderId) {
      query = query.eq("id", orderId);
    } else {
      query = query.eq(
        "tracking_number",
        tracking
      );
    }

    const {
      data,
      error
    } = await query.maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "We could not find an order for that S4U tracking number."
      );
    }

    /*
     * If both identifiers were supplied, make sure they
     * refer to the same order.
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

    if (data.payment_status === "paid") {
      return data;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs)
      );
    }
  }

  throw new Error(
    "Your payment is still being confirmed. Please wait a moment and try again."
  );
}

async function loadExistingLocation(orderId) {
  const client = await getSupabaseClient();

  const { data, error } = await client
    .from("order_donor_locations")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

async function handleSubmit(event) {
  event.preventDefault();
  clearNotice();

  const params = new URLSearchParams(window.location.search);
  const orderId = String(
    params.get("order") ||
    params.get("order_id") ||
    ""
  ).trim();

  const tracking = String(
    params.get("tracking") ||
    params.get("tracking_number") ||
    ""
  ).trim();

  if (!tracking && !orderId) {
    showNotice(
      "No S4U tracking number or order was provided.",
      "error"
    );
    return;
  }

  const values = {
    address_line_1: getValue("address"),
    address_line_2: getValue("address2"),
    city: getValue("city"),
    state: getValue("state").toUpperCase(),
    postal_code: getValue("zip")
  };

  const validation = validateLocation(values);

  if (!validation.valid) {
    showNotice(validation.message, "error");
    document.getElementById(validation.field)?.focus();
    return;
  }

  const button = document.getElementById("generatePassButton");
  setButton(button, true, "Validating Address...");

  try {
    // Load the paid order first. This also verifies the tracking number.
    const order = await loadPaidOrderWithRetry(tracking, orderId);

    if (orderId && order.id !== orderId) {
      throw new Error(
        "The order information does not match the S4U tracking number."
      );
    }

    // USPS validation happens server-side so the Consumer Key/Secret
    // never reaches the customer's browser.
    const usps = await validateWithUSPS(values);

    if (!usps.valid) {
      throw new Error(
        usps.message ||
        "USPS could not validate this address. Please check the address and try again."
      );
    }

    const standardized = usps.address || {};

    // Save USPS-standardized values through the SECURITY DEFINER RPC.
    // Do not write directly to order_donor_locations from the browser.
    const addressLine1 =
      standardized.streetAddress || values.address_line_1;

    const addressLine2 =
      standardized.secondaryAddress || values.address_line_2 || null;

    const city =
      standardized.city || values.city;

    const state =
      standardized.state || values.state;

    const postalCode =
      standardized.ZIPCode
        ? standardized.ZIPPlus4
          ? `${standardized.ZIPCode}-${standardized.ZIPPlus4}`
          : standardized.ZIPCode
        : values.postal_code;

    const metadata = {
      ...(standardized || {}),
      usps_validated: true,
      usps_validated_at: new Date().toISOString()
    };

    setButton(button, true, "Saving Location...");

    const client = await getSupabaseClient();

    const { data: savedId, error: saveError } = await client.rpc(
      "save_customer_donor_location",
      {
        p_order_id: order.id,
        p_tracking_number: order.tracking_number || tracking,
        p_address_line_1: addressLine1,
        p_address_line_2: addressLine2,
        p_city: city,
        p_state: state,
        p_postal_code: postalCode,
        p_country: "US",
        p_source: "usps",
        p_metadata: metadata
      }
    );

    if (saveError) {
      console.error("Donor location RPC error:", saveError);
      throw new Error(
        saveError.message ||
        "The testing location could not be saved."
      );
    }

    if (!savedId) {
      throw new Error("The testing location could not be saved.");
    }

    const actualTracking = order.tracking_number || tracking;

    // Preserve BOTH order UUID and tracking number.
    window.location.assign(
      "donor-pass-result.html?order=" +
      encodeURIComponent(order.id) +
      "&tracking=" +
      encodeURIComponent(actualTracking)
    );
  } catch (error) {
    console.error("Donor location save/validation error:", error);

    showNotice(
      error?.message || "Unable to save your testing location.",
      "error"
    );

    setButton(button, false, "Continue to Donor Pass →");
  }
}

async function validateWithUSPS(values) {
  const client = await getSupabaseClient();

  const { data, error } = await client.functions.invoke(
    "validate-usps-address",
    {
      body: {
        streetAddress: values.address_line_1,
        secondaryAddress: values.address_line_2 || "",
        city: values.city,
        state: values.state,
        ZIPCode: values.postal_code.replace(/\D/g, "").slice(0, 5)
      }
    }
  );

  if (error) {
    console.error("USPS validation function error:", error);
    throw new Error(
      "We could not verify the address right now. Please try again."
    );
  }

  return data || {
    valid: false,
    message: "No address validation response was returned."
  };
}

function validateLocation(values) {
  if (values.address_line_1.length < 3) {
    return {
      valid: false,
      field: "address",
      message: "Please enter your street address."
    };
  }

  if (!values.city || values.city.length < 2) {
    return {
      valid: false,
      field: "city",
      message: "Please enter your city."
    };
  }

  if (!/^[A-Z]{2}$/.test(values.state)) {
    return {
      valid: false,
      field: "state",
      message: "Please select your state."
    };
  }

  if (!/^\d{5}(?:-\d{4})?$/.test(values.postal_code)) {
    return {
      valid: false,
      field: "zip",
      message: "Please enter a valid ZIP code."
    };
  }

  return { valid: true };
}

function populateLocation(location) {
  setValue("address", location.address_line_1);
  setValue("address2", location.address_line_2 || "");
  setValue("city", location.city);
  setValue("state", location.state);
  setValue("zip", location.postal_code);
}

function formatZip() {
  const zip = document.getElementById("zip");
  if (!zip) return;

  zip.addEventListener("input", () => {
    const digits = zip.value.replace(/\D/g, "").slice(0, 9);

    zip.value =
      digits.length > 5
        ? digits.slice(0, 5) + "-" + digits.slice(5)
        : digits;
  });
}

function getValue(id) {
  return String(document.getElementById(id)?.value || "").trim();
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value || "";
}

function setButton(button, disabled, label) {
  if (!button) return;
  button.disabled = disabled;
  button.textContent = label;
}

function disableForm() {
  document
    .querySelectorAll(
      "#donorPassForm input, #donorPassForm select, #donorPassForm button"
    )
    .forEach((element) => {
      element.disabled = true;
    });
}

function showNotice(message, type) {
  const notice =
    document.getElementById("formMessage") ||
    document.getElementById("locationNotice");

  if (!notice) return;

  notice.className = "notice " + type;
  notice.textContent = message;
  notice.style.display = "block";
}

function clearNotice() {
  const notice =
    document.getElementById("formMessage") ||
    document.getElementById("locationNotice");

  if (!notice) return;

  notice.className = "notice";
  notice.textContent = "";
  notice.style.display = "none";
}