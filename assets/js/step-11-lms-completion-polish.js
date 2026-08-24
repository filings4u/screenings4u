(() => {
  "use strict";

  const T = {
    courses: "lms_courses",
    enrollments: "lms_enrollments",
    sections: "lms_sections",
    lessons: "lms_lessons",
    lessonProgress: "lms_lesson_progress",
    quizzes: "lms_quizzes",
    quizAttempts: "lms_quiz_attempts",
    certificates: "lms_certificates"
  };

  const S = {
    user: null, enrollment: null, course: null,
    sections: [], lessons: [], progress: [], quizzes: [],
    attempts: [], certificate: null,
    completion: {}
  };

  const $ = id => document.getElementById(id);

  function db() {
    const c = window.supabaseClient || window.supabase || window.screenings4uSupabase;
    if (!c?.from) throw new Error("Supabase client is not available.");
    return c;
  }

  function num(v, d = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  function pct(v) {
    return Math.max(0, Math.min(100, Math.round(num(v))));
  }

  function params() {
    const q = new URLSearchParams(location.search);
    return {
      enrollment: q.get("enrollment") || q.get("enrollment_id") || "",
      course: q.get("course") || q.get("course_id") || ""
    };
  }

  async function user() {
    const { data, error } = await db().auth.getUser();
    if (error) throw error;
    if (!data?.user) throw new Error("You must be signed in to access your training.");
    S.user = data.user;
  }

  async function enrollment() {
    const p = params();
    if (!p.enrollment) throw new Error("The training link is missing the enrollment ID.");

    const { data, error } = await db().from(T.enrollments)
      .select(`
        id,user_id,course_id,status,progress_percent,enrolled_at,
        started_at,completed_at,last_activity_at,
        course:${T.courses}(id,title,slug,passing_score,certificate_enabled)
      `)
      .eq("id", p.enrollment)
      .eq("user_id", S.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("This training enrollment could not be found.");
    if (p.course && String(data.course_id) !== String(p.course)) {
      throw new Error("This enrollment does not belong to the requested course.");
    }

    S.enrollment = data;
    S.course = data.course || null;
  }

  async function structure() {
    const { data: sections, error: se } = await db().from(T.sections)
      .select("id,course_id,title,sort_order,is_published")
      .eq("course_id", S.enrollment.course_id)
      .order("sort_order", { ascending: true });

    if (se) throw se;
    S.sections = sections || [];

    const ids = S.sections.map(x => x.id);
    if (!ids.length) {
      S.lessons = [];
      S.quizzes = [];
      return;
    }

    const { data: lessons, error: le } = await db().from(T.lessons)
      .select("id,section_id,title,status,sort_order,is_required,completion_required,estimated_minutes")
      .in("section_id", ids)
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    if (le) throw le;
    S.lessons = lessons || [];

    const lessonIds = S.lessons.map(x => x.id);
    if (!lessonIds.length) {
      S.quizzes = [];
      return;
    }

    const { data: quizzes, error: qe } = await db().from(T.quizzes)
      .select("id,lesson_id,title,description,passing_score,attempt_limit,is_required")
      .in("lesson_id", lessonIds);

    if (qe) throw qe;
    S.quizzes = quizzes || [];
  }

  async function records() {
    const { data: p, error: pe } = await db().from(T.lessonProgress)
      .select("lesson_id,progress_percent,completed_at")
      .eq("enrollment_id", S.enrollment.id);
    if (pe) throw pe;
    S.progress = p || [];

    const ids = S.quizzes.map(x => x.id);
    if (!ids.length) {
      S.attempts = [];
      return;
    }

    const { data: a, error: ae } = await db().from(T.quizAttempts)
      .select("id,quiz_id,attempt_number,score,passed,started_at,completed_at")
      .eq("enrollment_id", S.enrollment.id)
      .in("quiz_id", ids);
    if (ae) throw ae;
    S.attempts = a || [];
  }

  async function certificate() {
    const { data, error } = await db().from(T.certificates)
      .select("*")
      .eq("enrollment_id", S.enrollment.id)
      .maybeSingle();
    if (error) throw error;
    S.certificate = data || null;
  }

  function lessonDone(id) {
    const row = S.progress.find(x => String(x.lesson_id) === String(id));
    return !!row && (pct(row.progress_percent) >= 100 || !!row.completed_at);
  }

  function quizDone(id) {
    return S.attempts.some(
      x => String(x.quiz_id) === String(id) && x.passed === true
    );
  }

  function calculate() {
    const rl = S.lessons.filter(x => x.is_required !== false && x.completion_required !== false);
    const rq = S.quizzes.filter(x => x.is_required !== false);
    const cl = rl.filter(x => lessonDone(x.id)).length;
    const pq = rq.filter(x => quizDone(x.id)).length;

    const lp = rl.length ? Math.round(cl / rl.length * 100) : 100;
    const qp = rq.length ? Math.round(pq / rq.length * 100) : 100;
    const eligible = cl === rl.length && pq === rq.length;

    S.completion = {
      requiredLessons: rl.length,
      completedLessons: cl,
      requiredQuizzes: rq.length,
      passedQuizzes: pq,
      lessonPercent: lp,
      quizPercent: qp,
      overallPercent: eligible ? 100 : Math.round((lp + qp) / 2),
      lessonsComplete: cl === rl.length,
      quizzesComplete: pq === rq.length,
      eligible,
      courseCompleted: S.enrollment.status === "completed"
    };
    return S.completion;
  }

  async function refresh() {
    await structure();
    await records();
    await certificate();
    calculate();
    render();
    return S.completion;
  }

  function makePanel() {
    if ($("s4uCompletionPolished")) return $("s4uCompletionPolished");

    const anchor =
      $("courseCompletionPanel") ||
      $("lmsCourseCompletion") ||
      $("courseCompletion") ||
      document.querySelector("[data-lms-completion]");

    if (!anchor) return null;

    const p = document.createElement("section");
    p.id = "s4uCompletionPolished";
    p.className = "s4u-lms-completion";
    p.innerHTML = `
      <div class="s4u-completion-hero">
        <div class="s4u-completion-copy">
          <span class="s4u-eyebrow">COURSE COMPLETION</span>
          <h2 id="s4uCompletionTitle">Checking your progress…</h2>
          <p id="s4uCompletionSub">Verifying your lessons and assessments.</p>
        </div>
        <div class="s4u-score-ring" id="s4uCompletionRing">
          <strong id="s4uCompletionPct">0%</strong>
          <span>complete</span>
        </div>
      </div>

      <div class="s4u-requirements">
        <div class="s4u-requirement" id="s4uLessonRequirement">
          <span class="s4u-requirement-icon">✓</span>
          <div><strong>Lessons</strong><small id="s4uLessonRequirementText">0 / 0 complete</small></div>
          <span class="s4u-requirement-status" id="s4uLessonStatus">In progress</span>
        </div>
        <div class="s4u-requirement" id="s4uQuizRequirement">
          <span class="s4u-requirement-icon">✓</span>
          <div><strong>Quizzes</strong><small id="s4uQuizRequirementText">0 / 0 passed</small></div>
          <span class="s4u-requirement-status" id="s4uQuizStatus">In progress</span>
        </div>
      </div>

      <div class="s4u-next-step" id="s4uNextStep">
        <strong>Next step</strong>
        <span id="s4uNextStepText">Complete the remaining requirements.</span>
      </div>

      <div class="s4u-complete-banner" id="s4uCompleteBanner" hidden>
        <div class="s4u-complete-mark">✓</div>
        <div>
          <span class="s4u-eyebrow">CONGRATULATIONS</span>
          <strong>You completed this course.</strong>
          <p>Your training record has been updated successfully.</p>
        </div>
      </div>

      <div class="s4u-certificate-card" id="s4uCertificateCard" hidden>
        <div>
          <span class="s4u-eyebrow">CERTIFICATE</span>
          <strong id="s4uCertificateNumber">Certificate issued</strong>
          <small id="s4uCertificateDate"></small>
        </div>
        <a id="s4uCertificateButton" class="s4u-primary-button" href="#" hidden>View Certificate</a>
      </div>

      <button class="s4u-primary-button s4u-full-button" id="s4uVerifyCompletion" type="button">
        Verify Completion
      </button>
    `;
    anchor.appendChild(p);
    return p;
  }

  function render() {
    const p = makePanel();
    if (!p) return;

    const c = calculate();
    const value = c.eligible ? 100 : c.overallPercent;

    $("s4uCompletionPct").textContent = `${value}%`;
    $("s4uCompletionRing").style.setProperty("--progress", `${value * 3.6}deg`);
    $("s4uLessonRequirementText").textContent = `${c.completedLessons} / ${c.requiredLessons} complete`;
    $("s4uQuizRequirementText").textContent = `${c.passedQuizzes} / ${c.requiredQuizzes} passed`;

    $("s4uLessonRequirement").classList.toggle("complete", c.lessonsComplete);
    $("s4uQuizRequirement").classList.toggle("complete", c.quizzesComplete);
    $("s4uLessonStatus").textContent = c.lessonsComplete ? "Complete" : "In progress";
    $("s4uQuizStatus").textContent = c.quizzesComplete ? "Passed" : "In progress";

    if (c.eligible) {
      p.classList.add("complete");
      $("s4uCompletionTitle").textContent = "Course complete!";
      $("s4uCompletionSub").textContent = "All required lessons and quizzes have been completed.";
      $("s4uNextStep").hidden = true;
      $("s4uCompleteBanner").hidden = false;
      $("s4uVerifyCompletion").textContent = S.certificate ? "Completion Verified" : "Issue Certificate";
    } else {
      p.classList.remove("complete");
      $("s4uCompletionTitle").textContent = value ? "You're making progress." : "Ready when you are.";
      $("s4uCompletionSub").textContent = "Complete every required lesson and pass every required quiz to finish.";
      $("s4uNextStep").hidden = false;
      $("s4uCompleteBanner").hidden = true;

      const left = [];
      const rl = c.requiredLessons - c.completedLessons;
      const rq = c.requiredQuizzes - c.passedQuizzes;
      if (rl) left.push(`${rl} lesson${rl === 1 ? "" : "s"}`);
      if (rq) left.push(`${rq} quiz${rq === 1 ? "" : "zes"}`);
      $("s4uNextStepText").textContent = left.length
        ? `Finish ${left.join(" and ")} to complete the course.`
        : "Complete the remaining requirements.";
    }

    if (S.certificate && !S.certificate.revoked_at) {
      $("s4uCertificateCard").hidden = false;
      $("s4uCertificateNumber").textContent =
        S.certificate.certificate_number || "Certificate issued";
      $("s4uCertificateDate").textContent = S.certificate.issued_at
        ? new Date(S.certificate.issued_at).toLocaleDateString(undefined, {
            year: "numeric", month: "long", day: "numeric"
          })
        : "";

      if (S.certificate.certificate_url) {
        $("s4uCertificateButton").href = S.certificate.certificate_url;
        $("s4uCertificateButton").hidden = false;
      }
    }
  }

  async function complete() {
    if (!S.completion.eligible) return null;

    const now = new Date().toISOString();
    const { data, error } = await db().from(T.enrollments)
      .update({
        status: "completed",
        progress_percent: 100,
        completed_at: S.enrollment.completed_at || now,
        last_activity_at: now
      })
      .eq("id", S.enrollment.id)
      .eq("user_id", S.user.id)
      .select("*")
      .single();

    if (error) throw error;
    S.enrollment = { ...S.enrollment, ...data };
    return data;
  }

  async function issueCertificate() {
    if (!S.completion.eligible) {
      throw new Error("Complete all required lessons and pass all required quizzes first.");
    }

    if (S.course?.certificate_enabled === false) return null;
    await complete();
    await certificate();

    if (S.certificate && !S.certificate.revoked_at) return S.certificate;

    const random = crypto?.randomUUID
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

    const payload = {
      enrollment_id: S.enrollment.id,
      certificate_number: `S4U-${new Date().getFullYear()}-${random}`,
      issued_at: new Date().toISOString(),
      metadata: {
        course_id: S.enrollment.course_id,
        course_title: S.course?.title || null,
        user_id: S.user.id,
        generated_by: "screenings4u-lms"
      }
    };

    const { data, error } = await db().from(T.certificates)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        await certificate();
        return S.certificate;
      }
      throw error;
    }

    S.certificate = data;
    return data;
  }

  async function verify() {
    await refresh();
    if (!S.completion.eligible) {
      render();
      return { completion: S.completion, certificate: S.certificate };
    }

    await complete();
    if (!S.certificate && S.course?.certificate_enabled !== false) {
      await issueCertificate();
    }

    calculate();
    render();

    document.dispatchEvent(new CustomEvent("screenings4u:lms-completion-ready", {
      detail: { enrollment: S.enrollment, course: S.course, completion: S.completion, certificate: S.certificate }
    }));

    return { completion: S.completion, certificate: S.certificate };
  }

  function bind() {
    document.addEventListener("screenings4u:lms-progress-updated", () => refresh().catch(console.error));
    document.addEventListener("screenings4u:lms-quiz-completed", () => refresh().catch(console.error));
    document.addEventListener("screenings4u:lms-quiz-passed", () => refresh().catch(console.error));

    document.addEventListener("click", async e => {
      if (!e.target.closest("#s4uVerifyCompletion")) return;
      const b = $("s4uVerifyCompletion");
      const old = b.textContent;
      b.disabled = true;
      b.textContent = "Checking…";

      try {
        const result = await verify();
        toast(
          result.certificate
            ? "Course complete. Your certificate is available."
            : result.completion.eligible
              ? "Course complete."
              : "You're not finished yet. Complete the remaining requirements.",
          result.completion.eligible ? "success" : "info"
        );
      } catch (err) {
        toast(err?.message || "Unable to verify course completion.", "error");
      } finally {
        b.disabled = false;
        b.textContent = old;
      }
    });
  }

  function toast(text, type) {
    const node = $("lmsCompletionToast");
    if (!node) {
      document.dispatchEvent(new CustomEvent("screenings4u:lms-message", {
        detail: { message: text, type }
      }));
      return;
    }
    node.textContent = text;
    node.dataset.type = type;
    node.classList.add("show");
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.classList.remove("show"), 4500);
  }

  async function init() {
    try {
      await user();
      await enrollment();
      await refresh();
      if (S.completion.eligible) {
        await complete();
        if (!S.certificate && S.course?.certificate_enabled !== false) {
          await issueCertificate();
        }
        render();
      }
    } catch (err) {
      console.error("Completion polish failed:", err);
      toast(err?.message || "Unable to load course completion.", "error");
    }
  }

  window.Screenings4uLMSCompletionPolished = {
    state: S, init, refresh, calculateCompletion: calculate,
    verifyAndComplete: verify, markEnrollmentCompleted: complete,
    issueCertificate, render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { bind(); init(); }, { once: true });
  } else {
    bind();
    init();
  }
})();
