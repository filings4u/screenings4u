/*
 * =========================================================
 * screenings4u — Admin Authentication
 *
 * Location:
 * assets/js/admin-auth.js
 *
 * Uses the SINGLE Supabase client created by admin-config.js.
 *
 * Authentication:
 * 1. Supabase email/password authentication
 * 2. Verify admin_profiles record
 * 3. Verify active status when available
 * 4. Determine admin role
 * 5. Redirect to admin dashboard
 *
 * IMPORTANT:
 * This is the CLIENT-SIDE authentication layer.
 *
 * RLS / server-side authorization will be hardened after
 * the complete admin + LMS system is finished.
 * =========================================================
 */

document.addEventListener(
    "DOMContentLoaded",
    initializeAdminLogin
);


let adminAuthClient = null;


const SUPERADMIN_EMAIL =
    "aerving@screenings4u.com";


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeAdminLogin() {

    const form =
        document.getElementById(
            "adminLoginForm"
        );

    if (!form) {
        return;
    }


    /*
     * Get the SAME Supabase client used everywhere else.
     */

    adminAuthClient =
        getAdminAuthClient();


    if (!adminAuthClient) {

        setLoginMessage(
            "Supabase configuration could not be loaded.",
            "error"
        );

        return;
    }


    /*
     * Check whether an existing session is already present.
     */

    try {

        const {
            data,
            error
        } =
            await adminAuthClient.auth.getSession();


        if (error) {
            console.error(
                "Unable to read Supabase session:",
                error
            );
        }


        if (data?.session?.user) {

            const allowed =
                await verifyAdminProfile(
                    data.session.user
                );


            if (allowed) {

                window.location.replace(
                    "admin-dashboard.html"
                );

                return;
            }


            /*
             * Session exists but the user isn't authorized
             * for the admin console.
             */

            await adminAuthClient.auth.signOut();
        }

    } catch (error) {

        console.error(
            "Admin session initialization failed:",
            error
        );
    }


    /*
     * Attach login handler.
     */

    form.addEventListener(
        "submit",
        handleAdminLogin
    );
}


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getAdminAuthClient() {

    /*
     * Preferred shared client.
     */

    if (
        window.supabaseClient &&
        window.supabaseClient.auth
    ) {
        return window.supabaseClient;
    }


    /*
     * Shared Admin namespace.
     */

    if (
        window.Screenings4uAdmin &&
        window.Screenings4uAdmin.supabase &&
        window.Screenings4uAdmin.supabase.auth
    ) {
        return window.Screenings4uAdmin.supabase;
    }


    /*
     * Compatibility alias.
     */

    if (
        window.screenings4uSupabase &&
        window.screenings4uSupabase.auth
    ) {
        return window.screenings4uSupabase;
    }


    console.error(
        "No shared Supabase client was found."
    );


    return null;
}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleAdminLogin(event) {

    event.preventDefault();


    const emailElement =
        document.getElementById(
            "adminEmail"
        );

    const passwordElement =
        document.getElementById(
            "adminPassword"
        );

    const button =
        document.getElementById(
            "adminLoginButton"
        );


    const email =
        emailElement?.value
            ?.trim() || "";


    const password =
        passwordElement?.value || "";


    if (!email || !password) {

        setLoginMessage(
            "Enter your email and password.",
            "error"
        );

        return;
    }


    if (button) {

        button.disabled = true;

        button.textContent =
            "Signing In...";
    }


    setLoginMessage(
        "",
        ""
    );


    try {

        /*
         * Authenticate against Supabase.
         */

        const {
            data,
            error
        } =
            await adminAuthClient.auth
                .signInWithPassword({
                    email,
                    password
                });


        if (error) {
            throw error;
        }


        if (
            !data?.session ||
            !data?.user
        ) {

            throw new Error(
                "Supabase did not return an authenticated session."
            );
        }


        /*
         * Authentication succeeded.
         *
         * Now verify the account is an admin.
         */

        const allowed =
            await verifyAdminProfile(
                data.user
            );


        if (!allowed) {

            await adminAuthClient.auth.signOut();


            throw new Error(
                "This account authenticated successfully but is not authorized for the admin console."
            );
        }


        try {
            await adminAuthClient.rpc("write_audit_event", {
                p_action: "login",
                p_entity_type: "admin_session",
                p_entity_id: data.user.id,
                p_details: {
                    description: "Administrator signed in",
                    email: data.user.email || ""
                }
            });
        } catch (auditError) {
            console.warn("Unable to write login audit event:", auditError);
        }

        setLoginMessage(
            "Login successful. Loading admin console...",
            "success"
        );


        /*
         * Give Supabase's auth state a moment to persist.
         */

        window.setTimeout(
            () => {

                window.location.replace(
                    "admin-dashboard.html"
                );

            },
            150
        );

    } catch (error) {

        console.error(
            "Admin login failed:",
            error
        );


        setLoginMessage(
            getLoginErrorMessage(error),
            "error"
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Sign In";
        }
    }
}


