/**
 * screenings4u — Universal Stripe Checkout
 *
 * PUBLIC MARKETING CHECKOUT
 *
 * SERVICE-BASED CHECKOUT
 *
 * Flow:
 *   checkout.html?service=SERVICE_ID
 *        ↓
 *   create-payment-intent Edge Function
 *        ↓
 *   Supabase Order Engine
 *        ↓
 *   Stripe PaymentIntent
 *        ↓
 *   Stripe Payment Element
 *        ↓
 *   payment_intent.succeeded
 *        ↓
 *   Stripe webhook
 *        ↓
 *   mark_order_paid()
 *
 * IMPORTANT:
 * - Everything in this checkout is SERVICE based.
 * - The browser sends the SERVICE ID, not a Stripe price ID.
 * - The server is authoritative for pricing.
 * - The webhook is authoritative for payment completion.
 * - Customer fields must be entered manually.
 */

"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51U8CQQ2QEeEuL3QXzML14sIufQvcjU2fxNkTCylTwCR2cJvtx4nBVbiZ2bvbD97oFL2aScbitB21htQyxoETfY2x00rtvDvxUm";

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

/*
 * Prevent duplicate Confirm Email clicks from starting two
 * PaymentIntent / Stripe mount operations at the same time.
 */
let emailConfirmationInProgress = false;

let orderId = null;
let orderNumber = null;
let trackingNumber = null;
let paymentIntentId = null;

let paymentProcessingOverlay = null;
let manualEntryWarning = null;

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
      background: #24467f;
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
}

function markAllFieldsUnconfirmed() {

  MANUAL_ENTRY_FIELDS.forEach(id => {

    const input = document.getElementById(id);

    if (!input) {
      return;
    }

    input.dataset.manualTyped = "false";
    input.dataset.autofilled = "false";
  });
}

function fieldWasManuallyTyped(id) {

  const input = document.getElementById(id);

  return Boolean(
    input &&
    input.dataset.manualTyped === "true"
  );
}

function setupManualEntryFields() {

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

    input.setAttribute("autocomplete", "off");
    input.setAttribute("data-form-type", "other");
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-1p-ignore", "true");

    /*
     * Keyboard typing.
     */
    input.addEventListener("keydown", event => {

      if (
        event.key.length === 1 ||
        event.key === "Backspace" ||
        event.key === "Delete"
      ) {
        markFieldAsManuallyTyped(input);
      }
    });

    /*
     * beforeinput is useful on mobile keyboards and modern browsers.
     */
    input.addEventListener("beforeinput", event => {

      if (
        event.inputType &&
        (
          event.inputType.startsWith("insertText") ||
          event.inputType === "deleteContentBackward" ||
          event.inputType === "deleteContentForward"
        )
      ) {
        markFieldAsManuallyTyped(input);
      }
    });

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

        showManualEntryWarning(input.id);
      }
    });

    /*
     * Explicitly block paste.
     */
    input.addEventListener("paste", event => {

      event.preventDefault();

      input.dataset.manualTyped = "false";

      showManualEntryWarning(input.id);
    });

    /*
     * Explicitly block drop.
     */
    input.addEventListener("drop", event => {

      event.preventDefault();

      input.dataset.manualTyped = "false";

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

      showManualEntryWarning(input.id);
    });
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
   */
  if (state) {

    state.setAttribute("autocapitalize", "characters");

    state.addEventListener("input", () => {

      state.value =
        state.value
          .replace(/[^A-Za-z]/g, "")
          .toUpperCase()
          .slice(0, 2);
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
          /[^A-Za-zÀ-ÿ' -]/g,
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
          /[^A-Za-z0-9À-ÿ .,'#-]/g,
          ""
        );
    });
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

    if (
      input &&
      input.value.trim() &&
      input.dataset.manualTyped !== "true"
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

async function initCheckout() {

  try {

    createManualEntryWarning();

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
     */
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

    setupManualEntryFields();
    setupEmailModal();

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
   * Require actual manual entry before validation.
   */
  if (!requireManualEntry()) {
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

    openEmailConfirmation(
      getInputValue("email")
    );

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
      "Pay " +
      formatTestPrice(
        selectedService.price,
        selectedService.currency || "USD"
      )
    );
  }
}

/* =========================================================
   CUSTOMER VALIDATION
========================================================= */

const VALIDATION = {

  name:
    /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,49}$/,

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
    /^\d{1,6}\s+[A-Za-z0-9À-ÿ][A-Za-z0-9À-ÿ .,'#-]{2,99}$/,

  city:
    /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,49}$/,

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

function setupEmailModal() {

  const changeButton =
    document.getElementById("changeEmailBtn");

  const confirmButton =
    document.getElementById("confirmEmailBtn");

  if (changeButton) {

    changeButton.addEventListener(
      "click",
      () => {

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
    document.getElementById("emailConfirmModal");

  const display =
    document.getElementById(
      "confirmedEmailDisplay"
    );

  if (!modal || !display) {

    throw new Error(
      "Email confirmation dialog could not be found."
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

  if (!requireManualEntry()) {
    closeEmailConfirmation();
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
      "Pay " +
      formatTestPrice(
        selectedService.price,
        selectedService.currency || "USD"
      )
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

    emailConfirmed = false;

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
      parts.join(" • ") +
      " is ready for secure payment.";

    orderNotice.style.display =
      "block";
  }
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

    throw new Error(
      result?.error ||
      result?.message ||
      "The secure payment server could not create the payment."
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
          colorPrimary: "#24467f",
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
      border-top-color: #24467f;
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
      color: #24467f;
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