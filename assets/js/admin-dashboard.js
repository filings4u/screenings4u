/*
 * =========================================================
 * screenings4u — Admin Dashboard
 * Uses admin_profiles for admins and client_profiles for customers.
 * training_enrollments.user_id references auth.users, so student
 * client details are loaded from client_profiles separately.
 *
 * Phase 1:
 * - Supabase session guard
 * - Admin role guard
 * - Dashboard metrics
 * - Customers
 * - Orders
 * - LMS Courses
 * - LMS Students
 * - Audit log
 *
 * The service-role key is NEVER used here.
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
            !window.SCREENINGS4U_SUPABASE_URL ||
            window.SCREENINGS4U_SUPABASE_URL.includes("YOUR_") ||
            !window.SCREENINGS4U_SUPABASE_ANON_KEY ||
            window.SCREENINGS4U_SUPABASE_ANON_KEY.includes("YOUR_")
        ) {

            showToast(
                "Configure admin-config.js first.",
                true
            );

            return;
        }


        /*
         * -----------------------------------------------------
         * SUPABASE CLIENT
         * -----------------------------------------------------
         */

        if (
            window.screenings4uSupabase &&
            window.screenings4uSupabase.from
        ) {

            /*
             * Reuse existing shared client.
             */

        } else if (
            window.supabase &&
            window.SCREENINGS4U_SUPABASE_URL &&
            window.SCREENINGS4U_SUPABASE_ANON_KEY
        ) {

            window.screenings4uSupabase =
                window.supabase.createClient(
                    window.SCREENINGS4U_SUPABASE_URL,
                    window.SCREENINGS4U_SUPABASE_ANON_KEY
                );

        } else {

            showToast(
                "Supabase client could not be initialized.",
                true
            );

            return;
        }


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


        initializeAdminNavigation();

        initializeSearchHandlers();

        initializeButtons();

        await loadAdminIdentity();

        await loadDashboard();
    }
);


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
            console.error("SUPABASE SESSION ERROR:", error);
            showToast(
                "Unable to verify your login session: " + error.message,
                true
            );
            return false;
        }

        if (!data || !data.session) {
            console.warn("ADMIN GUARD: No active Supabase session.");
            window.location.replace("admin-login.html");
            return false;
        }

        const user = data.session.user;

        console.log("ADMIN GUARD: Authenticated user:", user.email);
        console.log("ADMIN GUARD: User ID:", user.id);

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
            console.error("ADMIN PROFILE QUERY ERROR:", profileError);
            showToast(
                "Admin profile query failed: " + profileError.message,
                true
            );
            return false;
        }

        if (!profile) {
            console.error(
                "ADMIN GUARD: No admin profile found for authenticated user:",
                user.id
            );
            showToast(
                "No admin profile was found for this login account.",
                true
            );
            return false;
        }

        console.log("ADMIN GUARD: Admin profile loaded:", profile);

        const adminLevel = String(profile.admin_level || "")
            .trim()
            .toLowerCase();

        const allowedLevels = [
            "admin",
            "superadmin",
            "super_admin"
        ];

        if (!allowedLevels.includes(adminLevel)) {
            console.error(
                "ADMIN GUARD: Invalid admin level:",
                profile.admin_level
            );
            showToast(
                "This account is not authorized for the admin console.",
                true
            );
            return false;
        }

        if (profile.is_active !== true) {
            console.error(
                "ADMIN GUARD: Account is inactive:",
                profile.is_active
            );
            showToast(
                "This admin account is marked inactive.",
                true
            );
            return false;
        }

        window.screenings4uAdminProfile = profile;

        console.log("ADMIN GUARD: Authorization successful.");

        return true;

    } catch (error) {
        console.error(
            "ADMIN GUARD UNEXPECTED ERROR:",
            error
        );

        showToast(
            "Admin authorization error: " +
            (error.message || error),
            true
        );

        return false;
    }
}

/* =========================================================
   ADMIN NAVIGATION
   ========================================================= */