/* =========================================================
   ADMIN AUTHORIZATION
   ========================================================= */

async function verifyAdminProfile(user) {

    if (
        !user ||
        !user.id
    ) {
        return false;
    }


    const userEmail =
        String(
            user.email || ""
        )
            .trim()
            .toLowerCase();


    /*
     * -------------------------------------------------------
     * SUPERADMIN
     * -------------------------------------------------------
     *
     * The email identifies the designated superadmin.
     *
     * The user MUST still:
     * - authenticate with Supabase
     * - have an admin_profiles row
     *
     * There is no authentication bypass here.
     */

    if (
        userEmail ===
        SUPERADMIN_EMAIL.toLowerCase()
    ) {

        const result =
            await adminAuthClient
                .from("admin_profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();


        if (result.error) {

            console.error(
                "Unable to verify superadmin record:",
                result.error
            );

            return false;
        }


        if (!result.data) {

            console.error(
                "Authenticated superadmin has no admin_profiles record."
            );

            return false;
        }


        /*
         * If is_active exists and is explicitly false,
         * do not allow access.
         */

        if (
            Object.prototype.hasOwnProperty.call(
                result.data,
                "is_active"
            ) &&
            result.data.is_active === false
        ) {

            console.error(
                "Superadmin account is inactive."
            );

            return false;
        }


        window.screenings4uAdminProfile =
            result.data;


        window.screenings4uAdminRole =
            "superadmin";


        return true;
    }


    /*
     * -------------------------------------------------------
     * STANDARD ADMIN
     * -------------------------------------------------------
     */

    const result =
        await adminAuthClient
            .from("admin_profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();


    if (result.error) {

        console.error(
            "Unable to verify admin account:",
            result.error
        );

        return false;
    }


    const admin =
        result.data;


    if (!admin) {

        console.error(
            "Authenticated user does not have an admin_profiles record."
        );

        return false;
    }


    /*
     * If the column exists and is false,
     * the administrator is inactive.
     */

    if (
        Object.prototype.hasOwnProperty.call(
            admin,
            "is_active"
        ) &&
        admin.is_active === false
    ) {

        console.error(
            "Admin account is inactive."
        );

        return false;
    }


    window.screenings4uAdminProfile =
        admin;


    window.screenings4uAdminRole =
        getAdminRole(admin);


    return true;
}


/* =========================================================
   ADMIN ROLE
   ========================================================= */

function getAdminRole(admin) {

    if (!admin) {
        return "admin";
    }


    const role =
        String(
            admin.admin_level || ""
        )
            .trim()
            .toLowerCase();


    if (
        role === "superadmin" ||
        role === "super_admin"
    ) {
        return "superadmin";
    }


    if (
        role === "admin"
    ) {
        return "admin";
    }


    return "admin";
}


/* =========================================================
   LOGIN ERROR MESSAGE
   ========================================================= */

function getLoginErrorMessage(error) {

    const message =
        String(
            error?.message || ""
        )
            .toLowerCase();


    if (
        message.includes(
            "invalid login credentials"
        ) ||
        message.includes(
            "invalid credentials"
        )
    ) {

        return "Incorrect email or password.";
    }


    if (
        message.includes(
            "email not confirmed"
        )
    ) {

        return "This email address has not been confirmed.";
    }


    if (
        message.includes(
            "too many requests"
        )
    ) {

        return "Too many login attempts. Please wait and try again.";
    }


    if (
        message.includes(
            "failed to fetch"
        ) ||
        message.includes(
            "network"
        )
    ) {

        return "Unable to reach the authentication server.";
    }


    if (
        message.includes(
            "not authorized"
        )
    ) {

        return (
            error?.message ||
            "This account is not authorized for the admin console."
        );
    }


    if (
        message.includes(
            "admin_profiles"
        )
    ) {

        return (
            "Unable to verify your admin account. Please contact an administrator."
        );
    }


    return (
        error?.message ||
        "Unable to sign in. Please try again."
    );
}


/* =========================================================
   LOGIN MESSAGE
   ========================================================= */

function setLoginMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "loginMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message || "";


    element.className =
        "form-message";


    if (type) {

        element.classList.add(
            type
        );
    }
}