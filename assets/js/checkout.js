/**
 * screenings4u — Universal Stripe Checkout
 *
 * PUBLIC MARKETING CHECKOUT
 *
 * Flow:
 *
 * Customer
 *    ↓
 * checkout.html
 *    ↓
 * create-payment-intent Edge Function
 *    ↓
 * Supabase Order Engine
 *    ↓
 * Stripe PaymentIntent
 *    ↓
 * Stripe Payment Element
 *    ↓
 * payment_intent.succeeded
 *    ↓
 * Stripe webhook
 *    ↓
 * mark_order_paid()
 *
 * IMPORTANT:
 * - No customer authentication is required.
 * - The browser sends the PRODUCT ID, not the price.
 * - The server is authoritative for pricing.
 * - The webhook is authoritative for payment completion.
 */

"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51TTy4i0dNjSlvyScX676lZwB34Lby8nEuvs0Rorwo6kGYKkTJYiTyPQA6PVjzwUSjB9Kz90LdHtCh2E1BTMMEkTX00HCLPKUk";

const PAYMENT_FUNCTION_NAME =
  "create-payment-intent";


/* =========================================================
   STATE
========================================================= */

let stripe = null;
let elements = null;
let paymentElement = null;

let selectedProduct = null;

let paymentMounted = false;
let paymentIntentCreated = false;
let emailConfirmed = false;

let orderId = null;
let orderNumber = null;
let trackingNumber = null;
let paymentIntentId = null;


/* =========================================================
   INPUT FORMATTING / MANUAL ENTRY CONTROLS
========================================================= */

const manualEntryFields = new Set();
let manualEntryNotice = null;

function getManualEntryFieldIds() {
  return [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "city",
    "state",
    "zip"
  ];
}

function markManualEntry(field) {
  if (field && field.id) {
    manualEntryFields.add(field.id);
  }
}

