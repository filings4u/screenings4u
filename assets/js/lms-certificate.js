(() => {
  "use strict";

  let client;
  let user;
  let certificate;
  let enrollment;
  let course;

  const $ = id => document.getElementById(id);

  function getClient() {
    return window.getScreenings4uSupabase
      ? window.getScreenings4uSupabase()
      : window.screenings4uSupabase ||
        window.supabaseClient ||
        window.supabase;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function params() {
    const p = new URLSearchParams(location.search);
    return {
      enrollmentId: p.get("enrollment") || p.get("enrollment_id") || ""
    };
  }

  function nameFromUser() {
    const meta = user?.user_metadata || {};
    return meta.full_name ||
      [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
      user?.email ||
      "Student";
  }

  function formatDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
  }

  async function init() {
    try {
      client = getClient();
      if (!client) throw new Error("Supabase client is not configured.");

      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        location.href = "../client-login.html";
        return;
      }

      user = data.session.user;

      const { enrollmentId } = params();
      if (!enrollmentId) throw new Error("No training enrollment was specified.");

      const result = await client.functions.invoke(
        "lms-issue-certificate",
        { body: { enrollmentId } }
      );

      if (result.error) throw result.error;
      if (!result.data?.success) {
        throw new Error(result.data?.error || "Certificate could not be issued.");
      }

      certificate = result.data.certificate;
      enrollment = result.data.enrollment;
      course = result.data.course;

      render();
    } catch (error) {
      console.error("Certificate page error:", error);
      showError(error.message || "Unable to load your certificate.");
    }
  }

  function render() {
    $("certificateLoading").hidden = true;
    $("certificateError").hidden = true;
    $("certificateCard").hidden = false;

    $("certificateHeaderMessage").textContent =
      "Your verified course completion certificate is ready.";

    $("certificateStudentName").textContent =
      resultStudentName();

    $("certificateCourseTitle").textContent =
      course?.title || "Training Course";

    $("certificateNumber").textContent =
      certificate?.certificate_number || "—";

    $("certificateIssuedDate").textContent =
      formatDate(certificate?.issued_at);

    const revoked = Boolean(certificate?.revoked_at);
    $("certificateStatus").textContent =
      revoked ? "Revoked" : "Valid";

    $("printCertificateButton").hidden = revoked;
    $("printCertificateButton").onclick = () => window.print();

    const back = $("backToTraining");
    if (back && enrollment?.course_id && enrollment?.id) {
      back.href =
        `../lms-course-player.html?course=${encodeURIComponent(enrollment.course_id)}&enrollment=${encodeURIComponent(enrollment.id)}`;
    }
  }

  function resultStudentName() {
    const metadata = certificate?.metadata || {};
    return metadata.student_name || nameFromUser();
  }

  function showError(message) {
    $("certificateLoading").hidden = true;
    $("certificateError").hidden = false;
    $("certificateCard").hidden = true;
    $("certificateHeaderMessage").textContent =
      "We could not issue or load your certificate.";
    $("certificateErrorMessage").textContent = message;
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
