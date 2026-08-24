/* =========================================================
   screenings4u LMS Shared Helpers
   Authentication + common LMS data helpers
   ========================================================= */

(() => {
    "use strict";

    const getClient = () => {
        const client =
            window.supabaseClient ||
            window.Screenings4uAdmin?.supabase ||
            window.Screenings4uClient?.supabase;

        if (!client) {
            throw new Error("Supabase client is not initialized.");
        }

        return client;
    };

    async function getCurrentUser() {
        const client = getClient();

        const {
            data,
            error
        } = await client.auth.getUser();

        if (error) {
            throw error;
        }

        return data?.user || null;
    }

    async function requireAuthenticatedUser(redirect = null) {
        const user = await getCurrentUser();

        if (!user && redirect) {
            window.location.href = redirect;
            return null;
        }

        if (!user) {
            throw new Error("Authentication required.");
        }

        return user;
    }

    async function getSession() {
        const client = getClient();

        const {
            data,
            error
        } = await client.auth.getSession();

        if (error) {
            throw error;
        }

        return data?.session || null;
    }

    window.Screenings4uLMS = {
        getClient,
        getCurrentUser,
        requireAuthenticatedUser,
        getSession
    };
})();