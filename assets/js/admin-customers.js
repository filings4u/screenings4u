/*
 * screenings4u — Admin Audit Center Controller
 * assets/js/admin-audit.js
 *
 * The audit page reads the existing audit_log records and actor profiles.
 * It intentionally does not provide controls for modifying audit records.
 */
(function () {
  "use strict";

  let auditClient = null;
  let allAuditEvents = [];
  let auditProfiles = {};
  let auditLoading = false;

  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", initializeAuditPage, { once: true });

  async function initializeAuditPage() {
    try {
      auditClient = getAuditSupabaseClient();

      if (!auditClient) {
        throw new Error(
          "Supabase configuration could not be loaded. Check that admin-config.js loads before admin-audit.js."
        );
      }

      initializeAuditControls();
      await loadAuditEvents();
    } catch (error) {
      console.error("Audit Center initialization failed:", error);

      setAuditMessage(
        error instanceof Error
          ? error.message
          : "Unable to initialize the audit center."
      );

      showAuditToast("Unable to initialize audit log.", "error");
    }
  }

  function getAuditSupabaseClient() {
    /*
     * admin-config.js is the shared source of truth for the admin Supabase
     * client. Do not create a second client when the shared client exists.
     */
    if (
      window.Screenings4uAdmin &&
      window.Screenings4uAdmin.supabase &&
      typeof window.Screenings4uAdmin.supabase.from === "function"
    ) {
      return window.Screenings4uAdmin.supabase;
    }

    /* Backward-compatible fallbacks for older admin pages. */
    if (
      window.screenings4uSupabase &&
      typeof window.screenings4uSupabase.from === "function"
    ) {
      return window.screenings4uSupabase;
    }

    if (
      window.supabaseClient &&
      typeof window.supabaseClient.from === "function"
    ) {
      return window.supabaseClient;
    }

    if (
      window.supabase &&
      window.SCREENINGS4U_SUPABASE_URL &&
      window.SCREENINGS4U_SUPABASE_ANON_KEY &&
      typeof window.supabase.createClient === "function"
    ) {
      window.screenings4uSupabase = window.supabase.createClient(
        window.SCREENINGS4U_SUPABASE_URL,
        window.SCREENINGS4U_SUPABASE_ANON_KEY
      );

      return window.screenings4uSupabase;
    }

    return null;
  }

  function initializeAuditControls() {
    $("auditSearch")?.addEventListener("input", renderAuditEvents);
    $("auditActionFilter")?.addEventListener("change", renderAuditEvents);

    $("clearAuditFiltersButton")?.addEventListener("click", () => {
      if ($("auditSearch")) $("auditSearch").value = "";
      if ($("auditActionFilter")) $("auditActionFilter").value = "all";
      renderAuditEvents();
    });

    $("refreshAuditButton")?.addEventListener("click", loadAuditEvents);
  }

  async function loadAuditEvents() {
    if (auditLoading) return;

    auditLoading = true;
    setRefreshState(true);
    setAuditLoadingMessage();

    try {
      const { data, error } = await auditClient
        .from("audit_log")
        .select(`
          id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          details,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      allAuditEvents = Array.isArray(data) ? data : [];

      await loadAuditProfiles();

      updateAuditMetrics();
      renderAuditEvents();
    } catch (error) {
      console.error("Unable to load audit log:", error);

      allAuditEvents = [];
      auditProfiles = {};

      setAuditMessage(
        "Unable to load the audit log. Check the browser console for the Supabase error."
      );

      updateAuditMetrics();
      setText("auditResultCount", "0");
      showAuditToast("Unable to load audit log.", "error");
    } finally {
      auditLoading = false;
      setRefreshState(false);
    }
  }

  async function loadAuditProfiles() {
    auditProfiles = {};

    const actorIds = [
      ...new Set(
        allAuditEvents
          .map((event) => event.actor_user_id)
          .filter(Boolean)
          .map(String)
      )
    ];

    if (!actorIds.length) return;

    try {
      const { data, error } = await auditClient
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          is_active
        `)
        .in("id", actorIds);

      if (error) throw error;

      (data || []).forEach((profile) => {
        auditProfiles[String(profile.id)] = profile;
      });
    } catch (error) {
      /*
       * The audit event itself remains useful even if an actor profile
       * cannot be resolved. Render those events as system activity instead
       * of failing the entire page.
       */
      console.warn("Unable to load audit actor profiles:", error);
    }
  }

  function updateAuditMetrics() {
    const todayKey = getLocalDateKey(new Date());

    const todayCount = allAuditEvents.filter((event) => {
      const date = getEventDate(event);
      return date && getLocalDateKey(new Date(date)) === todayKey;
    }).length;

    const loginCount = allAuditEvents.filter(
      (event) => getAction(event) === "login"
    ).length;

    const changeCount = allAuditEvents.filter((event) =>
      ["create", "update", "delete"].includes(getAction(event))
    ).length;

    setText("auditTotal", allAuditEvents.length);
    setText("auditToday", todayCount);
    setText("auditLogins", loginCount);
    setText("auditChanges", changeCount);
  }

  function renderAuditEvents() {
    const table = $("auditTable");
    if (!table) return;

    const search = String($("auditSearch")?.value || "")
      .trim()
      .toLowerCase();

    const filter = String(
      $("auditActionFilter")?.value || "all"
    );

    const filtered = allAuditEvents.filter((event) => {
      const action = getAction(event);
      const user = getEventUser(event);
      const detailsText = event.details
        ? safeStringify(event.details)
        : "";

      const searchable = [
        action,
        event.action,
        event.entity_type,
        event.entity_id,
        event.actor_user_id,
        user.name,
        user.email,
        detailsText
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search || searchable.includes(search);

      const matchesFilter =
        filter === "all" || action === filter;

      return matchesSearch && matchesFilter;
    });

    setText("auditResultCount", filtered.length);

    if (!filtered.length) {
      table.innerHTML = `
        <div class="audit-empty">
          No audit events match the current filters.
        </div>
      `;
      return;
    }

    table.innerHTML = `
      <table class="admin-data-table">
        <thead>
          <tr>
            <th>Date &amp; Time</th>
            <th>Action</th>
            <th>User</th>
            <th>Event</th>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(renderAuditRow).join("")}
        </tbody>
      </table>
    `;
  }

  function renderAuditRow(event) {
    const action = getAction(event);
    const user = getEventUser(event);
    const eventName = getEventDescription(event);
    const record = event.entity_id || event.entity_type || "—";

    return `
      <tr>
        <td>
          <span class="audit-time">
            ${escapeHtml(formatDateTime(getEventDate(event)))}
          </span>
        </td>

        <td>
          <span class="audit-action ${escapeHtml(action)}">
            ${escapeHtml(formatAction(action))}
          </span>
        </td>

        <td>
          <div class="audit-event">
            <strong>${escapeHtml(user.name)}</strong>
            <small>${escapeHtml(user.email)}</small>
          </div>
        </td>

        <td>
          <div class="audit-event">
            <strong>${escapeHtml(eventName)}</strong>
            <small>${escapeHtml(getTableName(event))}</small>
          </div>
        </td>

        <td>
          <span class="audit-record">
            ${escapeHtml(String(record))}
          </span>
        </td>
      </tr>
    `;
  }

  function getAction(event) {
    const raw = event?.action || "activity";
    const value = String(raw).toLowerCase().trim();

    if (value.includes("login") || value.includes("sign in")) {
      return "login";
    }

    if (value.includes("logout") || value.includes("sign out")) {
      return "logout";
    }

    if (value.includes("create") || value.includes("insert")) {
      return "create";
    }

    if (value.includes("update") || value.includes("edit")) {
      return "update";
    }

    if (value.includes("delete") || value.includes("remove")) {
      return "delete";
    }

    if (value.includes("complete")) {
      return "complete";
    }

    return (
      value
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 40) || "activity"
    );
  }

  function getEventUser(event) {
    const actorId = event?.actor_user_id
      ? String(event.actor_user_id)
      : "";

    const profile = actorId
      ? auditProfiles[actorId]
      : null;

    if (!profile) {
      return {
        name: "System",
        email: "System activity"
      };
    }

    const firstName = String(profile.first_name || "").trim();
    const lastName = String(profile.last_name || "").trim();

    const name =
      `${firstName} ${lastName}`.trim() ||
      profile.email ||
      "Administrator";

    return {
      name: String(name),
      email: String(profile.email || "—")
    };
  }

  function getEventDate(event) {
    return event?.created_at || null;
  }

  function getEventDescription(event) {
    const action = getAction(event);
    const entityType = event?.entity_type || "system";

    const details =
      event?.details &&
      typeof event.details === "object"
        ? event.details
        : {};

    const descriptionKeys = [
      "description",
      "message",
      "name",
      "title",
      "reason"
    ];

    for (const key of descriptionKeys) {
      if (
        details[key] !== undefined &&
        details[key] !== null &&
        String(details[key]).trim()
      ) {
        return String(details[key]);
      }
    }

    return `${formatAction(action)} ${formatEntityName(entityType)}`;
  }

  function getTableName(event) {
    return formatEntityName(event?.entity_type || "System");
  }

  function formatEntityName(value) {
    return String(value || "record")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatAction(action) {
    return String(action || "activity")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function setRefreshState(isLoading) {
    const button = $("refreshAuditButton");
    if (!button) return;

    button.disabled = isLoading;
    button.innerHTML = isLoading
      ? '<span class="audit-refresh-icon audit-refresh-spinning" aria-hidden="true">↻</span> Refreshing...'
      : '<span class="audit-refresh-icon" aria-hidden="true">↻</span> Refresh Log';
  }

  function setAuditLoadingMessage() {
    const table = $("auditTable");
    if (!table) return;

    table.innerHTML = `
      <div class="audit-loading">
        <span class="audit-spinner" aria-hidden="true"></span>
        Loading audit activity...
      </div>
    `;
  }

  function setAuditMessage(message) {
    const table = $("auditTable");
    if (!table) return;

    table.innerHTML = `
      <div class="audit-empty">
        ${escapeHtml(message)}
      </div>
    `;
  }

  function setText(id, value) {
    const element = $(id);
    if (!element) return;

    element.textContent =
      value == null || value === ""
        ? "—"
        : String(value);
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function showAuditToast(message, type) {
    const toast = $("auditToast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = "admin-toast " + (type || "");
    toast.classList.add("show");

    clearTimeout(showAuditToast.timeout);

    showAuditToast.timeout = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 3500);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();