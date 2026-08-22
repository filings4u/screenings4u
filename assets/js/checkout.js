/**
 * screenings4u — Universal Checkout
 * One checkout page reads every product from test-price-list.js.
 *
 * Before live payments:
 * 1. Put your Stripe publishable key in STRIPE_PUBLISHABLE_KEY.
 * 2. Create a secure backend endpoint at PAYMENT_INTENT_ENDPOINT.
 * 3. The backend must look up the product ID server-side and create
 *    the Stripe PaymentIntent using the server-side price.
 *
 * Never put a Stripe secret key in this file.
 */

const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51TTy4i0dNjSlvyScX676lZwB34Lby8nEuv0sRorwo6kGYKkTJYiTyPQA6PVjzwUSjB9Kz90LdHtCh2E1BTMMEkTX00HCLPKUkf";

const PAYMENT_INTENT_ENDPOINT = "/api/create-payment-intent";

let stripe = null;
let elements = null;
let paymentElement = null;
let selectedProduct = null;
let paymentMounted = false;

document.addEventListener("DOMContentLoaded", initCheckout);

async function initCheckout() {
  const productId = new URLSearchParams(location.search).get("service");

  if (!productId || typeof getTestProduct !== "function") {
    return showCheckoutError();
  }

  selectedProduct = getTestProduct(productId);

  if (!selectedProduct) {
    return showCheckoutError();
  }

  renderProduct(selectedProduct);
  document.getElementById("loading").style.display = "none";
  document.getElementById("checkoutGrid").style.display = "grid";

  const form = document.getElementById("checkoutForm");
  form.addEventListener("submit", handleSubmit);

  if (STRIPE_PUBLISHABLE_KEY.includes("REPLACE_WITH")) {
    showSetupNotice("Stripe publishable key has not been configured yet.");
    return;
  }

  if (typeof Stripe !== "function") {
    showPaymentError("Stripe could not be loaded. Please refresh the page.");
    return;
  }

  stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
}

function renderProduct(product) {
  document.getElementById("category").textContent = product.category || "";
  document.getElementById("product").textContent = product.name || "";
  document.getElementById("price").textContent =
    formatTestPrice(product.price, product.currency || "USD");

  const features = document.getElementById("features");
  features.innerHTML = "";
  (product.features || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    features.appendChild(li);
  });

  const drugs = document.getElementById("drugs");
  drugs.innerHTML = "";
  (product.drugs || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    drugs.appendChild(li);
  });
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!selectedProduct) return showPaymentError("No test was selected.");

  if (!stripe) {
    showPaymentError("Stripe is not configured yet.");
    return;
  }

  const form = event.currentTarget;
  const button = document.getElementById("payButton");

  setButton(button, true, "Preparing Secure Payment...");
  clearMessages();

  try {
    if (!paymentMounted) {
      const clientSecret = await createPaymentIntent(form);
      mountStripePayment(clientSecret);

      setButton(
        button,
        false,
        "Pay " + formatTestPrice(
          selectedProduct.price,
          selectedProduct.currency || "USD"
        )
      );
      return;
    }

    await confirmPayment(form);
  } catch (error) {
    console.error(error);
    showPaymentError(error.message || "Unable to process the payment.");
    setButton(
      button,
      false,
      "Pay " + formatTestPrice(
        selectedProduct.price,
        selectedProduct.currency || "USD"
      )
    );
  }
}

async function createPaymentIntent(form) {
  const data = new FormData(form);

  const customer = {
    firstName: data.get("firstName").trim(),
    lastName: data.get("lastName").trim(),
    email: data.get("email").trim(),
    phone: data.get("phone").trim(),
    address: data.get("address").trim(),
    city: data.get("city").trim(),
    state: data.get("state").trim(),
    zip: data.get("zip").trim()
  };

  const response = await fetch(PAYMENT_INTENT_ENDPOINT, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      productId: selectedProduct.id,
      customer
    })
  });

  if (!response.ok) {
    throw new Error("The secure payment server could not create the payment.");
  }

  const result = await response.json();

  if (!result.clientSecret) {
    throw new Error("The payment server did not return a client secret.");
  }

  return result.clientSecret;
}

function mountStripePayment(clientSecret) {
  elements = stripe.elements({
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#325aa3",
        colorText: "#1d2d45",
        borderRadius: "8px",
        fontFamily: "Inter, Arial, sans-serif"
      }
    }
  });

  paymentElement = elements.create("payment");
  paymentElement.mount("#payment-element");
  paymentMounted = true;

  paymentElement.on("change", (event) => {
    if (event.error) showPaymentError(event.error.message);
    else clearMessages();
  });
}

async function confirmPayment(form) {
  const data = new FormData(form);
  const firstName = data.get("firstName").trim();
  const lastName = data.get("lastName").trim();

  const {error} = await stripe.confirmPayment({
    elements,
    confirmParams: {
      payment_method_data: {
        billing_details: {
          name: `${firstName} ${lastName}`,
          email: data.get("email").trim(),
          phone: data.get("phone").trim(),
          address: {
            line1: data.get("address").trim(),
            city: data.get("city").trim(),
            state: data.get("state").trim(),
            postal_code: data.get("zip").trim()
          }
        }
      },
      return_url:
        location.origin +
        "/order-confirmation?product=" +
        encodeURIComponent(selectedProduct.id)
    },
    redirect: "if_required"
  });

  if (error) throw new Error(error.message);

  showPaymentSuccess(
    "Payment submitted successfully. Your order is being processed."
  );

  setButton(
    document.getElementById("payButton"),
    true,
    "Payment Submitted"
  );
}

function setButton(button, disabled, label) {
  button.disabled = disabled;
  button.textContent = label;
}

function showCheckoutError() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("errorCard").style.display = "block";
}

function showSetupNotice(message) {
  const box = document.getElementById("setupNotice");
  box.textContent = message;
  box.style.display = "block";
}

function showPaymentError(message) {
  const box = document.getElementById("paymentError");
  box.textContent = message;
  box.style.display = "block";
}

function showPaymentSuccess(message) {
  const box = document.getElementById("paymentError");
  box.className = "notice";
  box.textContent = message;
  box.style.display = "block";
}

function clearMessages() {
  document.getElementById("paymentError").style.display = "none";
  document.getElementById("setupNotice").style.display = "none";
}