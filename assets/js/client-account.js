/*
 * =========================================================
 * screenings4u — Client Account Controller
 * =========================================================
 *
 * Current database wiring:
 *
 *   client_profiles
 *     id -> auth.users.id
 *
 * Current client profile columns:
 *   first_name
 *   last_name
 *   email
 *   phone
 *   company_name
 *   address_line_1
 *   address_line_2
 *   city
 *   state
 *   postal_code
 *   is_active
 *   created_at
 *   updated_at
 *
 * IMPORTANT:
 *   The old "profiles" table is no longer used.
 *   The old combined company/address/full_name fields are no
 *   longer used.
 * =========================================================
 */

(function () {
  "use strict";

  let client = null;
  let user = null;

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

  /* =======================================================
     INITIALIZE
  ======================================================= */

  async function init() {
    try {
      client =
        window.getScreenings4uSupabase
          ? window.getScreenings4uSupabase()
          : window.screenings4uSupabase;

      if (!client || !client.auth) {
        throw new Error(
          "Supabase client could not be initialized."
        );
      }

      const {
        data,
        error
      } =
        await client.auth.getSession();

      if (error) {
        throw error;
      }

      if (!data || !data.session) {
        window.location.replace(
          "client-login.html"
        );
        return;
      }

      user =
        data.session.user;

      await loadProfile();

      const accountForm =
        document.getElementById(
          "accountForm"
        );

      const passwordForm =
        document.getElementById(
          "passwordForm"
        );

      if (accountForm) {
        accountForm.addEventListener(
          "submit",
          saveProfile
        );
      }

      if (passwordForm) {
        passwordForm.addEventListener(
          "submit",
          changePassword
        );
      }

    } catch (error) {
      console.error(
        "Client account initialization failed:",
        error
      );

      showMessage(
        "accountMessage",
        error.message ||
          "Unable to load account.",
        "error"
      );
    }
  }

  /* =======================================================
     LOAD CLIENT PROFILE
  ======================================================= */

  async function loadProfile() {
    const {
      data,
      error
    } =
      await client
        .from("client_profiles")
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          company_name,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          is_active,
          created_at,
          updated_at
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    const profile =
      data || {};

    /*
     * If the authenticated user does not have a client
     * profile yet, the form can still be used to create one.
     */
    setValue(
      "firstName",
      profile.first_name || ""
    );

    setValue(
      "lastName",
      profile.last_name || ""
    );

    setValue(
      "email",
      user.email ||
        profile.email ||
        ""
    );

    setValue(
      "phone",
      profile.phone || ""
    );

    /*
     * Support the current HTML using "company".
     * The database column is company_name.
     */
    setValue(
      "company",
      profile.company_name || ""
    );

    /*
     * Current address schema is split into individual
     * fields. The helper below only fills an element when
     * that element exists, so this works with the current
     * client account HTML without breaking if some fields
     * are not present.
     */
    setValue(
      "address",
      profile.address_line_1 || ""
    );

    setValue(
      "addressLine1",
      profile.address_line_1 || ""
    );

    setValue(
      "addressLine2",
      profile.address_line_2 || ""
    );

    setValue(
      "city",
      profile.city || ""
    );

    setValue(
      "state",
      profile.state || ""
    );

    setValue(
      "postalCode",
      profile.postal_code || ""
    );

    /*
     * Keep the client identity display independent of
     * full_name, because that column no longer exists.
     */
    const name =
      [
        profile.first_name,
        profile.last_name
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      user.email ||
      "Client";

    const identity =
      document.getElementById(
        "clientIdentity"
      );

    if (identity) {
      identity.innerHTML = `
        <div class="client-identity-avatar">
          ${escapeHtml(
            getInitials(name)
          )}
        </div>

        <div class="client-identity-text">
          <strong>
            ${escapeHtml(name)}
          </strong>

          <span>
            ${escapeHtml(
              user.email || ""
            )}
          </span>
        </div>
      `;
    }
  }

  /* =======================================================
     SAVE CLIENT PROFILE
  ======================================================= */

  async function saveProfile(
    event
  ) {
    event.preventDefault();

    const firstName =
      value("firstName");

    const lastName =
      value("lastName");

    /*
     * Build the payload using ONLY columns that exist in
     * client_profiles.
     */
    const payload = {
      id: user.id,

      first_name:
        firstName,

      last_name:
        lastName,

      email:
        user.email ||
        value("email"),

      phone:
        value("phone"),

      company_name:
        value("company"),

      address_line_1:
        getFirstExistingValue([
          "addressLine1",
          "address"
        ]),

      address_line_2:
        value("addressLine2"),

      city:
        value("city"),

      state:
        value("state"),

      postal_code:
        value("postalCode"),

      updated_at:
        new Date().toISOString()
    };

    /*
     * Do not send duplicate/legacy columns such as:
     *   full_name
     *   company
     *   address
     */

    try {
      const {
        error
      } =
        await client
          .from("client_profiles")
          .upsert(
            payload,
            {
              onConflict: "id"
            }
          );

      if (error) {
        throw error;
      }

      showMessage(
        "accountMessage",
        "Account information saved.",
        "success"
      );

      /*
       * Refresh the displayed identity from the database
       * after a successful save.
       */
      await loadProfile();

    } catch (error) {
      console.error(
        "Unable to save client profile:",
        error
      );

      showMessage(
        "accountMessage",
        error.message ||
          "Unable to save changes.",
        "error"
      );
    }
  }

  /* =======================================================
     CHANGE PASSWORD
  ======================================================= */

  async function changePassword(
    event
  ) {
    event.preventDefault();

    const password =
      value("newPassword");

    const confirm =
      value("confirmPassword");

    if (password.length < 8) {
      showMessage(
        "passwordMessage",
        "Password must be at least 8 characters.",
        "error"
      );
      return;
    }

    if (password !== confirm) {
      showMessage(
        "passwordMessage",
        "Passwords do not match.",
        "error"
      );
      return;
    }

    try {
      const {
        error
      } =
        await client.auth.updateUser({
          password: password
        });

      if (error) {
        throw error;
      }

      const passwordForm =
        document.getElementById(
          "passwordForm"
        );

      if (passwordForm) {
        passwordForm.reset();
      }

      showMessage(
        "passwordMessage",
        "Password updated successfully.",
        "success"
      );

    } catch (error) {
      console.error(
        "Unable to update password:",
        error
      );

      showMessage(
        "passwordMessage",
        error.message ||
          "Unable to update password.",
        "error"
      );
    }
  }

  /* =======================================================
     FIELD HELPERS
  ======================================================= */

  function value(id) {
    const element =
      document.getElementById(id);

    return String(
      element?.value || ""
    ).trim();
  }

  function getFirstExistingValue(
    ids
  ) {
    for (
      let i = 0;
      i < ids.length;
      i++
    ) {
      const element =
        document.getElementById(
          ids[i]
        );

      if (element) {
        return String(
          element.value || ""
        ).trim();
      }
    }

    return "";
  }

  function setValue(
    id,
    fieldValue
  ) {
    const element =
      document.getElementById(id);

    if (element) {
      element.value =
        fieldValue == null
          ? ""
          : fieldValue;
    }
  }

  /* =======================================================
     IDENTITY HELPERS
  ======================================================= */

  function getInitials(
    name
  ) {
    const parts =
      String(name || "Client")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) {
      return "CL";
    }

    if (parts.length === 1) {
      return parts[0]
        .substring(0, 2)
        .toUpperCase();
    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();
  }

  /* =======================================================
     MESSAGES
  ======================================================= */

  function showMessage(
    id,
    message,
    type
  ) {
    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    element.textContent =
      message || "";

    element.className =
      "form-message";

    if (type) {
      element.classList.add(
        type
      );
    }
  }

  /* =======================================================
     ESCAPE HTML
  ======================================================= */

  function escapeHtml(
    value
  ) {
    return String(
      value ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

})();