/* =========================================================
   screenings4u Client / LMS Configuration
   Shared Supabase client for all customer LMS pages
   ========================================================= */

(() => {
    "use strict";

    /*
     * Client pages use the same Supabase project as the admin LMS.
     * Authentication determines which customer's data is visible.
     */

    const SUPABASE_URL = "https://rgsrubdtljyxmnihwlah.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnc3J1YmR0bGp5eG1uaWh3bGFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NjYxODgsImV4cCI6MjEwMjI0MjE4OH0.al5nEbeGjGncHZ9cJjh1oN76XjfS4EfYj5fXyeD2CE0";

    if (!window.supabase) {
        console.error(
            "Supabase library is not loaded. " +
            "Load @supabase/supabase-js before client-config.js."
        );
        return;
    }

    if (
        SUPABASE_URL.includes("REPLACE_WITH") ||
        SUPABASE_ANON_KEY.includes("REPLACE_WITH")
    ) {
        console.error(
            "Supabase configuration is incomplete. " +
            "Set SUPABASE_URL and SUPABASE_ANON_KEY in client-config.js."
        );
        return;
    }

    if (!window.supabaseClient) {
        window.supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );
    }

    window.Screenings4uClient = {
        supabase: window.supabaseClient
    };
})();