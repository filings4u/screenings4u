/*
 * =========================================================
 * screenings4u — Admin Orders Controller
 * =========================================================
 *
 * Location:
 * assets/js/admin-orders.js
 *
 * Uses the existing admin Supabase configuration.
 *
 * The page expects:
 *   - orders
 *   - order_items
 *   - products
 *   - client_profiles
 *
 * The controller safely adapts to available columns and
 * reports database errors instead of silently failing.
 *
 * =========================================================
 */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        initializeOrdersPage();
    }
);


let ordersClient = null;
let allOrders = [];
let selectedOrder = null;


/*
 * =========================================================
 * INITIALIZE
 * =========================================================
 */

async function initializeOrdersPage() {

    ordersClient =
        getOrdersSupabaseClient();


    if (!ordersClient) {

        showOrderError(
            "Supabase configuration could not be loaded."
        );

        return;
    }


    initializeOrderControls();

    await loadOrders();
}


/*
 * =========================================================
 * SUPABASE CLIENT
 * =========================================================
 */

function getOrdersSupabaseClient() {

    if (
        window.screenings4uSupabase &&
        window.screenings4uSupabase.from
    ) {

        return window.screenings4uSupabase;
    }


    if (
        window.supabase &&
        window.SCREENINGS4U_SUPABASE_URL &&
        window.SCREENINGS4U_SUPABASE_ANON_KEY
    ) {

        window.screenings4uSupabase =
            window.supabase.createClient(
                window.SCREENINGS4U_SUPABASE_URL,
                window.SCREENINGS4U_SUPABASE_ANON_KEY
            );


        return window.screenings4uSupabase;
    }


    return null;
}


/*
 * =========================================================
 * CONTROLS
 * =========================================================
 */

function initializeOrderControls() {

    const search =
        document.getElementById(
            "orderSearch"
        );


    const filter =
        document.getElementById(
            "orderStatusFilter"
        );


    const backButton =
        document.getElementById(
            "backToOrders"
        );


    const saveButton =
        document.getElementById(
            "saveOrderStatus"
        );


    if (search) {

        search.addEventListener(
            "input",
            renderOrders
        );
    }


    if (filter) {

        filter.addEventListener(
            "change",
            renderOrders
        );
    }


    if (backButton) {

        backButton.addEventListener(
            "click",
            showOrderList
        );
    }


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveSelectedOrderStatus
        );
    }

    const refreshButton =
        document.getElementById(
            "refreshOrders"
        );

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async function () {

                refreshButton.disabled = true;
                refreshButton.textContent = "Refreshing...";

                try {
                    await loadOrders();
                } finally {
                    refreshButton.disabled = false;
                    refreshButton.textContent = "↻ Refresh Orders";
                }
            }
        );
    }
}


/*
 * =========================================================
 * LOAD ORDERS
 * =========================================================
 */

async function loadOrders() {

    setOrderTableMessage(
        "Loading orders..."
    );


    try {

        const result =
            await ordersClient
                .from("orders")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (result.error) {
            throw result.error;
        }


        allOrders =
            Array.isArray(result.data)
                ? result.data
                : [];


        await attachCustomerProfiles();

        renderOrders();


    } catch (error) {

        console.error(
            "Unable to load orders:",
            error
        );


        setOrderTableMessage(
            "Unable to load orders. Check the browser console for the Supabase error."
        );


        showOrderToast(
            "Unable to load orders.",
            "error"
        );
    }
}


/*
 * =========================================================
 * CUSTOMER PROFILE DATA
 * =========================================================
 */

