/*
 * =========================================================
 * screenings4u — Admin Customers
 *
 * Location:
 * assets/js/admin-customers.js
 *
 * Purpose:
 * - Protect the page with the admin Supabase session.
 * - Display customer accounts.
 * - Search customers.
 * - Open an individual customer profile.
 * - Display customer orders.
 * - Display customer training enrollments and progress.
 * =========================================================
 */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        /*
         * -----------------------------------------------------
         * SUPABASE CONFIGURATION
         * -----------------------------------------------------
         */

        if (
            !window.Screenings4uAdmin ||
            !window.Screenings4uAdmin.supabase
        ) {
            showCustomerToast(
                "Supabase client is not available. Check admin-config.js.",
                true
            );
            return;
        }


        /*
         * -----------------------------------------------------
         * SUPABASE CLIENT
         * -----------------------------------------------------
         */

        window.screenings4uSupabase =
            window.Screenings4uAdmin.supabase;


        /*
         * -----------------------------------------------------
         * ADMIN GUARD
         * -----------------------------------------------------
         */

        const authorized =
            await enforceAdminGuard();


        if (!authorized) {
            return;
        }


        initializeCustomerPage();

        await loadCustomers();
    }
);

/* =========================================================
   ADMIN AUTHORIZATION
   ========================================================= */

async function enforceAdminGuard() {

    if (
        !window.screenings4uSupabase ||
        !window.screenings4uSupabase.auth
    ) {
        window.location.href = "admin-login.html";
        return false;
    }

    const {
        data,
        error
    } = await window.screenings4uSupabase.auth.getSession();

    if (
        error ||
        !data ||
        !data.session ||
        !data.session.user
    ) {
        window.location.href = "admin-login.html";
        return false;
    }

    const user = data.session.user;

    const userEmail =
        String(user.email || "")
            .trim()
            .toLowerCase();

    const SUPERADMIN_EMAIL =
        "aerving@screenings4u.com";

    /*
     * Look up the authenticated user in the
     * actual admin_profiles table.
     */
    const {
        data: adminProfile,
        error: profileError
    } = await window.screenings4uSupabase
        .from("admin_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {

        console.error(
            "Admin authorization error:",
            profileError
        );

        return false;
    }

    /*
     * The designated superadmin must have an
     * admin_profiles record and be active.
     */
    if (userEmail === SUPERADMIN_EMAIL) {

        if (
            !adminProfile ||
            adminProfile.is_active !== true
        ) {
            await window.screenings4uSupabase.auth.signOut();

            window.location.href =
                "admin-login.html";

            return false;
        }

        window.screenings4uAdminProfile =
            adminProfile;

        window.screenings4uAdminRole =
            "superadmin";

        return true;
    }

    /*
     * All other administrators must have an
     * active admin_profiles record.
     */
    if (
        !adminProfile ||
        adminProfile.is_active !== true
    ) {

        await window.screenings4uSupabase.auth.signOut();

        window.location.href =
            "admin-login.html";

        return false;
    }

    const adminLevel =
        String(
            adminProfile.admin_level || "admin"
        )
            .trim()
            .toLowerCase();

    window.screenings4uAdminProfile =
        adminProfile;

    window.screenings4uAdminRole =
        adminLevel === "superadmin"
            ? "superadmin"
            : "admin";

    return true;
}


/* =========================================================
   PAGE EVENTS
   ========================================================= */

