

/**
 * screenings4u â€” Universal Stripe Checkout
 *
 * PUBLIC MARKETING CHECKOUT
 *
 * SERVICE-BASED CHECKOUT
 *
 * Flow:
 *   checkout.html?service=SERVICE_ID
 *        â†“
 *   create-payment-intent Edge Function
 *        â†“
 *   Supabase Order Engine
 *        â†“
 *   Stripe PaymentIntent
 *        â†“
 *   Stripe Payment Element
 *        â†“
 *   payment_intent.succeeded
 *        â†“
 *   Stripe webhook
 *        â†“
 *   mark_order_paid()
 *
 * IMPORTANT:
 * - Everything in this checkout is SERVICE based.
 * - The browser sends the SERVICE ID, not a Stripe price ID.
 * - The server is authoritative for pricing.
 * - The webhook is authoritative for payment completion.
 * - Customer fields support browser autofill, paste, and normal editing.
 */

"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51U8CQJEHE8bc4Otur9RVR1HsajJbmSbmRr5z0jGw1v5jgrKrzmnaaRTIV5v5CbEZIwFJLujrU0AI3lOZFDaNg4CG005XAPqkx3";

const PAYMENT_FUNCTION_NAME = "create-payment-intent";

/* =========================================================
   STATE
========================================================= */

let stripe = null;
let elements = null;
let paymentElement = null;

let selectedService = null;

let paymentMounted = false;
let paymentIntentCreated = false;
let emailConfirmed = false;
let confirmedEmailValue = "";

/*
 * Prevent duplicate Confirm Email clicks from starting two
 * PaymentIntent / Stripe mount operations at the same time.
 */
let emailConfirmationInProgress = false;

let orderId = null;
let orderNumber = null;
let trackingNumber = null;
let paymentIntentId = null;
let appliedDiscountCode = "";
let appliedDiscount = null;
let checkoutAmount = null;
let discountValidationInProgress = false;

let paymentProcessingOverlay = null;
let addressValidationOverlay = null;
let addressConfirmationOverlay = null;
let manualEntryWarning = null;
let manualEntryBaseline = Object.create(null);

/*
 * Every customer field gets a manual-entry flag.
 * This prevents browser autofill from silently satisfying
 * the checkout validation.
 */
const MANUAL_ENTRY_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "zip"
];

/* =========================================================
   MANUAL ENTRY WARNING
========================================================= */

