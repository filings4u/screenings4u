(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  function db() {
    const c = window.supabaseClient || window.supabase || window.screenings4uSupabase;
    if (!c?.from) throw new Error("Supabase client is not available.");
    return c;
  }

  function esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function query() {
    const q = new URLSearchParams(location.search);
    return {
      certificate: q.get("certificate") || q.get("certificate_id") || "",
      enrollment: q.get("enrollment") || q.get("enrollment_id") || ""
    };
  }

  function date(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function showError(message) {
    $("certificateState").innerHTML = `
      <strong>Unable to load certificate</strong>
      <p>${esc(message)}</p>
    `;
    $("certificate").hidden = true;
  }

  async function load() {
    const q = query();
    if (!q.certificate && !q.enrollment) {
      throw new Error("No certificate or enrollment was specified.");
    }

    const { data: userData, error: userError } = await db().auth.getUser();
    if (userError) throw userError;
    if (!userData?.user) throw new Error("Please sign in to view this certificate.");

    let request = db().from("lms_certificates")
      .select(`
        id,
        enrollment_id,
        certificate_number,
        status,
        issued_at,
        revoked_at,
        metadata,
        enrollment:lms_enrollments(
          id,
          user_id,
          course_id,
          status,
          completed_at,
          course:lms_courses(
            id,
            title,
            short_description,
            description,
            certificate_enabled
          )
        )
      `);

    if (q.certificate) request = request.eq("id", q.certificate);
    else request = request.eq("enrollment_id", q.enrollment);

    const { data: cert, error } = await request.maybeSingle();
    if (error) throw error;
    if (!cert) throw new Error("Certificate not found.");

    if (cert.enrollment?.user_id !== userData.user.id) {
      throw new Error("You are not authorized to view this certificate.");
    }

    render(cert);

    const courseId = cert.enrollment?.course_id;
    $("certificateBack").href =
      `course-player.html?enrollment=${encodeURIComponent(cert.enrollment_id)}&course=${encodeURIComponent(courseId || "")}`;
  }

  function render(cert) {
    $("certificateState").style.display = "none";
    $("certificate").hidden = false;

    const enrollment = cert.enrollment || {};
    const course = enrollment.course || {};
    const metadata = cert.metadata || {};

    const studentName =
      metadata.student_name ||
      metadata.recipient_name ||
      metadata.user_name ||
      "Training Participant";

    $("studentName").textContent = studentName;
    $("courseTitle").textContent = course.title || metadata.course_title || "Training Course";

    const description =
      course.short_description ||
      metadata.course_description ||
      "";

    $("courseDescription").textContent = description;
    $("courseDescription").hidden = !description;

    const completionDate =
      enrollment.completed_at ||
      cert.issued_at;

    $("completionDate").textContent = date(completionDate);

    $("certificateNumber").textContent =
      cert.certificate_number || "—";

    $("verificationNumber").textContent =
      cert.certificate_number || "—";

    document.title =
      `${studentName} — Certificate | screenings4u`;

    if (cert.revoked_at || cert.status === "revoked") {
      const banner = document.createElement("div");
      banner.className = "certificate-revoked-banner";
      banner.textContent =
        `REVOKED — This certificate was revoked on ${date(cert.revoked_at)}.`;
      $("certificate").prepend(banner);
    }
  }

  $("certificatePrint").addEventListener("click", () => window.print());

  load().catch(error => {
    console.error(error);
    showError(error?.message || "An unexpected error occurred.");
  });
})();