function initializeCustomerPage() {

    /*
     * -----------------------------------------------------
     * SIGN OUT
     * -----------------------------------------------------
     */

    const signOutButton =
        document.getElementById(
            "signOutButton"
        );


    if (signOutButton) {

        signOutButton.addEventListener(
            "click",
            async function () {

                signOutButton.disabled =
                    true;


                await window.screenings4uSupabase
                    .auth
                    .signOut();


                window.location.href =
                    "admin-login.html";
            }
        );
    }


    /*
     * -----------------------------------------------------
     * CUSTOMER SEARCH
     * -----------------------------------------------------
     */

    const search =
        document.getElementById(
            "customerSearch"
        );


    if (search) {

        search.addEventListener(
            "input",
            function () {

                renderCustomers(
                    window.adminCustomers || [],
                    search.value
                );
            }
        );
    }


    /*
     * -----------------------------------------------------
     * BACK TO CUSTOMER LIST
     * -----------------------------------------------------
     */

    const backButton =
        document.getElementById(
            "backToCustomers"
        );


    if (backButton) {

        backButton.addEventListener(
            "click",
            showCustomerList
        );
    }
}


/* =========================================================
   CUSTOMER LIST
   ========================================================= */

async function loadCustomers() {

    const container =
        document.getElementById(
            "customerTable"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="empty-state">
            Loading customers...
        </div>
    `;


    const {
        data,
        error
    } =
        await window.screenings4uSupabase
            .from("client_profiles")
            .select(`
                id,
                first_name,
                last_name,
                email,
                phone,
                company_name,
                is_active,
                created_at
            `)
         
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Customer load error:",
            error
        );


        container.innerHTML =
            renderError(
                error.message
            );


        return;
    }


    window.adminCustomers =
        data || [];


    renderCustomers(
        window.adminCustomers,
        ""
    );
}


/* =========================================================
   RENDER CUSTOMERS
   ========================================================= */

function renderCustomers(
    customers,
    searchTerm
) {

    const container =
        document.getElementById(
            "customerTable"
        );


    if (!container) {
        return;
    }


    const term =
        String(
            searchTerm || ""
        )
            .toLowerCase()
            .trim();


    const filtered =
        customers.filter(
            function (customer) {

                const searchableText = [

                    customer.first_name,

                    customer.last_name,

                    customer.email,

                    customer.phone,

                    customer.company_name

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                return (
                    !term ||
                    searchableText.includes(
                        term
                    )
                );
            }
        );


    if (!filtered.length) {

        container.innerHTML =
            renderEmpty(
                term
                    ? "No customers match your search."
                    : "No customers found."
            );


        return;
    }


    container.innerHTML = `
        <table class="admin-data-table">

            <thead>

                <tr>

                    <th>Customer</th>

                    <th>Email</th>

                    <th>Phone</th>

                    <th>Company</th>

                    <th>Status</th>

                    <th>Created</th>

                    <th></th>

                </tr>

            </thead>


            <tbody>

                ${filtered
                    .map(
                        function (customer) {

                            return `
                                <tr>

                                    <td>
                                        <strong>
                                            ${escapeHtml(
                                                getCustomerName(
                                                    customer
                                                )
                                            )}
                                        </strong>
                                    </td>


                                    <td>
                                        ${escapeHtml(
                                            customer.email ||
                                            "—"
                                        )}
                                    </td>


                                    <td>
                                        ${escapeHtml(
                                            customer.phone ||
                                            "—"
                                        )}
                                    </td>


                                    <td>
                                        ${escapeHtml(
                                            customer.company_name ||
                                            "—"
                                        )}
                                    </td>


                                    <td>
                                        ${statusBadge(
                                            customer.is_active
                                                ? "Active"
                                                : "Inactive"
                                        )}
                                    </td>


                                    <td>
                                        ${formatDate(
                                            customer.created_at
                                        )}
                                    </td>


                                    <td>

                                        <button
                                            type="button"
                                            class="table-action"
                                            data-customer-id="${escapeAttribute(
                                                customer.id
                                            )}"
                                        >
                                            View
                                        </button>

                                    </td>

                                </tr>
                            `;
                        }
                    )
                    .join("")}

            </tbody>

        </table>
    `;


    container
        .querySelectorAll(
            "[data-customer-id]"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        loadCustomerDetail(
                            button.dataset.customerId
                        );
                    }
                );
            }
        );
}


/* =========================================================
   CUSTOMER DETAIL
   ========================================================= */

async function loadCustomerDetail(
    customerId
) {

    const customer =
        (window.adminCustomers || [])
            .find(
                function (item) {

                    return (
                        String(item.id) ===
                        String(customerId)
                    );
                }
            );


    if (!customer) {

        showCustomerToast(
            "Customer could not be found.",
            true
        );

        return;
    }


    const listView =
        document.getElementById(
            "customerListView"
        );


    const detailView =
        document.getElementById(
            "customerDetailView"
        );


    if (listView) {

        listView.classList.remove(
            "active"
        );
    }


    if (detailView) {

        detailView.classList.add(
            "active"
        );
    }


    setCustomerText(
        "customerInitials",
        getInitials(customer)
    );


    setCustomerText(
        "detailCustomerName",
        getCustomerName(customer)
    );


    setCustomerText(
        "detailCustomerEmail",
        customer.email || "—"
    );


    setCustomerText(
        "detailPhone",
        customer.phone || "—"
    );


    setCustomerText(
        "detailCompany",
        customer.company_name || "—"
    );


    setCustomerText(
        "detailAddress",
        formatAddress(customer)
    );


    const statusElement =
        document.getElementById(
            "detailStatus"
        );


    if (statusElement) {

        statusElement.innerHTML =
            statusBadge(
                customer.is_active
                    ? "Active"
                    : "Inactive"
            );
    }


    setCustomerText(
        "detailCreated",
        formatDate(
            customer.created_at
        )
    );


    const ordersTable =
        document.getElementById(
            "customerOrdersTable"
        );


    if (ordersTable) {

        ordersTable.innerHTML = `
            <div class="empty-state">
                Loading orders...
            </div>
        `;
    }


    const trainingTable =
        document.getElementById(
            "customerTrainingTable"
        );


    if (trainingTable) {

        trainingTable.innerHTML = `
            <div class="empty-state">
                Loading LMS enrollments...
            </div>
        `;
    }


    await Promise.all([
        loadCustomerOrders(customerId),
        loadCustomerTraining(customerId)
    ]);


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   CUSTOMER ORDERS
   ========================================================= */

async function loadCustomerOrders(
    customerId
) {

    const container =
        document.getElementById(
            "customerOrdersTable"
        );


    if (!container) {
        return;
    }


    const {
        data,
        error
    } =
        await window.screenings4uSupabase
            .from("orders")
            .select(`
                id,
                order_number,
                subtotal,
                tax,
                total,
                status,
                payment_status,
                created_at
            `)
            .eq(
                "user_id",
                customerId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Customer orders error:",
            error
        );


        container.innerHTML =
            renderError(
                error.message
            );


        return;
    }


    const orders =
        data || [];


    setCustomerText(
        "detailOrderCount",
        orders.length
    );


    const totalSpent =
        orders
            .filter(
                function (order) {

                    return (
                        String(
                            order.payment_status ||
                            ""
                        ).toLowerCase() ===
                        "paid"
                    );
                }
            )
            .reduce(
                function (
                    sum,
                    order
                ) {

                    return (
                        sum +
                        Number(
                            order.total || 0
                        )
                    );
                },
                0
            );


    setCustomerText(
        "detailTotalSpent",
        formatCurrency(
            totalSpent
        )
    );


    if (!orders.length) {

        container.innerHTML =
            renderEmpty(
                "This customer has no orders."
            );

        return;
    }


    container.innerHTML = `
        <table class="admin-data-table">

            <thead>

                <tr>

                    <th>Order</th>

                    <th>Subtotal</th>

                    <th>Tax</th>

                    <th>Total</th>

                    <th>Payment</th>

                    <th>Status</th>

                    <th>Date</th>

                </tr>

            </thead>


            <tbody>

                ${orders
                    .map(
                        function (order) {

                            return `
                                <tr>

                                    <td>
                                        <strong>
                                            ${escapeHtml(
                                                order.order_number ||
                                                "—"
                                            )}
                                        </strong>
                                    </td>


                                    <td>
                                        ${formatCurrency(
                                            order.subtotal
                                        )}
                                    </td>


                                    <td>
                                        ${formatCurrency(
                                            order.tax
                                        )}
                                    </td>


                                    <td>
                                        <strong>
                                            ${formatCurrency(
                                                order.total
                                            )}
                                        </strong>
                                    </td>


                                    <td>
                                        ${statusBadge(
                                            order.payment_status
                                        )}
                                    </td>


                                    <td>
                                        ${statusBadge(
                                            order.status
                                        )}
                                    </td>


                                    <td>
                                        ${formatDate(
                                            order.created_at
                                        )}
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


/* =========================================================
   CUSTOMER LMS ACCESS
   ========================================================= */

async function loadCustomerTraining(
    customerId
) {

    const container =
        document.getElementById(
            "customerTrainingTable"
        );


    if (!container) {
        return;
    }


    /*
     * Actual relationship:
     *
     * lms_enrollments.course_id
     *        ↓
     * lms_courses.id
     *
     * The customer relationship is:
     *
     * lms_enrollments.user_id
     *        ↓
     * auth.users.id
     */

    const {
        data,
        error
    } =
        await window.screenings4uSupabase
            .from("lms_enrollments")
            .select(`
                id,
                user_id,
                course_id,
                status,
                progress_percent,
                enrolled_at,
                started_at,
                completed_at,
                course:lms_courses (
                    id,
                    title,
                    slug
                )
            `)
            .eq(
                "user_id",
                customerId
            )
            .order(
                "enrolled_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Customer LMS enrollment error:",
            error
        );


        container.innerHTML =
            renderError(
                error.message
            );


        return;
    }


    const enrollments =
        data || [];


    setCustomerText(
        "detailTrainingCount",
        enrollments.length
    );


    setCustomerText(
        "detailCompletedCount",
        enrollments.filter(
            function (item) {

                return (
                    String(
                        item.status || ""
                    ).toLowerCase() ===
                    "completed"
                );
            }
        ).length
    );


    if (!enrollments.length) {

        container.innerHTML =
            renderEmpty(
                "This customer has no LMS enrollments."
            );

        return;
    }


    container.innerHTML = `
        <table class="admin-data-table">

            <thead>

                <tr>

                    <th>Course</th>

                    <th>Progress</th>

                    <th>Status</th>

                    <th>Enrolled</th>

                    <th>Started</th>

                    <th>Completed</th>

                </tr>

            </thead>


            <tbody>

                ${enrollments
                    .map(
                        function (enrollment) {

                            const course =
                                enrollment.course ||
                                {};


                            const progress =
                                Math.max(
                                    0,
                                    Math.min(
                                        100,
                                        Number(
                                            enrollment.progress_percent ||
                                            0
                                        )
                                    )
                                );


                            return `
                                <tr>

                                    <td>

                                        <strong>
                                            ${escapeHtml(
                                                course.title ||
                                                "—"
                                            )}
                                        </strong>

                                        ${
                                            course.slug
                                                ? `
                                                    <small class="table-secondary">
                                                        ${escapeHtml(
                                                            course.slug
                                                        )}
                                                    </small>
                                                  `
                                                : ""
                                        }

                                    </td>


                                    <td>

                                        <div class="progress-cell">

                                            <div class="progress-track">

                                                <span
                                                    style="width:${progress}%"
                                                ></span>

                                            </div>


                                            <strong>
                                                ${progress}%
                                            </strong>

                                        </div>

                                    </td>


                                    <td>
                                        ${statusBadge(
                                            enrollment.status
                                        )}
                                    </td>


                                    <td>
                                        ${formatDate(
                                            enrollment.enrolled_at
                                        )}
                                    </td>


                                    <td>
                                        ${formatDate(
                                            enrollment.started_at
                                        )}
                                    </td>


                                    <td>
                                        ${formatDate(
                                            enrollment.completed_at
                                        )}
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


/* =========================================================
   VIEW HELPERS
   ========================================================= */

function showCustomerList() {

    const detailView =
        document.getElementById(
            "customerDetailView"
        );


    const listView =
        document.getElementById(
            "customerListView"
        );


    if (detailView) {

        detailView.classList.remove(
            "active"
        );
    }


    if (listView) {

        listView.classList.add(
            "active"
        );
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   CUSTOMER NAME
   ========================================================= */

function getCustomerName(
    customer
) {

    if (!customer) {
        return "Unnamed Customer";
    }

    const name = [
        customer.first_name,
        customer.last_name
    ]
        .filter(Boolean)
        .join(" ")
        .trim();

    if (name) {
        return name;
    }

    return (
        customer.email ||
        "Unnamed Customer"
    );
}


/* =========================================================
   CUSTOMER INITIALS
   ========================================================= */

function getInitials(
    customer
) {

    const name =
        getCustomerName(
            customer
        );


    if (!name) {
        return "?";
    }


    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!parts.length) {
        return "?";
    }


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        parts[0].charAt(0) +
        parts[
            parts.length - 1
        ].charAt(0)
    ).toUpperCase();
}


/* =========================================================
   CUSTOMER ADDRESS
   ========================================================= */

function formatAddress(
    customer
) {

    if (!customer) {
        return "—";
    }


    const addressParts = [
        customer.address_line_1,
        customer.address_line_2,
        customer.city,
        customer.state,
        customer.postal_code
    ]
        .filter(
            function (value) {

                return (
                    value !== null &&
                    value !== undefined &&
                    String(value).trim() !== ""
                );
            }
        );


    if (!addressParts.length) {
        return "—";
    }


    /*
     * Keep address formatting readable.
     */

    const firstLine = [
        customer.address_line_1,
        customer.address_line_2
    ]
        .filter(Boolean)
        .join(", ");


    const cityLine = [
        customer.city,
        customer.state,
        customer.postal_code
    ]
        .filter(Boolean)
        .join(", ");


    return [
        firstLine,
        cityLine
    ]
        .filter(Boolean)
        .join(" • ") || "—";
}


/* =========================================================
   CURRENCY
   ========================================================= */

function formatCurrency(
    value
) {

    const amount =
        Number(value || 0);


    return amount.toLocaleString(
        "en-US",
        {
            style: "currency",
            currency: "USD"
        }
    );
}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(
    value
) {

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


/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(
    value
) {

    const text =
        String(
            value || "—"
        );


    const normalized =
        text
            .toLowerCase()
            .trim()
            .replace(
                /[^a-z0-9_-]+/g,
                "-"
            );


    return `
        <span
            class="status-badge status-${escapeAttribute(
                normalized
            )}"
        >
            ${escapeHtml(text)}
        </span>
    `;
}


/* =========================================================
   SET TEXT
   ========================================================= */

function setCustomerText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);
}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function renderEmpty(
    message
) {

    return `
        <div class="empty-state">
            ${escapeHtml(message)}
        </div>
    `;
}


/* =========================================================
   ERROR STATE
   ========================================================= */

function renderError(
    message
) {

    return `
        <div class="error-state">
            ${escapeHtml(message)}
        </div>
    `;
}


/* =========================================================
   CUSTOMER TOAST
   ========================================================= */

function showCustomerToast(
    message,
    isError
) {

    const toast =
        document.getElementById(
            "customerToast"
        );


    if (!toast) {

        console.log(
            message
        );

        return;
    }


    toast.textContent =
        message;


    toast.className =
        "admin-toast visible" +
        (
            isError
                ? " error"
                : ""
        );


    clearTimeout(
        window.customerToastTimer
    );


    window.customerToastTimer =
        setTimeout(
            function () {

                toast.classList.remove(
                    "visible"
                );

            },
            4000
        );
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

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


/* =========================================================
   ESCAPE ATTRIBUTE
   ========================================================= */

function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );
}