async function attachCustomerProfiles() {

    if (!allOrders.length) {
        return;
    }

    /*
     * Customers now live in client_profiles.
     *
     * orders.user_id -> auth.users.id
     * client_profiles.id -> auth.users.id
     *
     * The orders table already stores customer_email,
     * customer_first_name, customer_last_name and customer_phone.
     * Those order fields remain available as fallbacks.
     */

    const userIds = [
        ...new Set(
            allOrders
                .map(function (order) {
                    return order.user_id || null;
                })
                .filter(Boolean)
        )
    ];

    if (!userIds.length) {
        allOrders = allOrders.map(function (order) {
            return {
                ...order,
                _customer: null
            };
        });

        return;
    }

    try {

        const result =
            await ordersClient
                .from("client_profiles")
                .select("*")
                .in(
                    "id",
                    userIds
                );

        if (result.error) {

            console.warn(
                "Client profile lookup failed:",
                result.error
            );

            allOrders = allOrders.map(function (order) {
                return {
                    ...order,
                    _customer: null
                };
            });

            return;
        }

        const clientProfiles =
            new Map(
                (result.data || [])
                    .map(function (profile) {
                        return [
                            profile.id,
                            profile
                        ];
                    })
            );

        allOrders =
            allOrders.map(function (order) {

                const userId =
                    order.user_id || null;

                return {
                    ...order,

                    _customer:
                        userId
                            ? clientProfiles.get(userId) || null
                            : null
                };
            });

    } catch (error) {

        console.warn(
            "Client profile enrichment failed:",
            error
        );

        allOrders = allOrders.map(function (order) {
            return {
                ...order,
                _customer: null
            };
        });
    }
}


/*
 * =========================================================
 * RENDER ORDER LIST
 * =========================================================
 */

function renderOrders() {

    const table =
        document.getElementById(
            "ordersTable"
        );


    if (!table) {
        return;
    }


    const searchInput =
        document.getElementById(
            "orderSearch"
        );


    const filterInput =
        document.getElementById(
            "orderStatusFilter"
        );


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const filter =
        filterInput
            ? filterInput.value
            : "all";


    const filtered =
        allOrders.filter(
            function (order) {

                const customer =
                    order._customer || {};


                const customerName =
                    getCustomerName(
                        customer,
                        order
                    );


                const email =
                    customer.email ||
                    order.customer_email ||
                    order.email_address ||
                    order.email ||
                    "";


                const orderNumber =
                    getOrderNumber(
                        order
                    );


                const status =
                    getOrderStatus(
                        order
                    );


                const searchable = [
                    orderNumber,
                    order.tracking_number,
                    customerName,
                    email,
                    order.customer_phone,
                    order.payment_status,
                    order.payment_provider,
                    order.payment_reference,
                    order.stripe_payment_intent_id,
                    order.fulfillment_status,
                    order.fulfillment_type,
                    status
                ]
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchable.includes(
                        search
                    );


                const matchesFilter =
                    filter === "all" ||
                    status.toLowerCase() ===
                        filter.toLowerCase();


                return (
                    matchesSearch &&
                    matchesFilter
                );
            }
        );


    if (!filtered.length) {

        table.innerHTML = `
            <div class="empty-state">
                No orders found.
            </div>
        `;

        return;
    }


    table.innerHTML = `
        <table class="admin-data-table">

            <thead>
                <tr>
                    <th>Order</th>
                    <th>Tracking</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Fulfillment</th>
                    <th>Total</th>
                    <th></th>
                </tr>
            </thead>

            <tbody>
                ${filtered
                    .map(renderOrderRow)
                    .join("")}
            </tbody>

        </table>
    `;


    table
        .querySelectorAll(
            "[data-order-id]"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const id =
                            button.getAttribute(
                                "data-order-id"
                            );


                        openOrderDetail(id);
                    }
                );
            }
        );
}


/*
 * =========================================================
 * ORDER ROW
 * =========================================================
 */

