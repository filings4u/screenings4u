(function () {
  "use strict";

  let client;
  let user;
  let profile;
  let orders = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      client = window.getScreenings4uSupabase
        ? window.getScreenings4uSupabase()
        : window.screenings4uSupabase;

      if (!client) {
        throw new Error("Supabase client is not configured.");
      }

      const { data, error } =
        await client.auth.getSession();

      if (error) throw error;

      if (!data.session) {
        window.location.href = "client-login.html";
        return;
      }

      user = data.session.user;

      await loadProfile();
      await loadOrders();

      renderIdentity();
      renderOrders();

      document
        .getElementById("orderSearch")
        ?.addEventListener("input", renderOrders);

    } catch (error) {
      console.error("Client orders error:", error);
      renderMessage("Unable to load your orders.");
    }
  }

  async function loadProfile() {
    const { data, error } =
      await client
        .from("client_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error) throw error;

    profile = data || {};
  }

  async function loadOrders() {
    const { data, error } =
      await client
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false
        });

    if (error) throw error;

    orders = data || [];
  }

  function renderIdentity() {
    const el =
      document.getElementById("clientIdentity");

    if (!el) return;

    const name = getName();

    el.innerHTML = `
      <div class="client-identity-avatar">
        ${escapeHtml(initials(name))}
      </div>

      <div class="client-identity-text">
        <strong>
          ${escapeHtml(name)}
        </strong>

        <span>
          ${escapeHtml(user.email || "")}
        </span>
      </div>
    `;
  }

  function renderOrders() {
    const container =
      document.getElementById("ordersTable");

    if (!container) return;

    const search = String(
      document.getElementById("orderSearch")?.value || ""
    )
      .trim()
      .toLowerCase();

    const filtered = orders.filter(function (order) {
      const number = String(
        order.order_number ||
        order.order_no ||
        order.id ||
        ""
      ).toLowerCase();

      return !search || number.includes(search);
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div class="client-empty-state">
          <strong>No orders found.</strong>
          <p>
            Your orders will appear here after a purchase.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="client-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          ${filtered.map(orderRow).join("")}
        </tbody>
      </table>
    `;
  }

  function orderRow(order) {
    const number =
      order.order_number ||
      order.order_no ||
      order.id ||
      "Order";

    const total =
      Number(
        order.total ??
        order.total_amount ??
        order.amount ??
        0
      );

    return `
      <tr>
        <td>
          <strong>
            ${escapeHtml(number)}
          </strong>
        </td>

        <td>
          ${formatDate(order.created_at)}
        </td>

        <td>
          ${currency(total)}
        </td>

        <td>
          ${badge(
            order.payment_status || "pending"
          )}
        </td>

        <td>
          ${badge(
            order.status ||
            order.order_status ||
            "pending"
          )}
        </td>

        <td>
          <a
            class="client-table-link"
            href="client-order-detail.html?id=${encodeURIComponent(order.id)}"
          >
            View
          </a>
        </td>
      </tr>
    `;
  }

  function badge(value) {
    const text =
      String(value || "Pending");

    const cls =
      text
        .toLowerCase()
        .replace(/\s+/g, "-");

    return `
      <span class="client-status-badge status-${escapeHtml(cls)}">
        ${escapeHtml(capitalize(text))}
      </span>
    `;
  }

  function getName() {
    const firstName =
      String(profile?.first_name || "").trim();

    const lastName =
      String(profile?.last_name || "").trim();

    const fullName =
      [firstName, lastName]
        .filter(Boolean)
        .join(" ");

    if (fullName) {
      return fullName;
    }

    return (
      user?.email?.split("@")[0] ||
      "Client"
    );
  }

  function initials(value) {
    const parts =
      String(value || "Client")
        .trim()
        .split(/\s+/);

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();
  }

  function formatDate(value) {
    const date =
      new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric"
          }
        );
  }

  function currency(value) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(Number(value) || 0);
  }

  function capitalize(value) {
    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderMessage(message) {
    const el =
      document.getElementById("ordersTable");

    if (el) {
      el.innerHTML = `
        <div class="client-empty-state">
          <strong>
            ${escapeHtml(message)}
          </strong>
        </div>
      `;
    }
  }

})();