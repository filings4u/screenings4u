/*
 * =========================================================
 * screenings4u
 * Client Portal Authentication
 *
 * Location:
 * assets/js/client-auth.js
 *
 * Uses the shared Supabase client created by client-config.js.
 * =========================================================
 */

(function () {
  "use strict";

  let supabaseClient = null;

  /*
   * =========================================================
   * INITIALIZE
   * =========================================================
   */

  async function initializeClientLogin() {
    try {
      supabaseClient = getSupabaseClient();

      if (!supabaseClient) {
        throw new Error(
          "Client authentication could not be initialized."
        );
      }

      const {
        data,
        error
      } = await supabaseClient.auth.getSession();

      if (error) {
        throw error;
      }

      /*
       * If the user already has a valid session,
       * send them directly to the client dashboard.
       */
      if (data && data.session) {
        window.location.replace("client-dashboard.html");
        return;
      }

      initializeLoginForm();

    } catch (error) {
      console.error(
        "Client login initialization error:",
        error
      );

      showLoginMessage(
        error.message ||
        "Unable to initialize the client portal.",
        "error"
      );
    }
  }


  /*
   * =========================================================
   * GET SHARED SUPABASE CLIENT
   * =========================================================
   *
   * client-config.js must load before this file.
   *
   * We do NOT create another Supabase client here.
   * =========================================================
   */

  function getSupabaseClient() {

    if (
      window.screenings4uSupabase &&
      typeof window.screenings4uSupabase.auth === "object"
    ) {
      return window.screenings4uSupabase;
    }

    /*
     * Fallback in case client-config.js has exposed
     * the configuration but has not created the client.
     */
    if (
      window.supabase &&
      typeof window.supabase.createClient === "function" &&
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
      "screenings4u: Shared Supabase client is unavailable."
    );

    return null;
  }


  /*
   * =========================================================
   * LOGIN FORM
   * =========================================================
   */

  function initializeLoginForm() {

    const form =
      document.getElementById("clientLoginForm");

    if (!form) {
      console.error(
        "client-auth.js: #clientLoginForm was not found."
      );
      return;
    }

    form.addEventListener(
      "submit",
      handleClientLogin
    );
  }


  /*
   * =========================================================
   * LOGIN
   * =========================================================
   */

  async function handleClientLogin(event) {

    event.preventDefault();

    const emailInput =
      document.getElementById("clientEmail");

    const passwordInput =
      document.getElementById("clientPassword");

    const button =
      document.getElementById("clientLoginButton");

    if (!emailInput || !passwordInput) {
      return;
    }

    const email =
      emailInput.value
        .trim()
        .toLowerCase();

    const password =
      passwordInput.value;

    if (!email) {

      showLoginMessage(
        "Please enter your email address.",
        "error"
      );

      emailInput.focus();
      return;
    }

    if (!password) {

      showLoginMessage(
        "Please enter your password.",
        "error"
      );

      passwordInput.focus();
      return;
    }

    setLoginLoading(true);
    clearLoginMessage();

    try {

      const {
        data,
        error
      } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        throw error;
      }

      if (
        !data ||
        !data.session ||
        !data.user
      ) {
        throw new Error(
          "Unable to establish your account session."
        );
      }

      showLoginMessage(
        "Sign in successful. Loading your dashboard...",
        "success"
      );

      window.setTimeout(function () {

        window.location.replace(
          "client-dashboard.html"
        );

      }, 300);

    } catch (error) {

      console.error(
        "Client login error:",
        error
      );

      showLoginMessage(
        getFriendlyAuthError(error),
        "error"
      );

      setLoginLoading(false);
    }
  }


  /*
   * =========================================================
   * BUTTON STATE
   * =========================================================
   */

  function setLoginLoading(loading) {

    const button =
      document.getElementById(
        "clientLoginButton"
      );

    if (!button) {
      return;
    }

    button.disabled = loading;

    button.textContent =
      loading
        ? "Signing In..."
        : "Sign In";
  }


  /*
   * =========================================================
   * LOGIN MESSAGE
   * =========================================================
   */

  function showLoginMessage(
    message,
    type
  ) {

    const element =
      document.getElementById(
        "clientLoginMessage"
      );

    if (!element) {
      return;
    }

    element.textContent =
      message;

    element.className =
      "form-message " +
      (
        type === "success"
          ? "success"
          : "error"
      );
  }


  function clearLoginMessage() {

    const element =
      document.getElementById(
        "clientLoginMessage"
      );

    if (!element) {
      return;
    }

    element.textContent = "";
    element.className = "form-message";
  }


  /*
   * =========================================================
   * FRIENDLY AUTH ERRORS
   * =========================================================
   */

  function getFriendlyAuthError(error) {

    const message =
      String(
        error && error.message
          ? error.message
          : ""
      ).toLowerCase();

    if (
      message.includes(
        "invalid login credentials"
      )
    ) {
      return (
        "The email or password you entered is incorrect."
      );
    }

    if (
      message.includes(
        "invalid api key"
      )
    ) {
      return (
        "The client portal authentication configuration is invalid."
      );
    }

    if (
      message.includes(
        "email not confirmed"
      )
    ) {
      return (
        "Your email address has not been confirmed yet. " +
        "Please check your email for the confirmation link."
      );
    }

    if (
      message.includes(
        "too many requests"
      )
    ) {
      return (
        "Too many login attempts. Please wait a moment and try again."
      );
    }

    if (
      message.includes(
        "user not found"
      )
    ) {
      return (
        "We could not find an account with that email address."
      );
    }

    return (
      error && error.message
        ? error.message
        : "Unable to sign in. Please try again."
    );
  }


  /*
   * =========================================================
   * PUBLIC CLIENT AUTH ACCESS
   * =========================================================
   */

  window.screenings4uClientAuth = {

    getClient: function () {
      return supabaseClient;
    },

    signOut: async function () {

      if (!supabaseClient) {
        return;
      }

      await supabaseClient.auth.signOut();

      window.location.replace(
        "client-login.html"
      );
    }
  };


  /*
   * =========================================================
   * DOM READY
   * =========================================================
   */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeClientLogin
    );

  } else {

    initializeClientLogin();

  }

})();