function renderOrderRow(order) {

    const customer =
        order._customer || {};


    const name =
        getCustomerName(customer, order);


    const email =
        customer.email ||
        order.customer_email ||
        order.email_address ||
        order.email ||
        "—";


    const orderNumber =
        getOrderNumber(order);


    const date =
        formatDate(
            order.created_at ||
            order.order_date
        );


    const status =
        getOrderStatus(order);


    const payment =
        order.payment_status ||
        order.paymentState ||
        order.payment_status_text ||
        "—";


    const total =
        formatMoney(
            order.total ??
            order.total_amount ??
            order.amount ??
            0
        );


    return `
        <tr>

            <td>
                <strong>
                    ${escapeHtml(orderNumber)}
                </strong>
            </td>

            <td>
                <strong>${escapeHtml(order.tracking_number || "—")}</strong>
            </td>

            <td>
                <div>
                    <strong>
                        ${escapeHtml(name)}
                    </strong>

                    <small>
                        ${escapeHtml(email)}
                    </small>
                </div>
            </td>

            <td>
                ${escapeHtml(date)}
            </td>

            <td>
                <span class="status-badge">
                    ${escapeHtml(status)}
                </span>
            </td>

            <td>
                ${escapeHtml(String(payment))}
            </td>

            <td>
                ${escapeHtml(order.fulfillment_status || order.fulfillment_type || "—")}
            </td>

            <td>
                <strong>
                    ${escapeHtml(total)}
                </strong>
            </td>

            <td>
                <button
                    type="button"
                    class="secondary-button"
                    data-order-id="${escapeHtml(order.id)}"
                >
                    View
                </button>
            </td>

        </tr>
    `;
}


/*
 * =========================================================
 * ORDER DETAIL
 * =========================================================
 */

