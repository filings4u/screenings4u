(function () {
  "use strict";

  function initializeLocationPage() {
    const params = new URLSearchParams(window.location.search);
    const service = params.get("service") || "Testing service";
    const tracking = params.get("tracking") || "—";
    const serviceName = document.getElementById("serviceName");
    const trackingNumber = document.getElementById("trackingNumber");
    const form = document.getElementById("locationForm");
    const notice = document.getElementById("locationNotice");
    const button = document.getElementById("saveLocationButton");

    if (serviceName) serviceName.textContent = service;
    if (trackingNumber) trackingNumber.textContent = tracking;

    if (notice) {
      notice.className = "notice error";
      notice.textContent =
        "Online testing-location selection is not currently available. Please contact screenings4u support for help selecting a location.";
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Contact Support to Continue";
    }

    form?.addEventListener("submit", function (event) {
      event.preventDefault();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLocationPage, {
      once: true
    });
  } else {
    initializeLocationPage();
  }
})();