function createManualEntryWarning() {

  if (manualEntryWarning) {
    return manualEntryWarning;
  }

  const overlay = document.createElement("div");

  overlay.id = "manualEntryWarning";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-hidden", "true");

  overlay.innerHTML = `
    <div class="manual-entry-warning-card">
      <button
        type="button"
        class="manual-entry-warning-close"
        id="manualEntryWarningClose"
        aria-label="Close message"
      >&times;</button>

      <div class="manual-entry-warning-icon" aria-hidden="true">
        !
      </div>

      <div class="manual-entry-warning-title">
        Please Type Your Information
      </div>

      <div class="manual-entry-warning-message">
        For security and verification purposes, your customer
        information must be entered directly into this form.
        Please type your information instead of using browser
        autofill, copy and paste, or drag and drop.
      </div>

      <button
        type="button"
        class="manual-entry-warning-button"
        id="manualEntryWarningButton"
      >
        I Understand
      </button>
    </div>
  `;

  const style = document.createElement("style");

  style.textContent = `
    #manualEntryWarning {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 29, 50, 0.58);
      backdrop-filter: blur(4px);
    }

    #manualEntryWarning.active {
      display: flex;
    }

    .manual-entry-warning-card {
      position: relative;
      width: min(470px, 100%);
      padding: 34px 30px 30px;
      background: #fff;
      border: 1px solid #d9e3f0;
      border-radius: 18px;
      box-shadow: 0 24px 70px rgba(23, 51, 95, 0.24);
      text-align: center;
      font-family: Inter, Arial, sans-serif;
    }

    .manual-entry-warning-close {
      position: absolute;
      top: 12px;
      right: 14px;
      width: 34px;
      height: 34px;
      border: 0;
      background: transparent;
      color: #71829a;
      font-size: 26px;
      line-height: 1;
      cursor: pointer;
    }

    .manual-entry-warning-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 18px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #fff3e8;
      color: #ff6b00;
      font-size: 25px;
      font-weight: 900;
    }

    .manual-entry-warning-title {
      color: #24467f;
      font-size: 22px;
      line-height: 1.25;
      font-weight: 900;
      margin-bottom: 11px;
    }

    .manual-entry-warning-message {
      color: #667892;
      font-size: 13px;
      line-height: 1.7;
    }

    .manual-entry-warning-button {
      margin-top: 22px;
      min-width: 150px;
      padding: 12px 20px;
      border: 0;
      border-radius: 9px;
      background: #325aa3;
      color: #fff;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
    }

    .manual-entry-warning-button:hover {
      background: #24467f;
    }

    @keyframes screenings4uAutofillDetected {
      from {
        opacity: 0.99;
      }
      to {
        opacity: 1;
      }
    }

    input:-webkit-autofill {
      animation-name: screenings4uAutofillDetected;
      animation-duration: 0.01s;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  manualEntryWarning = overlay;

  const close = () => closeManualEntryWarning();

  overlay.querySelector("#manualEntryWarningClose")
    ?.addEventListener("click", close);

  overlay.querySelector("#manualEntryWarningButton")
    ?.addEventListener("click", close);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      close();
    }
  });

  return overlay;
}

function showManualEntryWarning(fieldId = null) {

  const overlay = createManualEntryWarning();

  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const field = fieldId
    ? document.getElementById(fieldId)
    : null;

  if (field) {
    field.classList.add("manual-entry-warning-field");
  }
}

function closeManualEntryWarning() {

  if (!manualEntryWarning) {
    return;
  }

  manualEntryWarning.classList.remove("active");
  manualEntryWarning.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  document
    .querySelectorAll(".manual-entry-warning-field")
    .forEach(field => {
      field.classList.remove("manual-entry-warning-field");
    });
}

/* =========================================================
   MANUAL ENTRY FIELD SETUP
========================================================= */

function markFieldAsManuallyTyped(input) {

  if (!input) {
    return;
  }

  input.dataset.manualTyped = "true";
  input.dataset.autofilled = "false";
  input.dataset.manualEntryVerified = "true";
}

function markAllFieldsUnconfirmed() {

  MANUAL_ENTRY_FIELDS.forEach(id => {

    const input = document.getElementById(id);

    if (!input) {
      return;
    }

    input.dataset.manualTyped = "false";
    input.dataset.autofilled = "false";
    input.dataset.manualEntryVerified = "false";
    input.dataset.pendingKeyboardEdit = "false";
    input.dataset.keyboardValueBefore = input.value || "";
  });
}

function fieldWasManuallyTyped(id) {

  const input = document.getElementById(id);

  return Boolean(
    input &&
    input.dataset.manualTyped === "true" &&
    input.dataset.manualEntryVerified === "true"
  );
}

/*
 * A keydown by itself is NOT proof of manual entry.
 *
 * Chrome can fire keyboard events while a customer is navigating
 * an autofill/saved-address suggestion. The old implementation
 * marked the field as manually typed on keydown, which allowed
 * that autofill to satisfy checkout validation.
 *
 * We now require:
 *   1. A trusted printable/editing keyboard event.
 *   2. A subsequent trusted input event.
 *   3. The resulting value change to be consistent with a small
 *      keyboard edit rather than a complete autofill replacement.
 */
function beginKeyboardEdit(input, event) {

  if (!input || !event.isTrusted) {
    return;
  }

  const isPrintable =
    event.key &&
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey;

  const isDelete =
    event.key === "Backspace" ||
    event.key === "Delete";

  if (!isPrintable && !isDelete) {
    return;
  }

  input.dataset.pendingKeyboardEdit = "true";
  input.dataset.keyboardValueBefore = input.value || "";
}

function verifyKeyboardInput(input, event) {

  if (!input || !event.isTrusted) {
    return;
  }

  if (input.dataset.pendingKeyboardEdit !== "true") {
    return;
  }

  const before =
    input.dataset.keyboardValueBefore || "";

  const after =
    input.value || "";

  input.dataset.pendingKeyboardEdit = "false";

  /*
   * A normal keyboard edit changes the value by a very small amount.
   * This intentionally rejects one-shot autofill replacements.
   */
  const lengthDelta =
    Math.abs(after.length - before.length);

  const isSmallEdit =
    lengthDelta <= 1 ||
    (
      before.length === after.length &&
      before !== after
    );

  if (isSmallEdit) {
    markFieldAsManuallyTyped(input);
  } else {
    input.dataset.manualTyped = "false";
    input.dataset.manualEntryVerified = "false";
    input.dataset.autofilled = "true";

    showManualEntryWarning(input.id);
  }
}

function captureManualEntryBaseline() {
  manualEntryBaseline = Object.create(null);

  MANUAL_ENTRY_FIELDS.forEach(id => {
    const input = document.getElementById(id);

    if (input) {
      manualEntryBaseline[id] = input.value || "";
    }
  });
}

function resetAddressFields() {
  const addressFieldIds = [
    "address",
    "address2",
    "city",
    "state",
    "zip"
  ];

  addressFieldIds.forEach(id => {
    const input = document.getElementById(id);

    if (!input) {
      return;
    }

    input.value = "";

    input.dataset.manualTyped = "false";
    input.dataset.autofilled = "false";
    input.dataset.manualEntryVerified = "false";
    input.dataset.pendingKeyboardEdit = "false";
    input.dataset.keyboardValueBefore = "";
  });

  /*
   * The customer is intentionally starting a new address.
   * Make the empty address fields the new baseline so the
   * autofill watcher does not immediately reopen the warning.
   */
  captureManualEntryBaseline();

  const addressField = document.getElementById("address");

  if (addressField) {
    addressField.focus();
  }
}

function setupCustomerFields() {

  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const address = document.getElementById("address");
  const address2 = document.getElementById("address2");
  const city = document.getElementById("city");
  const state = document.getElementById("state");
  const zip = document.getElementById("zip");

  const autocomplete = new Map([
    [firstName, "given-name"],
    [lastName, "family-name"],
    [email, "email"],
    [phone, "tel"],
    [address, "address-line1"],
    [address2, "address-line2"],
    [city, "address-level2"],
    [state, "address-level1"],
    [zip, "postal-code"]
  ]);

  autocomplete.forEach((value, input) => {
    if (input) {
      input.setAttribute("autocomplete", value);
      input.removeAttribute("data-form-type");
      input.removeAttribute("data-lpignore");
      input.removeAttribute("data-1p-ignore");
    }
  });

  if (email) {
    email.setAttribute("autocapitalize", "none");
    email.setAttribute("spellcheck", "false");
    email.setAttribute("inputmode", "email");
    email.addEventListener("input", () => {
      email.value = email.value.replace(/\s/g, "").slice(0, 254);
      const at = email.value.indexOf("@");
      if (at > 0) {
        email.value = email.value.slice(0, at) + "@" +
          email.value.slice(at + 1).toLowerCase();
      }

      if (
        confirmedEmailValue &&
        email.value.trim().toLowerCase() !==
          confirmedEmailValue
      ) {
        emailConfirmed = false;
        confirmedEmailValue = "";
      }

      email.setCustomValidity("");
    });
  }

  if (phone) {
    phone.setAttribute("inputmode", "tel");
    phone.addEventListener("input", () => {
      let digits = phone.value.replace(/\D/g, "");
      if (digits.length > 10 && digits.startsWith("1")) {
        digits = digits.slice(1);
      }
      digits = digits.slice(0, 10);
      let formatted = "";
      if (digits.length) formatted = "(" + digits.slice(0, 3);
      if (digits.length >= 3) formatted += ") ";
      if (digits.length > 3) formatted += digits.slice(3, 6);
      if (digits.length >= 6) formatted += "-";
      if (digits.length > 6) formatted += digits.slice(6, 10);
      phone.value = formatted;
      phone.setCustomValidity("");
    });
  }

  if (zip) {
    zip.setAttribute("inputmode", "numeric");
    zip.addEventListener("input", () => {
      const digits = zip.value.replace(/\D/g, "").slice(0, 9);
      zip.value = digits.length > 5
        ? digits.slice(0, 5) + "-" + digits.slice(5)
        : digits;
    });
  }

  [firstName, lastName, city].forEach(input => {
    input?.addEventListener("input", () => {
      input.value = input.value.replace(/[^\p{L}' -]/gu, "");
    });
  });

  address?.addEventListener("input", () => {
    address.value = address.value.replace(/[^\p{L}\p{N} .,'#-]/gu, "");
  });

  return;

  /* Legacy manual-entry enforcement retained below only as unreachable
     reference code. It is not initialized and cannot block autofill. */
  {

  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const address = document.getElementById("address");
  const city = document.getElementById("city");
  const state = document.getElementById("state");
  const zip = document.getElementById("zip");

  markAllFieldsUnconfirmed();

  const fields = [
    firstName,
    lastName,
    email,
    phone,
    address,
    city,
    state,
    zip
  ].filter(Boolean);

  fields.forEach(input => {

    /*
     * Do not use "off" alone for Chrome autofill. Chrome may ignore
     * autocomplete="off" for customer/contact fields.
     *
     * The non-standard metadata below also discourages common
     * password managers, but validation remains authoritative.
     */
    input.setAttribute("autocomplete", "new-password");
    input.setAttribute("data-form-type", "other");
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-1p-ignore", "true");

    /*
     * Keyboard typing.
     *
     * IMPORTANT: keydown only records intent. It does not validate
     * the field. Validation happens after the corresponding input
     * event has actually changed the value.
     */
    input.addEventListener("keydown", event => {
      beginKeyboardEdit(input, event);
    });

    /*
     * beforeinput is intentionally NOT used to mark a field as
     * manually typed. Autofill and other browser-controlled changes
     * can produce input/beforeinput sequences that are not equivalent
     * to a customer typing the information.
     */
    input.addEventListener("beforeinput", event => {

      if (
        !event.isTrusted ||
        !event.inputType
      ) {
        return;
      }

      if (
        event.inputType === "insertFromPaste" ||
        event.inputType === "insertFromDrop" ||
        event.inputType === "insertReplacementText"
      ) {
        event.preventDefault();

        input.dataset.pendingKeyboardEdit = "false";
        input.dataset.manualTyped = "false";
        input.dataset.manualEntryVerified = "false";
        input.dataset.autofilled = "true";

        showManualEntryWarning(input.id);
      }
    });

    /*
     * The input event is where a keyboard edit becomes verified.
     */
    input.addEventListener("input", event => {
      verifyKeyboardInput(input, event);
    }, true);

    /*
     * Browser autofill detection.
     */
    input.addEventListener("animationstart", event => {

      if (
        event.animationName ===
        "screenings4uAutofillDetected"
      ) {
        input.dataset.autofilled = "true";
        input.dataset.manualTyped = "false";
        input.dataset.manualEntryVerified = "false";
        input.dataset.pendingKeyboardEdit = "false";

        showManualEntryWarning(input.id);
      }
    });

    /*
     * Explicitly block paste.
     */
    input.addEventListener("paste", event => {

      event.preventDefault();

      input.dataset.pendingKeyboardEdit = "false";
      input.dataset.manualTyped = "false";
      input.dataset.manualEntryVerified = "false";
      input.dataset.autofilled = "true";

      showManualEntryWarning(input.id);
    });

    /*
     * Explicitly block drop.
     */
    input.addEventListener("drop", event => {

      event.preventDefault();

      input.dataset.pendingKeyboardEdit = "false";
      input.dataset.manualTyped = "false";
      input.dataset.manualEntryVerified = "false";
      input.dataset.autofilled = "true";

      showManualEntryWarning(input.id);
    });

    input.addEventListener("dragover", event => {
      event.preventDefault();
    });

    /*
     * Explicitly block cut.
     */
    input.addEventListener("cut", event => {

      event.preventDefault();

      input.dataset.pendingKeyboardEdit = "false";
      input.dataset.manualTyped = "false";
      input.dataset.manualEntryVerified = "false";

      showManualEntryWarning(input.id);
    });
  });

  /*
   * Detect values that appear after checkout initialization.
   *
   * IMPORTANT:
   * We compare against a baseline instead of treating every
   * unverified populated field as autofill. The previous watcher
   * reopened the warning simply because a customer clicked a field
   * or returned to the page with browser-restored values.
   *
   * A value that was present when the baseline was captured is left
   * alone. A new value appearing without verified manual typing is
   * treated as possible browser autofill.
   */
  captureManualEntryBaseline();

  let autofillWatchCycles = 0;

  const autofillWatcher = window.setInterval(() => {

    autofillWatchCycles += 1;

    for (const id of MANUAL_ENTRY_FIELDS) {

      const input =
        document.getElementById(id);

      if (
        !input ||
        input.dataset.manualTyped === "true"
      ) {
        continue;
      }

      const currentValue =
        input.value || "";

      const baselineValue =
        manualEntryBaseline[id] || "";

      if (
        currentValue.trim() &&
        currentValue !== baselineValue
      ) {

        input.dataset.manualTyped = "false";
        input.dataset.manualEntryVerified = "false";
        input.dataset.autofilled = "true";

        showManualEntryWarning(id);
        return;
      }
    }

    /*
     * The watcher only needs to cover the period in which browsers
     * normally inject saved contact information.
     */
    if (autofillWatchCycles >= 40) {
      window.clearInterval(autofillWatcher);
    }

  }, 250);

  /*
   * Browser back/forward navigation can restore form values without
   * a real customer edit. Treat the restored values as the new
   * baseline so clicking Back or returning to the checkout does not
   * trigger the manual-entry warning by itself.
   */
  window.addEventListener("pageshow", () => {
    window.setTimeout(() => {
      captureManualEntryBaseline();

      if (manualEntryWarning) {
        closeManualEntryWarning();
      }
    }, 0);
  });

  /*
   * Email.
   */
  if (email) {

    email.setAttribute("autocapitalize", "none");
    email.setAttribute("spellcheck", "false");
    email.setAttribute("inputmode", "email");

    email.addEventListener("input", () => {

      email.value =
        email.value
          .replace(/\s/g, "")
          .slice(0, 254);

      const at = email.value.indexOf("@");

      if (at > 0) {

        const local =
          email.value.slice(0, at);

        const domain =
          email.value
            .slice(at + 1)
            .toLowerCase();

        email.value =
          local + "@" + domain;
      }

      email.setCustomValidity("");
    });
  }

  /*
   * Phone.
   */
  if (phone) {

    phone.setAttribute("inputmode", "tel");

    phone.addEventListener("input", () => {

      let digits =
        phone.value.replace(/\D/g, "");

      if (
        digits.length > 10 &&
        digits.startsWith("1")
      ) {
        digits = digits.slice(1);
      }

      digits = digits.slice(0, 10);

      let formatted = "";

      if (digits.length > 0) {
        formatted = "(" + digits.slice(0, 3);
      }

      if (digits.length >= 3) {
        formatted += ") ";
      }

      if (digits.length > 3) {
        formatted += digits.slice(3, 6);
      }

      if (digits.length >= 6) {
        formatted += "-";
      }

      if (digits.length > 6) {
        formatted += digits.slice(6, 10);
      }

      phone.value = formatted;
      phone.setCustomValidity("");
    });
  }

  /*
   * State.
   *
   * A <select> does not use the same keyboard/input verification path
   * as text fields. The previous implementation therefore left the
   * state field permanently unverified. The autofill watcher would
   * then see the selected state and incorrectly show the manual-entry
   * warning even when every field had been entered by the customer.
   *
   * A trusted change event is the correct signal for a state selection.
   */
  if (state) {

    state.setAttribute("autocapitalize", "characters");

    state.addEventListener("change", event => {

      if (!event.isTrusted) {
        return;
      }

      if (!state.value) {
        state.dataset.manualTyped = "false";
        state.dataset.manualEntryVerified = "false";
        state.dataset.autofilled = "false";
        return;
      }

      markFieldAsManuallyTyped(state);
    });
  }

  /*
   * ZIP.
   */
  if (zip) {

    zip.setAttribute("inputmode", "numeric");

    zip.addEventListener("input", () => {

      const digits =
        zip.value
          .replace(/\D/g, "")
          .slice(0, 9);

      if (digits.length > 5) {

        zip.value =
          digits.slice(0, 5) +
          "-" +
          digits.slice(5);

      } else {

        zip.value = digits;
      }
    });
  }

  /*
   * Names and city.
   */
  [firstName, lastName, city].forEach(input => {

    if (!input) {
      return;
    }

    input.addEventListener("input", () => {

      input.value =
        input.value.replace(
          /[^\p{L}' -]/gu,
          ""
        );
    });
  });

  /*
   * Address.
   */
  if (address) {

    address.addEventListener("input", () => {

      address.value =
        address.value.replace(
          /[^\p{L}\p{N} .,'#-]/gu,
          ""
        );
    });
  }
  }
}

/*
 * Browser autofill is not perfectly detectable on every browser.
 * This additional check catches the important case where values
 * have appeared without manual keyboard entry.
 */
function detectUnconfirmedFieldValues() {

  for (const id of MANUAL_ENTRY_FIELDS) {

    const input = document.getElementById(id);

    if (!input) {
      continue;
    }

    /*
     * Any populated field must have both verification flags.
     * A browser-filled value therefore can never satisfy checkout.
     */
    if (
      input.value.trim() &&
      (
        input.dataset.manualTyped !== "true" ||
        input.dataset.manualEntryVerified !== "true"
      )
    ) {
      return id;
    }
  }

  return null;
}

function requireManualEntry() {

  const unconfirmedField =
    detectUnconfirmedFieldValues();

  if (unconfirmedField) {

    showManualEntryWarning(
      unconfirmedField
    );

    return false;
  }

  return true;
}

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initCheckout
);

/*
 * SERVICE CATALOG SAFETY LOADER
 *
 * checkout.js depends on test-price-list.js for:
 *   - TEST_SERVICES
 *   - getTestService()
 *   - formatTestPrice()
 *
 * If checkout.html already loads test-price-list.js, this does nothing.
 * If that script tag is missing or loads after checkout.js, load it here
 * before the checkout initialization continues.
 */
let serviceCatalogLoadPromise = null;

async function ensureServiceCatalogLoaded() {
  if (
    typeof getTestService === "function" &&
    typeof formatTestPrice === "function"
  ) {
    return true;
  }

  if (!serviceCatalogLoadPromise) {
    serviceCatalogLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[src$="test-price-list.js"]'
      );

      if (existing) {
        existing.addEventListener("load", () => {
          if (
            typeof getTestService === "function" &&
            typeof formatTestPrice === "function"
          ) {
            resolve(true);
          } else {
            reject(
              new Error(
                "The service catalog script loaded, but the service catalog functions are unavailable."
              )
            );
          }
        }, { once: true });

        existing.addEventListener("error", () => {
          reject(
            new Error(
              "The service catalog script could not be loaded."
            )
          );
        }, { once: true });

        return;
      }

      const script = document.createElement("script");

      script.src = "assets/js/test-price-list.js";
      script.async = false;

      script.onload = () => {
        if (
          typeof getTestService === "function" &&
          typeof formatTestPrice === "function"
        ) {
          resolve(true);
        } else {
          reject(
            new Error(
              "The service catalog loaded, but getTestService() is unavailable."
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "The service catalog could not be loaded. Make sure assets/js/test-price-list.js exists."
          )
        );
      };

      document.head.appendChild(script);
    });
  }

  return serviceCatalogLoadPromise;
}

async function initCheckout() {

  try {

    createAddressValidationOverlay();
    createUSPSAddressConfirmationModal();

    const params =
      new URLSearchParams(
        window.location.search
      );

    /*
     * SERVICE ONLY.
     *
     * We intentionally accept only ?service=.
     */
    const serviceId =
      params.get("service");

    if (!serviceId) {

      showCheckoutError(
        "No service was selected. Please return to the services page and select a service."
      );

      return;
    }

    /*
     * SERVICE CATALOG.
     *
     * Do not remove this dependency. The checkout page uses the
     * service catalog for the service name, price, features, drugs,
     * order type, and checkout eligibility.
     */
    try {
      await ensureServiceCatalogLoaded();
    } catch (catalogError) {
      console.error(
        "Service catalog initialization error:",
        catalogError
      );

      showCheckoutError(
        catalogError?.message ||
        "The service catalog could not be loaded."
      );

      return;
    }

    if (
      typeof getTestService !==
      "function"
    ) {
      showCheckoutError(
        "The service catalog could not be loaded."
      );

      return;
    }

    selectedService =
      getTestService(serviceId);

    if (!selectedService) {

      showCheckoutError(
        "Unable to verify the selected service. Please return to the services page and select the service again."
      );

      return;
    }

    /*
     * Only checkout services are allowed through this page.
     */
    if (
      selectedService.orderType !==
      "checkout"
    ) {

      showCheckoutError(
        "This service requires a different order process. Please return to the services page."
      );

      return;
    }

    renderService(selectedService);

    if (
      typeof Stripe !==
      "function"
    ) {

      showCheckoutError(
        "Stripe could not be loaded. Please refresh the page and try again."
      );

      return;
    }

    stripe =
      Stripe(
        STRIPE_PUBLISHABLE_KEY
      );

    const loading =
      document.getElementById("loading");

    const checkoutGrid =
      document.getElementById("checkoutGrid");

    if (loading) {
      loading.style.display = "none";
    }

    if (checkoutGrid) {
      checkoutGrid.style.display = "grid";
    }

    const backLink =
      document.getElementById("backLink");

    if (backLink) {

      backLink.href =
        "service.html?service=" +
        encodeURIComponent(serviceId);
    }

    const errorBackLink =
      document.getElementById("errorBackLink");

    if (errorBackLink) {
      errorBackLink.href = "services.html";
    }

    const form =
      document.getElementById("checkoutForm");

    if (!form) {

      throw new Error(
        "Checkout form could not be found."
      );
    }

    form.addEventListener(
      "submit",
      handleSubmit
    );

    setupCustomerFields();
    setupBillingAddressValidationState();
    setupEmailModal();
    setupDiscountCode();

    const button =
      document.getElementById("payButton");

    if (button) {

      button.disabled = false;
      button.textContent =
        "Continue to Secure Payment";
    }

  } catch (error) {

    console.error(
      "Checkout initialization error:",
      error
    );

    showCheckoutError(
      error?.message ||
      "Unable to initialize checkout."
    );
  }
}

/* =========================================================
   SERVICE DISPLAY
========================================================= */

function renderService(service) {

  const category =
    document.getElementById("category");

  const serviceElement =
    document.getElementById("service");

  const price =
    document.getElementById("price");

  const features =
    document.getElementById("features");

  const drugs =
    document.getElementById("drugs");

  if (category) {
    category.textContent =
      service.category || "";
  }

  if (serviceElement) {
    serviceElement.textContent =
      service.name || "";
  }

  if (price) {

    price.textContent =
      formatTestPrice(
        service.price,
        service.currency || "USD"
      );
  }

  if (features) {

    features.innerHTML = "";

    const featureList =
      Array.isArray(service.features)
        ? service.features
        : [];

    featureList.forEach(item => {

      const li =
        document.createElement("li");

      li.textContent = item;

      features.appendChild(li);
    });

    if (!featureList.length) {

      const li =
        document.createElement("li");

      li.textContent =
        "See service details.";

      features.appendChild(li);
    }
  }

  if (drugs) {

    drugs.innerHTML = "";

    const drugList =
      Array.isArray(service.drugs)
        ? service.drugs
        : [];

    if (!drugList.length) {

      const li =
        document.createElement("li");

      li.textContent =
        "See service details.";

      drugs.appendChild(li);

    } else {

      drugList.forEach(item => {

        const li =
          document.createElement("li");

        li.textContent = item;

        drugs.appendChild(li);
      });
    }
  }
}


/* =========================================================
   DISCOUNT CODES
========================================================= */

/*
 * Discount/order totals returned by Supabase are DECIMAL DOLLARS.
 * The service catalog price is stored in MINOR UNITS (cents) and
 * formatTestPrice() is designed for that catalog representation.
 *
 * Do not pass server discount amounts such as 20.00 through
 * formatTestPrice(), or they will display as $0.20.
 */
function money(value, currency = null) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || selectedService?.currency || "USD"
  }).format(Number.isFinite(amount) ? amount : 0);
}

function getBaseCheckoutPrice() {
  const catalogPriceInCents = Number(selectedService?.price || 0);

  return Number.isFinite(catalogPriceInCents)
    ? catalogPriceInCents / 100
    : 0;
}

function renderDiscountSummary() {
  const subtotal = getBaseCheckoutPrice();
  const discountAmount = Number(appliedDiscount?.discountAmount || 0);
  const total = Math.max(0, subtotal - discountAmount);

  const subtotalElement = document.getElementById("discountSubtotal");
  const discountRow = document.getElementById("discountRow");
  const discountLabel = document.getElementById("discountLabel");
  const discountAmountElement = document.getElementById("discountAmount");
  const totalElement = document.getElementById("discountTotal");

  if (subtotalElement) subtotalElement.textContent = money(subtotal);
  if (totalElement) totalElement.textContent = money(total);

  if (discountRow && discountAmountElement) {
    if (appliedDiscountCode && discountAmount > 0) {
      discountRow.style.display = "flex";
      discountAmountElement.textContent = "-" + money(discountAmount);
      if (discountLabel) discountLabel.textContent = "Discount (" + appliedDiscountCode + ")";
    } else {
      discountRow.style.display = "none";
      discountAmountElement.textContent = "";
      if (discountLabel) discountLabel.textContent = "Discount";
    }
  }
}

function setDiscountMessage(message = "", type = "") {
  const element = document.getElementById("discountMessage");
  if (!element) return;

  element.textContent = message;
  element.className = "discount-message" + (type ? " " + type : "");
  element.style.display = message ? "block" : "none";
}

function resetAppliedDiscount({ keepInput = true } = {}) {
  appliedDiscountCode = "";
  appliedDiscount = null;
  checkoutAmount = null;

  if (!keepInput) {
    const input = document.getElementById("discountCode");
    if (input) input.value = "";
  }

  renderDiscountSummary();
}

async function validateDiscountCode() {
  if (paymentIntentCreated || paymentMounted) {
    setDiscountMessage(
      "The discount cannot be changed after secure payment has been prepared.",
      "error"
    );
    return;
  }

  const input = document.getElementById("discountCode");
  const button = document.getElementById("applyDiscountButton");
  const code = String(input?.value || "").trim().toUpperCase();

  if (!code) {
    resetAppliedDiscount({ keepInput: true });
    setDiscountMessage("Enter a discount code.", "error");
    input?.focus();
    return;
  }

  if (!selectedService?.id || discountValidationInProgress) return;

  discountValidationInProgress = true;
  if (button) {
    button.disabled = true;
    button.textContent = "Checking...";
  }
  setDiscountMessage("Checking discount code...");

  try {
    const baseUrl = window.SCREENINGS4U_SUPABASE_URL || "";
    const anonKey = window.SCREENINGS4U_SUPABASE_ANON_KEY || "";

    if (!baseUrl || baseUrl.includes("REPLACE_WITH")) {
      throw new Error("Checkout is not configured.");
    }

    const headers = { "Content-Type": "application/json" };
    if (anonKey) {
      headers.apikey = anonKey;
      headers.Authorization = "Bearer " + anonKey;
    }

    const response = await fetch(
      baseUrl.replace(/\/+$/, "") + "/functions/v1/validate-discount-code",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          code,
          serviceId: selectedService.id,
          customerEmail: getInputValue("email") || null,
          channel: "website"
        })
      }
    );

    let result = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok || !result?.valid) {
      resetAppliedDiscount({ keepInput: true });
      throw new Error(result?.message || "That discount code is not valid.");
    }

    appliedDiscountCode = String(result.code || code).toUpperCase();
    appliedDiscount = result;
    if (input) input.value = appliedDiscountCode;

    renderDiscountSummary();
    setDiscountMessage(
      (result.name && result.name !== appliedDiscountCode
        ? result.name + " — "
        : "") +
      money(result.discountAmount, result.currency) +
      " discount applied.",
      "success"
    );
  } catch (error) {
    setDiscountMessage(
      error?.message || "Unable to validate the discount code.",
      "error"
    );
  } finally {
    discountValidationInProgress = false;
    if (button) {
      button.disabled = false;
      button.textContent = appliedDiscountCode ? "Applied" : "Apply";
    }
  }
}

function setupDiscountCode() {
  const input = document.getElementById("discountCode");
  const button = document.getElementById("applyDiscountButton");

  renderDiscountSummary();

  button?.addEventListener("click", validateDiscountCode);

  input?.addEventListener("input", () => {
    const normalized = String(input.value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 50);

    input.value = normalized;

    if (appliedDiscountCode && normalized !== appliedDiscountCode) {
      resetAppliedDiscount({ keepInput: true });
      setDiscountMessage("Code changed. Select Apply to validate it again.");
      if (button) button.textContent = "Apply";
    }
  });

  input?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      validateDiscountCode();
    }
  });
}

function updateCheckoutFromServer(result) {
  const serverSubtotal = Number(result?.subtotal);
  const serverDiscount = Number(result?.discountAmount || 0);
  const serverTotal = Number(
    result?.total ??
    (Number.isFinite(result?.amount) ? Number(result.amount) / 100 : NaN)
  );

  if (Number.isFinite(serverTotal)) checkoutAmount = serverTotal;

  if (result?.discountCode && serverDiscount > 0) {
    appliedDiscountCode = String(result.discountCode).toUpperCase();
    appliedDiscount = {
      ...(appliedDiscount || {}),
      code: appliedDiscountCode,
      discountAmount: serverDiscount,
      subtotal: Number.isFinite(serverSubtotal) ? serverSubtotal : getBaseCheckoutPrice(),
      discountedSubtotal: serverTotal
    };
  }

  const subtotalElement = document.getElementById("discountSubtotal");
  const discountRow = document.getElementById("discountRow");
  const discountLabel = document.getElementById("discountLabel");
  const discountAmountElement = document.getElementById("discountAmount");
  const totalElement = document.getElementById("discountTotal");

  if (subtotalElement && Number.isFinite(serverSubtotal)) {
    subtotalElement.textContent = money(serverSubtotal, result?.currency);
  }

  if (discountRow && discountAmountElement) {
    if (serverDiscount > 0) {
      discountRow.style.display = "flex";
      discountAmountElement.textContent = "-" + money(serverDiscount, result?.currency);
      if (discountLabel) {
        discountLabel.textContent =
          "Discount" + (result?.discountCode ? " (" + result.discountCode + ")" : "");
      }
    } else {
      discountRow.style.display = "none";
    }
  }

  if (totalElement && Number.isFinite(serverTotal)) {
    totalElement.textContent = money(serverTotal, result?.currency);
  }

  const input = document.getElementById("discountCode");
  const applyButton = document.getElementById("applyDiscountButton");
  if (input) input.disabled = true;
  if (applyButton) applyButton.disabled = true;
}

function currentPayLabel() {
  const amount =
    Number.isFinite(checkoutAmount)
      ? checkoutAmount
      : Math.max(
          0,
          getBaseCheckoutPrice() -
          Number(appliedDiscount?.discountAmount || 0)
        );

  return "Pay " + money(amount);
}

/* =========================================================
   FORM SUBMISSION
========================================================= */

async function handleSubmit(event) {

  event.preventDefault();

  const form = event.currentTarget;

  clearMessages();

  if (!selectedService || !stripe) {

    showPaymentError(
      "Checkout is not ready. Please refresh the page and try again."
    );

    return;
  }


  /*
   * FIRST SUBMISSION:
   * Validate customer information only.
   */
  if (!paymentMounted) {

    const validation =
      validateCustomerForm(form);

    if (!validation.valid) {

      showPaymentError(
        validation.message
      );

      focusField(
        validation.field
      );

      return;
    }

    /*
     * USPS has already validated and the customer has already accepted
     * this exact address. A failed PaymentIntent setup must not force the
     * customer through address validation again. Editing any address field
     * clears this state through setupBillingAddressValidationState().
     */
    if (
      billingAddressVerified &&
      billingAddressVerificationKey ===
        getBillingAddressVerificationKey()
    ) {
      const currentEmail =
        getInputValue("email")
          .trim()
          .toLowerCase();

      if (
        emailConfirmed &&
        confirmedEmailValue === currentEmail
      ) {
        await handleEmailConfirmation();
        return;
      }

      openEmailConfirmation(
        getInputValue("email")
      );
      return;
    }

    /*
     * USPS BILLING ADDRESS VALIDATION
     *
     * Validate and standardize the billing address before we create
     * the PaymentIntent. USPS credentials remain server-side inside
     * the Supabase Edge Function.
     */
    try {
      const uspsResult =
        await validateBillingAddressWithUSPS(form);

      if (!uspsResult.valid) {
        showPaymentError(
          uspsResult.message ||
          "USPS could not validate this billing address. Please check the address and try again."
        );
        return;
      }

      /*
       * USPS has validated the address, but we do NOT overwrite the
       * customer's billing fields automatically.
       *
       * First show the USPS success state, then ask the customer whether
       * they want to use USPS's standardized version.
       */
      const useUSPSAddress =
        await confirmUSPSAddress(uspsResult.address);

      if (!useUSPSAddress) {
        const addressField =
          document.getElementById("address");

        if (addressField) {
          addressField.focus();
        }

        return;
      }

      /*
       * Only after the customer explicitly approves the USPS version do
       * we place the standardized address into the checkout form.
       */
      applyUSPSAddressToForm(uspsResult.address);

      billingAddressVerified = true;
      billingAddressVerificationKey =
        getBillingAddressVerificationKey();

      /*
       * Address is now verified and accepted. Move automatically to the
       * existing email-confirmation step.
       */
      openEmailConfirmation(
        getInputValue("email")
      );

    } catch (error) {
      console.error(
        "USPS billing address validation error:",
        error
      );

      showPaymentError(
        error?.message ||
        "We could not verify your billing address right now. Please try again."
      );
      return;
    }

    return;
  }

  /*
   * SECOND SUBMISSION:
   * Stripe Payment Element is mounted.
   */
  const button =
    document.getElementById("payButton");

  try {

    setButton(
      button,
      true,
      "Processing Payment..."
    );

    showPaymentProcessing();

    await confirmPayment(form);

  } catch (error) {

    console.error(
      "Checkout payment error:",
      error
    );

    hidePaymentProcessing();

    showPaymentError(
      error?.message ||
      "Unable to process the payment."
    );

    setButton(
      button,
      false,
      currentPayLabel()
    );
  }
}

/* =========================================================
   CUSTOMER VALIDATION
========================================================= */

const VALIDATION = {

  name:
    /^\p{L}[\p{L}' -]{1,49}$/u,

  /*
   * IMPORTANT:
   * This is a JavaScript regex literal.
   * The dot is escaped once, not twice.
   */
  email:
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/,

  phone:
    /^(?:\+1[\s.-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s.-]?[2-9]\d{2}[\s.-]?\d{4}$/,

  address:
    /^\d{1,6}\s+[\p{L}\p{N}][\p{L}\p{N} .,'#-]{2,99}$/u,

  city:
    /^\p{L}[\p{L}' -]{1,49}$/u,

  state:
    /^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI)$/i,

  zip:
    /^\d{5}(?:-\d{4})?$/
};

function validateCustomerForm(form) {

  const fields = {

    firstName:
      getInputValue("firstName"),

    lastName:
      getInputValue("lastName"),

    email:
      getInputValue("email"),

    phone:
      getInputValue("phone"),

    address:
      getInputValue("address"),

    city:
      getInputValue("city"),

    state:
      getInputValue("state").toUpperCase(),

    zip:
      getInputValue("zip")
  };

  if (!VALIDATION.name.test(fields.firstName)) {

    return {
      valid: false,
      field: "firstName",
      message:
        "Please enter a valid first name."
    };
  }

  if (!VALIDATION.name.test(fields.lastName)) {

    return {
      valid: false,
      field: "lastName",
      message:
        "Please enter a valid last name."
    };
  }

  if (!VALIDATION.email.test(fields.email)) {

    return {
      valid: false,
      field: "email",
      message:
        "Please enter a valid email address."
    };
  }

  if (!VALIDATION.phone.test(fields.phone)) {

    return {
      valid: false,
      field: "phone",
      message:
        "Please enter a valid U.S. phone number."
    };
  }

  if (!VALIDATION.address.test(fields.address)) {

    return {
      valid: false,
      field: "address",
      message:
        "Please enter a valid street address."
    };
  }

  if (!VALIDATION.city.test(fields.city)) {

    return {
      valid: false,
      field: "city",
      message:
        "Please enter a valid city."
    };
  }

  if (!VALIDATION.state.test(fields.state)) {

    return {
      valid: false,
      field: "state",
      message:
        "Please enter a valid two-letter state abbreviation."
    };
  }

  if (!VALIDATION.zip.test(fields.zip)) {

    return {
      valid: false,
      field: "zip",
      message:
        "Please enter a valid ZIP code."
    };
  }

  return {
    valid: true
  };
}

function getInputValue(id) {

  const input =
    document.getElementById(id);

  return input
    ? input.value.trim()
    : "";
}

function focusField(id) {

  const field =
    document.getElementById(id);

  if (!field) {
    return;
  }

  field.focus();

  field.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

/* =========================================================
   EMAIL CONFIRMATION
========================================================= */

function createEmailConfirmationModal() {

  let modal =
    document.getElementById("emailConfirmModal");

  if (modal) {
    return modal;
  }

  modal = document.createElement("div");

  modal.id = "emailConfirmModal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-hidden", "true");

  modal.innerHTML = `
    <div class="email-confirm-card">
      <div class="email-confirm-icon" aria-hidden="true">âœ“</div>

      <div class="email-confirm-title">
        Confirm Your Email
      </div>

      <div class="email-confirm-message">
        Please confirm that this is the correct email address
        for your order and payment confirmation.
      </div>

      <div class="email-confirm-address">
        <span id="confirmedEmailDisplay"></span>
      </div>

      <div class="email-confirm-actions">
        <button
          type="button"
          class="email-confirm-change"
          id="changeEmailBtn"
        >
          Change Email
        </button>

        <button
          type="button"
          class="email-confirm-continue"
          id="confirmEmailBtn"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  `;

  const style = document.createElement("style");

  style.textContent = `
    #emailConfirmModal {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 29, 50, 0.58);
      backdrop-filter: blur(4px);
    }

    #emailConfirmModal.active {
      display: flex;
    }

    .email-confirm-card {
      width: min(470px, 100%);
      padding: 34px 30px 30px;
      background: #ffffff;
      border: 1px solid #d9e3f0;
      border-radius: 18px;
      box-shadow: 0 24px 70px rgba(23, 51, 95, 0.24);
      text-align: center;
      font-family: Inter, Arial, sans-serif;
    }

    .email-confirm-icon {
      width: 52px;
      height: 52px;
      margin: 0 auto 18px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #edf5ff;
      color: #325aa3;
      font-size: 25px;
      font-weight: 900;
    }

    .email-confirm-title {
      color: #24467f;
      font-size: 22px;
      line-height: 1.25;
      font-weight: 900;
      margin-bottom: 10px;
    }

    .email-confirm-message {
      color: #667892;
      font-size: 13px;
      line-height: 1.7;
      margin-bottom: 18px;
    }

    .email-confirm-address {
      width: 100%;
      box-sizing: border-box;
      padding: 13px 15px;
      border: 1px solid #d9e3f0;
      border-radius: 9px;
      background: #f7faff;
      color: #24467f;
      font-size: 14px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .email-confirm-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 22px;
    }

    .email-confirm-actions button {
      min-height: 44px;
      padding: 11px 18px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      transition: background .15s ease, border-color .15s ease;
    }

    .email-confirm-change {
      border: 1px solid #d1dce9;
      background: #ffffff;
      color: #325aa3;
    }

    .email-confirm-change:hover {
      background: #f5f8fc;
      border-color: #b8c8dc;
    }

    .email-confirm-continue {
      border: 0;
      background: #325aa3;
      color: #ffffff;
    }

    .email-confirm-continue:hover {
      background: #24467f;
    }

    .email-confirm-continue:disabled {
      opacity: .65;
      cursor: wait;
    }

    @media (max-width: 520px) {
      .email-confirm-card {
        padding: 30px 20px 22px;
      }

      .email-confirm-actions {
        flex-direction: column-reverse;
      }

      .email-confirm-actions button {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(modal);

  return modal;
}

function setupEmailModal() {

  const modal =
    createEmailConfirmationModal();

  const changeButton =
    modal.querySelector("#changeEmailBtn");

  const confirmButton =
    modal.querySelector("#confirmEmailBtn");

  if (changeButton) {

    changeButton.addEventListener(
      "click",
      () => {

        emailConfirmed = false;
        confirmedEmailValue = "";

        closeEmailConfirmation();

        const email =
          document.getElementById("email");

        if (email) {
          email.focus();
          email.select();
        }
      }
    );
  }

  if (confirmButton) {

    confirmButton.addEventListener(
      "click",
      handleEmailConfirmation
    );
  }
}

function openEmailConfirmation(email) {

  const modal =
    createEmailConfirmationModal();

  const display =
    modal.querySelector(
      "#confirmedEmailDisplay"
    );

  if (!display) {
    throw new Error(
      "Email confirmation dialog could not be initialized."
    );
  }

  display.textContent = email;

  modal.classList.add("active");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow = "hidden";
}

function closeEmailConfirmation() {

  const modal =
    document.getElementById("emailConfirmModal");

  if (!modal) {
    return;
  }

  /*
   * Remove focus from a modal control BEFORE applying
   * aria-hidden so the browser does not report that a focused
   * descendant was hidden from assistive technology.
   */
  if (
    document.activeElement &&
    modal.contains(document.activeElement)
  ) {
    document.activeElement.blur();
  }

  modal.classList.remove("active");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow = "";
}

async function handleEmailConfirmation() {

  /*
   * Ignore a second click while the first confirmation is still
   * preparing the secure payment form.
   */
  if (emailConfirmationInProgress) {
    return;
  }

  /*
   * If Stripe is already mounted, do not recreate it.
   */
  if (paymentMounted && paymentElement && elements) {
    closeEmailConfirmation();
    return;
  }

  const form =
    document.getElementById("checkoutForm");

  const confirmButton =
    document.getElementById("confirmEmailBtn");

  if (!form) {
    return;
  }

  const validation =
    validateCustomerForm(form);

  if (!validation.valid) {
    closeEmailConfirmation();

    showPaymentError(
      validation.message
    );

    focusField(
      validation.field
    );

    return;
  }

  emailConfirmationInProgress = true;

  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.setAttribute(
      "aria-busy",
      "true"
    );
  }

  emailConfirmed = true;
  confirmedEmailValue =
    getInputValue("email")
      .trim()
      .toLowerCase();

  closeEmailConfirmation();

  const button =
    document.getElementById("payButton");

  setButton(
    button,
    true,
    "Preparing Secure Payment..."
  );

  try {

    const result =
      await createPaymentIntent(form);

    if (!result) {
      throw new Error(
        "The payment server returned no data."
      );
    }

    orderId =
      result.orderId ||
      result.order_id ||
      null;

    orderNumber =
      result.orderNumber ||
      result.order_number ||
      null;

    trackingNumber =
      result.trackingNumber ||
      result.tracking_number ||
      null;

    paymentIntentId =
      result.paymentIntentId ||
      result.payment_intent_id ||
      null;

    updateCheckoutFromServer(result);

    if (!result.clientSecret) {
      throw new Error(
        "The payment server did not return a Stripe client secret."
      );
    }

    /*
     * The PaymentIntent exists. Reveal the payment section and
     * mount Stripe exactly once.
     */
    await mountStripePayment(
      result.clientSecret
    );

    if (
      !paymentMounted ||
      !paymentElement ||
      !elements
    ) {
      throw new Error(
        "Stripe did not finish loading the secure payment form."
      );
    }

    paymentIntentCreated = true;

    lockCustomerFields(form);

    setButton(
      button,
      false,
      currentPayLabel()
    );

    showOrderNotice();
    clearPaymentError();

  } catch (error) {

    console.error(
      "Payment setup error:",
      error
    );

    /*
     * Do NOT hide the Payment section here. Hiding its parent after
     * Stripe begins mounting causes the exact flicker/disappear
     * behavior we are trying to eliminate.
     */
    showPaymentError(
      error?.message ||
      "Unable to prepare secure payment."
    );

    setButton(
      button,
      false,
      "Continue to Secure Payment"
    );

  } finally {

    emailConfirmationInProgress = false;

    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.removeAttribute(
        "aria-busy"
      );
    }
  }
}

