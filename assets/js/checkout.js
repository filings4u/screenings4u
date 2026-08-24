/*
 * =========================================================
 * screenings4u — Universal Checkout
 * =========================================================
 *
 * Uses:
 *   - test-price-list.js for displaying the selected product
 *   - client-config.js for the shared Supabase client
 *   - Supabase Edge Function: create-payment-intent
 *   - Stripe.js for payment collection
 *
 * IMPORTANT:
 *
 * The browser NEVER determines the final price.
 *
 * The selected product ID is sent to the Edge Function.
 * The Edge Function looks up the real product and price
 * from public.products.
 *
 * The Stripe webhook then creates:
 *
 *   orders
 *       ↓
 *   order_items
 *       ↓
 *   training_enrollments
 *
 * for training products.
 *
 * =========================================================
 */

"use strict";

/*
 * =========================================================
 * STRIPE CONFIGURATION
 * =========================================================
 */

const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51TTy4i0dNjSlvyScX676lZwB34Lby8nEuvs0Rorwo6kGYKkTJYiTyPQA6PVjzwUSjB9Kz90LdHtCh2E1BTMMEkTX00HCLPKUkf";

/*
 * We are no longer using:
 *
 * /api/create-payment-intent
 *
 * The payment intent is created through the Supabase
 * Edge Function:
 *
 * create-payment-intent
 */

const PAYMENT_FUNCTION_NAME =
  "create-payment-intent";


/*
 * =========================================================
 * GLOBAL STATE
 * =========================================================
 */

let stripe = null;

let elements = null;

let paymentElement = null;

let selectedProduct = null;

let paymentMounted = false;

let supabaseClient = null;

let currentUser = null;


/*
 * =========================================================
 * DOM READY
 * =========================================================
 */

document.addEventListener(
  "DOMContentLoaded",
  initCheckout
);


/*
 * =========================================================
 * INITIALIZE CHECKOUT
 * =========================================================
 */

async function initCheckout() {

  try {

    /*
     * -----------------------------------------------------
     * SUPABASE
     * -----------------------------------------------------
     */

    supabaseClient =
      getSupabaseClient();

    if (!supabaseClient) {

      showPaymentError(
        "The customer portal could not be initialized. Please refresh the page."
      );

      return;
    }


    /*
     * -----------------------------------------------------
     * CUSTOMER SESSION
     * -----------------------------------------------------
     */

    const {
      data: sessionData,
      error: sessionError
    } =
      await supabaseClient.auth.getSession();

    if (sessionError) {

      throw sessionError;
    }


    if (
      !sessionData ||
      !sessionData.session ||
      !sessionData.session.user
    ) {

      /*
       * Training purchases must be associated with
       * a customer account because training_enrollments
       * requires user_id.
       */

      showLoginRequired();

      return;
    }


    currentUser =
      sessionData.session.user;


    /*
     * -----------------------------------------------------
     * PRODUCT
     * -----------------------------------------------------
     */

    const productId =
      new URLSearchParams(
        window.location.search
      ).get("service");


    if (
      !productId ||
      typeof getTestProduct !== "function"
    ) {

      showCheckoutError();

      return;
    }


    selectedProduct =
      getTestProduct(productId);


    if (!selectedProduct) {

      showCheckoutError();

      return;
    }


    /*
     * -----------------------------------------------------
     * DISPLAY PRODUCT
     * -----------------------------------------------------
     */

    renderProduct(
      selectedProduct
    );


    /*
     * -----------------------------------------------------
     * SHOW CHECKOUT
     * -----------------------------------------------------
 */

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


    /*
     * -----------------------------------------------------
     * FORM
     * -----------------------------------------------------
     */

    const form =
      document.getElementById(
        "checkoutForm"
      );

    if (form) {

      form.addEventListener(
        "submit",
        handleSubmit
      );
    }


    /*
     * -----------------------------------------------------
     * STRIPE
     * -----------------------------------------------------
     */

    if (
      STRIPE_PUBLISHABLE_KEY.includes(
        "REPLACE_WITH"
      )
    ) {

      showSetupNotice(
        "Stripe publishable key has not been configured yet."
      );

      return;
    }


    if (
      typeof Stripe !==
      "function"
    ) {

      showPaymentError(
        "Stripe could not be loaded. Please refresh the page."
      );

      return;
    }


    stripe =
      Stripe(
        STRIPE_PUBLISHABLE_KEY
      );


    /*
     * -----------------------------------------------------
     * PREFILL CUSTOMER INFORMATION
     * -----------------------------------------------------
     */

    prefillCustomerInformation();

  } catch (error) {

    console.error(
      "Checkout initialization error:",
      error
    );

    showPaymentError(
      error.message ||
      "Unable to initialize checkout."
    );
  }
}