async function openOrderDetail(orderId) {

    const order =
        allOrders.find(
            function (item) {

                return (
                    String(item.id) ===
                    String(orderId)
                );
            }
        );


    if (!order) {
        return;
    }


    selectedOrder = order;


    const list =
        document.getElementById(
            "orderListView"
        );


    const detail =
        document.getElementById(
            "orderDetailView"
        );


    if (list) {
        list.classList.remove("active");
    }


    if (detail) {
        detail.classList.add("active");
    }


    populateOrderDetail(order);

    await loadOrderItems(order);


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/*
 * =========================================================
 * POPULATE DETAIL
 * =========================================================
 */

function populateOrderDetail(order) {

    const customer =
        order._customer || {};


    setText(
        "detailOrderNumber",
        getOrderNumber(order)
    );


    setText(
        "detailOrderDate",
        formatDate(
            order.created_at ||
            order.order_date
        )
    );


    setText(
        "detailCustomerName",
        getCustomerName(customer, order)
    );


    setText(
        "detailCustomerEmail",
        customer.email ||
        order.customer_email ||
        order.email_address ||
        order.email ||
        "—"
    );

    setText("detailCustomerPhone", order.customer_phone || customer.phone || "—");
    setText("detailUserId", order.user_id || "Guest / no account");
    setText("detailTrackingNumber", order.tracking_number || "—");
    setText("detailPaymentProvider", order.payment_provider || "—");
    setText("detailPaymentReference", order.payment_reference || order.stripe_payment_intent_id || "—");
    setText("detailStripeCustomer", order.stripe_customer_id || "—");
    setText("detailCheckoutSession", order.stripe_checkout_session_id || "—");
    setText("detailCurrency", String(order.currency || "usd").toUpperCase());
    setText("detailFulfillmentType", order.fulfillment_type || "—");
    setText("detailFulfillmentStatus", order.fulfillment_status || "—");
    setText("detailPaymentMethod", order.payment_method || "—");
    setText("detailPaidAt", formatDate(order.paid_at));
    setText("detailFulfilledAt", formatDate(order.fulfilled_at));
    setText("detailCancelledAt", formatDate(order.cancelled_at));
    setText("detailRefundedAt", formatDate(order.refunded_at));
    setText("detailSource", order.source || "—");
    setText("detailBillingAddress", [order.billing_address_line_1, order.billing_address_line_2, order.billing_city, order.billing_state, order.billing_postal_code, order.billing_country].filter(Boolean).join(", ") || "—");
    setText("detailCustomerNotes", order.customer_notes || "—");
    setText("detailInternalNotes", order.internal_notes || "—");
    setText("detailPaymentOverrideReason", order.payment_override_reason || "—");


    setText(
        "detailPaymentStatus",
        order.payment_status ||
        "—"
    );


    setText(
        "detailSubtotal",
        formatMoney(
            order.subtotal ??
            order.sub_total ??
            0
        )
    );


    setText(
        "detailTax",
        formatMoney(
            order.tax ??
            order.tax_amount ??
            0
        )
    );


    setText(
        "detailTotal",
        formatMoney(
            order.total ??
            order.total_amount ??
            order.amount ??
            0
        )
    );


    const status =
        getOrderStatus(order);


    setText(
        "detailOrderStatus",
        status
    );


    const statusSelect =
        document.getElementById(
            "orderStatusSelect"
        );


    if (statusSelect) {

        statusSelect.value =
            normalizeStatusValue(
                status
            );
    }
}


/*
 * =========================================================
 * ORDER ITEMS
 * =========================================================
 */

async function loadOrderItems(order) {

    const table =
        document.getElementById(
            "orderItemsTable"
        );


    if (!table) {
        return;
    }


    table.innerHTML = `
        <div class="empty-state">
            Loading order items...
        </div>
    `;


    try {

        const result =
            await ordersClient
                .from("order_items")
                .select("*")
                .eq(
                    "order_id",
                    order.id
                );


        if (result.error) {
            throw result.error;
        }


        const items =
            result.data || [];


        if (!items.length) {

            table.innerHTML = `
                <div class="empty-state">
                    No order items found.
                </div>
            `;

            renderTrainingItems([]);

            return;
        }


        table.innerHTML = `
            <table class="admin-data-table">

                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>

                    ${items
                        .map(
                            function (item) {

                                const product =
                                    item.product_name ||
                                    item.name ||
                                    item.title ||
                                    item.product_id ||
                                    "Product";


                                const quantity =
                                    item.quantity || 1;


                                const unitPrice =
                                    item.unit_price ??
                                    item.price ??
                                    0;


                                const total =
                                    item.total ??
                                    item.line_total ??
                                    Number(unitPrice) *
                                        Number(quantity);


                                return `
                                    <tr>

                                        <td>
                                            <strong>
                                                ${escapeHtml(
                                                    String(product)
                                                )}
                                            </strong>
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                String(quantity)
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                formatMoney(
                                                    unitPrice
                                                )
                                            )}
                                        </td>

                                        <td>
                                            <strong>
                                                ${escapeHtml(
                                                    formatMoney(
                                                        total
                                                    )
                                                )}
                                            </strong>
                                        </td>

                                    </tr>
                                `;
                            }
                        )
                        .join("")}

                </tbody>

            </table>
        `;


        renderTrainingItems(items);


    } catch (error) {

        console.error(
            "Unable to load order items:",
            error
        );


        table.innerHTML = `
            <div class="empty-state">
                Unable to load order items.
            </div>
        `;


        renderTrainingItems([]);
    }
}


/*
 * =========================================================
 * TRAINING ITEMS
 * =========================================================
 */

function renderTrainingItems(items) {

    const container =
        document.getElementById(
            "orderTrainingTable"
        );


    if (!container) {
        return;
    }


    const trainingItems =
        items.filter(
            function (item) {

                const value = [
                    item.product_name,
                    item.name,
                    item.title,
                    item.product_type,
                    item.item_type,
                    item.type
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                return (
                    value.includes("training") ||
                    value.includes("course") ||
                    value.includes("collector")
                );
            }
        );


    if (!trainingItems.length) {

        container.innerHTML = `
            <div class="empty-state">
                No training purchases detected for this order.
            </div>
        `;

        return;
    }


    container.innerHTML = `
        <table class="admin-data-table">

            <thead>
                <tr>
                    <th>Training Product</th>
                    <th>Quantity</th>
                    <th>Access</th>
                </tr>
            </thead>

            <tbody>

                ${trainingItems
                    .map(
                        function (item) {

                            return `
                                <tr>

                                    <td>
                                        <strong>
                                            ${escapeHtml(
                                                String(
                                                    item.product_name ||
                                                    item.name ||
                                                    item.title ||
                                                    "Training Course"
                                                )
                                            )}
                                        </strong>
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            String(
                                                item.quantity || 1
                                            )
                                        )}
                                    </td>

                                    <td>
                                        Training purchase
                                    </td>

                                </tr>
                            `;
                        }
                    )
                    .join("")}

            </tbody>

        </table>
    `;
}


