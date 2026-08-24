/*
 * screenings4u — Admin Dashboard Controller
 * File: assets/js/admin-dashboard.js
 *
 * Responsibilities:
 * - Verify the current Supabase session.
 * - Verify the authenticated user has an active admin profile.
 * - Load dashboard metrics.
 * - Load recent orders.
 * - Load active/recent students.
 *
 * Navigation is intentionally NOT managed here.
 * admin-navigation.js owns the shared admin navigation.
 */

"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (!initializeSupabaseClient()) {
            return;
        }

        const authorized = await enforceAdminGuard();

        if (!authorized) {
            return;
        }

        bindDashboardControls();
        await loadAdminIdentity();
        await loadDashboard();

    } catch (error) {
        console.error("ADMIN DASHBOARD INITIALIZATION ERROR:", error);

        showToast(
            error?.message || "Unable to load the admin dashboard.",
            true
        );
    }
});

/* =========================================================
   DASHBOARD CONTROLS
   ========================================================= */

function bindDashboardControls() {
    const refreshButton =
        document.getElementById("refreshDashboardBtn");

    if (!refreshButton) {
        return;
    }

    refreshButton.addEventListener("click", async () => {
        const originalHtml = refreshButton.innerHTML;

        refreshButton.disabled = true;
        refreshButton.innerHTML = `
            <span aria-hidden="true">↻</span>
            Refreshing...
        `;

        try {
            await loadDashboard();
            showToast("Dashboard data refreshed.");
        } catch (error) {
            console.error("DASHBOARD REFRESH ERROR:", error);

            showToast(
                error?.message || "Unable to refresh dashboard data.",
                true
            );
        } finally {
            refreshButton.disabled = false;
            refreshButton.innerHTML = originalHtml;
        }
    });
}

/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function initializeSupabaseClient() {
    if (
        window.screenings4uSupabase &&
        typeof window.screenings4uSupabase.from === "function"
    ) {
        return true;
    }

    if (
        typeof window.getScreenings4uSupabase === "function"
    ) {
        try {
            window.screenings4uSupabase =
                window.getScreenings4uSupabase();

            return Boolean(window.screenings4uSupabase);
        } catch (error) {
            console.error(
                "SHARED SUPABASE CLIENT INITIALIZATION ERROR:",
                error
            );
        }
    }

    if (
        window.supabase &&
        window.SCREENINGS4U_SUPABASE_URL &&
        window.SCREENINGS4U_SUPABASE_ANON_KEY &&
        !String(window.SCREENINGS4U_SUPABASE_URL).includes("YOUR_") &&
        !String(window.SCREENINGS4U_SUPABASE_ANON_KEY).includes("YOUR_")
    ) {
        window.screenings4uSupabase =
            window.supabase.createClient(
                window.SCREENINGS4U_SUPABASE_URL,
                window.SCREENINGS4U_SUPABASE_ANON_KEY
            );

        return true;
    }

    showToast(
        "Supabase is not configured. Check admin-config.js.",
        true
    );

    return false;
}

/* =========================================================
   ADMIN AUTHORIZATION
   ========================================================= */