/*
 * =========================================================
 * GET SHARED SUPABASE CLIENT
 * =========================================================
 */

function getSupabaseClient() {

  /*
   * Preferred method.
   */

  if (
    typeof window.getScreenings4uSupabase ===
      "function"
  ) {

    return window.getScreenings4uSupabase();
  }


  /*
   * Existing shared client.
   */

  if (
    window.screenings4uSupabase
  ) {

    return window.screenings4uSupabase;
  }


  /*
   * Last-resort fallback.
   */

  if (
    window.supabase &&
    typeof window.supabase.createClient ===
      "function" &&
    window.SCREENINGS4U_SUPABASE_URL &&
    window.SCREENINGS4U_SUPABASE_ANON_KEY
  ) {

    window.screenings4uSupabase =
      window.supabase.createClient(
        window.SCREENINGS4U_SUPABASE_URL,
        window.SCREENINGS4U_SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          }
        }
      );

    return window.screenings4uSupabase;
  }


  console.error(
    "screenings4u checkout: Supabase client unavailable."
  );

  return null;
}


/*
 * =========================================================
 * PREFILL CUSTOMER INFORMATION
 * =========================================================
 */

function prefillCustomerInformation() {

  if (!currentUser) {
    return;
  }


  const emailInput =
    document.querySelector(
      '[name="email"]'
    );


  if (
    emailInput &&
    !emailInput.value
  ) {

    emailInput.value =
      currentUser.email ||
      "";
  }
}


/*
 * =========================================================
 * RENDER PRODUCT
 * =========================================================
 */

