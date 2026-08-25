
async function ensureTrainingModal() {
    if (window.AdminTrainingModal) return;
    await new Promise(function (resolve, reject) {
        const script = document.createElement("script");
        script.src = "assets/js/admin-training-modal.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/*
 * =========================================================
 * screenings4u — Admin Students Controller
 * =========================================================
 *
 * Location:
 * assets/js/admin-students.js
 *
 * Wired to the CURRENT screenings4u schema:
 *
 *   client_profiles
 *   lms_enrollments
 *   lms_courses
 *   lms_certificates
 *
 * lms_enrollments.user_id -> auth.users.id
 * client_profiles.id            -> auth.users.id
 *
 * The old "profiles" table is NOT used.
 * =========================================================
 */

document.addEventListener("DOMContentLoaded", async function () {
  await ensureTrainingModal();
  initializeStudentsPage();
});

let studentsClient = null;
let allStudents = [];
let selectedStudent = null;

/* =========================================================
   INITIALIZE
========================================================= */

async function initializeStudentsPage() {
  studentsClient = getStudentsSupabaseClient();

  if (!studentsClient) {
    showStudentMessage(
      "Supabase configuration could not be loaded."
    );
    return;
  }

  initializeStudentControls();
  await loadStudents();
}

/* =========================================================
   SUPABASE CLIENT
========================================================= */

function getStudentsSupabaseClient() {
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

function initializeStudentControls() {
  const search =
    document.getElementById("studentSearch");

  const filter =
    document.getElementById("studentStatusFilter");

  const backButton =
    document.getElementById("backToStudents");

  if (search) {
    search.addEventListener(
      "input",
      renderStudents
    );
  }

  if (filter) {
    filter.addEventListener(
      "change",
      renderStudents
    );
  }

  if (backButton) {
    backButton.addEventListener(
      "click",
      showStudentList
    );
  }

  const refreshButton =
    document.getElementById("refreshStudents");

  if (refreshButton) {
    refreshButton.addEventListener(
      "click",
      async function () {
        refreshButton.disabled = true;
        refreshButton.innerHTML =
          '<span aria-hidden="true">↻</span> Refreshing...';

        try {
          await loadStudents();
        } finally {
          refreshButton.disabled = false;
          refreshButton.innerHTML =
            '<span aria-hidden="true">↻</span> Refresh';
        }
      }
    );
  }
}

/* =========================================================
   LOAD STUDENTS
========================================================= */

async function loadStudents() {
  setStudentTableMessage(
    "Loading students..."
  );

  try {
    /*
     * Students are client_profiles that have at least
     * one LMS enrollment.
     */
    const profileResult =
      await studentsClient
        .from("client_profiles")
        .select(`
          id,
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
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (profileResult.error) {
      throw profileResult.error;
    }

    const profiles =
      profileResult.data || [];

    /*
     * Current enrollment schema:
     * user_id -> auth.users.id
     */
    const enrollmentResult =
      await studentsClient
        .from("lms_enrollments")
        .select(`
          id,
          user_id,
          course_id,
          order_item_id,
          status,
          progress_percent,
          enrolled_at,
          started_at,
          completed_at,
          last_activity_at,
          created_at,
          updated_at
        `);

    if (enrollmentResult.error) {
      throw enrollmentResult.error;
    }

    const enrollments =
      enrollmentResult.data || [];

    /*
     * Courses are loaded separately so this controller does
     * not depend on a PostgREST relationship name.
     */
    let courses = [];

    const courseResult =
      await studentsClient
        .from("lms_courses")
        .select(`
          id,
          title,
          slug
        `);

    if (!courseResult.error) {
      courses =
        courseResult.data || [];
    } else {
      console.error(
        "Unable to load training courses:",
        courseResult.error
      );
    }

    /*
     * Certificates are linked through enrollment_id in the
     * current database structure.
     */
    let certificates = [];

    const certificateResult =
      await studentsClient
        .from("lms_certificates")
        .select("*");

    if (!certificateResult.error) {
      certificates =
        certificateResult.data || [];
    } else {
      console.error(
        "Unable to load training certificates:",
        certificateResult.error
      );
    }

    /*
     * Only client profiles that have actual LMS
     * enrollments are displayed as students.
     */
    const studentUserIds =
      new Set(
        enrollments
          .map(function (enrollment) {
            return enrollment.user_id || null;
          })
          .filter(Boolean)
          .map(String)
      );

    allStudents =
      profiles
        .filter(function (profile) {
          return studentUserIds.has(
            String(profile.id)
          );
        })
        .map(function (profile) {
          const profileEnrollments =
            enrollments.filter(
              function (enrollment) {
                return String(
                  enrollment.user_id
                ) === String(profile.id);
              }
            );

          const enrollmentIds =
            new Set(
              profileEnrollments.map(
                function (enrollment) {
                  return String(enrollment.id);
                }
              )
            );

          const profileCertificates =
            certificates.filter(
              function (certificate) {
                return (
                  certificate.enrollment_id &&
                  enrollmentIds.has(
                    String(
                      certificate.enrollment_id
                    )
                  )
                );
              }
            );

          return {
            ...profile,
            _enrollments:
              profileEnrollments,
            _certificates:
              profileCertificates,
            _courses:
              courses
          };
        });

    renderStudents();

  } catch (error) {
    console.error(
      "Unable to load students:",
      error
    );

    setStudentTableMessage(
      "Unable to load students. Check the browser console for the Supabase error."
    );

    showStudentToast(
      "Unable to load students.",
      "error"
    );
  }
}

/* =========================================================
   RENDER STUDENTS
========================================================= */

function renderStudents() {
  const table =
    document.getElementById(
      "studentsTable"
    );

  if (!table) {
    return;
  }

  const searchInput =
    document.getElementById(
      "studentSearch"
    );

  const filterInput =
    document.getElementById(
      "studentStatusFilter"
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
    allStudents.filter(
      function (student) {
        const name =
          getStudentName(student);

        const email =
          student.email || "";

        const enrollments =
          student._enrollments || [];

        const courses =
          enrollments
            .map(function (enrollment) {
              return getEnrollmentCourseName(
                enrollment,
                student._courses || []
              );
            })
            .join(" ");

        const status =
          getStudentProgressStatus(
            student
          );

        const searchable = [
          name,
          email,
          student.company_name || "",
          courses,
          status
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !search ||
          searchable.includes(search);

        const matchesFilter =
          filter === "all" ||
          status === filter;

        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );

  if (!filtered.length) {
    table.innerHTML = `
      <div class="empty-state">
        No LMS students found.
      </div>
    `;
    return;
  }

  table.innerHTML = `
    <table class="admin-data-table">
      <thead>
        <tr>
          <th>Student</th>
          <th>Courses</th>
          <th>Progress</th>
          <th>Certificates</th>
          <th>Joined</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        ${filtered
          .map(renderStudentRow)
          .join("")}
      </tbody>
    </table>
  `;

  table
    .querySelectorAll(
      "[data-student-id]"
    )
    .forEach(function (button) {
      button.addEventListener(
        "click",
        function () {
          openStudent(
            button.getAttribute(
              "data-student-id"
            )
          );
        }
      );
    });
}

/* =========================================================
   STUDENT ROW
========================================================= */

function renderStudentRow(student) {
  const enrollments =
    student._enrollments || [];

  const certificates =
    student._certificates || [];

  const progress =
    calculateStudentProgress(
      enrollments
    );

  const status =
    getStudentProgressStatus(
      student
    );

  return `
    <tr>
      <td>
        <div class="student-row-person">
          <div class="student-avatar">
            ${escapeHtml(
              getInitials(
                getStudentName(student)
              )
            )}
          </div>

          <div>
            <strong>
              ${escapeHtml(
                getStudentName(student)
              )}
            </strong>

            <small>
              ${escapeHtml(
                student.email || "—"
              )}
            </small>
          </div>
        </div>
      </td>

      <td>
        ${enrollments.length}
      </td>

      <td>
        <span class="status-badge">
          ${escapeHtml(
            formatStudentStatus(status)
          )}
        </span>

        <small class="progress-text">
          ${progress}%
        </small>
      </td>

      <td>
        ${certificates.length}
      </td>

      <td>
        ${escapeHtml(
          formatDate(
            student.created_at
          )
        )}
      </td>

      <td>
        <button
          type="button"
          class="secondary-button"
          data-student-id="${escapeHtml(
            student.id
          )}"
        >
          View
        </button>
      </td>
    </tr>
  `;
}

/* =========================================================
   OPEN STUDENT
========================================================= */

async function openStudent(studentId) {
  const student =
    allStudents.find(
      function (item) {
        return (
          String(item.id) ===
          String(studentId)
        );
      }
    );

  if (!student) {
    return;
  }

  selectedStudent =
    student;

  /*
   * The standalone student-detail page works from an
   * enrollment ID. A student can have multiple courses,
   * so use the first enrollment here and allow the detail
   * page to show that enrollment's complete history.
   */
  const firstEnrollment =
    (student._enrollments || [])[0];

  if (firstEnrollment?.id) {
    window.location.href =
      "admin-student-detail.html?id=" +
      encodeURIComponent(
        firstEnrollment.id
      );

    return;
  }

  populateStudentDetail(
    student
  );

  const list =
    document.getElementById(
      "studentListView"
    );

  const detail =
    document.getElementById(
      "studentDetailView"
    );

  if (list) {
    list.classList.remove(
      "active"
    );
  }

  if (detail) {
    detail.classList.add(
      "active"
    );
  }

  renderStudentEnrollments(
    student
  );

  renderStudentCertificates(
    student
  );
}

/* =========================================================
   STUDENT DETAIL
========================================================= */

function populateStudentDetail(
  student
) {
  const name =
    getStudentName(student);

  setText(
    "studentInitials",
    getInitials(name)
  );

  setText(
    "detailStudentName",
    name
  );

  setText(
    "detailStudentEmail",
    student.email || "—"
  );

  setText(
    "detailStudentPhone",
    student.phone || "—"
  );

  setText(
    "detailStudentCompany",
    student.company_name || "—"
  );

  setText(
    "detailStudentStatus",
    formatStudentStatus(
      getStudentProgressStatus(
        student
      )
    )
  );

  setText(
    "detailStudentCreated",
    formatDate(
      student.created_at
    )
  );

  const enrollments =
    student._enrollments || [];

  const certificates =
    student._certificates || [];

  const completed =
    enrollments.filter(
      isEnrollmentCompleted
    ).length;

  const inProgress =
    enrollments.filter(
      function (enrollment) {
        return !isEnrollmentCompleted(
          enrollment
        );
      }
    ).length;

  setText(
    "detailCourseCount",
    enrollments.length
  );

  setText(
    "detailCompletedCount",
    completed
  );

  setText(
    "detailProgressCount",
    inProgress
  );

  setText(
    "detailCertificateCount",
    certificates.length
  );
}

/* =========================================================
   ENROLLMENTS
========================================================= */

function renderStudentEnrollments(
  student
) {
  const container =
    document.getElementById(
      "studentEnrollmentsTable"
    );

  if (!container) {
    return;
  }

  const enrollments =
    student._enrollments || [];

  if (!enrollments.length) {
    container.innerHTML =
      `
        <div class="empty-state">
          No LMS enrollments found.
        </div>
      `;
    return;
  }

  container.innerHTML = `
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
        ${enrollments
          .map(function (enrollment) {
            const courseName =
              getEnrollmentCourseName(
                enrollment,
                student._courses || []
              );

            const progress =
              getEnrollmentProgress(
                enrollment
              );

            const status =
              enrollment.status ||
              (
                progress >= 100
                  ? "completed"
                  : progress > 0
                    ? "active"
                    : "not-started"
              );

            return `
              <tr>
                <td>
                  <strong>
                    ${escapeHtml(
                      courseName
                    )}
                  </strong>
                </td>

                <td>
                  <span class="status-badge">
                    ${escapeHtml(
                      formatStudentStatus(
                        normalizeEnrollmentStatus(
                          status
                        )
                      )
                    )}
                  </span>
                </td>

                <td>
                  ${progress}%
                </td>

                <td>
                  ${escapeHtml(
                    formatDate(
                      enrollment.enrolled_at ||
                      enrollment.created_at
                    )
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    formatDate(
                      enrollment.completed_at
                    )
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
   CERTIFICATES
========================================================= */

function renderStudentCertificates(
  student
) {
  const container =
    document.getElementById(
      "studentCertificatesTable"
    );

  if (!container) {
    return;
  }

  const certificates =
    student._certificates || [];

  if (!certificates.length) {
    container.innerHTML =
      `
        <div class="empty-state">
          No certificates found.
        </div>
      `;
    return;
  }

  container.innerHTML = `
    <table class="admin-data-table">
      <thead>
        <tr>
          <th>Certificate</th>
          <th>Course</th>
          <th>Issued</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        ${certificates
          .map(function (certificate) {
            const enrollment =
              (student._enrollments || [])
                .find(function (item) {
                  return String(item.id) ===
                    String(
                      certificate.enrollment_id
                    );
                });

            const courseName =
              enrollment
                ? getEnrollmentCourseName(
                    enrollment,
                    student._courses || []
                  )
                : (
                    certificate.course_title ||
                    certificate.course_name ||
                    "Course"
                  );

            return `
              <tr>
                <td>
                  <strong>
                    ${escapeHtml(
                      certificate.certificate_number ||
                      certificate.certificate_no ||
                      certificate.id ||
                      "Certificate"
                    )}
                  </strong>
                </td>

                <td>
                  ${escapeHtml(
                    courseName
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    formatDate(
                      certificate.issued_at ||
                      certificate.created_at
                    )
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    certificate.status ||
                    "Issued"
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
   BACK TO LIST
========================================================= */

function showStudentList() {
  selectedStudent = null;

  const detail =
    document.getElementById(
      "studentDetailView"
    );

  const list =
    document.getElementById(
      "studentListView"
    );

  if (detail) {
    detail.classList.remove(
      "active"
    );
  }

  if (list) {
    list.classList.add(
      "active"
    );
  }
}

/* =========================================================
   PROGRESS
========================================================= */

function calculateStudentProgress(
  enrollments
) {
  if (!enrollments.length) {
    return 0;
  }

  const total =
    enrollments.reduce(
      function (
        sum,
        enrollment
      ) {
        return (
          sum +
          getEnrollmentProgress(
            enrollment
          )
        );
      },
      0
    );

  return Math.round(
    total /
    enrollments.length
  );
}

function getEnrollmentProgress(
  enrollment
) {
  const raw =
    enrollment.progress_percent ??
    enrollment.progress_percentage ??
    enrollment.progress ??
    enrollment.completion_percentage ??
    null;

  if (
    raw !== null &&
    raw !== undefined &&
    raw !== ""
  ) {
    const number =
      Number(raw);

    if (
      Number.isFinite(number)
    ) {
      return Math.max(
        0,
        Math.min(
          100,
          Math.round(number)
        )
      );
    }
  }

  if (
    enrollment.completed_at ||
    String(
      enrollment.status || ""
    ).toLowerCase() ===
      "completed"
  ) {
    return 100;
  }

  return 0;
}

function isEnrollmentCompleted(
  enrollment
) {
  return (
    getEnrollmentProgress(
      enrollment
    ) >= 100 ||
    String(
      enrollment.status || ""
    ).toLowerCase() ===
      "completed"
  );
}

function getStudentProgressStatus(
  student
) {
  const enrollments =
    student._enrollments || [];

  if (!enrollments.length) {
    return "not-started";
  }

  if (
    enrollments.every(
      isEnrollmentCompleted
    )
  ) {
    return "completed";
  }

  const progress =
    calculateStudentProgress(
      enrollments
    );

  if (progress > 0) {
    return "active";
  }

  return "not-started";
}

function normalizeEnrollmentStatus(
  status
) {
  const value =
    String(status || "")
      .toLowerCase()
      .trim();

  if (
    value.includes("complete")
  ) {
    return "completed";
  }

  if (
    value.includes("progress") ||
    value === "active"
  ) {
    return "active";
  }

  return "not-started";
}

function formatStudentStatus(
  status
) {
  switch (status) {
    case "not-started":
      return "Not Started";

    case "completed":
      return "Completed";

    case "active":
      return "Active";

    default:
      return status || "Unknown";
  }
}

/* =========================================================
   COURSE NAME
========================================================= */

function getEnrollmentCourseName(
  enrollment,
  courses
) {
  if (
    enrollment.course_title
  ) {
    return enrollment.course_title;
  }

  if (
    enrollment.course_name
  ) {
    return enrollment.course_name;
  }

  const courseId =
    enrollment.course_id;

  if (courseId) {
    const course =
      courses.find(
        function (item) {
          return (
            String(item.id) ===
            String(courseId)
          );
        }
      );

    if (course) {
      return (
        course.title ||
        course.name ||
        "Course"
      );
    }
  }

  return "Course";
}

/* =========================================================
   GENERAL HELPERS
========================================================= */

function getStudentName(
  student
) {
  const fullName = [
    student.first_name,
    student.last_name
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    student.email ||
    "Student"
  );
}

function getInitials(
  name
) {
  const parts =
    String(name || "Student")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!parts.length) {
    return "S";
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
    return String(value);
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

function escapeHtml(
  value
) {
  return String(value ?? "")
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

function setStudentTableMessage(
  message
) {
  const table =
    document.getElementById(
      "studentsTable"
    );

  if (table) {
    table.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(message)}
      </div>
    `;
  }
}

function showStudentMessage(
  message
) {
  setStudentTableMessage(
    message
  );
}

function showStudentToast(
  message,
  type
) {
  const toast =
    document.getElementById(
      "studentToast"
    );

  if (!toast) {
    console.log(message);
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