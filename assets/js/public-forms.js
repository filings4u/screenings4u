(() => {
  "use strict";

  const FUNCTION_NAME = "public-form-submit";

  function valueObject(form) {
    const data = new FormData(form);
    const output = {};

    for (const [key, value] of data.entries()) {
      if (key === "website_trap" || key === "form_started_at") continue;

      let normalized = value;

      if (value instanceof File) {
        if (!value.size) continue;
        normalized = {
          name: value.name.slice(0, 180),
          type: value.type.slice(0, 120),
          size: value.size
        };
      }

      if (Object.prototype.hasOwnProperty.call(output, key)) {
        output[key] = Array.isArray(output[key])
          ? [...output[key], normalized]
          : [output[key], normalized];
      } else {
        output[key] = normalized;
      }
    }

    return output;
  }

  function setPageStatus(form, message, ok) {
    const id = form.id === "contactForm" ? "formStatus" : "formStatus";
    const status = document.getElementById(id);
    if (!status) return;

    status.textContent = message || "";
    status.className =
      form.id === "contactForm"
        ? "status " + (ok ? "success" : "error")
        : "status " + (ok ? "success" : "error");
  }

  async function submit(form) {
    const security =
      window.Screenings4uFormSecurity?.payload(form) || {};

    if (!security.turnstileToken) {
      setPageStatus(
        form,
        "Complete the security verification before submitting.",
        false
      );
      return;
    }

    const baseUrl =
      window.SCREENINGS4U_SUPABASE_URL ||
      "https://rgsrubdtljyxmnihwlah.supabase.co";

    const formKey = form.dataset.s4uFormKey;
    const button = form.querySelector('[type="submit"]');
    const original = button?.textContent || "";

    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = "Submitting securely...";
    }

    try {
      const response = await fetch(
        baseUrl.replace(/\/+$/, "") + "/functions/v1/" + FUNCTION_NAME,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formKey,
            sourceUrl: window.location.href,
            payload: valueObject(form),
            ...security
          })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Your submission could not be verified. Please try again."
        );
      }

      form.reset();
      window.Screenings4uFormSecurity?.reset(form);

      setPageStatus(
        form,
        result.message || "Your information has been submitted successfully.",
        true
      );
    } catch (error) {
      window.Screenings4uFormSecurity?.reset(form);
      setPageStatus(
        form,
        error instanceof Error
          ? error.message
          : "Unable to submit the form. Please try again.",
        false
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        button.textContent = original;
      }
    }
  }

  function init() {
    document
      .querySelectorAll('form[data-s4u-public-submit="true"]')
      .forEach((form) => {
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }
          submit(form);
        });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