function showOrderNotice() {

  const orderNotice =
    document.getElementById("orderNotice");

  if (!orderNotice) {
    return;
  }

  const parts = [];

  if (orderNumber) {
    parts.push("Order " + orderNumber);
  }

  if (trackingNumber) {
    parts.push(
      "Tracking " + trackingNumber
    );
  }

  if (parts.length) {

    orderNotice.textContent =
      parts.join(" â€¢ ") +
      " is ready for secure payment.";

    orderNotice.style.display =
      "block";
  }
}

/* =========================================================
   USPS BILLING ADDRESS VALIDATION
========================================================= */

async function validateBillingAddressWithUSPS(form) {

  const baseUrl =
    window.SCREENINGS4U_SUPABASE_URL ||
    "";

  if (
    !baseUrl ||
    baseUrl.includes("REPLACE_WITH")
  ) {
    throw new Error(
      "Checkout is not configured. Set SCREENINGS4U_SUPABASE_URL in assets/js/site-config.js."
    );
  }

  const data = new FormData(form);

  const payload = {
    streetAddress:
      getFormValue(data, "address"),

    secondaryAddress:
      getFormValue(data, "address2"),

    city:
      getFormValue(data, "city"),

    state:
      getFormValue(data, "state").toUpperCase(),

    ZIPCode:
      getFormValue(data, "zip")
        .replace(/\D/g, "")
        .slice(0, 5)
  };

  showAddressValidation();

  try {

    const supabaseAnonKey =
      window.SCREENINGS4U_SUPABASE_ANON_KEY ||
      "";

    if (!supabaseAnonKey) {
      throw new Error(
        "Checkout is not configured. Set SCREENINGS4U_SUPABASE_ANON_KEY in assets/js/site-config.js."
      );
    }

    const response = await fetch(
      "https://rgsrubdtljyxmnihwlah.supabase.co/functions/v1/validate-usps-address",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(payload)
      }
    );

    let result = null;

    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
        "USPS address verification is temporarily unavailable. Please try again."
      );
    }

    if (!result?.valid) {
      /*
       * USPS answered the request. Keep the validation dialog visible long
       * enough to show the customer that the address was rejected, then
       * let the customer return to the form.
       */
      await showAddressValidationError(
        result?.message ||
        "USPS could not validate this billing address. Please check your street address, apartment or suite number, city, state, and ZIP code."
      );

      return {
        valid: false,
        message:
          result?.message ||
          "USPS could not validate this billing address."
      };
    }

    /*
     * USPS has successfully validated the address. Keep the same overlay
     * on screen, stop the spinner, show a success check, and briefly show
     * the successful validation state before the address-choice modal.
     */
    await showAddressValidationSuccess();

    return {
      valid: true,
      address: result.address || null
    };

  } finally {
    hideAddressValidation();
  }
}

