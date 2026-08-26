/*
 * screenings4u — Admin Account Management
 * assets/js/admin-accounts.js
 *
 * Browser-safe account management.
 * No Supabase service-role key is used.
 * Invitation delivery must be handled by a trusted server/Edge Function.
 */
(function () {
  "use strict";

  let supabaseClient = null;
  let accounts = [];
  let invitations = [];
  let adminUsers = [];
  let selectedAccount = null;
  let refreshInProgress = false;

  const PROTECTED_ADMIN_ID = "8886ef8e-bfcb-4e36-8a0d-7287f34628dc";
  const PROTECTED_ADMIN_EMAIL = "aerving@screenings4u.com";
  const $ = (id) => document.getElementById(id);

  function getSupabaseClient() {
    if (window.getScreenings4uSupabase) return window.getScreenings4uSupabase();
    if (window.screenings4uSupabase) return window.screenings4uSupabase;

    if (
      window.supabase &&
      window.SCREENINGS4U_SUPABASE_URL &&
      window.SCREENINGS4U_SUPABASE_ANON_KEY
    ) {
      window.screenings4uSupabase = window.supabase.createClient(
        window.SCREENINGS4U_SUPABASE_URL,
        window.SCREENINGS4U_SUPABASE_ANON_KEY
      );
      return window.screenings4uSupabase;
    }

    return null;
  }

  async function initialize() {
    try {
      supabaseClient = getSupabaseClient();

      if (!supabaseClient) {
        throw new Error("Supabase client could not be initialized.");
      }

      const { data, error } = await supabaseClient.auth.getSession();

      if (error) throw error;

      if (!data?.session?.user) {
        window.location.href = "admin-dashboard.html";
        return;
      }

      bindEvents();
      await loadAccountPage();
    } catch (error) {
      console.error("Admin accounts initialization error:", error);
      showToast(
        error?.message || "Unable to initialize account management.",
        "error"
      );
    }
  }

  async function loadAccountPage() {
    if (refreshInProgress) return;

    refreshInProgress = true;
    setLoadingState();
    setRefreshState(true);

    try {
      const results = await Promise.allSettled([
        loadAccounts(),
        loadInvitations(),
        loadAdminUsers()
      ]);

      const failed = results.filter(
        (result) => result.status === "rejected"
      );

      if (failed.length) {
        console.error("Account datasets failed:", failed);
        showToast(
          failed[0].reason?.message ||
            "Some account data could not be loaded.",
          "error"
        );
      }

      updateAccountMetrics();
    } finally {
      refreshInProgress = false;
      setRefreshState(false);
    }
  }

  async function loadAccounts() {
    try {
      const { data, error } = await supabaseClient
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
        .order("created_at", { ascending: false });

      if (error) throw error;

      accounts = Array.isArray(data) ? data : [];
      updateAccountMetrics();
      renderAccounts();
    } catch (error) {
      accounts = [];
      renderSectionError(
        $("accountsTable"),
        "Unable to load customer accounts."
      );
      throw error;
    }
  }

  async function loadInvitations() {
    try {
      const { data, error } = await supabaseClient
        .from("account_invites")
        .select(`
          id,
          email,
          user_id,
          order_id,
          status,
          invited_at,
          accepted_at,
          last_error,
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      invitations = Array.isArray(data) ? data : [];
      updateAccountMetrics();
      renderInvitations();
    } catch (error) {
      invitations = [];
      renderSectionError(
        $("invitationsTable"),
        "Unable to load invitations."
      );
      throw error;
    }
  }

  async function loadAdminUsers() {
    try {
      const { data, error } = await supabaseClient
        .from("admin_profiles")
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          admin_level,
          is_active,
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: true });

      if (error) throw error;

      adminUsers = Array.isArray(data) ? data : [];
      renderAdminUsers();
    } catch (error) {
      adminUsers = [];
      renderSectionError(
        $("adminUsersTable"),
        "Unable to load administrator accounts."
      );
      throw error;
    }
  }

  function setLoadingState() {
    if ($("accountsTable")) {
      $("accountsTable").innerHTML = `
        <div class="accounts-loading">
          <span class="accounts-spinner" aria-hidden="true"></span>
          Loading customer accounts...
        </div>
      `;
    }

    if ($("invitationsTable")) {
      $("invitationsTable").innerHTML = `
        <div class="accounts-loading">
          <span class="accounts-spinner" aria-hidden="true"></span>
          Loading invitations...
        </div>
      `;
    }

    if ($("adminUsersTable")) {
      $("adminUsersTable").innerHTML = `
        <div class="accounts-loading">
          <span class="accounts-spinner" aria-hidden="true"></span>
          Loading administrators...
        </div>
      `;
    }
  }

  function setRefreshState(isLoading) {
    const button = $("refreshAccountsButton");

    if (!button) return;

    button.disabled = isLoading;
    button.innerHTML = isLoading
      ? '<span class="refresh-icon refresh-spinning" aria-hidden="true">↻</span> Refreshing...'
      : '<span class="refresh-icon" aria-hidden="true">↻</span> Refresh Data';
  }

  function renderSectionError(container, message) {
    if (!container) return;

    container.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(message)}
      </div>
    `;
  }

  function updateAccountMetrics() {
    setText("metricTotalAccounts", accounts.length);

    setText(
      "metricActiveAccounts",
      accounts.filter((account) => account.is_active !== false).length
    );

    setText(
      "metricPendingInvitations",
      invitations.filter(
        (invitation) => getInvitationStatus(invitation) === "pending"
      ).length
    );

    setText(
      "metricAcceptedInvitations",
      invitations.filter(
        (invitation) => getInvitationStatus(invitation) === "accepted"
      ).length
    );
  }

  function renderAccounts() {
    const container = $("accountsTable");
    if (!container) return;

    const search = String($("accountSearch")?.value || "")
      .trim()
      .toLowerCase();

    const statusFilter = String(
      $("accountStatusFilter")?.value || ""
    )
      .trim()
      .toLowerCase();

    const filtered = accounts.filter((account) => {
      const searchableText = [
        getAccountName(account),
        account.first_name,
        account.last_name,
        account.email,
        account.company_name,
        account.phone
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!search || searchableText.includes(search)) &&
        (!statusFilter ||
          getAccountStatus(account) === statusFilter)
      );
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          No customer accounts found.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Company</th>
            <th>Email</th>
            <th>Status</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map(
              (account) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(
                      getAccountName(account) || "Customer"
                    )}</strong>
                  </td>
                  <td>${escapeHtml(
                    account.company_name || "—"
                  )}</td>
                  <td>${escapeHtml(
                    account.email || "—"
                  )}</td>
                  <td>${renderStatusBadge(
                    getAccountStatus(account)
                  )}</td>
                  <td>${formatDate(account.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      class="accounts-row-button account-view-button"
                      data-account-id="${escapeAttribute(account.id)}"
                    >
                      View
                    </button>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;

    container
      .querySelectorAll(".account-view-button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          openAccountDetail(button.dataset.accountId);
        });
      });
  }

  function renderInvitations() {
    const container = $("invitationsTable");
    if (!container) return;

    const search = String($("invitationSearch")?.value || "")
      .trim()
      .toLowerCase();

    const statusFilter = String(
      $("invitationStatusFilter")?.value || ""
    )
      .trim()
      .toLowerCase();

    const filtered = invitations.filter((invitation) => {
      const searchableText = [
        invitation.email,
        invitation.order_id,
        invitation.user_id
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const status = getInvitationStatus(invitation);

      return (
        (!search || searchableText.includes(search)) &&
        (!statusFilter || status === statusFilter)
      );
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          No invitations found.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Invited</th>
            <th>Accepted</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map(
              (invitation) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(
                      invitation.email || "—"
                    )}</strong>
                  </td>
                  <td>${renderStatusBadge(
                    getInvitationStatus(invitation)
                  )}</td>
                  <td>${formatDate(
                    invitation.invited_at ||
                      invitation.created_at
                  )}</td>
                  <td>${formatDate(
                    invitation.accepted_at
                  )}</td>
                  <td>
                    <button
                      type="button"
                      class="accounts-row-button invitation-resend-button"
                      data-invitation-id="${escapeAttribute(
                        invitation.id
                      )}"
                    >
                      Resend
                    </button>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;

    container
      .querySelectorAll(".invitation-resend-button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          resendInvitation(button.dataset.invitationId);
        });
      });
  }

  function renderAdminUsers() {
    const container = $("adminUsersTable");
    if (!container) return;

    if (!adminUsers.length) {
      container.innerHTML = `
        <div class="empty-state">
          No admin users found.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Administrator</th>
            <th>Email</th>
            <th>Access</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${adminUsers
            .map((admin) => {
              const level = String(
                admin.admin_level || "administrator"
              ).toLowerCase();

              const status = isProtectedAdmin(admin)
                ? "superadmin"
                : admin.is_active === false
                  ? "inactive"
                  : "active";

              return `
                <tr>
                  <td>
                    <strong>${escapeHtml(
                      getAccountName(admin) ||
                        "Administrator"
                    )}</strong>
                  </td>
                  <td>${escapeHtml(
                    admin.email || "—"
                  )}</td>
                  <td>${escapeHtml(
                    capitalizeWords(level)
                  )}</td>
                  <td>${renderStatusBadge(status)}</td>
                  <td>${formatDate(admin.created_at)}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  function openAccountDetail(accountId) {
    selectedAccount = accounts.find(
      (account) =>
        String(account.id) === String(accountId)
    );

    if (!selectedAccount) {
      showToast(
        "That account could not be found.",
        "error"
      );
      return;
    }

    const invitation =
      findInvitationForAccount(selectedAccount);

    const name =
      getAccountName(selectedAccount) ||
      "Customer Account";

    setText("accountDetailTitle", name);
    setText("accountCustomerName", name);
    setText(
      "accountCustomerEmail",
      selectedAccount.email || "—"
    );
    setText("accountInitials", getInitials(name));
    setText(
      "accountCompany",
      selectedAccount.company_name || "—"
    );
    setText(
      "accountPhone",
      selectedAccount.phone || "—"
    );
    setText(
      "accountAddress",
      [
        selectedAccount.address_line_1,
        selectedAccount.address_line_2,
        selectedAccount.city,
        selectedAccount.state,
        selectedAccount.postal_code
      ]
        .filter(Boolean)
        .join(", ") || "—"
    );
    setText(
      "accountStatus",
      capitalizeWords(
        getAccountStatus(selectedAccount)
      )
    );
    setText(
      "accountCreated",
      formatDate(selectedAccount.created_at)
    );

    if (invitation) {
      setText(
        "detailInvitationEmail",
        invitation.email ||
          selectedAccount.email ||
          "—"
      );
      setText(
        "detailInvitationStatus",
        capitalizeWords(
          getInvitationStatus(invitation)
        )
      );
      setText(
        "detailInvitationSent",
        formatDate(
          invitation.invited_at ||
            invitation.created_at
        )
      );
      setText(
        "detailInvitationAccepted",
        formatDate(invitation.accepted_at)
      );
      setText(
        "detailInvitationExpires",
        "—"
      );
    } else {
      setText(
        "detailInvitationEmail",
        selectedAccount.email || "—"
      );
      setText(
        "detailInvitationStatus",
        "No invitation"
      );
      setText("detailInvitationSent", "—");
      setText(
        "detailInvitationAccepted",
        "—"
      );
      setText(
        "detailInvitationExpires",
        "—"
      );
    }

    const protectedAccount =
      isProtectedAccount(selectedAccount);

    if ($("activateAccountButton")) {
      $("activateAccountButton").hidden =
        protectedAccount ||
        selectedAccount.is_active !== false;
    }

    if ($("deactivateAccountButton")) {
      $("deactivateAccountButton").hidden =
        protectedAccount ||
        selectedAccount.is_active === false;
    }

    const panel = $("accountDetailPanel");

    if (panel) {
      panel.hidden = false;
      panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  function closeAccountDetail() {
    selectedAccount = null;

    const panel = $("accountDetailPanel");

    if (panel) {
      panel.hidden = true;
    }
  }

  function findInvitationForAccount(account) {
    if (!account) return null;

    const accountId = String(account.id || "");
    const email = String(account.email || "")
      .trim()
      .toLowerCase();

    const byUserId = invitations.find(
      (invitation) =>
        accountId &&
        String(invitation.user_id || "") ===
          accountId
    );

    if (byUserId) return byUserId;

    if (!email) return null;

    return (
      invitations.find(
        (invitation) =>
          String(invitation.email || "")
            .trim()
            .toLowerCase() === email
      ) || null
    );
  }

  async function callAccountAction(payload) {
    const { data, error } = await supabaseClient.functions.invoke(
      "admin-account-actions",
      { body: payload }
    );
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function resendInvitation(invitationId) {
    const invitation = invitations.find(
      (item) => String(item.id) === String(invitationId)
    );
    if (!invitation) {
      showToast("Invitation could not be found.", "error");
      return;
    }
    try {
      toggleActionButtons(true);
      await callAccountAction({
        action: "resend_invitation",
        invitation_id: invitation.id,
        email: invitation.email
      });
      showToast("Invitation email sent.", "success");
      await loadAccountPage();
    } catch (error) {
      console.error("Resend invitation error:", error);
      showToast(error?.message || "Unable to resend invitation.", "error");
    } finally {
      toggleActionButtons(false);
    }
  }

  async function updateSelectedAccountStatus(
    isActive
  ) {
    if (!selectedAccount) return;

    if (isProtectedAccount(selectedAccount)) {
      showToast(
        "The primary administrator account cannot be changed here.",
        "error"
      );
      return;
    }

    if (
      !isActive &&
      !window.confirm(
        "Are you sure you want to deactivate this customer account?"
      )
    ) {
      return;
    }

    try {
      toggleActionButtons(true);

      await callAccountAction({
        action: isActive ? "activate_account" : "deactivate_account",
        user_id: selectedAccount.id,
        email: selectedAccount.email || ""
      });

      showToast(
        isActive
          ? "Account activated."
          : "Account deactivated.",
        "success"
      );

      closeAccountDetail();
      await loadAccountPage();
    } catch (error) {
      console.error(
        "Account status update error:",
        error
      );

      showToast(
        error?.message ||
          "Unable to update account status.",
        "error"
      );
    } finally {
      toggleActionButtons(false);
    }
  }

  function toggleActionButtons(disabled) {
    [
      $("resendInvitationButton"),
      $("activateAccountButton"),
      $("deactivateAccountButton")
    ].forEach((button) => {
      if (button) button.disabled = disabled;
    });
  }

  function getAccountStatus(account) {
    if (!account) return "unknown";

    if (account.is_active === false) {
      return "inactive";
    }

    const invitation =
      findInvitationForAccount(account);

    if (
      invitation &&
      getInvitationStatus(invitation) ===
        "pending"
    ) {
      return "pending";
    }

    return "active";
  }

  function getInvitationStatus(invitation) {
    if (!invitation) return "unknown";

    if (invitation.accepted_at) {
      return "accepted";
    }

    const status = String(
      invitation.status || ""
    )
      .trim()
      .toLowerCase();

    return status || "pending";
  }

  function isProtectedAdmin(admin) {
    return (
      !!admin &&
      (String(admin.id || "") ===
        PROTECTED_ADMIN_ID ||
        String(admin.email || "")
          .trim()
          .toLowerCase() ===
          PROTECTED_ADMIN_EMAIL)
    );
  }

  function isProtectedAccount(account) {
    return (
      !!account &&
      (String(account.id || "") ===
        PROTECTED_ADMIN_ID ||
        String(account.email || "")
          .trim()
          .toLowerCase() ===
          PROTECTED_ADMIN_EMAIL)
    );
  }

  function bindEvents() {
    $("accountSearch")?.addEventListener(
      "input",
      renderAccounts
    );

    $("accountStatusFilter")?.addEventListener(
      "change",
      renderAccounts
    );

    $("invitationSearch")?.addEventListener(
      "input",
      renderInvitations
    );

    $("invitationStatusFilter")?.addEventListener(
      "change",
      renderInvitations
    );

    $("refreshAccountsButton")?.addEventListener(
      "click",
      loadAccountPage
    );

    $("closeAccountDetailButton")?.addEventListener(
      "click",
      closeAccountDetail
    );

    $("resendInvitationButton")?.addEventListener(
      "click",
      () => {
        if (!selectedAccount) return;

        const invitation =
          findInvitationForAccount(
            selectedAccount
          );

        if (!invitation) {
          showToast(
            "No invitation exists for this account.",
            "error"
          );
          return;
        }

        resendInvitation(invitation.id);
      }
    );

    $("activateAccountButton")?.addEventListener(
      "click",
      () => updateSelectedAccountStatus(true)
    );

    $("deactivateAccountButton")?.addEventListener(
      "click",
      () => updateSelectedAccountStatus(false)
    );
  }

  function getAccountName(account) {
    if (!account) return "";

    const first = String(
      account.first_name || ""
    ).trim();

    const last = String(
      account.last_name || ""
    ).trim();

    return (
      `${first} ${last}`.trim() ||
      account.email ||
      ""
    );
  }

  function setText(id, value) {
    const element = $(id);

    if (!element) return;

    element.textContent =
      value === null ||
      value === undefined ||
      value === ""
        ? "—"
        : String(value);
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );
  }

  function getInitials(value) {
    const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return "—";

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

  function capitalizeWords(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );
  }

  function renderStatusBadge(status) {
    const safeStatus = String(
      status || "unknown"
    )
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    return `
      <span class="status-badge status-${escapeAttribute(
        safeStatus
      )}">
        ${escapeHtml(
          capitalizeWords(safeStatus)
        )}
      </span>
    `;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function showToast(
    message,
    type = "success"
  ) {
    const toast = $("accountToast");

    if (!toast) {
      console.log(message);
      return;
    }

    toast.textContent = message;
    toast.className =
      "admin-toast show " +
      (type === "error"
        ? "error"
        : "success");

    clearTimeout(showToast.timeout);

    showToast.timeout = setTimeout(
      () => toast.classList.remove("show"),
      4000
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();