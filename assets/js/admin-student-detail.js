/*
 * =========================================================
 * screenings4u — Admin Student Detail
 * =========================================================
 *
 * Location:
 * assets/js/admin-student-detail.js
 *
 * Wired to the current screenings4u database structure:
 *
 *   admin_profiles
 *   client_profiles
 *   training_enrollments
 *   training_lesson_progress
 *   training_quiz_attempts
 *   training_certificates
 *
 * IMPORTANT:
 * - Students are identified by training_enrollments.user_id.
 * - Customer information comes from client_profiles.
 * - Admin authorization comes from admin_profiles.
 * - The old profiles table is NOT used.
 * =========================================================
 */


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


document.addEventListener("DOMContentLoaded", async function () {
    await ensureTrainingModal();
    const db = getDb();

    const params = new URLSearchParams(window.location.search);
    const enrollmentId = params.get("id");

    if (!db) {
        return toast("Supabase client could not be initialized.", "error");
    }

    if (!enrollmentId) {
        return toast("Enrollment ID is missing.", "error");
    }

    /*
     * =====================================================
     * ADMIN AUTHORIZATION
     * =====================================================
     */

    const authorized = await enforceAdminGuard(db);

    if (!authorized) {
        return;
    }

    /*
     * =====================================================
     * LOAD ENROLLMENT
     * =====================================================
     */

    const enrollmentResult = await db
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
        `)
        .eq("id", enrollmentId)
        .single();

    if (enrollmentResult.error) {
        console.error(
            "Unable to load training enrollment:",
            enrollmentResult.error
        );

        return toast(
            enrollmentResult.error.message,
            "error"
        );
    }

    const enrollment = enrollmentResult.data;

    /*
     * =====================================================
     * LOAD CLIENT PROFILE
     *
     * training_enrollments.user_id references auth.users.id.
     * client_profiles.id also references auth.users.id.
     * Therefore we resolve the client profile separately
     * instead of using the old profiles relationship.
     * =====================================================
     */

    let clientProfile = null;

    if (enrollment.user_id) {
        const profileResult = await db
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
            .eq("id", enrollment.user_id)
            .maybeSingle();

        if (profileResult.error) {
            console.error(
                "Unable to load client profile:",
                profileResult.error
            );

            return toast(
                profileResult.error.message,
                "error"
            );
        }

        clientProfile = profileResult.data;
    }

    /*
     * =====================================================
     * LOAD COURSE
     * =====================================================
     */

    let course = null;

    if (enrollment.course_id) {
        const courseResult = await db
            .from("lms_courses")
            .select(`
                id,
                title,
                slug
            `)
            .eq("id", enrollment.course_id)
            .maybeSingle();

        if (courseResult.error) {
            console.error(
                "Unable to load training course:",
                courseResult.error
            );
        } else {
            course = courseResult.data;
        }
    }

    /*
     * =====================================================
     * STUDENT INFORMATION
     * =====================================================
     */

    const firstName = clientProfile?.first_name || "";
    const lastName = clientProfile?.last_name || "";

    const fullName = [
        firstName,
        lastName
    ]
        .filter(Boolean)
        .join(" ")
        .trim();

    set(
        "studentName",
        fullName ||
        clientProfile?.email ||
        "Training Student"
    );

    set(
        "studentEmail",
        clientProfile?.email ||
        "—"
    );

    set(
        "studentPhone",
        clientProfile?.phone ||
        "—"
    );

    set(
        "studentCompany",
        clientProfile?.company_name ||
        "—"
    );

    set(
        "studentCourse",
        course?.title ||
        "Training Course"
    );

    set(
        "enrollmentStatus",
        formatStatus(
            enrollment.status
        )
    );

    const normalizedProgress = normalizeProgress(
        enrollment.progress_percent
    );

    set(
        "progressValue",
        `${normalizedProgress}%`
    );

    /*
     * =====================================================
     * OPTIONAL DETAIL FIELDS
     * =====================================================
     */

    set(
        "enrollmentDate",
        formatDate(enrollment.enrolled_at)
    );

    set(
        "startedDate",
        formatDate(enrollment.started_at)
    );

    set(
        "completedDate",
        formatDate(enrollment.completed_at)
    );

    set(
        "lastActivityDate",
        formatDate(enrollment.last_activity_at)
    );

    /*
     * =====================================================
     * LOAD DETAIL DATA
     * =====================================================
     */

    await loadProgress();
    await loadAttempts();
    await loadCertificate();

    /*
     * =====================================================
     * ISSUE CERTIFICATE BUTTON
     * =====================================================
     */

    const issueButton =
        document.getElementById("issueCertificate");

    if (issueButton) {
        issueButton.addEventListener(
            "click",
            issueCertificate
        );
    }

    /*
     * =====================================================
     * LESSON PROGRESS
     * =====================================================
     */

    async function loadProgress() {
        const result = await db
            .from("lms_lesson_progress")
            .select("*")
            .eq("enrollment_id", enrollmentId)
            .order("created_at", {
                ascending: true
            });

        if (result.error) {
            return toast(
                result.error.message,
                "error"
            );
        }

        const box =
            document.getElementById(
                "progressTable"
            );

        if (!box) {
            return;
        }

        if (!result.data || !result.data.length) {
            box.innerHTML = `
                <div class="empty-state">
                    No lesson progress recorded.
                </div>
            `;
            return;
        }

        box.innerHTML = `
            <table class="admin-data-table">
                <thead>
                    <tr>
                        <th>Lesson</th>
                        <th>Status</th>
                        <th>Completed</th>
                    </tr>
                </thead>

                <tbody>
                    ${result.data
                        .map(function (item) {
                            return `
                                <tr>
                                    <td>
                                        ${esc(
                                            item.lesson_title ||
                                            item.lesson_id ||
                                            "Lesson"
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            formatStatus(
                                                item.status ||
                                                "in_progress"
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            item.completed_at
                                                ? formatDateTime(
                                                    item.completed_at
                                                )
                                                : "—"
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

    /*
     * =====================================================
     * QUIZ ATTEMPTS
     * =====================================================
     */

    async function loadAttempts() {
        const result = await db
            .from("lms_quiz_attempts")
            .select("*")
            .eq("enrollment_id", enrollmentId)
            .order("created_at", {
                ascending: false
            });

        if (result.error) {
            return toast(
                result.error.message,
                "error"
            );
        }

        const attempts = result.data || [];

        set(
            "attemptCount",
            attempts.length
        );

        const box =
            document.getElementById(
                "attemptTable"
            );

        if (!box) {
            return;
        }

        if (!attempts.length) {
            box.innerHTML = `
                <div class="empty-state">
                    No quiz attempts recorded.
                </div>
            `;
            return;
        }

        box.innerHTML = `
            <table class="admin-data-table">
                <thead>
                    <tr>
                        <th>Quiz</th>
                        <th>Score</th>
                        <th>Passed</th>
                        <th>Date</th>
                    </tr>
                </thead>

                <tbody>
                    ${attempts
                        .map(function (attempt) {
                            let passed = "—";

                            if (attempt.passed === true) {
                                passed = "Yes";
                            } else if (
                                attempt.passed === false
                            ) {
                                passed = "No";
                            }

                            return `
                                <tr>
                                    <td>
                                        ${esc(
                                            attempt.quiz_title ||
                                            attempt.quiz_id ||
                                            "Quiz"
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            attempt.score ??
                                            "—"
                                        )}
                                    </td>

                                    <td>
                                        ${esc(passed)}
                                    </td>

                                    <td>
                                        ${esc(
                                            attempt.created_at
                                                ? formatDateTime(
                                                    attempt.created_at
                                                )
                                                : "—"
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

    /*
     * =====================================================
     * CERTIFICATE
     * =====================================================
     */

    async function loadCertificate() {
        const result = await db
            .from("lms_certificates")
            .select("*")
            .eq("enrollment_id", enrollmentId)
            .order("created_at", {
                ascending: false
            })
            .limit(1);

        if (result.error) {
            return toast(
                result.error.message,
                "error"
            );
        }

        const certificate =
            result.data?.[0] || null;

        set(
            "certificateStatus",
            certificate
                ? "Issued"
                : "Not Issued"
        );

        const panel =
            document.getElementById(
                "certificatePanel"
            );

        if (!panel) {
            return;
        }

        if (!certificate) {
            panel.innerHTML =
                "No certificate has been issued.";
            return;
        }

        panel.innerHTML = `
            Certificate #${esc(
                certificate.certificate_number ||
                certificate.certificate_no ||
                certificate.id
            )}

            · Issued

            ${esc(
                certificate.issued_at
                    ? formatDate(
                        certificate.issued_at
                    )
                    : "—"
            )}
        `;
    }

    /*
     * =====================================================
     * ISSUE CERTIFICATE
     * =====================================================
     */

    async function issueCertificate() {
        const confirmed = await AdminTrainingModal.confirm(
            "Issue a certificate for this enrollment?"
        );

        if (!confirmed) {
            return;
        }

        /*
         * Prevent duplicate certificates.
         */
        const existingResult = await db
            .from("lms_certificates")
            .select("id")
            .eq("enrollment_id", enrollmentId)
            .limit(1);

        if (existingResult.error) {
            return toast(
                existingResult.error.message,
                "error"
            );
        }

        if (existingResult.data?.length) {
            await loadCertificate();

            return toast(
                "A certificate already exists for this enrollment.",
                "error"
            );
        }

        const result = await db
            .from("lms_certificates")
            .insert({
                enrollment_id: enrollmentId,
                issued_at: new Date().toISOString()
            })
            .select()
            .single();

        if (result.error) {
            return toast(
                result.error.message,
                "error"
            );
        }

        toast(
            "Certificate issued.",
            "success"
        );

        await loadCertificate();
    }

    /*
     * =====================================================
     * DATABASE CLIENT
     * =====================================================
     */

    function getDb() {
        if (
            window.screenings4uSupabase?.from &&
            window.screenings4uSupabase?.auth
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

    /*
     * =====================================================
     * ADMIN GUARD
     * =====================================================
     */

    async function enforceAdminGuard(dbClient) {
        const sessionResult =
            await dbClient.auth.getSession();

        if (
            sessionResult.error ||
            !sessionResult.data?.session
        ) {
            window.location.replace(
                "admin-login.html"
            );

            return false;
        }

        const user =
            sessionResult.data.session.user;

        const adminResult =
            await dbClient
                .from("admin_profiles")
                .select(`
                    id,
                    first_name,
                    last_name,
                    email,
                    phone,
                    is_active,
                    admin_level
                `)
                .eq("id", user.id)
                .maybeSingle();

        if (
            adminResult.error ||
            !adminResult.data
        ) {
            console.error(
                "Admin profile could not be loaded:",
                adminResult.error
            );

            await dbClient.auth.signOut();

            window.location.replace(
                "admin-login.html"
            );

            return false;
        }

        const admin =
            adminResult.data;

        if (
            admin.is_active !== true
        ) {
            await dbClient.auth.signOut();

            window.location.replace(
                "admin-login.html"
            );

            return false;
        }

        window.screenings4uAdminProfile =
            admin;

        return true;
    }

    /*
     * =====================================================
     * PROGRESS
     * =====================================================
     */

    function normalizeProgress(value) {
        const number = Number(value ?? 0);

        if (!Number.isFinite(number)) {
            return 0;
        }

        return Math.max(
            0,
            Math.min(
                100,
                Math.round(number)
            )
        );
    }

    /*
     * =====================================================
     * STATUS
     * =====================================================
     */

    function formatStatus(value) {
        const raw = String(
            value || ""
        )
            .trim()
            .toLowerCase()
            .replace(/[_-]+/g, " ");

        if (!raw) {
            return "Active";
        }

        return raw
            .replace(/\b\w/g, function (letter) {
                return letter.toUpperCase();
            });
    }

    /*
     * =====================================================
     * DATE HELPERS
     * =====================================================
     */

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
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

    function formatDateTime(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
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

    /*
     * =====================================================
     * SET TEXT
     * =====================================================
     */

    function set(id, value) {
        const element =
            document.getElementById(id);

        if (element) {
            element.textContent =
                value ?? "—";
        }
    }

    /*
     * =====================================================
     * ESCAPE HTML
     * =====================================================
     */

    function esc(value) {
        return String(
            value ?? ""
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /*
     * =====================================================
     * TOAST
     * =====================================================
     */

    function toast(
        message,
        type = ""
    ) {
        const element =
            document.getElementById(
                "studentToast"
            );

        if (!element) {
            console.log(message);
            return;
        }

        element.textContent =
            message;

        element.className =
            `admin-toast ${type} show`;

        window.setTimeout(
            function () {
                element.classList.remove(
                    "show"
                );
            },
            3000
        );
    }
});