function applyUSPSAddressToForm(address) {

  if (!address) {
    return;
  }

  const street = document.getElementById("address");
  const address2 = document.getElementById("address2");
  const city = document.getElementById("city");
  const state = document.getElementById("state");
  const zip = document.getElementById("zip");

  if (street && address.streetAddress) {
    street.value = address.streetAddress;
    markFieldAsManuallyTyped(street);
  }

  if (address2 && address.secondaryAddress !== undefined) {
    address2.value =
      address.secondaryAddress || "";
  }

  if (city && address.city) {
    city.value = address.city;
    markFieldAsManuallyTyped(city);
  }

  if (state && address.state) {
    state.value =
      String(address.state).toUpperCase();

    /*
     * USPS is standardizing the address, not the customer
     * manually selecting a state here. Keep the field verified
     * for the current checkout flow because this standardized
     * value came from our trusted server-side validation.
     */
    markFieldAsManuallyTyped(state);
  }

  if (zip && address.ZIPCode) {

    const five =
      String(address.ZIPCode)
        .replace(/\D/g, "")
        .slice(0, 5);

    const plus4 =
      String(address.ZIPPlus4 || "")
        .replace(/\D/g, "")
        .slice(0, 4);

    zip.value =
      five +
      (plus4 ? "-" + plus4 : "");

    markFieldAsManuallyTyped(zip);
  }
}