async function enforceAdminGuard() {
    try {
        const {
            data,
            error
        } = await window.screenings4uSupabase.auth.getSession();

        if (error) {
            console.error(
                "SUPABASE SESSION ERROR:",
                error
            );

            showToast(
                "Unable to verify your login session: " +
                error.message,
                true
            );

            return false;
        }

        if (!data?.session) {
            window.location.replace("admin-login.html");
            return false;
        }

        const user = data.session.user;

        const {
            data: profile,
            error: profileError
        } = await window.screenings4uSupabase
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
                is_active,
                admin_level,
                created_at,
                updated_at
            `)
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error(
                "ADMIN PROFILE QUERY ERROR:",
                profileError
            );

            showToast(
                "Admin profile query failed: " +
                profileError.message,
                true
            );

            return false;
        }

        if (!profile) {
            showToast(
                "No admin profile was found for this login account.",
                true
            );

            return false;
        }

        const adminLevel = String(
            profile.admin_level || ""
        )
            .trim()
            .toLowerCase();

        const allowedLevels = [
            "admin",
            "superadmin",
            "super_admin"
        ];

        if (!allowedLevels.includes(adminLevel)) {
            showToast(
                "This account is not authorized for the admin console.",
                true
            );

            return false;
        }

        if (profile.is_active !== true) {
            showToast(
                "This admin account is marked inactive.",
                true
            );

            return false;
        }

        window.screenings4uAdminProfile = profile;

        return true;

    } catch (error) {
        console.error(
            "ADMIN AUTHORIZATION ERROR:",
            error
        );

        showToast(
            "Admin authorization error: " +
            (error?.message || error),
            true
        );

        return false;
    }
}

/* =========================================================
   ADMIN IDENTITY
   ========================================================= */

async function loadAdminIdentity() {
    const element =
        document.getElementById("adminIdentity");

    const profile =
        window.screenings4uAdminProfile;

    if (!element || !profile) {
        return;
    }

    const name = [
        profile.first_name,
        profile.last_name
    ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
        profile.email ||
        "Administrator";

    const initials = getInitials(name);

    element.innerHTML = `
        <div class="dashboard-identity-card">
            <span class="dashboard-identity-avatar" aria-hidden="true">
                ${escapeHtml(initials)}
            </span>

            <span class="dashboard-identity-copy">
                <strong>
                    ${escapeHtml(name)}
                </strong>

                <small>
                    Administrator
                </small>
            </span>
        </div>
    `;
}

/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {
    setDashboardLoadingState();

    await Promise.all([
        loadMetrics(),
        loadRecentOrders(),
        loadRecentStudents()
    ]);
}

/* =========================================================
   METRICS
   ========================================================= */

async function loadMetrics() {
    const [
        customers,
        orders,
        pending,
        completed,
        students,
        courses,
        completedCourses
    ] = await Promise.all([
        countRows("client_profiles"),
        countRows("orders"),
        countRows(
            "orders",
            "status",
            "pending"
        ),
        countRows(
            "orders",
            "status",
            "completed"
        ),
        countRows(
            "lms_enrollments",
            "status",
            "active"
        ),
        countRows("lms_courses"),
        countRows(
            "lms_enrollments",
            "status",
            "completed"
        )
    ]);

    setMetric("metricCustomers", customers);
    setMetric("metricOrders", orders);
    setMetric("metricPending", pending);
    setMetric("metricCompleted", completed);
    setMetric("metricStudents", students);
    setMetric("metricCourses", courses);
    setMetric("metricCompletedCourses", completedCourses);
}

async function countRows(
    table,
    column,
    value
) {
    try {
        let query =
            window.screenings4uSupabase
                .from(table)
                .select("*", {
                    count: "exact",
                    head: true
                });

        if (
            column &&
            value !== undefined
        ) {
            query = query.eq(
                column,
                value
            );
        }

        const {
            count,
            error
        } = await query;

        if (error) {
            console.error(
                `Count failed for ${table}:`,
                error
            );

            return 0;
        }

        return Number(count || 0);

    } catch (error) {
        console.error(
            `Count failed for ${table}:`,
            error
        );

        return 0;
    }
}

function setMetric(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            Number(value || 0).toLocaleString(
                "en-US"
            );
    }
}

/* =========================================================
   RECENT ORDERS
   ========================================================= */

async function loadRecentOrders() {
    const container =
        document.getElementById(
            "recentOrders"
        );

    if (!container) {
        return;
    }

    try {
        const {
            data,
            error
        } = await window.screenings4uSupabase
            .from("orders")
            .select(`
                id,
                order_number,
                customer_email,
                customer_first_name,
                customer_last_name,
                total,
                status,
                payment_status,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(8);

        if (error) {
            throw error;
        }

        container.innerHTML =
            renderOrderTable(data || []);

    } catch (error) {
        console.error(
            "RECENT ORDERS ERROR:",
            error
        );

        container.innerHTML =
            renderError(
                error?.message ||
                "Unable to load recent orders."
            );
    }
}

/* =========================================================
   RECENT / ACTIVE STUDENTS
   ========================================================= */

async function loadRecentStudents() {
    const container =
        document.getElementById(
            "recentStudents"
        );

    if (!container) {
        return;
    }

    try {
        const {
            data: enrollments,
            error
        } = await window.screenings4uSupabase
            .from("lms_enrollments")
            .select(`
                id,
                user_id,
                course_id,
                progress_percent,
                status,
                enrolled_at,
                started_at,
                completed_at,
                course:lms_courses (
                    id,
                    title,
                    slug
                )
            `)
            .order(
                "enrolled_at",
                {
                    ascending: false
                }
            )
            .limit(8);

        if (error) {
            throw error;
        }

        const rows = enrollments || [];

        if (!rows.length) {
            container.innerHTML =
                renderEmpty(
                    "No LMS students yet."
                );

            return;
        }

        const userIds = [
            ...new Set(
                rows
                    .map(row => row.user_id)
                    .filter(Boolean)
            )
        ];

        let clients = [];

        if (userIds.length) {
            const clientResult =
                await window.screenings4uSupabase
                    .from("client_profiles")
                    .select(`
                        id,
                        first_name,
                        last_name,
                        email
                    `)
                    .in(
                        "id",
                        userIds
                    );

            if (clientResult.error) {
                throw clientResult.error;
            }

            clients =
                clientResult.data || [];
        }

        const clientMap =
            new Map(
                clients.map(client => [
                    client.id,
                    client
                ])
            );

        const students =
            rows.map(row => ({
                ...row,
                profile:
                    clientMap.get(
                        row.user_id
                    ) || null
            }));

        container.innerHTML =
            renderStudentTable(
                students
            );

    } catch (error) {
        console.error(
            "RECENT STUDENTS ERROR:",
            error
        );

        container.innerHTML =
            renderError(
                error?.message ||
                "Unable to load active students."
            );
    }
}

