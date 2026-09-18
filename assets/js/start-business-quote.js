(() => {
  "use strict";

  function initForm(form) {
    const group = form.querySelector("[data-quote-options]");
    const count = form.querySelector("[data-quote-count]");
    const status = form.querySelector("#formStatus");

    function selectedCount() {
      return form.querySelectorAll('input[name="quote_items"]:checked').length;
    }

    function updateCount() {
      const n = selectedCount();
      if (count) {
        count.textContent = n
          ? `${n} item${n === 1 ? "" : "s"} selected`
          : "Select the services and setup items you want quoted.";
      }
    }

    group?.addEventListener("change", updateCount);
    updateCount();

    form.addEventListener(
      "submit",
      (event) => {
        if (selectedCount() < 1) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (status) {
            status.textContent =
              "Select at least one service or setup item for your custom quote.";
            status.className = "status error";
          }
          group?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      true
    );
  }

  function init() {
    document
      .querySelectorAll('form[data-start-business-quote="true"]')
      .forEach(initForm);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