/* =========================================================
   USPS ADDRESS CONFIRMATION
   Customer must explicitly approve the standardized address.
========================================================= */

function createUSPSAddressConfirmationModal() {

  if (addressConfirmationOverlay) {
    return addressConfirmationOverlay;
  }

  const overlay = document.createElement("div");

  overlay.id = "uspsAddressConfirmation";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-hidden", "true");

  overlay.innerHTML = `
    <div class="usps-address-confirmation-card">
      <div class="usps-address-confirmation-icon" aria-hidden="true">
        âœ“
      </div>

      <div class="usps-address-confirmation-eyebrow">
        USPS ADDRESS VALIDATED
      </div>

      <h2 class="usps-address-confirmation-title">
        We Found Your Address.
      </h2>

      <p class="usps-address-confirmation-message">
        USPS has validated your address and found the standardized version below.
        Would you like to use this address for your order?
      </p>

      <div class="usps-standardized-address">
        <div class="usps-address-line" id="uspsConfirmStreet"></div>
        <div class="usps-address-line" id="uspsConfirmSecondary"></div>
        <div class="usps-address-line" id="uspsConfirmCityStateZip"></div>
      </div>

      <div class="usps-address-confirmation-actions">
        <button
          type="button"
          class="usps-address-secondary-button"
          id="uspsEnterAnotherAddress"
        >
          Enter Another Address
        </button>

        <button
          type="button"
          class="usps-address-primary-button"
          id="uspsUseAddress"
        >
          Use This Address
        </button>
      </div>
    </div>
  `;

  const style = document.createElement("style");

  style.textContent = `
    #uspsAddressConfirmation {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 29, 50, 0.58);
      backdrop-filter: blur(4px);
    }

    #uspsAddressConfirmation.active {
      display: flex;
    }

    .usps-address-confirmation-card {
      width: min(500px, 100%);
      padding: 34px 30px 30px;
      background: #fff;
      border: 1px solid #d9e3f0;
      border-radius: 18px;
      box-shadow: 0 24px 70px rgba(23, 51, 95, 0.24);
      text-align: center;
      font-family: Inter, Arial, sans-serif;
    }

    .usps-address-confirmation-icon {
      width: 54px;
      height: 54px;
      margin: 0 auto 16px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #eaf3ff;
      color: #325aa3;
      font-size: 28px;
      font-weight: 900;
    }

    .usps-address-confirmation-eyebrow {
      color: #ff6b00;
      font-size: 11px;
      letter-spacing: .12em;
      font-weight: 900;
      margin-bottom: 8px;
    }

    .usps-address-confirmation-title {
      margin: 0 0 10px;
      color: #24467f;
      font-size: 24px;
      line-height: 1.2;
      font-weight: 900;
    }

    .usps-address-confirmation-message {
      margin: 0;
      color: #667892;
      font-size: 13px;
      line-height: 1.65;
    }

    .usps-standardized-address {
      margin: 20px 0;
      padding: 18px;
      border: 1px solid #d9e3f0;
      border-radius: 12px;
      background: #f7faff;
      text-align: left;
      color: #24467f;
      font-size: 14px;
      line-height: 1.7;
      font-weight: 700;
    }

    .usps-address-line:empty {
      display: none;
    }

    .usps-address-confirmation-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .usps-address-primary-button,
    .usps-address-secondary-button {
      min-height: 44px;
      padding: 12px 18px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }

    .usps-address-primary-button {
      border: 0;
      background: #ff6b00;
      color: #fff;
    }

    .usps-address-primary-button:hover {
      background: #e85f00;
    }

    .usps-address-secondary-button {
      border: 1px solid #325aa3;
      background: #fff;
      color: #325aa3;
    }

    .usps-address-secondary-button:hover {
      background: #f2f6fc;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  addressConfirmationOverlay = overlay;

  overlay.querySelector("#uspsUseAddress")
    ?.addEventListener("click", () => {
      resolveUSPSAddressConfirmation(true);
    });

  overlay.querySelector("#uspsEnterAnotherAddress")
    ?.addEventListener("click", () => {
      resetAddressFields();
      resolveUSPSAddressConfirmation(false);
    });

  return overlay;
}

let uspsAddressConfirmationResolver = null;

function confirmUSPSAddress(address) {

  const modal =
    createUSPSAddressConfirmationModal();

  const street =
    modal.querySelector("#uspsConfirmStreet");

  const secondary =
    modal.querySelector("#uspsConfirmSecondary");

  const cityStateZip =
    modal.querySelector("#uspsConfirmCityStateZip");

  const stateName =
    getStateName(address?.state);

  const zip =
    address?.ZIPPlus4
      ? `${address?.ZIPCode || ""}-${address.ZIPPlus4}`
      : address?.ZIPCode || "";

  if (street) {
    street.textContent =
      address?.streetAddress || "";
  }

  if (secondary) {
    secondary.textContent =
      address?.secondaryAddress || "";
  }

  if (cityStateZip) {
    cityStateZip.textContent =
      [
        address?.city || "",
        stateName || address?.state || "",
        zip
      ].filter(Boolean).join(", ");
  }

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  return new Promise(resolve => {
    uspsAddressConfirmationResolver = resolve;
  });
}

function resolveUSPSAddressConfirmation(useAddress) {

  const modal =
    addressConfirmationOverlay;

  if (!modal) {
    return;
  }

  if (
    document.activeElement &&
    modal.contains(document.activeElement)
  ) {
    document.activeElement.blur();
  }

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  const resolver =
    uspsAddressConfirmationResolver;

  uspsAddressConfirmationResolver = null;

  if (resolver) {
    resolver(Boolean(useAddress));
  }
}

function getStateName(abbreviation) {

  const states = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
    CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
    FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
    IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
    KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
    MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska",
    NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
    NM: "New Mexico", NY: "New York", NC: "North Carolina",
    ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
    PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
    VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
    WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia"
  };

  return states[String(abbreviation || "").toUpperCase()] || "";
}

/* =========================================================
   ADDRESS VALIDATION OVERLAY
   Matches the existing payment-processing spinner style.
========================================================= */

function createAddressValidationOverlay() {

  if (addressValidationOverlay) {
    return addressValidationOverlay;
  }

  const overlay =
    document.createElement("div");

  overlay.id =
    "addressValidationOverlay";

  overlay.setAttribute(
    "role",
    "dialog"
  );

  overlay.setAttribute(
    "aria-modal",
    "true"
  );

  overlay.setAttribute(
    "aria-live",
    "polite"
  );

  overlay.innerHTML = `
    <div class="address-validation-card">

      <div
        class="address-validation-spinner"
        id="addressValidationIndicator"
        aria-hidden="true"
      ></div>

      <div class="address-validation-title" id="addressValidationTitle">
        Verifying Your Address
      </div>

      <div class="address-validation-message" id="addressValidationMessage">
        We are checking your billing address with USPS.
        Please wait while we verify and standardize the address.
      </div>

      <div class="address-validation-status" id="addressValidationStatus">
        Connecting securely to USPS...
      </div>

      <button
        type="button"
        class="address-validation-action"
        id="addressValidationAction"
        style="display:none;"
      >
        Try Again
      </button>

    </div>
  `;

  const style =
    document.createElement("style");

  style.textContent = `
    #addressValidationOverlay {
      position: fixed;
      inset: 0;
      z-index: 99998;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 29, 50, 0.58);
      backdrop-filter: blur(4px);
    }

    #addressValidationOverlay.active {
      display: flex;
    }

    .address-validation-card {
      width: min(440px, 100%);
      padding: 34px 30px;
      background: #ffffff;
      border: 1px solid #d9e3f0;
      border-radius: 18px;
      box-shadow: 0 24px 70px rgba(23, 51, 95, 0.24);
      text-align: center;
      font-family: Inter, Arial, sans-serif;
    }

    .address-validation-spinner {
      width: 52px;
      height: 52px;
      margin: 0 auto 22px;
      border: 4px solid #d9e3f0;
      border-top-color: #325aa3;
      border-right-color: #ff6b00;
      border-radius: 50%;
      animation: screenings4uAddressSpin .85s linear infinite;
    }

    .address-validation-title {
      color: #24467f;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 900;
      margin-bottom: 10px;
    }

    .address-validation-message {
      color: #667892;
      font-size: 13px;
      line-height: 1.65;
    }

    .address-validation-status {
      margin-top: 16px;
      color: #325aa3;
      font-size: 12px;
      font-weight: 800;
    }

    .address-validation-action {
      margin-top: 20px;
      min-width: 150px;
      min-height: 42px;
      padding: 11px 18px;
      border: 0;
      border-radius: 9px;
      background: #ff6b00;
      color: #fff;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }

    .address-validation-action:hover {
      background: #e85f00;
    }

    .address-validation-spinner.success {
      border: 0;
      background: #eaf3ff;
      position: relative;
      animation: none;
    }

    .address-validation-spinner.success::after {
      content: "âœ“";
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: #325aa3;
      font-size: 29px;
      font-weight: 900;
    }

    .address-validation-spinner.error {
      border: 0;
      background: #fff3e8;
      position: relative;
      animation: none;
    }

    .address-validation-spinner.error::after {
      content: "!";
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: #ff6b00;
      font-size: 27px;
      font-weight: 900;
    }

    @keyframes screenings4uAddressSpin {
      to {
        transform: rotate(360deg);
      }
    }

    body.address-validation-active {
      overflow: hidden;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  addressValidationOverlay = overlay;

  return overlay;
}

function showAddressValidation() {

  createAddressValidationOverlay()
    .classList.add("active");

  document.body.classList.add(
    "address-validation-active"
  );
}

function setAddressValidationContent({
  state = "loading",
  title,
  message,
  status,
  actionLabel = "",
  onAction = null
} = {}) {

  const overlay =
    createAddressValidationOverlay();

  const indicator =
    overlay.querySelector("#addressValidationIndicator");

  const titleEl =
    overlay.querySelector("#addressValidationTitle");

  const messageEl =
    overlay.querySelector("#addressValidationMessage");

  const statusEl =
    overlay.querySelector("#addressValidationStatus");

  const action =
    overlay.querySelector("#addressValidationAction");

  if (indicator) {
    indicator.classList.remove("success", "error");

    if (state === "success") {
      indicator.classList.add("success");
    } else if (state === "error") {
      indicator.classList.add("error");
    }
  }

  if (titleEl) {
    titleEl.textContent =
      title || "Verifying Your Address";
  }

  if (messageEl) {
    messageEl.textContent =
      message ||
      "We are checking your billing address with USPS. Please wait while we verify and standardize the address.";
  }

  if (statusEl) {
    statusEl.textContent =
      status || "Connecting securely to USPS...";
  }

  if (action) {
    action.style.display =
      actionLabel ? "inline-flex" : "none";

    action.textContent =
      actionLabel || "";

    action.onclick =
      typeof onAction === "function"
        ? onAction
        : null;
  }
}

function showAddressValidationSuccess() {

  setAddressValidationContent({
    state: "success",
    title: "Address Validated",
    message:
      "USPS has successfully validated your billing address.",
    status:
      "Address verified successfully."
  });

  return new Promise(resolve => {
    window.setTimeout(resolve, 900);
  });
}

function showAddressValidationError(message) {

  return new Promise(resolve => {

    setAddressValidationContent({
      state: "error",
      title: "We Couldn't Verify This Address",
      message:
        message ||
        "We could not verify the address you entered with USPS. Please check your street address, apartment or suite number, city, state, and ZIP code.",
      status:
        "Please review the address and try again.",
      actionLabel:
        "Enter Another Address",
      onAction: () => {
        resetAddressFields();
        resolve();
      }
    });

    /*
     * The overlay is already visible. Keep it visible until the customer
     * acknowledges the failed validation.
     */
  });
}

function hideAddressValidation() {

  if (!addressValidationOverlay) {
    return;
  }

  addressValidationOverlay
    .classList.remove("active");

  document.body.classList.remove(
    "address-validation-active"
  );
}

/* =========================================================
   CREATE PAYMENT INTENT
========================================================= */

async function createPaymentIntent(form) {

  const baseUrl =
    window.SCREENINGS4U_SUPABASE_URL ||
    "";

  if (
    !baseUrl ||
    baseUrl.includes("REPLACE_WITH")
  ) {

    throw new Error(
      "Checkout is not configured. Set SCREENINGS4U_SUPABASE_URL in assets/js/site-config.js."
    );
  }

  const data =
    new FormData(form);

  const customer = {

    firstName:
      getFormValue(
        data,
        "firstName"
      ),

    lastName:
      getFormValue(
        data,
        "lastName"
      ),

    email:
      getFormValue(
        data,
        "email"
      ),

    phone:
      getFormValue(
        data,
        "phone"
      ),

    address:
      getFormValue(
        data,
        "address"
      ),

    address2:
      getFormValue(
        data,
        "address2"
      ),

    city:
      getFormValue(
        data,
        "city"
      ),

    state:
      getFormValue(
        data,
        "state"
      ).toUpperCase(),

    zip:
      getFormValue(
        data,
        "zip"
      )
  };

  const functionUrl =
    baseUrl.replace(/\/+$/, "") +
    "/functions/v1/" +
    PAYMENT_FUNCTION_NAME;

  console.log(
    "Creating payment intent:",
    {
      functionUrl,
      serviceId:
        selectedService.id
    }
  );

  const response =
    await fetch(
      functionUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            /*
             * SERVICE ID ONLY.
             */
            serviceId:
              selectedService.id,

            discountCode:
              appliedDiscountCode || null,

            customer
          })
      }
    );

  let result = null;

  try {

    result =
      await response.json();

  } catch {

    throw new Error(
      "The payment server returned an invalid response."
    );
  }

  console.log(
    "create-payment-intent response:",
    result
  );

  if (!response.ok) {

    const serverErrorParts = [
      result?.error || result?.message,
      result?.stage ? "Stage: " + result.stage : "",
      result?.code ? "Code: " + result.code : "",
      result?.details ? "Details: " + result.details : ""
    ].filter(Boolean);

    const serverErrorMessage =
      serverErrorParts.join(" | ") ||
      "The secure payment server could not create the payment.";

    console.error(
      "create-payment-intent failed:",
      {
        status: response.status,
        statusText: response.statusText,
        result
      }
    );

    throw new Error(
      serverErrorMessage
    );
  }

  if (
    !result ||
    !result.clientSecret
  ) {

    throw new Error(
      "The payment server did not return a Stripe client secret."
    );
  }

  return result;
}

