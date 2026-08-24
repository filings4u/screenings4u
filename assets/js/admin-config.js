/*
 * =========================================================
 * screenings4u — Admin / LMS Configuration
 *
 * Location:
 * assets/js/admin-config.js
 *
 * SINGLE SUPABASE CLIENT FOR:
 * - Admin dashboard
 * - Admin authentication
 * - LMS admin pages
 * - LMS student pages that use the shared client
 *
 * Load order:
 * 1. Supabase CDN
 * 2. admin-config.js
 * 3. page-specific JavaScript
 * =========================================================
 */

(() => {
    "use strict";

    const SUPABASE_URL =
        "https://rgsrubdtljyxmnihwlah.supabase.co";

    const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnc3J1YmR0bGp5eG1uaWh3bGFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NjYxODgsImV4cCI6MjEwMjI0MjE4OH0.al5nEbeGjGncHZ9cJjh1oN76XjfS4EfYj5fXyeD2CE0";


    /* =====================================================
       VERIFY SUPABASE LIBRARY
       ===================================================== */

    if (!window.supabase) {
        console.error(
            "Supabase library is not loaded. " +
            "Load @supabase/supabase-js before admin-config.js."
        );

        return;
    }


    /* =====================================================
       VERIFY CONFIGURATION
       ===================================================== */

    if (
        !SUPABASE_URL ||
        !SUPABASE_ANON_KEY ||
        SUPABASE_URL.includes("REPLACE_WITH") ||
        SUPABASE_ANON_KEY.includes("REPLACE_WITH")
    ) {
        console.error(
            "Supabase configuration is incomplete."
        );

        return;
    }


    /* =====================================================
       CREATE ONE SHARED CLIENT
       ===================================================== */

    if (!window.supabaseClient) {

        window.supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );
    }


    /* =====================================================
       COMPATIBILITY ALIAS
       
       Existing pages may reference:
       window.screenings4uSupabase

       Point it at the EXACT SAME client.
       ===================================================== */

    window.screenings4uSupabase =
        window.supabaseClient;


    /* =====================================================
       ADMIN CONFIG OBJECT
       ===================================================== */

    window.Screenings4uAdmin = {
        supabase: window.supabaseClient,
        supabaseUrl: SUPABASE_URL
    };


    /* =====================================================
       OPTIONAL GLOBAL CONFIG VALUES
       
       These are provided only for compatibility with older
       code. New code should use Screenings4uAdmin.supabase.
       ===================================================== */

    window.SCREENINGS4U_SUPABASE_URL =
        SUPABASE_URL;

    window.SCREENINGS4U_SUPABASE_ANON_KEY =
        SUPABASE_ANON_KEY;


    /* =====================================================
       DEBUG CONFIRMATION
       ===================================================== */

    console.log(
        "screenings4u Supabase client initialized."
    );

})();