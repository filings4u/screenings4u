/*
 * =========================================================
 * screenings4u
 * Admin Account & Invitation Management
 *
 * Location:
 * assets/js/admin-accounts.js
 * =========================================================
 */

(function () {
    "use strict";

    let supabaseClient = null;

    let accounts = [];
    let invitations = [];
    let adminUsers = [];
    let selectedAccount = null;

    const SUPERADMIN_ID =
        "8886ef8e-bfbc-4e36-8a0d-7287f34628dc";

    const SUPERADMIN_EMAIL =
        "aerving@screenings4u.com";


    /* =========================================================
       INITIALIZE
       ========================================================= */

    async function initializeAccountManagement() {
        try {
            supabaseClient = getSupabaseClient();

            if (!supabaseClient) {
                throw new Error(
                    "Supabase client could not be initialized."
                );
            }

            initializeAccountEvents();

            await loadAccountPage();

        } catch (error) {
            console.error(
                "Account management initialization error:",
                error
            );

            showToast(
                error.message ||
                "Unable to initialize account management.",
                "error"
            );
        }
    }


    /* =========================================================
       SUPABASE CLIENT
       ========================================================= */

    function getSupabaseClient() {
        if (window.screenings4uSupabase) {
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


    /* =========================================================
       LOAD PAGE
       ========================================================= */

    async function loadAccountPage() {
        await Promise.all([
            loadAccounts(),
            loadInvitations(),
            loadAdminUsers()
        ]);
    }


    /* =========================================================
       LOAD CUSTOMER ACCOUNTS
       ========================================================= */

    async function loadAccounts() {
        const table =
            document.getElementById("accountsTable");

        if (table) {
            table.innerHTML = `
                <div class="empty-state">
                    Loading accounts...
                </div>
            `;
        }

        const { data, error } =
            await supabaseClient
                .from("clients")
                .select(`
                    id,
                    role,
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
                
                .order("created_at", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        accounts =
            Array.isArray(data)
                ? data
                : [];

        updateAccountMetrics();
        renderAccounts();
    }


    /* =========================================================
       LOAD INVITATIONS
       ========================================================= */

    async function loadInvitations() {
        const table =
            document.getElementById("invitationsTable");

        if (table) {
            table.innerHTML = `
                <div class="empty-state">
                    Loading invitations...
                </div>
            `;
        }

        const { data, error } =
            await supabaseClient
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
                .order("created_at", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        invitations =
            Array.isArray(data)
                ? data
                : [];

        updateAccountMetrics();
        renderInvitations();
    }


    /* =========================================================
       LOAD ADMIN USERS
       ========================================================= */

    async function loadAdminUsers() {
        const table =
            document.getElementById("adminUsersTable");

        if (table) {
            table.innerHTML = `
                <div class="empty-state">
                    Loading admin users...
                </div>
            `;
        }

        const { data, error } =
            await supabaseClient
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
                
                .order("created_at", {
                    ascending: true
                });

        if (error) {
            throw error;
        }

        adminUsers =
            Array.isArray(data)
                ? data
                : [];

        renderAdminUsers();
    }


    /* =========================================================
       METRICS
       ========================================================= */

    function updateAccountMetrics() {

        const totalAccounts =
            accounts.length;

        const activeAccounts =
            accounts.filter(function (account) {
                return account.is_active !== false;
            }).length;

        const pendingInvitations =
            invitations.filter(function (invitation) {
                return (
                    getInvitationStatus(invitation) ===
                    "pending"
                );
            }).length;

        const acceptedInvitations =
            invitations.filter(function (invitation) {
                return (
                    getInvitationStatus(invitation) ===
                    "accepted"
                );
            }).length;


        setText(
            "metricTotalAccounts",
            totalAccounts
        );

        setText(
            "metricActiveAccounts",
            activeAccounts
        );

        setText(
            "metricPendingInvitations",
            pendingInvitations
        );

        setText(
            "metricAcceptedInvitations",
            acceptedInvitations
        );
    }


    /* =========================================================
       RENDER ACCOUNTS
       ========================================================= */

    function renderAccounts() {
        const container =
            document.getElementById(
                "accountsTable"
            );

        if (!container) {
            return;
        }

        const search =
            String(
                document.getElementById(
                    "accountSearch"
                )?.value || ""
            )
                .trim()
                .toLowerCase();

        const statusFilter =
            String(
                document.getElementById(
                    "accountStatusFilter"
                )?.value || ""
            )
                .trim()
                .toLowerCase();


        const filtered =
            accounts.filter(function (account) {

                const fullName =
                    getAccountName(account);

                const searchableText = [
                    fullName,
                    account.first_name,
                    account.last_name,
                    account.email,
                    account.company_name,
                    account.phone
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(search);


                const accountStatus =
                    getAccountStatus(account);


                const matchesStatus =
                    !statusFilter ||
                    accountStatus === statusFilter;


                return (
                    matchesSearch &&
                    matchesStatus
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
                        <th></th>
                    </tr>
                </thead>

                <tbody>
                    ${filtered
                        .map(function (account) {

                            return `
                                <tr>

                                    <td>
                                        <strong>
                                            ${escapeHtml(
                                                getAccountName(account) ||
                                                "Customer"
                                            )}
                                        </strong>
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            account.company_name ||
                                            "—"
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            account.email ||
                                            "—"
                                        )}
                                    </td>

                                    <td>
                                        ${renderStatusBadge(
                                            getAccountStatus(account)
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            account.created_at
                                        )}
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            class="secondary-button account-view-button"
                                            data-account-id="${escapeAttribute(
                                                account.id
                                            )}"
                                        >
                                            View
                                        </button>
                                    </td>

                                </tr>
                            `;
                        })
                        .join("")}
                </tbody>
            </table>
        `;


        container
            .querySelectorAll(
                ".account-view-button"
            )
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        openAccountDetail(
                            button.dataset.accountId
                        );

                    }
                );

            });
    }


    /* =========================================================
       RENDER INVITATIONS
       ========================================================= */

    function renderInvitations() {
        const container =
            document.getElementById(
                "invitationsTable"
            );

        if (!container) {
            return;
        }


        const search =
            String(
                document.getElementById(
                    "invitationSearch"
                )?.value || ""
            )
                .trim()
                .toLowerCase();


        const statusFilter =
            String(
                document.getElementById(
                    "invitationStatusFilter"
                )?.value || ""
            )
                .trim()
                .toLowerCase();


        const filtered =
            invitations.filter(function (invitation) {

                const searchableText = [
                    invitation.email,
                    invitation.order_id,
                    invitation.user_id
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(search);


                const status =
                    getInvitationStatus(
                        invitation
                    );


                const matchesStatus =
                    !statusFilter ||
                    status === statusFilter;


                return (
                    matchesSearch &&
                    matchesStatus
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
                        <th></th>
                    </tr>
                </thead>

                <tbody>

                    ${filtered
                        .map(function (invitation) {

                            return `
                                <tr>

                                    <td>
                                        <strong>
                                            ${escapeHtml(
                                                invitation.email ||
                                                "—"
                                            )}
                                        </strong>
                                    </td>

                                    <td>
                                        ${renderStatusBadge(
                                            getInvitationStatus(
                                                invitation
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            invitation.invited_at ||
                                            invitation.created_at
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            invitation.accepted_at
                                        )}
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            class="secondary-button invitation-resend-button"
                                            data-invitation-id="${escapeAttribute(
                                                invitation.id
                                            )}"
                                        >
                                            Resend
                                        </button>
                                    </td>

                                </tr>
                            `;

                        })
                        .join("")}

                </tbody>

            </table>
        `;


        container
            .querySelectorAll(
                ".invitation-resend-button"
            )
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        resendInvitation(
                            button.dataset.invitationId
                        );

                    }
                );

            });
    }


    /* =========================================================
       RENDER ADMIN USERS
       ========================================================= */

    function renderAdminUsers() {
        const container =
            document.getElementById(
                "adminUsersTable"
            );

        if (!container) {
            return;
        }


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
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>

                <tbody>

                    ${adminUsers
                        .map(function (admin) {

                            return `
                                <tr>

                                    <td>
                                        <strong>
                                            ${escapeHtml(
                                                getAccountName(admin) ||
                                                "Administrator"
                                            )}
                                        </strong>
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            admin.email ||
                                            "—"
                                        )}
                                    </td>

                                    <td>
                                        ${renderStatusBadge(
                                            String(admin.admin_level || "").toLowerCase() === "superadmin"
                                                ? "superadmin"
                                                : (
                                                    admin.is_active === false
                                                        ? "inactive"
                                                        : "active"
                                                )
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            admin.created_at
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
       ACCOUNT DETAIL
       ========================================================= */

    function openAccountDetail(accountId) {

        selectedAccount =
            accounts.find(function (account) {

                return (
                    String(account.id) ===
                    String(accountId)
                );

            });


        if (!selectedAccount) {
            return;
        }


        const invitation =
            findInvitationForAccount(
                selectedAccount
            );


        const customerName =
            getAccountName(
                selectedAccount
            ) || "Customer Account";


        setText(
            "accountDetailTitle",
            customerName
        );


        setText(
            "accountCustomerName",
            customerName
        );


        setText(
            "accountCustomerEmail",
            selectedAccount.email ||
            "—"
        );


        setText(
            "accountInitials",
            getInitials(
                customerName ||
                selectedAccount.email
            )
        );


        setText(
            "accountCompany",
            selectedAccount.company_name ||
            "—"
        );


        setText(
            "accountPhone",
            selectedAccount.phone ||
            "—"
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
                .join(", ") ||
                "—"
        );

        setText(
            "accountAdminLevel",
            selectedAccount.admin_level ||
            "—"
        );


        setText(
            "accountStatus",
            capitalize(
                getAccountStatus(
                    selectedAccount
                )
            )
        );


        setText(
            "accountCreated",
            formatDate(
                selectedAccount.created_at
            )
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
                capitalize(
                    getInvitationStatus(
                        invitation
                    )
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
                formatDate(
                    invitation.accepted_at
                )
            );


            /*
             * account_invites does not contain an
             * expires_at column.
             */
            setText(
                "detailInvitationExpires",
                "—"
            );

        } else {

            setText(
                "detailInvitationEmail",
                selectedAccount.email ||
                "—"
            );

            setText(
                "detailInvitationStatus",
                "No invitation"
            );

            setText(
                "detailInvitationSent",
                "—"
            );

            setText(
                "detailInvitationAccepted",
                "—"
            );

            setText(
                "detailInvitationExpires",
                "—"
            );
        }


        /*
         * Update the activate/deactivate controls
         * based on the actual account state.
         */

        const activateButton =
            document.getElementById(
                "activateAccountButton"
            );

        const deactivateButton =
            document.getElementById(
                "deactivateAccountButton"
            );


        if (activateButton) {

            activateButton.hidden =
                selectedAccount.is_active !== false;
        }


        if (deactivateButton) {

            deactivateButton.hidden =
                selectedAccount.is_active === false;
        }


        const panel =
            document.getElementById(
                "accountDetailPanel"
            );


        if (panel) {

            panel.hidden = false;

            panel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }


    /* =========================================================
       CLOSE DETAIL
       ========================================================= */

    function closeAccountDetail() {

        selectedAccount = null;


        const panel =
            document.getElementById(
                "accountDetailPanel"
            );


        if (panel) {
            panel.hidden = true;
        }
    }


    /* =========================================================
       FIND INVITATION FOR ACCOUNT
       ========================================================= */

    function findInvitationForAccount(account) {

        if (!account) {
            return null;
        }


        const accountId =
            String(account.id || "");


        const email =
            String(
                account.email || ""
            )
                .trim()
                .toLowerCase();


        /*
         * Prefer the actual user_id relationship.
         */
        const byUserId =
            invitations.find(
                function (invitation) {

                    return (
                        accountId &&
                        String(
                            invitation.user_id || ""
                        ) === accountId
                    );

                }
            );


        if (byUserId) {
            return byUserId;
        }


        /*
         * Fall back to email because the
         * invitation table also stores email.
         */
        if (email) {

            return (
                invitations.find(
                    function (invitation) {

                        return (
                            String(
                                invitation.email || ""
                            )
                                .trim()
                                .toLowerCase() ===
                            email
                        );

                    }
                ) || null
            );
        }


        return null;
    }


    /* =========================================================
       RESEND INVITATION
       ========================================================= */

    async function resendInvitation(
        invitationId
    ) {

        const invitation =
            invitations.find(
                function (item) {

                    return (
                        String(item.id) ===
                        String(invitationId)
                    );

                }
            );


        if (!invitation) {
            return;
        }


        /*
         * The browser must not use the Supabase
         * service-role key to send invitations.
         *
         * A secure Edge Function/server endpoint
         * needs to perform the actual invitation
         * email operation.
         */

        showToast(
            "Invitation resend requires the secure Supabase invitation workflow.",
            "error"
        );
    }


    /* =========================================================
       ACTIVATE ACCOUNT
       ========================================================= */

    async function activateSelectedAccount() {

        if (!selectedAccount) {
            return;
        }


        await updateAccountStatus(
            selectedAccount.id,
            true
        );
    }


    /* =========================================================
       DEACTIVATE ACCOUNT
       ========================================================= */

    async function deactivateSelectedAccount() {

        if (!selectedAccount) {
            return;
        }


        const confirmed =
            window.confirm(
                "Are you sure you want to deactivate this customer account?"
            );


        if (!confirmed) {
            return;
        }


        await updateAccountStatus(
            selectedAccount.id,
            false
        );
    }


    /* =========================================================
       UPDATE ACCOUNT STATUS
       ========================================================= */

    async function updateAccountStatus(
        accountId,
        isActive
    ) {

        if (String(accountId || "") === SUPERADMIN_ID) {
            showToast(
                "The primary superadmin account cannot be deactivated.",
                "error"
            );
            return;
        }

        try {

            const { error } =
                await supabaseClient
                    .from("clients")
                    .update({
                        is_active: isActive
                    })
                    .eq(
                        "id",
                        accountId
                    );


            if (error) {
                throw error;
            }


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
                error.message ||
                "Unable to update account status.",
                "error"
            );
        }
    }


    /* =========================================================
       ACCOUNT STATUS
       ========================================================= */

    function getAccountStatus(account) {

        if (
            account.is_active === false
        ) {
            return "inactive";
        }


        const invitation =
            findInvitationForAccount(
                account
            );


        if (
            invitation &&
            getInvitationStatus(
                invitation
            ) === "pending"
        ) {
            return "pending";
        }


        return "active";
    }


    /* =========================================================
       INVITATION STATUS
       ========================================================= */

    function getInvitationStatus(
        invitation
    ) {

        if (!invitation) {
            return "unknown";
        }


        /*
         * accepted_at is the strongest indication
         * that the invitation was accepted.
         */
        if (invitation.accepted_at) {
            return "accepted";
        }


        if (invitation.status) {

            return String(
                invitation.status
            ).toLowerCase();
        }


        return "pending";
    }


    /* =========================================================
       EVENTS
       ========================================================= */

    function initializeAccountEvents() {

        document
            .getElementById(
                "accountSearch"
            )
            ?.addEventListener(
                "input",
                renderAccounts
            );


        document
            .getElementById(
                "accountStatusFilter"
            )
            ?.addEventListener(
                "change",
                renderAccounts
            );


        document
            .getElementById(
                "invitationSearch"
            )
            ?.addEventListener(
                "input",
                renderInvitations
            );


        document
            .getElementById(
                "invitationStatusFilter"
            )
            ?.addEventListener(
                "change",
                renderInvitations
            );


        document
            .getElementById(
                "refreshAccountsButton"
            )
            ?.addEventListener(
                "click",
                loadAccountPage
            );


        document
            .getElementById(
                "closeAccountDetailButton"
            )
            ?.addEventListener(
                "click",
                closeAccountDetail
            );


        document
            .getElementById(
                "resendInvitationButton"
            )
            ?.addEventListener(
                "click",
                function () {

                    if (!selectedAccount) {
                        return;
                    }


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


                    resendInvitation(
                        invitation.id
                    );
                }
            );


        document
            .getElementById(
                "activateAccountButton"
            )
            ?.addEventListener(
                "click",
                activateSelectedAccount
            );


        document
            .getElementById(
                "deactivateAccountButton"
            )
            ?.addEventListener(
                "click",
                deactivateSelectedAccount
            );
    }


    /* =========================================================
       STATUS BADGE
       ========================================================= */

    function renderStatusBadge(
        status
    ) {

        const safeStatus =
            String(
                status || "unknown"
            )
                .toLowerCase();


        return `
            <span class="status-badge status-${escapeAttribute(
                safeStatus
            )}">
                ${escapeHtml(
                    capitalize(safeStatus)
                )}
            </span>
        `;
    }


    /* =========================================================
       ACCOUNT NAME
       ========================================================= */

    function getAccountName(account) {

        if (!account) {
            return "";
        }


        const firstName =
            String(
                account.first_name || ""
            ).trim();


        const lastName =
            String(
                account.last_name || ""
            ).trim();


        const fullName =
            `${firstName} ${lastName}`
                .trim();


        if (fullName) {
            return fullName;
        }


        return (
            account.email ||
            ""
        );
    }


    /* =========================================================
       SUPERADMIN PROTECTION
       ========================================================= */

    function isSuperAdmin(admin) {
        if (!admin) {
            return false;
        }

        return (
            String(admin.id || "") === SUPERADMIN_ID ||
            String(admin.email || "").trim().toLowerCase() ===
                SUPERADMIN_EMAIL
        );
    }


    /* =========================================================
       SET TEXT
       ========================================================= */

    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent =
                value === null ||
                value === undefined ||
                value === ""
                    ? "—"
                    : String(value);
        }
    }


    /* =========================================================
       FORMAT DATE
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
       GET INITIALS
       ========================================================= */

    function getInitials(
        value
    ) {

        if (!value) {
            return "—";
        }


        const parts =
            String(value)
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (!parts.length) {
            return "—";
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


    /* =========================================================
       CAPITALIZE
       ========================================================= */

    function capitalize(
        value
    ) {

        const text =
            String(value || "");


        if (!text) {
            return "";
        }


        return (
            text.charAt(0).toUpperCase() +
            text.slice(1)
        );
    }


    /* =========================================================
       ESCAPE HTML
       ========================================================= */

    function escapeHtml(
        value
    ) {

        return String(
            value === null ||
            value === undefined
                ? ""
                : value
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
        return escapeHtml(value);
    }


    /* =========================================================
       TOAST
       ========================================================= */

    function showToast(
        message,
        type
    ) {

        const toast =
            document.getElementById(
                "accountToast"
            );


        if (!toast) {
            console.log(message);
            return;
        }


        toast.textContent =
            message;


        toast.className =
            "admin-toast show " +
            (
                type === "error"
                    ? "error"
                    : "success"
            );


        window.clearTimeout(
            showToast.timeout
        );


        showToast.timeout =
            window.setTimeout(
                function () {

                    toast.classList.remove(
                        "show"
                    );

                },
                4000
            );
    }


    /* =========================================================
       DOM READY
       ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeAccountManagement
        );

    } else {

        initializeAccountManagement();

    }

})();