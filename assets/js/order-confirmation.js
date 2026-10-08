/**
 * screenings4u — Order Confirmation
 *
 * Main-website payment confirmation page.
 * This page intentionally does not load portal authentication.
 * New customers establish their portal session from the Supabase
 * invitation email; existing customers use their existing login.
 *
 * Expected URL:
 * order-confirmation.html?order=ORDER_UUID&tracking=TRACKING_NUMBER
 */

(() => {
  "use strict";

  const DONOR_PASS_PAGE = "donor-pass.html";
  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const TRACKING_PATTERN = /^[A-Za-z0-9_-]{16}$/;

  document.addEventListener(
    "DOMContentLoaded",
    initializeOrderConfirmation
  );

  function initializeOrderConfirmation() {
    const params = new URLSearchParams(
      window.location.search
    );

    const orderId = String(
      params.get("order") ||
      params.get("order_id") ||
      ""
    ).trim();

    const trackingNumber = String(
      params.get("tracking") ||
      params.get("tracking_number") ||
      ""
    ).trim();

    const trackingElement =
      document.getElementById("trackingNumber");

    const donorPassButton =
      document.getElementById("donorPassButton");

    const statusElement =
      document.getElementById("confirmationStatus");

    const validOrderId =
      UUID_PATTERN.test(orderId);

    const validTrackingNumber =
      TRACKING_PATTERN.test(trackingNumber);

    if (trackingElement) {
      trackingElement.textContent =
        validTrackingNumber
          ? trackingNumber
          : "Submitted";
    }

    if (!donorPassButton) {
      return;
    }

    if (!validOrderId || !validTrackingNumber) {
      disableDonorPassButton(donorPassButton);

      if (statusElement) {
        statusElement.hidden = false;
        statusElement.textContent =
          "Your payment was submitted, but the order details in this page link are incomplete. Use the link in your receipt email or contact screenings4u for assistance.";
      }

      return;
    }

    const donorPassParams =
      new URLSearchParams({
        order: orderId,
        tracking: trackingNumber
      });

    donorPassButton.href =
      `${DONOR_PASS_PAGE}?${donorPassParams.toString()}`;

    donorPassButton.removeAttribute("aria-disabled");
  }

  function disableDonorPassButton(button) {
    button.href = "#";
    button.setAttribute("aria-disabled", "true");
    button.classList.add("is-disabled");

    button.addEventListener("click", event => {
      event.preventDefault();
    });
  }
})();