/* =========================================================
   MOUNT STRIPE PAYMENT ELEMENT
========================================================= */

async function mountStripePayment(
  clientSecret
) {

  /*
   * Never destroy and recreate a working Payment Element.
   * Re-mounting can make Stripe appear briefly and then disappear.
   */
  if (
    paymentMounted &&
    paymentElement &&
    elements
  ) {
    return;
  }

  paymentMounted = false;

  if (!stripe) {
    throw new Error(
      "Stripe has not been initialized."
    );
  }

  if (!clientSecret) {
    throw new Error(
      "Stripe client secret is missing."
    );
  }

  const paymentContainer =
    document.getElementById("payment-element");

  if (!paymentContainer) {
    throw new Error(
      "The Stripe payment element could not be found."
    );
  }

  /*
   * =========================================================
   * SHOW PAYMENT SECTION
   *
   * The Payment Element must be mounted into a real,
   * visible DOM container. Some checkout layouts keep the
   * payment area hidden until the customer confirms email.
   * Reveal it BEFORE calling Stripe.mount().
   * =========================================================
   */

  revealPaymentSection(paymentContainer);

  /*
   * Give the browser one rendering cycle to apply the
   * visibility/layout changes before Stripe mounts.
   */
  await new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

  /*
   * A zero-size container is a strong indication that the
   * payment section is still hidden by the page CSS/layout.
   */
  const rect =
    paymentContainer.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    console.error(
      "Stripe Payment Element container is not visible:",
      {
        width: rect.width,
        height: rect.height,
        display:
          window.getComputedStyle(paymentContainer).display,
        visibility:
          window.getComputedStyle(paymentContainer).visibility
      }
    );

    throw new Error(
      "The secure payment form is hidden and cannot be loaded. Please refresh the page and try again."
    );
  }

  /*
   * Remove any previous Payment Element.
   */
  if (paymentElement) {
    try {
      paymentElement.destroy();
    } catch (error) {
      console.warn(
        "Unable to destroy previous Payment Element:",
        error
      );
    }

    paymentElement = null;
  }

  elements = null;
  paymentContainer.innerHTML = "";

  /*
   * =========================================================
   * CREATE STRIPE ELEMENTS
   * =========================================================
   */

  elements =
    stripe.elements({
      clientSecret,

      appearance: {
        theme: "stripe",

        variables: {
          colorPrimary: "#325aa3",
          colorText: "#1d2d45",
          borderRadius: "8px",
          fontFamily:
            "Inter, Arial, sans-serif"
        }
      }
    });

  /*
   * =========================================================
   * CREATE PAYMENT ELEMENT
   * =========================================================
   */

  paymentElement =
    elements.create("payment");

  /*
   * =========================================================
   * MOUNT PAYMENT ELEMENT
   * =========================================================
   */

  try {

    await paymentElement.mount(
      paymentContainer
    );

  } catch (error) {

    paymentMounted = false;
    paymentElement = null;
    elements = null;

    console.error(
      "Stripe Payment Element mount failed:",
      error
    );

    throw new Error(
      "Stripe could not load the secure payment form. Please refresh the page and try again."
    );
  }

  /*
   * Stripe has successfully mounted the Payment Element.
   */
  paymentMounted = true;


  /*
   * Stripe Payment Element change events.
   */
  paymentElement.on(
    "change",
    event => {

      if (event.error) {

        showPaymentError(
          event.error.message
        );

      } else {

        clearPaymentError();
      }
    }
  );

  console.log(
    "Stripe Payment Element mounted successfully."
  );
}


