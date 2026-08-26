/*
 * screenings4u — Admin Customer Center
 *
 * Customer directory is intentionally built from BOTH client_profiles and orders.
 * Orders are the source of truth for guest/website purchasers; client_profiles is
 * the source of truth for authenticated customer accounts.
 */
(function () {
  "use strict";

  let db = null;
  let customers = [];
  let selectedCustomer = null;
  let loading = false;
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", init, { once: true });

  async function init() {
    try {
      db = window.Screenings4uAdmin?.supabase || window.screenings4uSupabase;
      if (!db) throw new Error("Supabase client could not be initialized.");
      bindEvents();
      await loadCustomers();
    } catch (error) {
      console.error("Customer Center initialization failed:", error);
      setTableMessage("Unable to load customer accounts.");
      toast(error?.message || "Unable to load customer accounts.", "error");
    }
  }

  function bindEvents() {
    $("refreshCustomersButton")?.addEventListener("click", loadCustomers);
    $("customerSearch")?.addEventListener("input", renderCustomers);
    $("customerStatusFilter")?.addEventListener("change", renderCustomers);
    $("clearCustomerFiltersButton")?.addEventListener("click", () => {
      if ($("customerSearch")) $("customerSearch").value = "";
      if ($("customerStatusFilter")) $("customerStatusFilter").value = "all";
      renderCustomers();
    });
    $("backToCustomers")?.addEventListener("click", showDirectory);
  }

  async function loadCustomers() {
    if (loading) return;
    loading = true;
    setTableMessage("Loading customer accounts...");
    setRefresh(true);

    try {
      const [profilesResult, ordersResult] = await Promise.all([
        db.from("client_profiles").select(`
          id, first_name, last_name, email, phone, company_name,
          address_line_1, address_line_2, city, state, postal_code,
          is_active, created_at, updated_at
        `).order("created_at", { ascending: false }),
        db.from("orders").select(`
          id, user_id, customer_email, customer_first_name,
          customer_last_name, customer_phone, total, payment_status,
          status, created_at, updated_at, order_number, tracking_number
        `).order("created_at", { ascending: false })
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (ordersResult.error) throw ordersResult.error;

      customers = mergeCustomers(profilesResult.data || [], ordersResult.data || []);
      renderCustomers();
      updateMetrics();
    } catch (error) {
      console.error("Unable to load customer accounts:", error);
      customers = [];
      setTableMessage("Unable to load customer accounts.");
      updateMetrics();
      toast(error?.message || "Unable to load customer accounts.", "error");
    } finally {
      loading = false;
      setRefresh(false);
    }
  }

  function mergeCustomers(profiles, orders) {
    const map = new Map();

    for (const profile of profiles) {
      const key = profile.id ? `id:${profile.id}` : `email:${norm(profile.email)}`;
      map.set(key, {
        id: profile.id || null,
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        company_name: profile.company_name || "",
        address_line_1: profile.address_line_1 || "",
        address_line_2: profile.address_line_2 || "",
        city: profile.city || "",
        state: profile.state || "",
        postal_code: profile.postal_code || "",
        is_active: profile.is_active !== false,
        created_at: profile.created_at,
        orders: []
      });
    }

    for (const order of orders) {
      const idKey = order.user_id ? `id:${order.user_id}` : null;
      const emailKey = `email:${norm(order.customer_email)}`;
      let customer = idKey ? map.get(idKey) : null;
      if (!customer) customer = map.get(emailKey);

      if (!customer) {
        customer = {
          id: order.user_id || null,
          first_name: order.customer_first_name || "",
          last_name: order.customer_last_name || "",
          email: order.customer_email || "",
          phone: order.customer_phone || "",
          company_name: "",
          address_line_1: "",
          address_line_2: "",
          city: "",
          state: "",
          postal_code: "",
          is_active: true,
          created_at: order.created_at,
          orders: []
        };
        map.set(idKey || emailKey, customer);
      }

      customer.orders.push(order);
      if (!customer.email && order.customer_email) customer.email = order.customer_email;
      if (!customer.first_name && order.customer_first_name) customer.first_name = order.customer_first_name;
      if (!customer.last_name && order.customer_last_name) customer.last_name = order.customer_last_name;
      if (!customer.phone && order.customer_phone) customer.phone = order.customer_phone;
    }

    return Array.from(map.values()).sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }

  function renderCustomers() {
    const table = $("customerTable");
    if (!table) return;

    const search = norm($("customerSearch")?.value);
    const status = $("customerStatusFilter")?.value || "all";

    const filtered = customers.filter((c) => {
      const haystack = norm([
        c.first_name, c.last_name, c.email, c.phone, c.company_name
      ].join(" "));
      const statusMatch = status === "all" ||
        (status === "active" && c.is_active) ||
        (status === "inactive" && !c.is_active);
      return (!search || haystack.includes(search)) && statusMatch;
    });

    $("customerResultCount") && ($("customerResultCount").textContent = String(filtered.length));

    if (!filtered.length) {
      table.innerHTML = `<div class="customer-empty">No customer accounts match the current filters.</div>`;
      return;
    }

    table.innerHTML = `
      <table class="admin-data-table">
        <thead><tr>
          <th>Customer</th><th>Email</th><th>Company</th><th>Orders</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>${filtered.map(renderCustomerRow).join("")}</tbody>
      </table>`;

    table.querySelectorAll("[data-customer-index]").forEach((button) => {
      button.addEventListener("click", () => showDetail(filtered[Number(button.dataset.customerIndex)]));
    });
  }

  function renderCustomerRow(customer, index) {
    const name = fullName(customer) || "Customer";
    return `<tr>
      <td><strong>${esc(name)}</strong><small>${esc(customer.phone || "—")}</small></td>
      <td>${esc(customer.email || "—")}</td>
      <td>${esc(customer.company_name || "—")}</td>
      <td>${customer.orders.length}</td>
      <td><span class="customer-status ${customer.is_active ? "active" : "inactive"}">${customer.is_active ? "Active" : "Inactive"}</span></td>
      <td><button type="button" class="customers-btn customers-btn-muted" data-customer-index="${index}">View</button></td>
    </tr>`;
  }

  async function showDetail(customer) {
    selectedCustomer = customer;
    $("customerListView")?.classList.remove("active");
    $("customerDetailView")?.classList.add("active");

    const name = fullName(customer) || "Customer";
    setText("customerInitials", initials(name));
    setText("detailCustomerName", name);
    setText("detailCustomerEmail", customer.email || "—");
    setText("detailPhone", customer.phone || "—");
    setText("detailCompany", customer.company_name || "—");
    setText("detailAddress", formatAddress(customer));
    setText("detailCreated", formatDate(customer.created_at));
    setText("detailStatus", customer.is_active ? "Active" : "Inactive");
    setText("detailOrderCount", customer.orders.length);
    setText("detailTotalSpent", currency(customer.orders.reduce((sum, o) => sum + Number(o.total || 0), 0)));

    const ordersTable = $("customerOrdersTable");
    if (ordersTable) {
      ordersTable.innerHTML = customer.orders.length
        ? `<table class="admin-data-table"><thead><tr><th>Order</th><th>Tracking</th><th>Status</th><th>Payment</th><th>Total</th><th>Date</th></tr></thead><tbody>${customer.orders.map(o => `<tr><td>${esc(o.order_number || "—")}</td><td>${esc(o.tracking_number || "—")}</td><td>${esc(o.status || "—")}</td><td>${esc(o.payment_status || "—")}</td><td>${currency(o.total)}</td><td>${formatDate(o.created_at)}</td></tr>`).join("")}</tbody></table>`
        : `<div class="customer-empty">No orders found.</div>`;
    }

    const training = $("customerTrainingTable");
    if (training) training.innerHTML = `<div class="customer-loading">Loading training...</div>`;

    if (!customer.id) {
      setText("detailTrainingCount", 0);
      setText("detailCompletedCount", 0);
      if (training) training.innerHTML = `<div class="customer-empty">This customer has no linked account yet.</div>`;
      return;
    }

    try {
      const { data: enrollments, error } = await db
        .from("lms_enrollments")
        .select("id, course_id, status, progress_percent, enrolled_at, completed_at")
        .eq("user_id", customer.id)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;

      const rows = enrollments || [];
      setText("detailTrainingCount", rows.length);
      setText("detailCompletedCount", rows.filter(e => e.status === "completed" || e.completed_at).length);
      if (training) training.innerHTML = rows.length
        ? `<table class="admin-data-table"><thead><tr><th>Course</th><th>Status</th><th>Progress</th><th>Enrolled</th></tr></thead><tbody>${rows.map(e => `<tr><td>${esc(e.course_id)}</td><td>${esc(e.status || "—")}</td><td>${Number(e.progress_percent || 0)}%</td><td>${formatDate(e.enrolled_at)}</td></tr>`).join("")}</tbody></table>`
        : `<div class="customer-empty">No training enrollments found.</div>`;
    } catch (error) {
      console.warn("Unable to load customer training:", error);
      setText("detailTrainingCount", 0);
      setText("detailCompletedCount", 0);
      if (training) training.innerHTML = `<div class="customer-empty">Training data could not be loaded.</div>`;
    }
  }

  function showDirectory() {
    $("customerDetailView")?.classList.remove("active");
    $("customerListView")?.classList.add("active");
  }

  function updateMetrics() {
    setText("customerMetricTotal", customers.length);
    setText("customerMetricActive", customers.filter(c => c.is_active).length);
    setText("customerMetricInactive", customers.filter(c => !c.is_active).length);
    setText("customerMetricCompanies", new Set(customers.map(c => norm(c.company_name)).filter(Boolean)).size);
  }

  function setTableMessage(message) {
    const table = $("customerTable");
    if (table) table.innerHTML = `<div class="customer-loading">${esc(message)}</div>`;
  }

  function setRefresh(loadingState) {
    const button = $("refreshCustomersButton");
    if (!button) return;
    button.disabled = loadingState;
    button.innerHTML = loadingState ? "↻ Refreshing..." : "↻ Refresh Customers";
  }

  function toast(message, type = "") {
    const element = $("customerToast");
    if (!element) return;
    element.textContent = message;
    element.className = `admin-toast ${type} show`;
    setTimeout(() => element.classList.remove("show"), 3500);
  }

  function fullName(c) { return `${c.first_name || ""} ${c.last_name || ""}`.trim(); }
  function initials(name) { return name.split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "—"; }
  function formatAddress(c) { return [c.address_line_1, c.address_line_2, [c.city, c.state].filter(Boolean).join(", "), c.postal_code].filter(Boolean).join(", ") || "—"; }
  function currency(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0)); }
  function formatDate(value) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  function norm(value) { return String(value || "").trim().toLowerCase(); }
  function setText(id, value) { const e = $(id); if (e) e.textContent = value == null || value === "" ? "—" : String(value); }
  function esc(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
})();