function showManualEntryNotice(reason = "manual") {
  if (!manualEntryNotice) {
    manualEntryNotice = document.createElement("div");
    manualEntryNotice.id = "manualEntryNotice";
    manualEntryNotice.setAttribute("role", "dialog");
    manualEntryNotice.setAttribute("aria-modal", "true");
    manualEntryNotice.setAttribute("aria-live", "assertive");

    manualEntryNotice.innerHTML = `
      <div class="manual-entry-backdrop"></div>
      <div class="manual-entry-card">
        <div class="manual-entry-icon">!</div>
        <div class="manual-entry-eyebrow">Manual Entry Required</div>
        <h2>Please Type Your Information</h2>
        <p>
          For checkout verification, please type your customer information
          directly into the form. Autofill, copy and paste are not supported
          on this checkout form.
        </p>
        <button type="button" id="manualEntryOkBtn">I Understand</button>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      #manualEntryNotice {
        position: fixed; inset: 0; z-index: 100000; display: flex;
        align-items: center; justify-content: center; padding: 20px;
      }
      #manualEntryNotice .manual-entry-backdrop {
        position: absolute; inset: 0; background: rgba(18,35,61,.62);
        backdrop-filter: blur(5px);
      }
      #manualEntryNotice .manual-entry-card {
        position: relative; z-index: 2; width: min(460px,100%);
        padding: 32px; background: #fff; border: 1px solid #d9e3f0;
        border-radius: 18px; box-shadow: 0 30px 90px rgba(12,32,64,.28);
        text-align: center; font-family: Inter,Arial,sans-serif;
      }
      #manualEntryNotice .manual-entry-icon {
        width: 46px; height: 46px; margin: 0 auto 16px; display: flex;
        align-items: center; justify-content: center; border-radius: 50%;
        background: #fff7ed; color: #ff6b00; font-size: 24px; font-weight: 900;
      }
      #manualEntryNotice .manual-entry-eyebrow {
        color: #ff6b00; font-size: 10px; font-weight: 900;
        text-transform: uppercase; letter-spacing: .12em; margin-bottom: 7px;
      }
      #manualEntryNotice h2 { margin: 0 0 10px; color: #24467f; font-size: 25px; }
      #manualEntryNotice p { margin: 0; color: #667892; font-size: 13px; line-height: 1.65; }
      #manualEntryNotice button {
        width: 100%; height: 50px; margin-top: 22px; border: 0;
        border-radius: 8px; background: #ff6b00; color: #fff;
        font-weight: 900; cursor: pointer;
      }
      body.manual-entry-notice-active { overflow: hidden; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(manualEntryNotice);

    manualEntryNotice
      .querySelector("#manualEntryOkBtn")
      .addEventListener("click", closeManualEntryNotice);

    manualEntryNotice
      .querySelector(".manual-entry-backdrop")
      .addEventListener("click", closeManualEntryNotice);
  }

  manualEntryNotice.classList.add("active");
  document.body.classList.add("manual-entry-notice-active");
}

function closeManualEntryNotice() {
  if (!manualEntryNotice) return;
  manualEntryNotice.remove();
  manualEntryNotice = null;
  document.body.classList.remove("manual-entry-notice-active");
}

function validateManualEntry() {
  const autofilled = getManualEntryFieldIds()
    .map(id => document.getElementById(id))
    .filter(field => field && field.value.trim() && !manualEntryFields.has(field.id));

  if (autofilled.length) {
    showManualEntryNotice("autofill");
    autofilled[0].focus();
    return {
      valid: false,
      field: autofilled[0].id,
      message: "Please type your information directly into the form."
    };
  }

  return { valid: true };
}

function checkForAutofill() {
  const autofilled = getManualEntryFieldIds()
    .map(id => document.getElementById(id))
    .filter(field => field && field.value.trim() && !manualEntryFields.has(field.id));

  if (autofilled.length) {
    showManualEntryNotice("autofill");
    autofilled[0].focus();
  }
}

function setupManualEntryFields() {

  const firstName =
    document.getElementById("firstName");

  const lastName =
    document.getElementById("lastName");

  const email =
    document.getElementById("email");

  const phone =
    document.getElementById("phone");

  const address =
    document.getElementById("address");

  const city =
    document.getElementById("city");

  const state =
    document.getElementById("state");

  const zip =
    document.getElementById("zip");

  /*
   * Email:
   * - Accepts upper/lowercase.
   * - Normalizes the domain to lowercase.
   * - Does NOT force the local part to lowercase because
   *   technically email local parts can be case-sensitive.
   */
  if (email) {

    email.setAttribute("autocomplete", "off");
    email.setAttribute("autocapitalize", "none");
    email.setAttribute("spellcheck", "false");

    email.addEventListener("input", () => {

      email.value =
        email.value
          .replace(/\s/g, "")
          .slice(0, 254);

      const at =
        email.value.indexOf("@");

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
   * Phone:
   * Formats as:
   * (555) 123-4567
   */
  if (phone) {

    phone.setAttribute("autocomplete", "off");
    phone.setAttribute("inputmode", "tel");

    phone.addEventListener("input", () => {

      let digits =
        phone.value.replace(/\D/g, "");

      if (digits.length > 10 && digits.startsWith("1")) {
        digits = digits.slice(1);
      }

      digits =
        digits.slice(0, 10);

      let formatted = "";

      if (digits.length > 0) {
        formatted =
          "(" + digits.slice(0, 3);
      }

      if (digits.length >= 3) {
        formatted += ") ";
      }

      if (digits.length > 3) {
        formatted +=
          digits.slice(3, 6);
      }

      if (digits.length >= 6) {
        formatted += "-";
      }

      if (digits.length > 6) {
        formatted +=
          digits.slice(6, 10);
      }

      phone.value =
        formatted;

      phone.setCustomValidity("");
    });
  }

  /*
   * State:
   * Two uppercase letters only.
   */
  if (state) {

    state.setAttribute("autocomplete", "off");
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
   * ZIP:
   * 12345 or 12345-6789
   */
  if (zip) {

    zip.setAttribute("autocomplete", "off");
    zip.setAttribute("inputmode", "numeric");

    zip.addEventListener("input", () => {

      let digits =
        zip.value.replace(/\D/g, "")
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
   * Names:
   * Keep natural capitalization. Remove numbers/symbols
   * that cannot be part of the supported name format.
   */
  [firstName, lastName, city].forEach(input => {

    if (!input) return;

    input.setAttribute("autocomplete", "off");

    input.addEventListener("input", () => {

      input.value =
        input.value.replace(
          /[^A-Za-zÀ-ÿ' -]/g,
          ""
        );
    });
  });

  /*
   * Address:
   * Allow normal street-address characters.
   */
  if (address) {

    address.setAttribute("autocomplete", "off");

    address.addEventListener("input", () => {

      address.value =
        address.value.replace(
          /[^A-Za-z0-9À-ÿ .,'#-]/g,
          ""
        );
    });
  }

  window.setTimeout(checkForAutofill, 500);
  window.setTimeout(checkForAutofill, 1500);

  /*
   * Disable paste/cut/drop on customer fields.
   * This is a UI restriction, not a security boundary.
   */
  [
    firstName,
    lastName,
    email,
    phone,
    address,
    city,
    state,
    zip
  ].forEach(input => {

    if (!input) return;

    input.addEventListener("keydown", event => {
      if (
        event.key.length === 1 ||
        event.key === "Backspace" ||
        event.key === "Delete"
      ) {
        markManualEntry(input);
      }
    });

    input.addEventListener("beforeinput", event => {
      if (
        event.inputType === "insertText" ||
        event.inputType === "deleteContentBackward" ||
        event.inputType === "deleteContentForward"
      ) {
        markManualEntry(input);
      }
    });

    input.addEventListener(
      "paste",
      event => {
        event.preventDefault();
        showManualEntryNotice("paste");
        input.focus();
      }
    );

    input.addEventListener(
      "drop",
      event => {
        event.preventDefault();
        showManualEntryNotice("drop");
        input.focus();
      }
    );

    input.addEventListener(
      "dragover",
      event => {
        event.preventDefault();
      }
    );

    input.addEventListener(
      "cut",
      event => {
        event.preventDefault();
      }
    );
  });
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

    const params =
      new URLSearchParams(
        window.location.search
      );


    /*
     * Accept both:
     *
     * checkout.html?service=PRODUCT_ID
     *
     * checkout.html?product=PRODUCT_ID
     */

    const serviceId =
      params.get("service") ||
      params.get("product");


    /* -----------------------------------------------------
       Validate product parameter
    ----------------------------------------------------- */

    if (!serviceId) {

      showCheckoutError(
        "No service was selected. Please return to the services page and select a service."
      );

      return;
    }


    /* -----------------------------------------------------
       Validate product catalog
    ----------------------------------------------------- */

    if (
      typeof getTestProduct !==
      "function"
    ) {

      showCheckoutError(
        "The service catalog could not be loaded."
      );

      return;
    }


    selectedProduct =
      getTestProduct(
        serviceId
      );


    if (!selectedProduct) {

      showCheckoutError(
        "That service is not available."
      );

      return;
    }


    /* -----------------------------------------------------
       Render selected product
    ----------------------------------------------------- */

    renderProduct(
      selectedProduct
    );


    /* -----------------------------------------------------
       Initialize Stripe
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Show checkout
    ----------------------------------------------------- */

    const loading =
      document.getElementById(
        "loading"
      );

    const checkoutGrid =
      document.getElementById(
        "checkoutGrid"
      );


    if (loading) {

      loading.style.display =
        "none";
    }


    if (checkoutGrid) {

      checkoutGrid.style.display =
        "grid";
    }


    /* -----------------------------------------------------
       Configure navigation
    ----------------------------------------------------- */

    const backLink =
      document.getElementById(
        "backLink"
      );


    if (backLink) {

      backLink.href =
        "service.html?service=" +
        encodeURIComponent(
          serviceId
        );
    }


    const errorBackLink =
      document.getElementById(
        "errorBackLink"
      );


    if (errorBackLink) {

      errorBackLink.href =
        "services.html";
    }


    /* -----------------------------------------------------
       Bind checkout form
    ----------------------------------------------------- */

    const form =
      document.getElementById(
        "checkoutForm"
      );


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


    /* -----------------------------------------------------
       Initial button state
    ----------------------------------------------------- */

    const button =
      document.getElementById(
        "payButton"
      );


    if (button) {

      button.disabled =
        false;

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
   PRODUCT DISPLAY
========================================================= */

function renderProduct(
  product
) {

  const category =
    document.getElementById(
      "category"
    );

  const productElement =
    document.getElementById(
      "product"
    );

  const price =
    document.getElementById(
      "price"
    );

  const features =
    document.getElementById(
      "features"
    );

  const drugs =
    document.getElementById(
      "drugs"
    );


  if (category) {

    category.textContent =
      product.category || "";
  }


  if (productElement) {

    productElement.textContent =
      product.name || "";
  }


  if (price) {

    price.textContent =
      formatTestPrice(
        product.price,
        product.currency ||
        "USD"
      );
  }


  /* -------------------------------------------------------
     Features
  ------------------------------------------------------- */

  if (features) {

    features.innerHTML =
      "";


    const featureList =
      Array.isArray(
        product.features
      )
        ? product.features
        : [];


    featureList.forEach(
      (item) => {

        const li =
          document.createElement(
            "li"
          );


        li.textContent =
          item;


        features.appendChild(
          li
        );
      }
    );


    if (!featureList.length) {

      const li =
        document.createElement(
          "li"
        );


      li.textContent =
        "See service details.";


      features.appendChild(
        li
      );
    }
  }


  /* -------------------------------------------------------
     Drugs
  ------------------------------------------------------- */

  if (drugs) {

    drugs.innerHTML =
      "";


    const drugList =
      Array.isArray(
        product.drugs
      )
        ? product.drugs
        : [];


    if (!drugList.length) {

      const li =
        document.createElement(
          "li"
        );


      li.textContent =
        "See service details.";


      drugs.appendChild(
        li
      );

    } else {

      drugList.forEach(
        (item) => {

          const li =
            document.createElement(
              "li"
            );


          li.textContent =
            item;


          drugs.appendChild(
            li
          );
        }
      );
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

  if (!selectedProduct || !stripe) {
    showPaymentError(
      "Checkout is not ready. Please refresh the page and try again."
    );
    return;
  }

  /*
   * FIRST SUBMISSION:
   * Validate customer information only.
   * Stripe is intentionally NOT mounted yet.
   */
  if (!paymentMounted) {

    const manualValidation = validateManualEntry();

    if (!manualValidation.valid) {
      return;
    }

    const validation = validateCustomerForm(form);

    if (!validation.valid) {
      showPaymentError(validation.message);
      focusField(validation.field);
      return;
    }

    openEmailConfirmation(getInputValue("email"));
    return;
  }

  /*
   * SECOND SUBMISSION:
   * Stripe Payment Element is mounted, so this submits payment.
   */
  const button = document.getElementById("payButton");

  try {

    setButton(button, true, "Processing Payment...");
    showPaymentProcessing();

    await confirmPayment(form);

  } catch (error) {

    console.error("Checkout payment error:", error);

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
        selectedProduct.price,
        selectedProduct.currency || "USD"
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

  email:
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/,

  phone:
    /^(?:\+1[\s.-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s.-]?[2-9]\d{2}[\s.-]?\d{4}$/,

  address:
    /^\d{1,6}\s+[A-Za-z0-9À-ÿ][A-Za-z0-9À-ÿ .,'#-]{2,99}$/,

  city:
    /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,49}$/,

  state:
    /^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)$/i,

  zip:
    /^\d{5}(?:-\d{4})?$/
};


function validateCustomerForm(form) {

  const fields = {
    firstName: getInputValue("firstName"),
    lastName: getInputValue("lastName"),
    email: getInputValue("email"),
    phone: getInputValue("phone"),
    address: getInputValue("address"),
    city: getInputValue("city"),
    state: getInputValue("state").toUpperCase(),
    zip: getInputValue("zip")
  };

  if (!VALIDATION.name.test(fields.firstName)) {
    return {
      valid: false,
      field: "firstName",
      message: "Please enter a valid first name."
    };
  }

  if (!VALIDATION.name.test(fields.lastName)) {
    return {
      valid: false,
      field: "lastName",
      message: "Please enter a valid last name."
    };
  }

  if (!VALIDATION.email.test(fields.email)) {
    return {
      valid: false,
      field: "email",
      message: "Please enter a valid email address."
    };
  }

  if (!VALIDATION.phone.test(fields.phone)) {
    return {
      valid: false,
      field: "phone",
      message: "Please enter a valid U.S. phone number."
    };
  }

  if (!VALIDATION.address.test(fields.address)) {
    return {
      valid: false,
      field: "address",
      message: "Please enter a valid street address."
    };
  }

  if (!VALIDATION.city.test(fields.city)) {
    return {
      valid: false,
      field: "city",
      message: "Please enter a valid city."
    };
  }

  if (!VALIDATION.state.test(fields.state)) {
    return {
      valid: false,
      field: "state",
      message: "Please enter a valid two-letter state abbreviation."
    };
  }

  if (!VALIDATION.zip.test(fields.zip)) {
    return {
      valid: false,
      field: "zip",
      message: "Please enter a valid ZIP code."
    };
  }

  return { valid: true };
}


function getInputValue(id) {

  const input = document.getElementById(id);

  return input
    ? input.value.trim()
    : "";
}


function focusField(id) {

  const field = document.getElementById(id);

  if (!field) return;

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

    changeButton.addEventListener("click", () => {

      closeEmailConfirmation();

      const email =
        document.getElementById("email");

      if (email) {
        email.focus();
        email.select();
      }
    });
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
    document.getElementById("confirmedEmailDisplay");

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

  if (!modal) return;

  modal.classList.remove("active");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow = "";
}


async function handleEmailConfirmation() {

  const form =
    document.getElementById("checkoutForm");

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

    /*
     * Only after validation + explicit
     * email confirmation do we create
     * the server-side order and PaymentIntent.
     */
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

    await mountStripePayment(
      result.clientSecret
    );

    paymentIntentCreated = true;

    lockCustomerFields(form);

    setButton(
      button,
      false,
      "Pay " +
      formatTestPrice(
        selectedProduct.price,
        selectedProduct.currency || "USD"
      )
    );

    showOrderNotice();

  } catch (error) {

    console.error(
      "Payment setup error:",
      error
    );

    hidePaymentProcessing();

    emailConfirmed = false;

    showPaymentError(
      error?.message ||
      "Unable to prepare secure payment."
    );

    setButton(
      button,
      false,
      "Continue to Secure Payment"
    );
  }
}


function showOrderNotice() {

  const orderNotice =
    document.getElementById("orderNotice");

  if (!orderNotice) return;

  const parts = [];

  if (orderNumber) {
    parts.push(
      "Order " + orderNumber
    );
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
        selectedProduct.id
    }
  );

  /*
   * PUBLIC MARKETING CHECKOUT:
   *
   * There is intentionally no Supabase
   * Authorization header here.
   *
   * create-payment-intent must therefore
   * be deployed with JWT verification OFF.
   */
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
            serviceId:
              selectedProduct.id,

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
    document.getElementById(
      "payment-element"
    );


  if (!paymentContainer) {

    throw new Error(
      "The Stripe payment element could not be found."
    );
  }


  /* -------------------------------------------------------
     Remove any previous Payment Element
  ------------------------------------------------------- */

  if (paymentElement) {

    try {

      paymentElement.destroy();

    } catch (error) {

      console.warn(
        "Unable to destroy previous Payment Element:",
        error
      );
    }


    paymentElement =
      null;
  }


  paymentContainer.innerHTML =
    "";


  /* -------------------------------------------------------
     Create Elements instance
  ------------------------------------------------------- */

  elements =
    stripe.elements({

      clientSecret,

      appearance: {

        theme:
          "stripe",

        variables: {

          colorPrimary:
            "#325aa3",

          colorText:
            "#1d2d45",

          borderRadius:
            "8px",

          fontFamily:
            "Inter, Arial, sans-serif"
        }
      }
    });


  /* -------------------------------------------------------
     Create Payment Element
  ------------------------------------------------------- */

  paymentElement =
    elements.create(
      "payment"
    );


  /* -------------------------------------------------------
     Mount
  ------------------------------------------------------- */

  await paymentElement.mount(
    "#payment-element"
  );


  paymentMounted =
    true;


  /* -------------------------------------------------------
     Stripe change events
  ------------------------------------------------------- */

  paymentElement.on(
    "change",
    (event) => {

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


/* =========================================================
   CONFIRM PAYMENT
========================================================= */

async function confirmPayment(
  form
) {

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
    new FormData(
      form
    );


  const firstName =
    getFormValue(
      data,
      "firstName"
    );


  const lastName =
    getFormValue(
      data,
      "lastName"
    );


  const email =
    getFormValue(
      data,
      "email"
    );


  const phone =
    getFormValue(
      data,
      "phone"
    );


  const address =
    getFormValue(
      data,
      "address"
    );


  const city =
    getFormValue(
      data,
      "city"
    );


  const state =
    getFormValue(
      data,
      "state"
    );


  const zip =
    getFormValue(
      data,
      "zip"
    );


  /* -------------------------------------------------------
     Confirm Stripe payment
  ------------------------------------------------------- */

  const {
    error
  } =
    await stripe.confirmPayment({

      elements,

      confirmParams: {

        payment_method_data: {

          billing_details: {

            name:
              `${firstName} ${lastName}`
                .trim(),

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


  /* -------------------------------------------------------
     Successful payment.

     If Stripe requires authentication, Stripe uses
     return_url and returns to order-confirmation.html.

     Otherwise, redirect there ourselves so every successful
     payment enters the same post-payment workflow.
  ------------------------------------------------------- */

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
    encodeURIComponent(
      orderId || ""
    );

  window.setTimeout(() => {
    window.location.assign(
      confirmationUrl
    );
  }, 250);
}


/* =========================================================
   LOCK CUSTOMER FIELDS
========================================================= */

function lockCustomerFields(
  form
) {

  if (!form) return;


  form
    .querySelectorAll(
      "input"
    )
    .forEach(
      (input) => {

        input.readOnly =
          true;
      }
    );
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

  if (!button) return;


  button.disabled =
    disabled;


  button.textContent =
    label;
}


/* =========================================================
   CHECKOUT ERROR
========================================================= */

function showCheckoutError(
  message
) {

  const loading =
    document.getElementById(
      "loading"
    );


  const errorCard =
    document.getElementById(
      "errorCard"
    );


  if (loading) {

    loading.style.display =
      "none";
  }


  if (errorCard) {

    errorCard.style.display =
      "block";


    const notice =
      errorCard.querySelector(
        ".notice"
      );


    if (notice) {

      notice.textContent =
        message;
    }
  }
}


/* =========================================================
   PAYMENT ERROR
========================================================= */

function showPaymentError(
  message
) {

  const box =
    document.getElementById(
      "paymentError"
    );


  if (!box) return;


  box.className =
    "error";


  box.textContent =
    message;


  box.style.display =
    "block";
}


function clearPaymentError() {

  const box =
    document.getElementById(
      "paymentError"
    );


  if (box) {

    box.style.display =
      "none";


    box.textContent =
      "";
  }
}


/* =========================================================
   PAYMENT PROCESSING OVERLAY
========================================================= */

let paymentProcessingOverlay = null;

function createPaymentProcessingOverlay() {

  if (paymentProcessingOverlay) {
    return paymentProcessingOverlay;
  }

  const overlay = document.createElement("div");

  overlay.id = "paymentProcessingOverlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-live", "polite");

  overlay.innerHTML = `
    <div class="payment-processing-card">
      <div class="payment-processing-spinner" aria-hidden="true"></div>
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

  const style = document.createElement("style");

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

  createPaymentProcessingOverlay().classList.add("active");
  document.body.classList.add("payment-processing-active");
}

function hidePaymentProcessing() {

  if (!paymentProcessingOverlay) {
    return;
  }

  paymentProcessingOverlay.classList.remove("active");
  document.body.classList.remove("payment-processing-active");
}


/* =========================================================
   PAYMENT SUCCESS
========================================================= */

function showPaymentSuccess(
  message
) {

  const box =
    document.getElementById(
      "paymentError"
    );


  if (!box) return;


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