/*
 * =========================================================
 * REVEAL PAYMENT SECTION
 * =========================================================
 *
 * This intentionally handles common checkout layouts:
 *
 * - display:none
 * - hidden
 * - opacity:0
 * - collapsed max-height
 * - hidden parent containers
 * - [hidden] attributes
 *
 * The Payment Element is revealed BEFORE Stripe.mount().
 */

function revealPaymentSection(
  paymentContainer
) {

  let current =
    paymentContainer;

  const elementsToReveal = [];

  while (
    current &&
    current !== document.body
  ) {

    elementsToReveal.push(current);
    current = current.parentElement;
  }

  elementsToReveal.forEach(element => {

    /*
     * The payment wrapper starts with aria-hidden="true".
     * It becomes available to assistive technology only after
     * the customer confirms the email and the PaymentIntent
     * has been created successfully.
     */
    if (
      element.id === "paymentSection"
    ) {
      element.setAttribute(
        "aria-hidden",
        "false"
      );
    }

    if (
      element.hasAttribute("hidden")
    ) {
      element.removeAttribute("hidden");
    }

    element.classList.remove(
      "hidden",
      "is-hidden",
      "payment-hidden",
      "checkout-hidden",
      "collapsed",
      "closed"
    );

    const computed =
      window.getComputedStyle(element);

    if (
      computed.display === "none"
    ) {
      element.style.display = "";
    }

    if (
      window.getComputedStyle(element).display === "none"
    ) {
      element.style.display = "block";
    }

    if (
      window.getComputedStyle(element).visibility === "hidden"
    ) {
      element.style.visibility = "visible";
    }

    if (
      parseFloat(
        window.getComputedStyle(element).opacity
      ) === 0
    ) {
      element.style.opacity = "1";
    }

    /*
     * Only remove inline max-height when it is actually
     * preventing the payment section from being displayed.
     */
    if (
      computed.maxHeight !== "none" &&
      parseFloat(computed.maxHeight) === 0
    ) {
      element.style.maxHeight = "none";
    }

  });

  /*
   * The actual Stripe mount container must always be usable.
   */
  paymentContainer.style.display = "block";
  paymentContainer.style.visibility = "visible";
  paymentContainer.style.opacity = "1";
  paymentContainer.style.minHeight = "120px";

  const paymentSection =
    document.getElementById("paymentSection");

  if (paymentSection) {
    paymentSection.style.display = "block";
    paymentSection.style.visibility = "visible";
    paymentSection.style.opacity = "1";
    paymentSection.setAttribute(
      "aria-hidden",
      "false"
    );
  }
}


/*
 * Find the nearest useful visual section surrounding the
 * Payment Element for scrolling after Stripe mounts.
 */
function findPaymentSection(
  paymentContainer
) {

  let current =
    paymentContainer;

  for (
    let i = 0;
    i < 5 && current;
    i++
  ) {

    if (
      current.matches &&
      (
        current.matches("section") ||
        current.matches(".card") ||
        current.matches(".payment-card") ||
        current.matches(".checkout-card") ||
        current.matches(".payment-section")
      )
    ) {
      return current;
    }

    current =
      current.parentElement;
  }

  return paymentContainer;
}

/* =========================================================
   CONFIRM PAYMENT
========================================================= */

async function confirmPayment(form) {

  if (!emailConfirmed) {

    throw new Error(
      "Please confirm your email address before continuing."
    );
  }

  if (
    !elements ||
    !paymentElement
  ) {

    throw new Error(
      "The Stripe payment form has not been initialized."
    );
  }

  const data =
    new FormData(form);

  const firstName =
    getFormValue(data, "firstName");

  const lastName =
    getFormValue(data, "lastName");

  const email =
    getFormValue(data, "email");

  const phone =
    getFormValue(data, "phone");

  const address =
    getFormValue(data, "address");

  const city =
    getFormValue(data, "city");

  const state =
    getFormValue(data, "state");

  const zip =
    getFormValue(data, "zip");

  const { error } =
    await stripe.confirmPayment({

      elements,

      confirmParams: {

        payment_method_data: {

          billing_details: {

            name:
              `${firstName} ${lastName}`.trim(),

            email,

            phone,

            address: {

              line1:
                address,

              city,

              state,

              postal_code:
                zip,

              country:
                "US"
            }
          }
        },

        return_url:
          window.location.origin +
          "/order-confirmation.html?order=" +
          encodeURIComponent(
            orderId || ""
          )
      },

      redirect:
        "if_required"
    });

  if (error) {

    throw new Error(
      error.message
    );
  }

  showPaymentProcessing();

  setButton(
    document.getElementById(
      "payButton"
    ),
    true,
    "Payment Confirmed"
  );

const confirmationUrl =
  window.location.origin +
  "/order-confirmation.html?order=" +
  encodeURIComponent(orderId || "") +
  "&tracking=" +
  encodeURIComponent(trackingNumber || "");

  window.setTimeout(() => {

    window.location.assign(
      confirmationUrl
    );

  }, 250);
}

/* =========================================================
   LOCK CUSTOMER FIELDS
========================================================= */

function lockCustomerFields(form) {

  if (!form) {
    return;
  }

  form
    .querySelectorAll("input")
    .forEach(input => {

      input.readOnly = true;
    });
}

/* =========================================================
   FORM VALUE HELPER
========================================================= */

function getFormValue(
  formData,
  name
) {

  return String(
    formData.get(name) ||
    ""
  ).trim();
}

/* =========================================================
   BUTTON
========================================================= */

function setButton(
  button,
  disabled,
  label
) {

  if (!button) {
    return;
  }

  button.disabled = disabled;
  button.textContent = label;
}

/* =========================================================
   CHECKOUT ERROR
========================================================= */

function showCheckoutError(message) {

  const loading =
    document.getElementById("loading");

  const errorCard =
    document.getElementById("errorCard");

  if (loading) {
    loading.style.display = "none";
  }

  if (errorCard) {

    errorCard.style.display = "block";

    const notice =
      errorCard.querySelector(".notice");

    if (notice) {
      notice.textContent = message;
    }
  }
}

/* =========================================================
   PAYMENT ERROR
========================================================= */