function initializeAdminNavigation() {

    document
        .querySelectorAll(
            ".admin-nav-item"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    async function () {

                        const section =
                            button.dataset.section;


                        document
                            .querySelectorAll(
                                ".admin-nav-item"
                            )
                            .forEach(
                                function (item) {

                                    item.classList.toggle(
                                        "active",
                                        item === button
                                    );
                                }
                            );


                        document
                            .querySelectorAll(
                                ".admin-section"
                            )
                            .forEach(
                                function (item) {

                                    item.classList.remove(
                                        "active"
                                    );
                                }
                            );


                        const target =
                            document.getElementById(
                                section + "Section"
                            );


                        if (target) {

                            target.classList.add(
                                "active"
                            );
                        }


                        updateSectionHeading(
                            section
                        );


                        if (
                            section ===
                            "customers"
                        ) {

                            await loadCustomers();
                        }


                        if (
                            section ===
                            "orders"
                        ) {

                            await loadOrders();
                        }


                        if (
                            section ===
                            "training"
                        ) {

                            await loadTraining();
                        }


                        if (
                            section ===
                            "students"
                        ) {

                            await loadStudents();
                        }


                        if (
                            section ===
                            "audit"
                        ) {

                            await loadAuditLog();
                        }
                    }
                );
            }
        );
}


/* =========================================================
   SECTION HEADINGS
   ========================================================= */

function updateSectionHeading(
    section
) {

    const title =
        document.getElementById(
            "sectionTitle"
        );


    const description =
        document.getElementById(
            "sectionDescription"
        );


    const sections = {

        dashboard: [
            "Dashboard",
            "Overview of your customer, order, and training activity."
        ],

        customers: [
            "Customers",
            "Manage customer profiles and account information."
        ],

        orders: [
            "Orders",
            "Review purchases, payment status, and order status."
        ],

        training: [
            "Training",
            "Manage courses and published training content."
        ],

        students: [
            "Students",
            "Review training enrollments and student progress."
        ],

        audit: [
            "Audit Log",
            "Review administrative activity recorded by the system."
        ]
    };


    const values =
        sections[section] ||
        sections.dashboard;


    if (title) {
        title.textContent =
            values[0];
    }


    if (description) {
        description.textContent =
            values[1];
    }
}


/* =========================================================
   SEARCH HANDLERS
   ========================================================= */

function initializeSearchHandlers() {

    const customerSearch =
        document.getElementById(
            "customerSearch"
        );


    const orderSearch =
        document.getElementById(
            "orderSearch"
        );


    const studentSearch =
        document.getElementById(
            "studentSearch"
        );


    if (customerSearch) {

        customerSearch.addEventListener(
            "input",
            function () {

                renderCustomers(
                    window.adminCustomers ||
                    [],
                    customerSearch.value
                );
            }
        );
    }


    if (orderSearch) {

        orderSearch.addEventListener(
            "input",
            function () {

                renderOrders(
                    window.adminOrders ||
                    [],
                    orderSearch.value
                );
            }
        );
    }


    if (studentSearch) {

        studentSearch.addEventListener(
            "input",
            function () {

                renderStudents(
                    window.adminStudents ||
                    [],
                    studentSearch.value
                );
            }
        );
    }
}


/* =========================================================
   BUTTONS
   ========================================================= */

function initializeButtons() {

    const signOutButton =
        document.getElementById(
            "signOutButton"
        );


    const refreshTrainingButton =
        document.getElementById(
            "refreshTrainingButton"
        );


    const refreshAuditButton =
        document.getElementById(
            "refreshAuditButton"
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


    if (refreshTrainingButton) {

        refreshTrainingButton.addEventListener(
            "click",
            loadTraining
        );
    }


    if (refreshAuditButton) {

        refreshAuditButton.addEventListener(
            "click",
            loadAuditLog
        );
    }
}


/* =========================================================
   ADMIN IDENTITY
   ========================================================= */

async function loadAdminIdentity() {

    const element =
        document.getElementById(
            "adminIdentity"
        );


    const profile =
        window.screenings4uAdminProfile;


    if (
        !element ||
        !profile
    ) {

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


    element.innerHTML = `
        <strong>
            ${escapeHtml(name)}
        </strong>

        <span>
            Administrator
        </span>
    `;
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

    await Promise.all([
        loadMetrics(),
        loadRecentOrders(),
        loadRecentStudents()
    ]);
}


/* =========================================================
   DASHBOARD METRICS
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
    ] =
        await Promise.all([

            countRows(
                "client_profiles"
            ),

            countRows(
                "orders"
            ),

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

            countRows(
                "lms_courses"
            ),

            countRows(
                "lms_enrollments",
                "status",
                "completed"
            )
        ]);


    setMetric(
        "metricCustomers",
        customers
    );


    setMetric(
        "metricOrders",
        orders
    );


    setMetric(
        "metricPending",
        pending
    );


    setMetric(
        "metricCompleted",
        completed
    );


    setMetric(
        "metricStudents",
        students
    );


    setMetric(
        "metricCourses",
        courses
    );


    setMetric(
        "metricCompletedCourses",
        completedCourses
    );
}


/* =========================================================
   COUNT ROWS
   ========================================================= */

async function countRows(
    table,
    column,
    value
) {

    let query =
        window.screenings4uSupabase
            .from(table)
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            );


    if (
        column &&
        value !== undefined
    ) {

        query =
            query.eq(
                column,
                value
            );
    }


    const {
        count,
        error
    } =
        await query;


    if (error) {

        console.error(
            `Count failed for ${table}:`,
            error
        );

        return 0;
    }


    return count || 0;
}


/* =========================================================
   SET METRIC
   ========================================================= */

function setMetric(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            String(value);
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


    const {
        data,
        error
    } =
        await window.screenings4uSupabase
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

        console.error(
            error
        );


        container.innerHTML =
            renderError(
                error.message
            );


        return;
    }


    container.innerHTML =
        renderOrderTable(
            data || []
        );
}


