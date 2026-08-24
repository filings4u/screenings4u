(function () {
  "use strict";

  let client;
  let user;
  let order;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      client = window.getScreenings4uSupabase
        ? window.getScreenings4uSupabase()
        : window.screenings4uSupabase;

      if (!client) {
        throw new Error("Supabase client could not be initialized.");
      }

      const { data, error } = await client.auth.getSession();

      if (error) throw error;

      if (!data.session) {
        window.location.href = "client-login.html";
        return;
      }

      user = data.session.user;

      const id =
        new URLSearchParams(window.location.search).get("id");

      if (!id) {
        throw new Error("No order was specified.");
      }

      await loadOrder(id);
      render();

    } catch (error) {
      console.error(error);
      showError(
        error.message || "Unable to load this order."
      );
    }
  }

  async function loadOrder(id) {
    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error("Order not found.");
    }

    order = data;
  }

  function render() {
    const number =
      order.order_number ||
      order.order_no ||
      order.id;

    document.getElementById("orderTitle").textContent =
      `Order ${number}`;

    document.getElementById("orderDate").textContent =
      `Placed ${formatDate(order.created_at)}`;

    const total =
      Number(
        order.total ??
        order.total_amount ??
        order.amount ??
        0
      );

    document.getElementById("orderSummary").innerHTML = `
      <div class="order-summary-grid">
        <div>
          <span>Order Number</span>
          <strong>${escapeHtml(number)}</strong>
        </div>

        <div>
          <span>Order Status</span>
          <strong>${badge(order.status || "pending")}</strong>
        </div>

        <div>
          <span>Payment Status</span>
          <strong>${badge(order.payment_status || "pending")}</strong>
        </div>

        <div>
          <span>Total</span>
          <strong>${currency(total)}</strong>
        </div>
      </div>`;

    const items = order.order_items || [];

    document.getElementById("orderItems").innerHTML =
      items.length
        ? `
          <table class="client-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              ${items.map(item => {
                const quantity =
                  Number(item.quantity || 1);

                const price =
                  Number(
                    item.unit_price ??
                    item.price ??
                    item.amount ??
                    0
                  );

                const lineTotal =
                  Number(
                    item.total ??
                    item.line_total ??
                    price * quantity
                  );

                return `
                  <tr>
                    <td>
                      <strong>
                        ${escapeHtml(
                          item.product_name ||
                          item.name ||
                          item.description ||
                          "Purchased Item"
                        )}
                      </strong>
                    </td>

                    <td>${quantity}</td>
                    <td>${currency(price)}</td>
                    <td>${currency(lineTotal)}</td>
                  </tr>`;
              }).join("")}
            </tbody>
          </table>`
        : `
          <div class="client-empty-state">
            No order items were found.
          </div>`;
  }

  function badge(value) {
    const text = String(value || "Pending");

    const cls = text
      .toLowerCase()
      .replace(/\s+/g, "-");

    return `
      <span class="client-status-badge status-${escapeHtml(cls)}">
        ${escapeHtml(capitalize(text))}
      </span>`;
  }

  function currency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(value) || 0);
  }

  function formatDate(value) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric"
        });
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showError(message) {
    const summary =
      document.getElementById("orderSummary");

    if (!summary) return;

    summary.innerHTML = `
      <div class="client-empty-state">
        <strong>${escapeHtml(message)}</strong>
        <p>
          <a href="client-orders.html">
            Return to My Orders
          </a>
        </p>
      </div>`;
  }

})();