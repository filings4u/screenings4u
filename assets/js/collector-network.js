/**
 * screenings4u
 * Collector Network Form
 *
 * Uses the existing public Supabase configuration:
 *
 * window.SCREENINGS4U_SUPABASE_URL
 * window.SCREENINGS4U_SUPABASE_ANON_KEY
 *
 * REQUIRED SCRIPT ORDER:
 *
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * <script src="assets/js/site-config.js"></script>
 * <script src="assets/js/collector-network.js"></script>
 */

(function () {
  "use strict";

  const FUNCTION_NAME = "collector-network-submit";

  function getSupabaseClient() {
    if (window.supabaseClient) {
      return window.supabaseClient;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("Supabase browser SDK was not loaded.");
      return null;
    }

    const supabaseUrl =
      window.SCREENINGS4U_SUPABASE_URL || "";

    const supabaseAnonKey =
      window.SCREENINGS4U_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        "Missing public Supabase configuration.",
        {
          hasUrl: Boolean(supabaseUrl),
          hasAnonKey: Boolean(supabaseAnonKey)
        }
      );
      return null;
    }

    try {
      window.supabaseClient =
        window.supabase.createClient(
          supabaseUrl,
          supabaseAnonKey,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false
            }
          }
        );

      return window.supabaseClient;
    } catch (error) {
      console.error(
        "Unable to create Supabase client:",
        error
      );
      return null;
    }
  }

  function showMessage(element, type, message) {
    if (!element) {
      alert(message);
      return;
    }

    element.textContent = message;
    element.classList.add("active");
    element.classList.remove("is-error", "is-success");
    element.classList.add(
      type === "success" ? "is-success" : "is-error"
    );
  }

  function clearMessage(element) {
    if (!element) return;

    element.textContent = "";
    element.classList.remove(
      "active",
      "is-error",
      "is-success"
    );
  }

  function setSubmittingState(button, isSubmitting) {
    if (!button) return;

    if (isSubmitting) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }

      button.disabled = true;
      button.textContent = "Submitting Your Application...";
      button.setAttribute("aria-busy", "true");
    } else {
      button.disabled = false;

      if (button.dataset.originalText) {
        button.textContent =
          button.dataset.originalText;
      }

      button.removeAttribute("aria-busy");
    }
  }

  function getValue(form, name) {
    const field = form.elements[name];

    if (!field) return "";

    return String(field.value || "").trim();
  }

  function createFullName(firstName, lastName) {
    return [firstName, lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function buildPayload(form) {
    const firstName = getValue(form, "firstName");
    const lastName = getValue(form, "lastName");
    const fullName = createFullName(
      firstName,
      lastName
    );

    const phone = getValue(form, "phone");
    const email = getValue(form, "email");
    const businessName = getValue(
      form,
      "businessName"
    );
    const city = getValue(form, "city");
    const state = getValue(form, "state");
    const zipCode = getValue(form, "zipCode");
    const mobileAvailability = getValue(
      form,
      "mobileAvailability"
    );
    const services = getValue(form, "services");
    const dotExperience = getValue(
      form,
      "dotExperience"
    );
    const availability = getValue(
      form,
      "availability"
    );
    const coverageArea = getValue(
      form,
      "coverageArea"
    );
    const additionalNotes = getValue(
      form,
      "additionalNotes"
    );

    const collectorTypeParts = [];

    if (mobileAvailability) {
      collectorTypeParts.push(
        "Mobile Collection: " +
        mobileAvailability
      );
    }

    if (dotExperience) {
      collectorTypeParts.push(
        "DOT Experience: " +
        dotExperience
      );
    }

    if (availability) {
      collectorTypeParts.push(
        "Availability: " +
        availability
      );
    }

    const certificationsParts = [];

    if (dotExperience) {
      certificationsParts.push(
        "DOT Collection Experience: " +
        dotExperience
      );
    }

    if (availability) {
      certificationsParts.push(
        "General Availability: " +
        availability
      );
    }

    return {
      full_name: fullName,
      email: email,
      phone: phone,
      company_name: businessName,
      website: "",
      city: city,
      state: state,
      zip_code: zipCode,
      service_areas: coverageArea,
      collector_type:
        collectorTypeParts.join(" | "),
      certifications:
        certificationsParts.join(" | "),
      years_experience: "",
      message: [
        services
          ? "Collection Services:\n" + services
          : "",
        additionalNotes
          ? "Additional Information:\n" +
            additionalNotes
          : ""
      ]
        .filter(Boolean)
        .join("\n\n"),
      website_trap: ""
    };
  }

  function validatePayload(payload) {
    if (!payload.full_name) {
      return "Please enter your first and last name.";
    }

    if (!payload.email) {
      return "Please enter your email address.";
    }

    if (!payload.phone) {
      return "Please enter your phone number.";
    }

    if (!payload.city) {
      return "Please enter your city.";
    }

    if (!payload.state) {
      return "Please select your state.";
    }

    return "";
  }

  async function submitApplication(
    form,
    messageElement,
    submitButton
  ) {
    clearMessage(messageElement);

    const payload = buildPayload(form);
    const validationError =
      validatePayload(payload);

    if (validationError) {
      showMessage(
        messageElement,
        "error",
        validationError
      );
      return;
    }

    const supabaseClient =
      getSupabaseClient();

    if (!supabaseClient) {
      showMessage(
        messageElement,
        "error",
        "The application service is temporarily unavailable. Please try again later."
      );
      return;
    }

    setSubmittingState(
      submitButton,
      true
    );

    try {
      const {
        data,
        error
      } = await supabaseClient.functions.invoke(
        FUNCTION_NAME,
        {
          body: payload
        }
      );

      if (error) {
        console.error(
          "Collector Network function error:",
          error
        );

        throw new Error(
          error.message ||
          "Unable to submit application."
        );
      }

      if (!data || data.success !== true) {
        throw new Error(
          data?.error ||
          "Unable to submit application."
        );
      }

      form.reset();

      showMessage(
        messageElement,
        "success",
        data.message ||
        "Thank you for your interest in joining the screenings4u Collector Network. Your information has been received."
      );

      if (messageElement) {
        setTimeout(function () {
          messageElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });
        }, 100);
      }
    } catch (error) {
      console.error(
        "Collector Network submission failed:",
        error
      );

      showMessage(
        messageElement,
        "error",
        error?.message ||
        "We were unable to submit your application. Please try again."
      );
    } finally {
      setSubmittingState(
        submitButton,
        false
      );
    }
  }

  function initializeCollectorNetworkForm() {
    const form = document.getElementById(
      "collectorNetworkForm"
    );

    if (!form) return;

    const messageElement =
      document.getElementById("formSuccess");

    const submitButton =
      form.querySelector(
        'button[type="submit"]'
      );

    form.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        await submitApplication(
          form,
          messageElement,
          submitButton
        );
      }
    );
  }

  document.addEventListener(
    "DOMContentLoaded",
    initializeCollectorNetworkForm
  );
})();