/* =========================================================
   RECENT STUDENTS
   ========================================================= */

async function loadRecentStudents() {
    const container =
        document.getElementById(
            "recentStudents"
        );

    if (!container) {
        return;
    }

    const {
        data: enrollments,
        error
    } =
        await window.screenings4uSupabase
            .from("lms_enrollments")
            .select(`
                id,
                user_id,
                course_id,
                progress_percent,
                status,
                enrolled_at,
                course:lms_courses (
                    id,
                    title
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
        console.error(error);

        container.innerHTML =
            renderError(
                error.message
            );

        return;
    }

    const rows = enrollments || [];

    if (!rows.length) {
        container.innerHTML =
            renderStudentTable([]);

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
                .in("id", userIds);

        if (clientResult.error) {
            console.error(
                "RECENT STUDENTS CLIENT PROFILE ERROR:",
                clientResult.error
            );

            container.innerHTML =
                renderError(
                    clientResult.error.message
                );

            return;
        }

        clients = clientResult.data || [];
    }

    const clientMap = new Map(
        clients.map(client => [
            client.id,
            client
        ])
    );

    const students = rows.map(row => ({
        ...row,
        profile: clientMap.get(row.user_id) || null
    }));

    container.innerHTML =
        renderStudentTable(
            students
        );
}

/* =========================================================
   CUSTOMERS
   ========================================================= */

async function loadCustomers() {
    const container =
        document.getElementById(
            "customersTable"
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
                address_line_1,
                address_line_2,
                city,
                state,
                postal_code,
                is_active,
                created_at,
                updated_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

    if (error) {
        showToast(
            error.message,
            true
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
    search
) {
    const container =
        document.getElementById(
            "customersTable"
        );

    if (!container) {
        return;
    }

    const term =
        String(
            search || ""
        )
            .toLowerCase()
            .trim();

    const filtered =
        customers.filter(
            function (customer) {
                const customerName = [
                    customer.first_name,
                    customer.last_name
                ]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                const haystack = [
                    customerName,
                    customer.first_name,
                    customer.last_name,
                    customer.email,
                    customer.phone,
                    customer.company_name,
                    customer.city,
                    customer.state
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return (
                    !term ||
                    haystack.includes(term)
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
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Created</th>
                </tr>
            </thead>

            <tbody>
                ${filtered
                    .map(
                        function (customer) {
                            const customerName = [
                                customer.first_name,
                                customer.last_name
                            ]
                                .filter(Boolean)
                                .join(" ")
                                .trim();

                            return `
                                <tr>
                                    <td>
                                        <strong>
                                            ${escapeHtml(
                                                customerName ||
                                                "—"
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
                                            customer.company_name ||
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
   ORDERS
   ========================================================= */

async function loadOrders() {

    const container =
        document.getElementById(
            "ordersTable"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="empty-state">
            Loading orders...
        </div>
    `;


    const {
        data,
        error
    } =
        await window.screenings4uSupabase
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
            );


    if (error) {

        showToast(
            error.message,
            true
        );

        return;
    }


    window.adminOrders =
        data || [];


    renderOrders(
        window.adminOrders,
        ""
    );
}


/* =========================================================
   RENDER ORDERS
   ========================================================= */

function renderOrders(
    orders,
    search
) {

    const container =
        document.getElementById(
            "ordersTable"
        );


    if (!container) {
        return;
    }


    const term =
        String(
            search || ""
        )
            .toLowerCase()
            .trim();


    const filtered =
        orders.filter(
            function (order) {

                const haystack = [

                    order.order_number,

                    order.customer_email,

                    order.customer_first_name,

                    order.customer_last_name

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                return (
                    !term ||
                    haystack.includes(term)
                );
            }
        );


    if (!filtered.length) {

        container.innerHTML =
            renderEmpty(
                term
                    ? "No orders match your search."
                    : "No orders found."
            );

        return;
    }


    container.innerHTML = `
        <table class="admin-data-table">

            <thead>

                <tr>

                    <th>Order</th>

                    <th>Customer</th>

                    <th>Total</th>

                    <th>Payment</th>

                    <th>Status</th>

                    <th>Created</th>

                </tr>

            </thead>


            <tbody>

                ${filtered
                    .map(
                        function (order) {

                            const customerName =
                                [
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
                                    </td>


                                    <td>
                                        ${escapeHtml(
                                            customerName ||
                                            order.customer_email ||
                                            "—"
                                        )}
                                    </td>


                                    <td>
                                        ${formatCurrency(
                                            order.total
                                        )}
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
   TRAINING COURSES
   ========================================================= */

async function loadTraining() {

    const container =
        document.getElementById(
            "trainingTable"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="empty-state">
            Loading LMS courses...
        </div>
    `;


    const {
        data,
        error
    } =
        await window.screenings4uSupabase
            .from("lms_courses")
            .select(`
                id,
                slug,
                title,
                short_description,
                passing_score,
                certificate_enabled,
                status,
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
            error
        );


        container.innerHTML =
            renderError(
                error.message
            );


        return;
    }


    if (
        !data ||
        !data.length
    ) {

        container.innerHTML =
            renderEmpty(
                "No LMS courses have been created."
            );

        return;
    }


    container.innerHTML = `
        <table class="admin-data-table">

            <thead>

                <tr>

                    <th>Course</th>

                    <th>Passing Score</th>

                    <th>Certificate</th>

                    <th>Published</th>

                    <th>Created</th>

                </tr>

            </thead>


            <tbody>

                ${data
                    .map(
                        function (course) {

                            return `
                                <tr>

                                    <td>

                                        <strong>
                                            ${escapeHtml(
                                                course.title ||
                                                "Untitled Course"
                                            )}
                                        </strong>

                                        <small>
                                            ${escapeHtml(
                                                course.slug ||
                                                ""
                                            )}
                                        </small>

                                    </td>


                                    <td>
                                        ${escapeHtml(
                                            String(
                                                course.passing_score ??
                                                80
                                            )
                                        )}%
                                    </td>


                                    <td>
                                        ${statusBadge(
                                            course.certificate_enabled
                                                ? "Enabled"
                                                : "Disabled"
                                        )}
                                    </td>


                                    <td>
                                        ${statusBadge(
                                            String(course.status || "").toLowerCase() === "published"
                                                ? "Published"
                                                : "Draft"
                                        )}
                                    </td>


                                    <td>
                                        ${formatDate(
                                            course.created_at
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
   STUDENTS
   ========================================================= */

async function loadStudents() {
    const container =
        document.getElementById(
            "studentsTable"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="empty-state">
            Loading LMS students...
        </div>
    `;

    const {
        data: enrollments,
        error
    } =
        await window.screenings4uSupabase
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
            );

    if (error) {
        showToast(
            error.message,
            true
        );
        return;
    }

    const rows = enrollments || [];

    if (!rows.length) {
        window.adminStudents = [];
        renderStudents([], "");
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
                .in("id", userIds);

        if (clientResult.error) {
            showToast(
                clientResult.error.message,
                true
            );
            return;
        }

        clients = clientResult.data || [];
    }

    const clientMap = new Map(
        clients.map(client => [
            client.id,
            client
        ])
    );

    window.adminStudents =
        rows.map(row => ({
            ...row,
            profile:
                clientMap.get(row.user_id) ||
                null
        }));

    renderStudents(
        window.adminStudents,
        ""
    );
}

/* =========================================================
   RENDER STUDENTS
   ========================================================= */

function renderStudents(
    students,
    search
) {
    const container =
        document.getElementById(
            "studentsTable"
        );

    if (!container) {
        return;
    }

    const term =
        String(
            search || ""
        )
            .toLowerCase()
            .trim();

    const filtered =
        students.filter(
            function (student) {
                const profile =
                    student.profile ||
                    {};

                const course =
                    student.course ||
                    {};

                const studentName = [
                    profile.first_name,
                    profile.last_name
                ]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                const haystack = [
                    studentName,
                    profile.first_name,
                    profile.last_name,
                    profile.email,
                    course.title,
                    course.slug
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return (
                    !term ||
                    haystack.includes(term)
                );
            }
        );

    if (!filtered.length) {
        container.innerHTML =
            renderEmpty(
                term
                    ? "No LMS students match your search."
                    : "No LMS students found."
            );
        return;
    }

    container.innerHTML = `
        <table class="admin-data-table">
            <thead>
                <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Course</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Enrolled</th>
                </tr>
            </thead>

            <tbody>
                ${filtered
                    .map(
                        function (student) {
                            const profile =
                                student.profile ||
                                {};

                            const course =
                                student.course ||
                                {};

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
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            profile.email ||
                                            "—"
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            course.title ||
                                            "—"
                                        )}
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
                                            student.status
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            student.enrolled_at
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
   AUDIT LOG
   ========================================================= */

async function loadAuditLog() {

    const container =
        document.getElementById(
            "auditTable"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="empty-state">
            Loading audit activity...
        </div>
    `;


    const {
        data,
        error
    } =
        await window.screenings4uSupabase
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
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(100);


    if (error) {

        console.error(
            error
        );


        container.innerHTML =
            renderError(
                error.message
            );


        return;
    }


    if (
        !data ||
        !data.length
    ) {

        container.innerHTML =
            renderEmpty(
                "No audit activity has been recorded yet."
            );

        return;
    }


    container.innerHTML = `
        <table class="admin-data-table">

            <thead>

                <tr>

                    <th>Action</th>

                    <th>Entity</th>

                    <th>Details</th>

                    <th>Date</th>

                </tr>

            </thead>


            <tbody>

                ${data
                    .map(
                        function (entry) {

                            const entity =
                                [
                                    entry.entity_type,
                                    entry.entity_id
                                ]
                                    .filter(Boolean)
                                    .join(" / ");


                            return `
                                <tr>

                                    <td>
                                        <strong>
                                            ${escapeHtml(
                                                entry.action ||
                                                "—"
                                            )}
                                        </strong>
                                    </td>


                                    <td>
                                        ${escapeHtml(
                                            entity ||
                                            "—"
                                        )}
                                    </td>


                                    <td>
                                        <code>
                                            ${escapeHtml(
                                                JSON.stringify(
                                                    entry.details ||
                                                    {}
                                                )
                                            )}
                                        </code>
                                    </td>


                                    <td>
                                        ${formatDate(
                                            entry.created_at
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
   RECENT ORDER TABLE
   ========================================================= */

function renderOrderTable(
    orders
) {

    if (!orders.length) {

        return renderEmpty(
            "No orders found."
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
                                        ${escapeHtml(
                                            order.customer_email ||
                                            "—"
                                        )}
                                    </td>


                                    <td>
                                        ${formatCurrency(
                                            order.total
                                        )}
                                    </td>


                                    <td>
                                        ${statusBadge(
                                            order.status
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
   RECENT STUDENT TABLE
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
                    .map(
                        function (student) {
                            const profile =
                                student.profile ||
                                {};

                            const course =
                                student.course ||
                                {};

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
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            course.title ||
                                            "—"
                                        )}
                                    </td>

                                    <td>
                                        ${progress}%
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
   CURRENCY
   ========================================================= */

function formatCurrency(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
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


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    isError
) {

    const toast =
        document.getElementById(
            "adminToast"
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


    window.clearTimeout(
        window.adminToastTimer
    );


    window.adminToastTimer =
        window.setTimeout(
            function () {

                toast.classList.remove(
                    "visible"
                );

            },
            4000
        );
}