function renderProduct(product) {

  const category =
    document.getElementById(
      "category"
    );

  if (category) {

    category.textContent =
      product.category || "";
  }


  const productElement =
    document.getElementById(
      "product"
    );

  if (productElement) {

    productElement.textContent =
      product.name || "";
  }


  const price =
    document.getElementById(
      "price"
    );

  if (price) {

    price.textContent =
      formatTestPrice(
        product.price,
        product.currency || "USD"
      );
  }


  /*
   * -------------------------------------------------------
   * FEATURES
   * -------------------------------------------------------
   */

  const features =
    document.getElementById(
      "features"
    );

  if (features) {

    features.innerHTML = "";

    (
      product.features ||
      []
    ).forEach(
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
  }


  /*
   * -------------------------------------------------------
   * DRUGS
   * -------------------------------------------------------
   */

  const drugs =
    document.getElementById(
      "drugs"
    );

  if (drugs) {

    drugs.innerHTML = "";

    (
      product.drugs ||
      []
    ).forEach(
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


/*
 * =========================================================
 * SUBMIT
 * =========================================================
 */

async function handleSubmit(
  event
) {

  event.preventDefault();


  /*
   * -------------------------------------------------------
   * VALIDATION
   * -------------------------------------------------------
   */

  if (!selectedProduct) {

    showPaymentError(
      "No product was selected."
    );

    return;
  }


  if (!stripe) {

    showPaymentError(
      "Stripe is not configured yet."
    );

    return;
  }


  if (!currentUser) {

    showLoginRequired();

    return;
  }


  const form =
    event.currentTarget;


  const button =
    document.getElementById(
      "payButton"
    );


  setButton(
    button,
    true,
    "Preparing Secure Payment..."
  );


  clearMessages();


  try {

    /*
     * -----------------------------------------------------
     * FIRST CLICK
     *
     * Create PaymentIntent and mount Stripe.
     * -----------------------------------------------------
     */

    if (!paymentMounted) {

      const clientSecret =
        await createPaymentIntent(
          form
        );


      mountStripePayment(
        clientSecret
      );


      setButton(
        button,
        false,
        "Pay " +
          formatTestPrice(
            selectedProduct.price,
            selectedProduct.currency ||
              "USD"
          )
      );


      return;
    }


    /*
     * -----------------------------------------------------
     * SECOND CLICK
     *
     * Confirm Stripe payment.
     * -----------------------------------------------------
     */

    await confirmPayment(
      form
    );

  } catch (error) {

    console.error(
      "Checkout payment error:",
      error
    );


    showPaymentError(
      error.message ||
      "Unable to process the payment."
    );


    setButton(
      button,
      false,
      "Pay " +
        formatTestPrice(
          selectedProduct.price,
          selectedProduct.currency ||
            "USD"
        )
    );
  }
}


/*
 * =========================================================
 * CREATE PAYMENT INTENT
 * =========================================================
 *
 * IMPORTANT:
 *
 * We use:
 *
 * supabase.functions.invoke()
 *
 * instead of fetch().
 *
 * Supabase automatically includes the customer's
 * authentication session with the Edge Function request.
 * =========================================================
 */

async function createPaymentIntent(
  form
) {

  if (!supabaseClient) {

    throw new Error(
      "Supabase is not configured."
    );
  }


  if (!currentUser) {

    throw new Error(
      "Please sign in before purchasing."
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
      ),

    zip:
      getFormValue(
        data,
        "zip"
      )
  };


  /*
   * -------------------------------------------------------
   * CALL SUPABASE EDGE FUNCTION
   * -------------------------------------------------------
   */

  const {
    data: result,
    error
  } =
    await supabaseClient.functions.invoke(
      PAYMENT_FUNCTION_NAME,
      {
        body: {

          /*
           * Only send the product ID.
           *
           * DO NOT send the browser price as authoritative.
           */

          productId:
            selectedProduct.id,

          customer
        }
      }
    );


  if (error) {

    console.error(
      "create-payment-intent function error:",
      error
    );


    /*
     * Supabase may return a generic FunctionsHttpError.
     * Try to extract the actual server response.
     */

    let message =
      error.message ||
      "The secure payment server could not create the payment.";


    try {

      if (
        error.context &&
        typeof error.context.json ===
          "function"
      ) {

        const body =
          await error.context.json();

        if (
          body &&
          body.error
        ) {

          message =
            body.error;
        }
      }

    } catch (
      ignored
    ) {
      /*
       * Keep original error.
       */
    }


    throw new Error(
      message
    );
  }


  if (
    !result ||
    !result.clientSecret
  ) {

    throw new Error(
      "The payment server did not return a client secret."
    );
  }


  return result.clientSecret;
}


/*
 * =========================================================
 * GET FORM VALUE
 * =========================================================
 */

function getFormValue(
  formData,
  name
) {

  const value =
    formData.get(name);


  return String(
    value || ""
  ).trim();
}


/*
 * =========================================================
 * MOUNT STRIPE PAYMENT
 * =========================================================
 */

function mountStripePayment(
  clientSecret
) {

  if (!stripe) {

    throw new Error(
      "Stripe is not available."
    );
  }


  if (!clientSecret) {

    throw new Error(
      "Stripe did not provide a payment client secret."
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


  paymentElement =
    elements.create(
      "payment"
    );


  paymentElement.mount(
    "#payment-element"
  );


  paymentMounted =
    true;


  paymentElement.on(
    "change",
    (event) => {

      if (
        event.error
      ) {

        showPaymentError(
          event.error.message
        );

      } else {

        clearMessages();
      }
    }
  );
}


/*
 * =========================================================
 * CONFIRM PAYMENT
 * =========================================================
 */

async function confirmPayment(
  form
) {

  if (!stripe) {

    throw new Error(
      "Stripe is not initialized."
    );
  }


  if (!elements) {

    throw new Error(
      "The payment form has not been initialized."
    );
  }


  const data =
    new FormData(form);


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


  /*
   * -------------------------------------------------------
   * STRIPE CONFIRMATION
   * -------------------------------------------------------
   */

  const {
    error
  } =
    await stripe.confirmPayment({

      elements,

      confirmParams: {

        payment_method_data: {

          billing_details: {

            name:
              `${firstName} ${lastName}`.trim(),

            email:
              email,

            phone:
              phone,

            address: {

              line1:
                address,

              city:
                city,

              state:
                state,

              postal_code:
                zip
            }
          }
        },


        return_url:
          window.location.origin +
          "/order-confirmation.html?product=" +
          encodeURIComponent(
            selectedProduct.id
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


  /*
   * IMPORTANT:
   *
   * Payment succeeded or was submitted.
   *
   * The Stripe webhook is responsible for creating
   * the order and training enrollment.
   */

  showPaymentSuccess(
    "Payment submitted successfully. Your order is being processed."
  );


  setButton(
    document.getElementById(
      "payButton"
    ),
    true,
    "Payment Submitted"
  );
}


/*
 * =========================================================
 * LOGIN REQUIRED
 * =========================================================
 */

function showLoginRequired() {

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
      "none";
  }


  const errorCard =
    document.getElementById(
      "errorCard"
    );


  if (errorCard) {

    errorCard.style.display =
      "block";


    errorCard.innerHTML = `
      <div class="client-empty-state">
        <strong>Sign in required</strong>

        <p>
          Please sign in to your screenings4u
          customer account before purchasing.
        </p>

        <p>
          Your purchase will automatically be
          connected to your customer account,
          order history, and training dashboard.
        </p>

        <a
          class="client-primary-button"
          href="client-login.html"
        >
          Sign In
        </a>
      </div>
    `;

  } else {

    showPaymentError(
      "Please sign in before purchasing."
    );
  }
}


/*
 * =========================================================
 * BUTTON STATE
 * =========================================================
 */

function setButton(
  button,
  disabled,
  label
) {

  if (!button) {
    return;
  }


  button.disabled =
    disabled;


  button.textContent =
    label;
}


/*
 * =========================================================
 * CHECKOUT ERROR
 * =========================================================
 */

function showCheckoutError() {

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
  }
}


/*
 * =========================================================
 * SETUP NOTICE
 * =========================================================
 */

function showSetupNotice(
  message
) {

  const box =
    document.getElementById(
      "setupNotice"
    );


  if (!box) {
    return;
  }


  box.textContent =
    message;


  box.style.display =
    "block";
}


/*
 * =========================================================
 * PAYMENT ERROR
 * =========================================================
 */

function showPaymentError(
  message
) {

  const box =
    document.getElementById(
      "paymentError"
    );


  if (!box) {
    return;
  }


  box.className =
    "notice error";


  box.textContent =
    message;


  box.style.display =
    "block";
}


/*
 * =========================================================
 * PAYMENT SUCCESS
 * =========================================================
 */

function showPaymentSuccess(
  message
) {

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


/*
 * =========================================================
 * CLEAR MESSAGES
 * =========================================================
 */

function clearMessages() {

  const paymentError =
    document.getElementById(
      "paymentError"
    );


  const setupNotice =
    document.getElementById(
      "setupNotice"
    );


  if (paymentError) {

    paymentError.style.display =
      "none";
  }


  if (setupNotice) {

    setupNotice.style.display =
      "none";
  }
}