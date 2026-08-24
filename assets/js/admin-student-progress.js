(() => {
  "use strict";

  let db = null;
  let profiles = [];
  let courses = [];
  let sections = [];
  let lessons = [];
  let enrollments = [];
  let lessonProgress = [];
  let quizzes = [];
  let quizAttempts = [];
  let certificates = [];
  let students = [];
  let filteredStudents = [];

  const $ = id => document.getElementById(id);

  function getDb() {
    if (window.screenings4uSupabase?.from) return window.screenings4uSupabase;

    if (
      window.supabase?.from
    ) return window.supabase;

    if (
      window.supabase?.createClient &&
      window.SCREENINGS4U_SUPABASE_URL &&
      window.SCREENINGS4U_SUPABASE_ANON_KEY
    ) {
      return window.supabase.createClient(
        window.SCREENINGS4U_SUPABASE_URL,
        window.SCREENINGS4U_SUPABASE_ANON_KEY
      );
    }

    throw new Error("Supabase client is not available.");
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function date(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function pct(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function studentName(profile) {
    return (
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      profile?.name ||
      profile?.email ||
      "Student"
    );
  }

  function initials(name) {
    const parts = String(name || "Student").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "ST";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function courseFor(enrollment) {
    return courses.find(c => String(c.id) === String(enrollment.course_id)) || null;
  }

  function lessonFor(id) {
    return lessons.find(l => String(l.id) === String(id)) || null;
  }

  function sectionFor(id) {
    return sections.find(s => String(s.id) === String(id)) || null;
  }

  function quizFor(id) {
    return quizzes.find(q => String(q.id) === String(id)) || null;
  }

  function profileForUser(userId) {
    return profiles.find(p => String(p.id) === String(userId)) || null;
  }

  function enrollmentsFor(userId) {
    return enrollments.filter(e => String(e.user_id) === String(userId));
  }

  function certificatesFor(userId) {
    const ids = new Set(enrollmentsFor(userId).map(e => String(e.id)));
    return certificates.filter(c => ids.has(String(c.enrollment_id)));
  }

  function progressForEnrollment(enrollmentId) {
    const row = enrollments.find(e => String(e.id) === String(enrollmentId));
    return row ? pct(row.progress_percent) : 0;
  }

  function completedEnrollment(e) {
    return e.status === "completed" || pct(e.progress_percent) >= 100;
  }

  function studentOverallProgress(student) {
    const list = enrollmentsFor(student.id);
    if (!list.length) return 0;
    return Math.round(
      list.reduce((sum, e) => sum + progressForEnrollment(e.id), 0) / list.length
    );
  }

  function studentStatus(student) {
    const list = enrollmentsFor(student.id);
    if (!list.length) return "not-started";
    if (list.every(completedEnrollment)) return "completed";
    return studentOverallProgress(student) > 0 ? "active" : "not-started";
  }

  function statusLabel(value) {
    if (value === "completed") return "Completed";
    if (value === "active") return "Active";
    if (value === "not-started") return "Not Started";
    if (value === "cancelled") return "Cancelled";
    if (value === "suspended") return "Suspended";
    return value || "—";
  }

  function badge(status) {
    const cls = String(status || "").toLowerCase().replaceAll(" ", "-");
    return `<span class="status-badge ${esc(cls)}">${esc(statusLabel(status))}</span>`;
  }

  function buildStudents() {
    const userIds = new Set(enrollments.map(e => String(e.user_id)));

    students = profiles
      .filter(p => userIds.has(String(p.id)))
      .map(p => ({
        ...p,
        _enrollments: enrollmentsFor(p.id),
        _certificates: certificatesFor(p.id)
      }));

    applyFilters();
  }

  function renderMetrics() {
    $("metricStudents").textContent = students.length;
    $("metricActive").textContent = students.filter(s => studentStatus(s) === "active").length;
    $("metricCompleted").textContent = students.filter(s => studentStatus(s) === "completed").length;
    $("metricNotStarted").textContent = students.filter(s => studentStatus(s) === "not-started").length;
    $("metricCertificates").textContent =
      certificates.filter(c => !c.revoked_at && c.status !== "revoked").length;
  }

  function applyFilters() {
    const term = ($("studentSearch").value || "").trim().toLowerCase();
    const filter = $("studentStatusFilter").value;

    filteredStudents = students.filter(student => {
      const name = studentName(student);
      const email = student.email || "";
      const courseText = enrollmentsFor(student.id)
        .map(e => courseFor(e)?.title || "")
        .join(" ");

      const matchesText =
        !term ||
        `${name} ${email} ${courseText}`.toLowerCase().includes(term);

      const matchesStatus =
        filter === "all" || studentStatus(student) === filter;

      return matchesText && matchesStatus;
    });

    renderStudentTable();
  }

  function renderStudentTable() {
    const table = $("studentsTable");
    $("studentsLoading").hidden = true;
    $("studentsError").hidden = true;
    table.hidden = false;

    if (!filteredStudents.length) {
      table.innerHTML = '<div class="empty-state">No LMS students match the selected filters.</div>';
      return;
    }

    table.innerHTML = `
      <table class="admin-data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Courses</th>
            <th>Progress</th>
            <th>Status</th>
            <th>Certificates</th>
            <th>Joined</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${filteredStudents.map(student => {
            const progress = studentOverallProgress(student);
            const certs = certificatesFor(student.id);
            return `
              <tr>
                <td>
                  <div class="student-row">
                    <div class="student-avatar">${esc(initials(studentName(student)))}</div>
                    <div>
                      <strong>${esc(studentName(student))}</strong>
                      <small>${esc(student.email || "—")}</small>
                    </div>
                  </div>
                </td>
                <td>${enrollmentsFor(student.id).length}</td>
                <td>
                  <div class="progress-cell">
                    <div class="progress-track">
                      <span style="width:${progress}%"></span>
                    </div>
                    <strong>${progress}%</strong>
                  </div>
                </td>
                <td>${badge(studentStatus(student))}</td>
                <td>${certs.length}</td>
                <td>${esc(date(student.created_at))}</td>
                <td>
                  <button class="admin-button secondary view-student"
                    type="button"
                    data-student-id="${esc(student.id)}">
                    View Results
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;

    table.querySelectorAll(".view-student").forEach(button => {
      button.addEventListener("click", () => openStudent(button.dataset.studentId));
    });
  }

  function openStudent(userId) {
    const student = students.find(s => String(s.id) === String(userId));
    if (!student) return;

    $("studentsTable").parentElement.hidden = true;
    $("studentDetail").hidden = false;

    const name = studentName(student);
    $("detailAvatar").textContent = initials(name);
    $("detailName").textContent = name;
    $("detailEmail").textContent = student.email || "—";

    const studentEnrollments = enrollmentsFor(student.id);
    const completed = studentEnrollments.filter(completedEnrollment).length;
    const inProgress = studentEnrollments.filter(e => !completedEnrollment(e)).length;
    const certs = certificatesFor(student.id);

    $("detailCourseCount").textContent = studentEnrollments.length;
    $("detailCompletedCount").textContent = completed;
    $("detailProgressCount").textContent = inProgress;
    $("detailCertificateCount").textContent = certs.length;
    $("detailOverallStatus").outerHTML =
      badge(studentStatus(student)).replace("status-badge", 'status-badge" id="detailOverallStatus');

    renderEnrollments(student);
    renderLessons(student);
    renderQuizzes(student);
    renderCertificates(student);
  }

  function renderEnrollments(student) {
    const list = enrollmentsFor(student.id);
    const box = $("detailEnrollments");

    if (!list.length) {
      box.innerHTML = '<div class="empty-state">No course enrollments found.</div>';
      return;
    }

    box.innerHTML = `
      <table class="admin-data-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Enrolled</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(e => {
            const course = courseFor(e);
            return `
              <tr>
                <td><strong>${esc(course?.title || "Training Course")}</strong></td>
                <td>${badge(e.status)}</td>
                <td>${progressForEnrollment(e.id)}%</td>
                <td>${esc(date(e.enrolled_at || e.created_at))}</td>
                <td>${esc(date(e.completed_at))}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  function renderLessons(student) {
    const ids = new Set(enrollmentsFor(student.id).map(e => String(e.id)));
    const rows = lessonProgress.filter(p => ids.has(String(p.enrollment_id)));

    $("detailLessonSummary").textContent =
      `${rows.filter(r => pct(r.progress_percent) >= 100).length} of ${rows.length} recorded lessons complete`;

    if (!rows.length) {
      $("detailLessons").innerHTML =
        '<div class="empty-state">No lesson progress recorded.</div>';
      return;
    }

    $("detailLessons").innerHTML = `
      <table class="admin-data-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Lesson</th>
            <th>Progress</th>
            <th>Started</th>
            <th>Completed</th>
            <th>Last Activity</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(p => {
            const lesson = lessonFor(p.lesson_id);
            const section = lesson ? sectionFor(lesson.section_id) : null;
            const course = section
              ? courses.find(c => String(c.id) === String(section.course_id))
              : null;
            const progress = pct(p.progress_percent);
            return `
              <tr>
                <td>${esc(course?.title || "—")}</td>
                <td><strong>${esc(lesson?.title || "Lesson")}</strong></td>
                <td>
                  <div class="progress-cell">
                    <div class="progress-track"><span style="width:${progress}%"></span></div>
                    <strong>${progress}%</strong>
                  </div>
                </td>
                <td>${esc(date(p.started_at))}</td>
                <td>${esc(date(p.completed_at))}</td>
                <td>${esc(date(p.last_activity_at))}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  function renderQuizzes(student) {
    const ids = new Set(enrollmentsFor(student.id).map(e => String(e.id)));
    const rows = quizAttempts
      .filter(a => ids.has(String(a.enrollment_id)))
      .sort((a, b) => new Date(b.completed_at || b.created_at || 0) -
                       new Date(a.completed_at || a.created_at || 0));

    const passed = rows.filter(a => a.passed === true).length;
    $("detailQuizSummary").textContent = `${passed} passed of ${rows.length} recorded attempts`;

    if (!rows.length) {
      $("detailQuizzes").innerHTML =
        '<div class="empty-state">No quiz attempts recorded.</div>';
      return;
    }

    $("detailQuizzes").innerHTML = `
      <table class="admin-data-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Quiz</th>
            <th>Attempt</th>
            <th>Score</th>
            <th>Result</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(a => {
            const quiz = quizFor(a.quiz_id);
            const lesson = quiz ? lessonFor(quiz.lesson_id) : null;
            const section = lesson ? sectionFor(lesson.section_id) : null;
            const course = section
              ? courses.find(c => String(c.id) === String(section.course_id))
              : null;
            const resultClass = a.passed ? "passed" : "failed";
            return `
              <tr>
                <td>${esc(course?.title || "—")}</td>
                <td><strong>${esc(quiz?.title || "Quiz")}</strong></td>
                <td>${esc(a.attempt_number)}</td>
                <td>${a.score == null ? "—" : `${Number(a.score)}%`}</td>
                <td><span class="status-badge ${resultClass}">${a.passed ? "Passed" : "Failed"}</span></td>
                <td>${esc(date(a.completed_at))}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  function renderCertificates(student) {
    const rows = certificatesFor(student.id);
    const box = $("detailCertificates");

    if (!rows.length) {
      box.innerHTML = '<div class="empty-state">No certificates found.</div>';
      return;
    }

    box.innerHTML = `
      <table class="admin-data-table">
        <thead>
          <tr>
            <th>Certificate</th>
            <th>Course</th>
            <th>Issued</th>
            <th>Status</th>
            <th>Revoked</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(c => {
            const enrollment = enrollments.find(e => String(e.id) === String(c.enrollment_id));
            const course = enrollment ? courseFor(enrollment) : null;
            const revoked = Boolean(c.revoked_at) || c.status === "revoked";
            return `
              <tr>
                <td><strong>${esc(c.certificate_number || c.id)}</strong></td>
                <td>${esc(course?.title || c.metadata?.course_title || "Training Course")}</td>
                <td>${esc(date(c.issued_at || c.created_at))}</td>
                <td>
                  <span class="status-badge ${revoked ? "revoked" : "completed"}">
                    ${revoked ? "Revoked" : "Issued"}
                  </span>
                </td>
                <td>${esc(date(c.revoked_at))}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  function exportCsv() {
    const header = [
      "Student",
      "Email",
      "Courses",
      "Overall Progress",
      "Status",
      "Certificates",
      "Joined"
    ];

    const rows = filteredStudents.map(s => [
      studentName(s),
      s.email || "",
      enrollmentsFor(s.id).length,
      `${studentOverallProgress(s)}%`,
      statusLabel(studentStatus(s)),
      certificatesFor(s.id).length,
      date(s.created_at)
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "screenings4u-student-progress-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function load() {
    try {
      db = getDb();

      const [
        profilesResult,
        coursesResult,
        sectionsResult,
        lessonsResult,
        enrollmentsResult,
        progressResult,
        quizzesResult,
        attemptsResult,
        certificatesResult
      ] = await Promise.all([
        db.from("client_profiles").select("*"),
        db.from("lms_courses").select("id,title,slug,status"),
        db.from("lms_sections").select("id,course_id,title,sort_order"),
        db.from("lms_lessons").select("id,section_id,title,status,is_required,completion_required,sort_order"),
        db.from("lms_enrollments").select("*"),
        db.from("lms_lesson_progress").select("*"),
        db.from("lms_quizzes").select("id,lesson_id,title,passing_score,is_required"),
        db.from("lms_quiz_attempts").select("*"),
        db.from("lms_certificates").select("*")
      ]);

      const results = [
        profilesResult,
        coursesResult,
        sectionsResult,
        lessonsResult,
        enrollmentsResult,
        progressResult,
        quizzesResult,
        attemptsResult,
        certificatesResult
      ];

      const firstError = results.find(r => r.error);
      if (firstError) throw firstError.error;

      profiles = profilesResult.data || [];
      courses = coursesResult.data || [];
      sections = sectionsResult.data || [];
      lessons = lessonsResult.data || [];
      enrollments = enrollmentsResult.data || [];
      lessonProgress = progressResult.data || [];
      quizzes = quizzesResult.data || [];
      quizAttempts = attemptsResult.data || [];
      certificates = certificatesResult.data || [];

      buildStudents();
      renderMetrics();
    } catch (error) {
      console.error("Unable to load LMS student progress:", error);
      $("studentsLoading").hidden = true;
      $("studentsError").hidden = false;
      $("studentsError").textContent =
        error?.message || "Unable to load LMS student progress.";
    }
  }

  function bind() {
    $("studentSearch").addEventListener("input", applyFilters);
    $("studentStatusFilter").addEventListener("change", applyFilters);
    $("exportStudentsButton").addEventListener("click", exportCsv);

    $("closeDetailButton").addEventListener("click", () => {
      $("studentDetail").hidden = true;
      $("studentsTable").parentElement.hidden = false;
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bind();
    await load();
  }, { once: true });
})();
