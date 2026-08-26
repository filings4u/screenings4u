/**
 * screenings4u — Order Confirmation
 *
 * Displays the S4U Tracking Number and carries the transaction
 * identifiers into the donor-pass workflow.
 *
 * Expected confirmation URL:
 * order-confirmation.html?order=ORDER_UUID&tracking=S4U_TRACKING_NUMBER
 */

"use strict";

document.addEventListener(
  "DOMContentLoaded",
  initializeOrderConfirmation
);

function initializeOrderConfirmation() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const orderId =
    params.get("order") ||
    params.get("order_id") ||
    "";

  const trackingNumber =
    params.get("tracking") ||
    params.get("tracking_number") ||
    "";

  const trackingElement =
    document.getElementById(
      "trackingNumber"
    );

  if (trackingElement) {
    trackingElement.textContent =
      trackingNumber || "Submitted";
  }

  const donorPassButton =
    document.getElementById(
      "donorPassButton"
    );

  if (!donorPassButton) {
    return;
  }

  const donorPassParams =
    new URLSearchParams();

  if (orderId) {
    donorPassParams.set(
      "order",
      orderId
    );
  }

  if (trackingNumber) {
    donorPassParams.set(
      "tracking",
      trackingNumber
    );
  }

  const query =
    donorPassParams.toString();

  donorPassButton.href =
    "donor-pass.html" +
    (query ? "?" + query : "");
}