/*
 * =========================================================
 * SAVE STATUS
 * =========================================================
 */

async function saveSelectedOrderStatus() {

    if (!selectedOrder) {
        return;
    }


    const select =
        document.getElementById(
            "orderStatusSelect"
        );


    const button =
        document.getElementById(
            "saveOrderStatus"
        );


    if (!select || !button) {
        return;
    }


    const newStatus =
        select.value;


    button.disabled = true;

    button.textContent =
        "Saving...";


    try {

        const result =
            await ordersClient
                .from("orders")
                .update({
                    status: newStatus
                })
                .eq(
                    "id",
                    selectedOrder.id
                );


        if (result.error) {
            throw result.error;
        }


        selectedOrder.status =
            newStatus;


        const index =
            allOrders.findIndex(
                function (order) {

                    return (
                        order.id ===
                        selectedOrder.id
                    );
                }
            );


        if (index !== -1) {

            allOrders[index].status =
                newStatus;
        }


        setText(
            "detailOrderStatus",
            newStatus
        );


        showOrderToast(
            "Order status updated.",
            "success"
        );


        renderOrders();


    } catch (error) {

        console.error(
            "Unable to update order status:",
            error
        );


        showOrderToast(
            "Unable to update order status.",
            "error"
        );

    } finally {

        button.disabled = false;

        button.textContent =
            "Save Order Status";
    }
}


/*
 * =========================================================
 * SHOW LIST
 * =========================================================
 */

function showOrderList() {

    selectedOrder = null;


    const list =
        document.getElementById(
            "orderListView"
        );


    const detail =
        document.getElementById(
            "orderDetailView"
        );


    if (detail) {

        detail.classList.remove(
            "active"
        );
    }


    if (list) {

        list.classList.add(
            "active"
        );
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function getOrderNumber(order) {

    return (
        order.order_number ||
        order.orderNumber ||
        order.order_no ||
        order.number ||
        order.id ||
        "Order"
    );
}


function getOrderStatus(order) {

    return (
        order.status ||
        order.order_status ||
        "pending"
    );
}


function normalizeStatusValue(status) {

    const value =
        String(status || "")
            .toLowerCase()
            .trim();


    if (
        [
            "pending",
            "processing",
            "completed",
            "cancelled"
        ].includes(value)
    ) {

        return value;
    }


    return "pending";
}


function getCustomerName(profile, order = null) {

    profile = profile || {};
    order = order || {};

    const fullName =
        [
            profile.first_name || order.customer_first_name,
            profile.last_name || order.customer_last_name
        ]
            .filter(Boolean)
            .join(" ")
            .trim();

    return (
        fullName ||
        profile.email ||
        order.customer_email ||
        "Customer"
    );
}


function formatMoney(value) {

    const number =
        Number(value || 0);


    return number.toLocaleString(
        "en-US",
        {
            style: "currency",
            currency: "USD"
        }
    );
}


function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);
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


function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value == null
                ? "—"
                : String(value);
    }
}


function escapeHtml(value) {

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


function setOrderTableMessage(
    message
) {

    const table =
        document.getElementById(
            "ordersTable"
        );


    if (table) {

        table.innerHTML = `
            <div class="empty-state">
                ${escapeHtml(message)}
            </div>
        `;
    }
}


function showOrderError(
    message
) {

    setOrderTableMessage(
        message
    );
}


function showOrderToast(
    message,
    type
) {

    const toast =
        document.getElementById(
            "orderToast"
        );


    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.className =
        "admin-toast " +
        (type || "");


    toast.classList.add(
        "show"
    );


    window.setTimeout(
        function () {

            toast.classList.remove(
                "show"
            );

        },
        3500
    );
}