/* =========================================================
   ORDER TABLE
   ========================================================= */

function renderOrderTable(
    orders
) {
    if (!orders.length) {
        return renderEmpty(
            "No recent orders found."
        );
    }

    return `
        <table class="admin-data-table">
            <thead>
                <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                </tr>
            </thead>

            <tbody>
                ${orders
                    .map(order => {
                        const customerName = [
                            order.customer_first_name,
                            order.customer_last_name
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .trim();

                        return `
                            <tr>
                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            order.order_number ||
                                            "—"
                                        )}
                                    </strong>

                                    <small>
                                        ${formatDate(
                                            order.created_at
                                        )}
                                    </small>
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            customerName ||
                                            order.customer_email ||
                                            "—"
                                        )}
                                    </strong>

                                    ${
                                        customerName &&
                                        order.customer_email
                                            ? `
                                                <small>
                                                    ${escapeHtml(
                                                        order.customer_email
                                                    )}
                                                </small>
                                            `
                                            : ""
                                    }
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
                                        order.status
                                    )}
                                </td>
                            </tr>
                        `;
                    })
                    .join("")}
            </tbody>
        </table>
    `;
}

/* =========================================================
   STUDENT TABLE
   ========================================================= */

function renderStudentTable(
    students
) {
    if (!students.length) {
        return renderEmpty(
            "No LMS students yet."
        );
    }

    return `
        <table class="admin-data-table">
            <thead>
                <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Progress</th>
                </tr>
            </thead>

            <tbody>
                ${students
                    .map(student => {
                        const profile =
                            student.profile || {};

                        const course =
                            student.course || {};

                        const progress =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    Number(
                                        student.progress_percent ||
                                        0
                                    )
                                )
                            );

                        const studentName = [
                            profile.first_name,
                            profile.last_name
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .trim();

                        return `
                            <tr>
                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            studentName ||
                                            profile.email ||
                                            "—"
                                        )}
                                    </strong>

                                    ${
                                        student.status
                                            ? `
                                                <small>
                                                    ${escapeHtml(
                                                        formatStatusText(
                                                            student.status
                                                        )
                                                    )}
                                                </small>
                                            `
                                            : ""
                                    }
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            course.title ||
                                            "—"
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    <div class="progress-cell">
                                        <div
                                            class="progress-track"
                                            aria-label="${progress}% complete"
                                        >
                                            <span
                                                style="width:${progress}%"
                                            ></span>
                                        </div>

                                        <strong>
                                            ${progress}%
                                        </strong>
                                    </div>
                                </td>
                            </tr>
                        `;
                    })
                    .join("")}
            </tbody>
        </table>
    `;
}

/* =========================================================
   LOADING STATE
   ========================================================= */

function setDashboardLoadingState() {
    const orderContainer =
        document.getElementById(
            "recentOrders"
        );

    const studentContainer =
        document.getElementById(
            "recentStudents"
        );

    if (orderContainer) {
        orderContainer.innerHTML = `
            <div class="dashboard-loading">
                <span
                    class="dashboard-spinner"
                    aria-hidden="true"
                ></span>
                Loading recent orders...
            </div>
        `;
    }

    if (studentContainer) {
        studentContainer.innerHTML = `
            <div class="dashboard-loading">
                <span
                    class="dashboard-spinner"
                    aria-hidden="true"
                ></span>
                Loading active students...
            </div>
        `;
    }
}

/* =========================================================
   EMPTY / ERROR STATES
   ========================================================= */

function renderEmpty(
    message
) {
    return `
        <div class="dashboard-empty">
            ${escapeHtml(message)}
        </div>
    `;
}

function renderError(
    message
) {
    return `
        <div class="dashboard-error">
            ${escapeHtml(message)}
        </div>
    `;
}

/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(
    value
) {
    const text =
        String(value || "—");

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
            ${escapeHtml(
                formatStatusText(text)
            )}
        </span>
    `;
}

function formatStatusText(
    value
) {
    return String(value || "—")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );
}

/* =========================================================
   FORMATTING
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

function getInitials(
    value
) {
    const parts =
        String(value || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (!parts.length) {
        return "A";
    }

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

/* =========================================================
   SECURITY HELPERS
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

function escapeAttribute(
    value
) {
    return escapeHtml(value);
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    isError = false
) {
    const toast =
        document.getElementById(
            "adminToast"
        );

    if (!toast) {
        console.log(message);
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

    window.clearTimeout(
        window.adminToastTimer
    );

    window.adminToastTimer =
        window.setTimeout(
            () => {
                toast.classList.remove(
                    "visible"
                );
            },
            4000
        );
}