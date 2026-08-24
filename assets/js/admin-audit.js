/*
 * =========================================================
 * screenings4u — Admin Audit Log Controller
 *
 * Location:
 * assets/js/admin-audit.js
 * =========================================================
 */

document.addEventListener("DOMContentLoaded", function () {
    initializeAuditPage();
});


let auditClient = null;
let allAuditEvents = [];
let auditProfiles = {};


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeAuditPage() {
    auditClient = getAuditSupabaseClient();

    if (!auditClient) {
        setAuditMessage(
            "Supabase configuration could not be loaded."
        );
        return;
    }

    initializeAuditControls();

    await loadAuditEvents();
}


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getAuditSupabaseClient() {

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


/* =========================================================
   CONTROLS
   ========================================================= */

function initializeAuditControls() {

    const search =
        document.getElementById(
            "auditSearch"
        );

    const filter =
        document.getElementById(
            "auditActionFilter"
        );

    const refresh =
        document.getElementById(
            "refreshAuditButton"
        );


    if (search) {
        search.addEventListener(
            "input",
            renderAuditEvents
        );
    }


    if (filter) {
        filter.addEventListener(
            "change",
            renderAuditEvents
        );
    }


    if (refresh) {
        refresh.addEventListener(
            "click",
            loadAuditEvents
        );
    }
}


/* =========================================================
   LOAD AUDIT EVENTS
   ========================================================= */

async function loadAuditEvents() {

    setAuditMessage(
        "Loading audit log..."
    );


    try {

        const result =
            await auditClient
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
                );


        if (result.error) {
            throw result.error;
        }


        allAuditEvents =
            Array.isArray(result.data)
                ? result.data
                : [];


        await loadAuditProfiles();


        updateAuditMetrics();

        renderAuditEvents();


    } catch (error) {

        console.error(
            "Unable to load audit log:",
            error
        );


        setAuditMessage(
            "Unable to load the audit log. Check the browser console for the Supabase error."
        );


        showAuditToast(
            "Unable to load audit log.",
            "error"
        );
    }
}


/* =========================================================
   LOAD ACTOR PROFILES
   ========================================================= */

async function loadAuditProfiles() {

    auditProfiles = {};


    const actorIds =
        [
            ...new Set(
                allAuditEvents
                    .map(function (event) {
                        return event.actor_user_id;
                    })
                    .filter(Boolean)
            )
        ];


    if (!actorIds.length) {
        return;
    }


    const { data, error } =
        await auditClient
            .from("profiles")
            .select(`
                id,
                first_name,
                last_name,
                email,
                role,
                is_active
            `)
            .in(
                "id",
                actorIds
            );


    if (error) {

        console.warn(
            "Unable to load audit actor profiles:",
            error
        );

        return;
    }


    (data || []).forEach(
        function (profile) {

            auditProfiles[
                String(profile.id)
            ] = profile;

        }
    );
}


/* =========================================================
   AUDIT METRICS
   ========================================================= */

function updateAuditMetrics() {

    const todayKey =
        new Date()
            .toISOString()
            .slice(0, 10);


    const todayCount =
        allAuditEvents.filter(
            function (event) {

                const date =
                    getEventDate(event);


                return (
                    date &&
                    date.slice(0, 10) ===
                    todayKey
                );
            }
        ).length;


    const loginCount =
        allAuditEvents.filter(
            function (event) {

                return (
                    getAction(event) ===
                    "login"
                );
            }
        ).length;


    const changeCount =
        allAuditEvents.filter(
            function (event) {

                const action =
                    getAction(event);


                return [
                    "create",
                    "update",
                    "delete"
                ].includes(action);
            }
        ).length;


    setText(
        "auditTotal",
        allAuditEvents.length
    );


    setText(
        "auditToday",
        todayCount
    );


    setText(
        "auditLogins",
        loginCount
    );


    setText(
        "auditChanges",
        changeCount
    );
}


/* =========================================================
   RENDER AUDIT EVENTS
   ========================================================= */