function showPaymentError(message) {

  const box =
    document.getElementById("paymentError");

  if (!box) {
    return;
  }

  box.className = "error";
  box.textContent = message;
  box.style.display = "block";
}

function clearPaymentError() {

  const box =
    document.getElementById("paymentError");

  if (box) {

    box.style.display = "none";
    box.textContent = "";
  }
}

/* =========================================================
   PAYMENT PROCESSING OVERLAY
========================================================= */

function createPaymentProcessingOverlay() {

  if (paymentProcessingOverlay) {
    return paymentProcessingOverlay;
  }

  const overlay =
    document.createElement("div");

  overlay.id =
    "paymentProcessingOverlay";

  overlay.setAttribute(
    "role",
    "dialog"
  );

  overlay.setAttribute(
    "aria-modal",
    "true"
  );

  overlay.setAttribute(
    "aria-live",
    "polite"
  );

  overlay.innerHTML = `
    <div class="payment-processing-card">

      <div
        class="payment-processing-spinner"
        aria-hidden="true"
      ></div>

      <div class="payment-processing-title">
        Processing Your Payment
      </div>

      <div class="payment-processing-message">
        Your payment has been submitted securely.
        Please do not close this window or press the
        payment button again while we confirm your order.
      </div>

      <div class="payment-processing-status">
        Confirming your payment with Stripe...
      </div>

    </div>
  `;

  const style =
    document.createElement("style");

  style.textContent = `
    #paymentProcessingOverlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 29, 50, 0.58);
      backdrop-filter: blur(4px);
    }

    #paymentProcessingOverlay.active {
      display: flex;
    }

    .payment-processing-card {
      width: min(440px, 100%);
      padding: 34px 30px;
      background: #ffffff;
      border: 1px solid #d9e3f0;
      border-radius: 18px;
      box-shadow: 0 24px 70px rgba(23, 51, 95, 0.24);
      text-align: center;
      font-family: Inter, Arial, sans-serif;
    }

    .payment-processing-spinner {
      width: 52px;
      height: 52px;
      margin: 0 auto 22px;
      border: 4px solid #d9e3f0;
      border-top-color: #325aa3;
      border-right-color: #ff6b00;
      border-radius: 50%;
      animation: screenings4uPaymentSpin .85s linear infinite;
    }

    .payment-processing-title {
      color: #24467f;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 900;
      margin-bottom: 10px;
    }

    .payment-processing-message {
      color: #667892;
      font-size: 13px;
      line-height: 1.65;
    }

    .payment-processing-status {
      margin-top: 16px;
      color: #325aa3;
      font-size: 12px;
      font-weight: 800;
    }

    @keyframes screenings4uPaymentSpin {
      to {
        transform: rotate(360deg);
      }
    }

    body.payment-processing-active {
      overflow: hidden;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  paymentProcessingOverlay = overlay;

  return overlay;
}

function showPaymentProcessing() {

  createPaymentProcessingOverlay()
    .classList.add("active");

  document.body.classList.add(
    "payment-processing-active"
  );
}

function hidePaymentProcessing() {

  if (!paymentProcessingOverlay) {
    return;
  }

  paymentProcessingOverlay
    .classList.remove("active");

  document.body.classList.remove(
    "payment-processing-active"
  );
}

/* =========================================================
   PAYMENT SUCCESS
========================================================= */

function showPaymentSuccess(message) {

  const box =
    document.getElementById(
      "paymentError"
    );

  if (!box) {
    return;
  }

  box.className =
    "notice success";

  box.textContent =
    message;

  box.style.display =
    "block";
}

/* =========================================================
   CLEAR MESSAGES
========================================================= */

function clearMessages() {

  clearPaymentError();

  const setupNotice =
    document.getElementById(
      "setupNotice"
    );

  if (setupNotice) {
    setupNotice.style.display =
      "none";
  }
}

/**
 * screenings4u â€” Checkout Billing Address Validation
 *
 * Add this script after checkout.js OR copy these functions
 * into checkout.js.
 *
 * Required IDs:
 *   address
 *   address2
 *   city
 *   state
 *   zip
 *
 * Optional:
 *   addressValidationMessage
 *
 * The browser calls our Supabase Edge Function.
 * USPS credentials NEVER appear in this file.
 *
 * NOTE: checkout submission uses validateBillingAddress() below.
 * This legacy helper is retained only for reference and is not called.
 */

"use strict";

let billingAddressVerified = false;
let billingAddressVerificationKey = "";


/* =========================================================
   ADDRESS FIELD
========================================================= */

function getBillingAddressData() {

  return {
    streetAddress:
      getInputValue("address"),

    secondaryAddress:
      getInputValue("address2"),

    city:
      getInputValue("city"),

    state:
      getInputValue("state")
        .toUpperCase(),

    ZIPCode:
      getInputValue("zip")
        .replace(/\D/g, "")
        .slice(0, 5)
  };
}


function getBillingAddressVerificationKey() {

  const data =
    getBillingAddressData();

  return [
    data.streetAddress,
    data.secondaryAddress,
    data.city,
    data.state,
    data.ZIPCode
  ]
    .map(
      value =>
        String(value || "")
          .trim()
          .toLowerCase()
    )
    .join("|");
}


/* =========================================================
   INVALIDATE AFTER EDIT
========================================================= */

function invalidateBillingAddressVerification() {

  billingAddressVerified = false;
  billingAddressVerificationKey = "";

  hideAddressValidationMessage();
}


function setupBillingAddressValidationState() {

  [
    "address",
    "address2",
    "city",
    "state",
    "zip"
  ].forEach(id => {

    const input =
      document.getElementById(id);

    if (!input) {
      return;
    }

    input.addEventListener(
      "input",
      invalidateBillingAddressVerification
    );

    input.addEventListener(
      "change",
      invalidateBillingAddressVerification
    );
  });
}


/* =========================================================
   VALIDATE WITH OUR EDGE FUNCTION
========================================================= */

async function validateBillingAddress() {

  const address =
    getBillingAddressData();

  if (
    !address.streetAddress ||
    !address.city ||
    !address.state ||
    !address.ZIPCode
  ) {

    return {
      verified: false,
      code:
        "ADDRESS_INCOMPLETE",
      message:
        "Please complete your billing street address, city, state, and ZIP code."
    };
  }


  const currentKey =
    getBillingAddressVerificationKey();

  if (
    billingAddressVerified &&
    billingAddressVerificationKey ===
      currentKey
  ) {

    return {
      verified: true,
      cached: true
    };
  }


  showAddressValidationMessage(
    "Verifying your billing address..."
  );


  const supabaseUrl =
    window.SCREENINGS4U_SUPABASE_URL ||
    "";

  if (
    !supabaseUrl ||
    supabaseUrl.includes(
      "REPLACE_WITH"
    )
  ) {

    return {
      verified: false,
      code:
        "USPS_NOT_CONFIGURED",
      message:
        "Address validation is not configured yet."
    };
  }


  const functionUrl =
    supabaseUrl.replace(/\/+$/, "") +
    "/functions/v1/validate-address";


  try {

    const response =
      await fetch(
        functionUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              address
            )
        }
      );


    let result = null;

    try {
      result =
        await response.json();
    } catch {
      result = null;
    }


    if (!response.ok) {

      return {
        verified: false,

        code:
          result?.code ||
          `HTTP_${response.status}`,

        message:
          result?.error ||
          result?.message ||
          "We could not verify your billing address."
      };
    }


    if (!result?.verified) {

      return {
        verified: false,

        code:
          result?.code ||
          "ADDRESS_NOT_VERIFIED",

        message:
          result?.message ||
          "We could not verify your billing address."
      };
    }


    billingAddressVerified =
      true;

    billingAddressVerificationKey =
      currentKey;


    showAddressValidationSuccess(
      result
    );


    return result;

  } catch (error) {

    console.error(
      "Billing address validation error:",
      error
    );

    return {
      verified: false,
      code:
        "ADDRESS_VALIDATION_NETWORK_ERROR",
      message:
        "We could not reach the address validation service. Please try again."
    };
  }
}


/* =========================================================
   DISPLAY
========================================================= */

function getAddressValidationMessageElement() {

  let element =
    document.getElementById(
      "addressValidationMessage"
    );

  if (element) {
    return element;
  }


  const addressInput =
    document.getElementById(
      "address"
    );

  if (!addressInput) {
    return null;
  }


  element =
    document.createElement(
      "div"
    );

  element.id =
    "addressValidationMessage";

  element.setAttribute(
    "role",
    "status"
  );

  element.style.cssText = `
    display:none;
    margin-top:10px;
    padding:11px 13px;
    border-radius:9px;
    font-size:12px;
    line-height:1.5;
  `;


  addressInput
    .closest(
      ".form-group, .field, .input-group, div"
    )
    ?.appendChild(
      element
    );


  return element;
}


function showAddressValidationMessage(
  message
) {

  const element =
    getAddressValidationMessageElement();

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.style.display =
    "block";

  element.style.background =
    "#f7f9fc";

  element.style.border =
    "1px solid #d9e3f0";

  element.style.color =
    "#667892";
}


function showAddressValidationSuccess(
  result
) {

  const element =
    getAddressValidationMessageElement();

  if (!element) {
    return;
  }


  const standardized =
    result?.standardizedAddress;


  let text =
    "Billing address verified.";

  if (
    standardized?.ZIPPlus4
  ) {

    text +=
      ` USPS verified ZIP+4: ${standardized.ZIPCode}-${standardized.ZIPPlus4}.`;
  }


  element.textContent =
    text;

  element.style.display =
    "block";

  element.style.background =
    "#eef8f1";

  element.style.border =
    "1px solid #c8e4cf";

  element.style.color =
    "#23643a";
}


function hideAddressValidationMessage() {

  const element =
    document.getElementById(
      "addressValidationMessage"
    );

  if (!element) {
    return;
  }

  element.style.display =
    "none";
}


/* =========================================================
   LOCAL BILLING ADDRESS VALIDATION
========================================================= */

function validateBillingAddressFormat() {

  const address =
    getBillingAddressData();


  if (
    !/^\d{1,6}\s+/.test(
      address.streetAddress
    )
  ) {

    return {
      valid: false,
      field: "address",
      message:
        "Please enter a complete street address, including the street number."
    };
  }


  if (
    address.secondaryAddress.length >
    0 &&
    address.secondaryAddress.length >
    50
  ) {

    return {
      valid: false,
      field: "address2",
      message:
        "Please enter a valid Apt, Suite, or Unit."
    };
  }


  if (
    !/^\p{L}[\p{L}' .-]{1,49}$/u.test(
      address.city
    )
  ) {

    return {
      valid: false,
      field: "city",
      message:
        "Please enter a valid city."
    };
  }


  if (
    !/^[A-Z]{2}$/.test(
      address.state
    )
  ) {

    return {
      valid: false,
      field: "state",
      message:
        "Please select a valid state."
    };
  }


  if (
    !/^\d{5}$/.test(
      address.ZIPCode
    )
  ) {

    return {
      valid: false,
      field: "zip",
      message:
        "Please enter a valid five-digit ZIP code."
    };
  }


  return {
    valid: true
  };
}
