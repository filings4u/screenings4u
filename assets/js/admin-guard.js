/**
 * screenings4u — Shared Admin Route Guard
 *
 * Loaded after admin-config.js and before page-specific admin scripts.
 * Every protected admin page must have an authenticated Supabase user with
 * a corresponding active admin_profiles record.
 */
(() => {
  "use strict";

  const LOGIN_PAGE = "admin-login.html";
  const PUBLIC_PAGES = new Set(["admin-login.html"]);

  function currentPage() {
    const page = String(window.location.pathname || "")
      .split("/")
      .pop()
      .split("?")[0]
      .split("#")[0];
    return page || "admin-dashboard.html";
  }

  function client() {
    return (
      window.Screenings4uAdmin?.supabase ||
      window.supabaseClient ||
      window.screenings4uSupabase ||
      null
    );
  }

  async function verify() {
    const page = currentPage();
    if (PUBLIC_PAGES.has(page)) return true;

    const db = client();
    if (!db?.auth) {
      throw new Error("The admin authentication service could not be initialized.");
    }

    const { data: sessionData, error: sessionError } =
      await db.auth.getSession();

    if (sessionError) throw sessionError;

    const user = sessionData?.session?.user;
    if (!user?.id) return false;

    const { data: admin, error: adminError } = await db
      .from("admin_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (adminError) throw adminError;
    if (!admin) return false;

    if (
      Object.prototype.hasOwnProperty.call(admin, "is_active") &&
      admin.is_active === false
    ) {
      return false;
    }

    window.screenings4uAdminProfile = admin;

    const level = String(admin.admin_level || "admin")
      .trim()
      .toLowerCase();

    window.screenings4uAdminRole =
      level === "superadmin" || level === "super_admin"
        ? "superadmin"
        : "admin";

    window.Screenings4uAdminReady = true;
    return true;
  }

  async function run() {
    try {
      const allowed = await verify();

      if (!allowed) {
        const db = client();
        try {
          await db?.auth?.signOut();
        } catch (_) {}

        window.location.replace(LOGIN_PAGE);
        return;
      }

      document.documentElement.classList.add("admin-authenticated");
    } catch (error) {
      console.error("Admin route guard failed:", error);
      window.location.replace(LOGIN_PAGE);
    }
  }

  window.Screenings4uAdminRouteGuard = {
    verify,
    run
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