function renderAuditEvents() {

    const table =
        document.getElementById(
            "auditTable"
        );


    if (!table) {
        return;
    }


    const searchInput =
        document.getElementById(
            "auditSearch"
        );


    const filterInput =
        document.getElementById(
            "auditActionFilter"
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
        allAuditEvents.filter(
            function (event) {

                const action =
                    getAction(event);


                const detailsText =
                    event.details
                        ? JSON.stringify(
                            event.details
                        )
                        : "";


                const searchable = [
                    action,
                    event.entity_type,
                    event.entity_id,
                    event.actor_user_id,
                    detailsText
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchable.includes(
                        search
                    );


                const matchesFilter =
                    filter === "all" ||
                    action === filter;


                return (
                    matchesSearch &&
                    matchesFilter
                );
            }
        );


    if (!filtered.length) {

        table.innerHTML = `
            <div class="empty-state">
                No audit events found.
            </div>
        `;

        return;
    }


    table.innerHTML = `
        <table class="admin-data-table">

            <thead>
                <tr>
                    <th>Date & Time</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Event</th>
                    <th>Record</th>
                </tr>
            </thead>

            <tbody>
                ${filtered
                    .map(renderAuditRow)
                    .join("")}
            </tbody>

        </table>
    `;
}


/* =========================================================
   RENDER AUDIT ROW
   ========================================================= */

function renderAuditRow(event) {

    const action =
        getAction(event);


    const user =
        getEventUser(event);


    const eventName =
        getEventDescription(event);


    const record =
        event.entity_id ||
        event.entity_type ||
        "—";


    return `
        <tr>

            <td>
                <span class="audit-time">
                    ${escapeHtml(
                        formatDateTime(
                            getEventDate(event)
                        )
                    )}
                </span>
            </td>


            <td>
                <span class="audit-action ${escapeHtml(
                    action
                )}">
                    ${escapeHtml(
                        formatAction(action)
                    )}
                </span>
            </td>


            <td>
                <div class="audit-event">

                    <strong>
                        ${escapeHtml(
                            user.name
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            user.email
                        )}
                    </small>

                </div>
            </td>


            <td>
                <div class="audit-event">

                    <strong>
                        ${escapeHtml(
                            eventName
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            getTableName(event)
                        )}
                    </small>

                </div>
            </td>


            <td>
                <span class="audit-record">
                    ${escapeHtml(
                        String(record)
                    )}
                </span>
            </td>

        </tr>
    `;
}


/* =========================================================
   GET ACTION
   ========================================================= */

function getAction(event) {

    const raw =
        event.action ||
        "activity";


    const value =
        String(raw)
            .toLowerCase()
            .trim();


    if (
        value.includes("login") ||
        value.includes("sign in")
    ) {
        return "login";
    }


    if (
        value.includes("logout") ||
        value.includes("sign out")
    ) {
        return "logout";
    }


    if (
        value.includes("create") ||
        value.includes("insert")
    ) {
        return "create";
    }


    if (
        value.includes("update") ||
        value.includes("edit")
    ) {
        return "update";
    }


    if (
        value.includes("delete") ||
        value.includes("remove")
    ) {
        return "delete";
    }


    if (
        value.includes("complete")
    ) {
        return "complete";
    }


    return value
        .replace(/\s+/g, "-");
}


/* =========================================================
   GET EVENT USER
   ========================================================= */

function getEventUser(event) {

    const actorId =
        event.actor_user_id
            ? String(
                event.actor_user_id
            )
            : "";


    const profile =
        actorId
            ? auditProfiles[actorId]
            : null;


    if (!profile) {

        return {
            name: "System",
            email: "System activity"
        };
    }


    const firstName =
        String(
            profile.first_name || ""
        ).trim();


    const lastName =
        String(
            profile.last_name || ""
        ).trim();


    const name =
        `${firstName} ${lastName}`
            .trim() ||
        profile.email ||
        "Administrator";


    return {
        name: String(name),
        email: String(
            profile.email ||
            "—"
        )
    };
}


/* =========================================================
   GET EVENT DATE
   ========================================================= */

function getEventDate(event) {

    return (
        event.created_at ||
        null
    );
}


/* =========================================================
   GET EVENT DESCRIPTION
   ========================================================= */

function getEventDescription(event) {

    const action =
        getAction(event);


    const entityType =
        event.entity_type ||
        "system";


    const details =
        event.details &&
        typeof event.details === "object"
            ? event.details
            : {};


    /*
     * If details contains a useful message,
     * use it rather than dumping JSON.
     */

    const descriptionKeys = [
        "description",
        "message",
        "name",
        "title",
        "reason"
    ];


    for (
        let i = 0;
        i < descriptionKeys.length;
        i++
    ) {

        const key =
            descriptionKeys[i];


        if (
            details[key] !== undefined &&
            details[key] !== null &&
            String(details[key]).trim()
        ) {

            return String(
                details[key]
            );
        }
    }


    return (
        `${formatAction(action)} ${formatEntityName(
            entityType
        )}`
    );
}


/* =========================================================
   GET TABLE / ENTITY NAME
   ========================================================= */

function getTableName(event) {

    return (
        event.entity_type ||
        "System"
    );
}


/* =========================================================
   FORMAT ENTITY NAME
   ========================================================= */

function formatEntityName(value) {

    return String(
        value || "record"
    )
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
        });
}


/* =========================================================
   FORMAT ACTION
   ========================================================= */

function formatAction(action) {

    return String(
        action || "activity"
    )
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
        });
}


/* =========================================================
   FORMAT DATE / TIME
   ========================================================= */

function formatDateTime(value) {

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


    return date.toLocaleString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
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
            value == null
                ? "—"
                : String(value);
    }
}


/* =========================================================
   AUDIT MESSAGE
   ========================================================= */

function setAuditMessage(
    message
) {

    const table =
        document.getElementById(
            "auditTable"
        );


    if (table) {

        table.innerHTML = `
            <div class="empty-state">
                ${escapeHtml(message)}
            </div>
        `;
    }
}


/* =========================================================
   AUDIT TOAST
   ========================================================= */

function showAuditToast(
    message,
    type
) {

    const toast =
        document.getElementById(
            "auditToast"
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