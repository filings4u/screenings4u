/* screenings4u LMS v1 — Student Course Player */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const courseId = params.get('course');
  const enrollmentId = params.get('enrollment');

  const state = {
    course: null,
    sections: [],
    lessons: [],
    currentLesson: null,
    currentLessonIndex: -1,
    enrollment: null,
    lessonProgress: new Map(),
    currentAssessment: null,
    currentAssessmentQuestions: [],
    assessmentAttempt: null
  };

  const $ = id => document.getElementById(id);

  function db() {
    const candidates = [
      window.supabaseClient,
      window.supabase
    ];

    const client = candidates.find(v => v && typeof v.from === 'function');

    if (!client) {
      throw new Error('Supabase client was not found. Check lms-config.js.');
    }

    return client;
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[c]));
  }

  function toast(message, type = 'success') {
    const el = $('playerToast');

    el.textContent = message;
    el.className = `player-toast ${type} show`;

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  async function getCurrentUser() {
    const client = db();

    if (!client.auth?.getUser) {
      throw new Error('Supabase authentication is not available.');
    }

    const { data, error } = await client.auth.getUser();

    if (error) throw error;

    if (!data?.user) {
      throw new Error('Please sign in to access this course.');
    }

    return data.user;
  }

  async function loadCourse() {
    if (!courseId) {
      throw new Error('No course was specified.');
    }

    const user = await getCurrentUser();

    const { data: course, error: courseError } = await db()
      .from('lms_courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    state.course = course;

    let enrollmentQuery = db()
      .from('lms_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed']);

    if (enrollmentId) {
      enrollmentQuery = enrollmentQuery.eq('id', enrollmentId);
    }

    const { data: enrollment, error: enrollmentError } =
      await enrollmentQuery.maybeSingle();

    if (enrollmentError) throw enrollmentError;

    if (!enrollment) {
      throw new Error('You do not have access to this course.');
    }

    state.enrollment = enrollment;

    $('courseTitle').textContent = course.title || 'Course';
    $('sidebarCourseTitle').textContent = course.title || 'Course';
    $('completeCourseTitle').textContent = course.title || 'Congratulations';

    await loadCourseStructure();
    await loadProgress();
    renderOutline();

    const firstIncomplete = state.lessons.find(
      lesson => !isLessonComplete(lesson.id)
    );

    const initialLessonId =
      params.get('lesson') ||
      firstIncomplete?.id ||
      state.lessons[0]?.id;

    if (initialLessonId) {
      await openLesson(initialLessonId);
    } else {
      showCourseComplete();
    }
  }

  async function loadCourseStructure() {
    const { data: sections, error: sectionError } = await db()
      .from('lms_sections')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (sectionError) throw sectionError;

    state.sections = sections || [];

    const sectionIds = state.sections.map(section => section.id);

    if (!sectionIds.length) {
      state.lessons = [];
      return;
    }

    const { data: lessons, error: lessonError } = await db()
      .from('lms_lessons')
      .select('*')
      .in('section_id', sectionIds)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (lessonError) throw lessonError;

    state.lessons = lessons || [];
  }

  async function loadProgress() {
    const { data, error } = await db()
      .from('lms_lesson_progress')
      .select('*')
      .eq('enrollment_id', state.enrollment.id);

    if (error) throw error;

    state.lessonProgress.clear();

    (data || []).forEach(row => {
      state.lessonProgress.set(row.lesson_id, row);
    });

    updateCourseProgress();
  }

  function isLessonComplete(lessonId) {
    return state.lessonProgress.get(lessonId)?.completed_at != null;
  }

  function getLessonProgress(lessonId) {
    return state.lessonProgress.get(lessonId) || null;
  }

  function renderOutline() {
    const container = $('courseOutline');

    if (!state.sections.length) {
      container.innerHTML =
        '<div class="player-loading">No published course content is available.</div>';
      return;
    }

    container.innerHTML = state.sections.map(section => {
      const lessons = state.lessons.filter(
        lesson => lesson.section_id === section.id
      );

      return `
        <div class="outline-section">
          <div class="outline-section-title">
            ${esc(section.title)}
          </div>

          ${lessons.map(lesson => {
            const complete = isLessonComplete(lesson.id);

            return `
              <button
                class="outline-lesson ${complete ? 'completed' : ''}"
                data-lesson-id="${esc(lesson.id)}"
                type="button"
              >
                <span class="outline-check">
                  ${complete ? '✓' : ''}
                </span>
                <span class="outline-lesson-name">
                  ${esc(lesson.title)}
                </span>
              </button>
            `;
          }).join('')}
        </div>
      `;
    }).join('');

    container.querySelectorAll('.outline-lesson').forEach(button => {
      button.addEventListener('click', () => {
        openLesson(button.dataset.lessonId);
      });
    });

    highlightCurrentLesson();
  }

  function highlightCurrentLesson() {
    document.querySelectorAll('.outline-lesson').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.lessonId === state.currentLesson?.id
      );
    });
  }

  async function loadLessonContent(lessonId) {
    const { data, error } = await db()
      .from('lms_content_blocks')
      .select(`
        *,
        lms_media(*)
      `)
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  async function openLesson(lessonId) {
    const lesson = state.lessons.find(item => item.id === lessonId);

    if (!lesson) return;

    if (lesson.lock_until_previous_complete) {
      const index = state.lessons.findIndex(item => item.id === lessonId);

      if (index > 0) {
        const previous = state.lessons[index - 1];

        if (!isLessonComplete(previous.id)) {
          toast('Complete the previous lesson first.', 'error');
          return;
        }
      }
    }

    try {
      $('playerLoading').hidden = false;
      $('lessonView').hidden = true;
      $('courseCompleteView').hidden = true;

      const blocks = await loadLessonContent(lessonId);

      state.currentLesson = {
        ...lesson,
        blocks
      };

      state.currentLessonIndex =
        state.lessons.findIndex(item => item.id === lessonId);

      $('lessonSectionName').textContent =
        state.sections.find(section => section.id === lesson.section_id)?.title || 'SECTION';

      $('lessonTitle').textContent = lesson.title || 'Lesson';
      $('lessonDescription').textContent = lesson.description || '';
      $('lessonRequiredBadge').textContent =
        lesson.is_required === false ? 'Optional' : 'Required';

      renderLessonBlocks(blocks);
      await loadLessonAssessment(lessonId);
      updateLessonNavigation();

      $('playerLoading').hidden = true;
      $('lessonView').hidden = false;

      highlightCurrentLesson();

      history.replaceState(
        null,
        '',
        `lms-course-player.html?course=${encodeURIComponent(courseId)}&lesson=${encodeURIComponent(lessonId)}`
      );

      await ensureLessonProgress(lessonId);

    } catch (error) {
      console.error(error);
      $('playerLoading').hidden = false;
      toast(error.message || 'Unable to open lesson.', 'error');
    }
  }

  function renderLessonBlocks(blocks) {
    const container = $('lessonContent');

    if (!blocks.length) {
      container.innerHTML =
        '<div class="student-content-block"><p>This lesson does not have any published content yet.</p></div>';
      return;
    }

    container.innerHTML = blocks.map(block => renderBlock(block)).join('');

    attachMediaProgressTracking();
  }

  function renderBlock(block) {
    const media = block.lms_media;
    const url = block.external_url || '';

    if (block.block_type === 'heading') {
      return `
        <article class="student-content-block">
          <h2>${esc(block.content || block.title || '')}</h2>
        </article>
      `;
    }

    if (block.block_type === 'text') {
      return `
        <article class="student-content-block">
          ${esc(block.content || '').replace(/\n/g, '<br>')}
        </article>
      `;
    }

    if (block.block_type === 'video') {
      const isCloudflareEmbed =
        /videodelivery\.net/i.test(url) && !/\.(m3u8|mp4)(\?|$)/i.test(url);

      const player = isCloudflareEmbed
        ? `
          <iframe
            class="student-content-video student-content-video-iframe"
            src="${esc(url)}"
            title="${esc(block.title || 'Course video')}"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowfullscreen
          ></iframe>
        `
        : `
          <video
            class="student-content-video"
            controls
            preload="metadata"
            data-progress-media
            src="${esc(url)}"
          ></video>
        `;

      return `
        <article class="student-content-block">
          ${block.title ? `<h3>${esc(block.title)}</h3>` : ''}
          ${player}
        </article>
      `;
    }

    if (block.block_type === 'audio') {
      return `
        <article class="student-content-block">
          ${block.title ? `<h3>${esc(block.title)}</h3>` : ''}
          <audio
            class="student-content-audio"
            controls
            data-progress-media
            src="${esc(url)}"
          ></audio>
        </article>
      `;
    }

    if (block.block_type === 'image') {
      return `
        <article class="student-content-block">
          ${block.title ? `<h3>${esc(block.title)}</h3>` : ''}
          <img
            class="student-content-image"
            src="${esc(url)}"
            alt="${esc(block.title || 'Course image')}"
          >
        </article>
      `;
    }

    if (block.block_type === 'pdf' || block.block_type === 'download') {
      return `
        <article class="student-content-block">
          <div class="student-file-card">
            <div>
              <strong>${esc(block.title || 'Course document')}</strong>
              <span>${esc(media?.original_filename || 'Document')}</span>
            </div>
            <a
              class="player-button secondary"
              href="${esc(url)}"
              target="_blank"
              rel="noopener"
            >
              ${block.block_type === 'pdf' ? 'Open PDF' : 'Download'}
            </a>
          </div>
        </article>
      `;
    }

    if (block.block_type === 'link') {
      return `
        <article class="student-content-block">
          <a
            class="student-link"
            href="${esc(url)}"
            target="_blank"
            rel="noopener"
          >
            ${esc(block.title || url)}
          </a>
        </article>
      `;
    }

    if (block.block_type === 'embed') {
      const height = Number(block.settings?.height || 350);

      return `
        <article class="student-content-block">
          ${block.title ? `<h3>${esc(block.title)}</h3>` : ''}
          <iframe
            src="${esc(url)}"
            title="${esc(block.title || 'Embedded content')}"
            style="width:100%;height:${height}px;border:0;border-radius:9px"
            loading="lazy"
          ></iframe>
        </article>
      `;
    }

    if (block.block_type === 'divider') {
      return `
        <article class="student-content-block">
          <hr>
        </article>
      `;
    }

    return `
      <article class="student-content-block">
        <h3>${esc(block.title || 'Content')}</h3>
        <p>${esc(block.content || '')}</p>
      </article>
    `;
  }

  function attachMediaProgressTracking() {
    document.querySelectorAll('[data-progress-media]').forEach(media => {
      media.addEventListener('ended', () => {
        markCurrentLessonReady();
      });
    });
  }

  async function ensureLessonProgress(lessonId) {
    if (state.lessonProgress.has(lessonId)) return;

    const { data, error } = await db()
      .from('lms_lesson_progress')
      .insert({
        enrollment_id: state.enrollment.id,
        lesson_id: lessonId,
        progress_percent: 0,
        last_position_seconds: 0
      })
      .select('*')
      .single();

    if (error && error.code !== '23505') {
      throw error;
    }

    if (data) {
      state.lessonProgress.set(lessonId, data);
    }
  }

  async function markCurrentLessonReady() {
    const lesson = state.currentLesson;

    if (!lesson || isLessonComplete(lesson.id)) return;

    const assessment = state.currentAssessment;

    if (assessment && assessment.require_pass) {
      const passed = await hasPassedAssessment(assessment.id);

      if (!passed) {
        toast('Complete and pass the assessment before finishing this lesson.', 'error');
        return;
      }
    }

    const now = new Date().toISOString();

    const payload = {
      enrollment_id: state.enrollment.id,
      lesson_id: lesson.id,
      progress_percent: 100,
      completed_at: now,
      updated_at: now
    };

    const { data, error } = await db()
      .from('lms_lesson_progress')
      .upsert(payload, {
        onConflict:'enrollment_id,lesson_id'
      })
      .select('*')
      .single();

    if (error) throw error;

    state.lessonProgress.set(lesson.id, data);

    await updateEnrollmentProgress();
    renderOutline();
    updateLessonNavigation();

    toast('Lesson completed.');

    if (state.currentLessonIndex === state.lessons.length - 1) {
      showCourseComplete();
    }
  }

  async function updateEnrollmentProgress() {
    const total = state.lessons.length;

    if (!total) return;

    const completed = state.lessons.filter(
      lesson => isLessonComplete(lesson.id)
    ).length;

    const progress = Math.round((completed / total) * 10000) / 100;

    const payload = {
      progress_percent: progress,
      last_activity_at: new Date().toISOString(),
      completed_at: progress >= 100 ? new Date().toISOString() : null
    };

    const { data, error } = await db()
      .from('lms_enrollments')
      .update(payload)
      .eq('id', state.enrollment.id)
      .select('*')
      .single();

    if (error) throw error;

    state.enrollment = data;
    updateCourseProgress();

    document.dispatchEvent(new CustomEvent('screenings4u:lms-progress-updated', {
      detail: {
        enrollmentId: state.enrollment.id,
        courseId: courseId,
        progressPercent: Number(state.enrollment.progress_percent || 0)
      }
    }));
  }

  function updateCourseProgress() {
    const progress = Number(state.enrollment?.progress_percent || 0);
    $('courseProgress').textContent = `${progress}% complete`;
  }

  function updateLessonNavigation() {
    const index = state.currentLessonIndex;

    $('previousLessonButton').disabled = index <= 0;

    const complete = state.currentLesson &&
      isLessonComplete(state.currentLesson.id);

    $('lessonCompletionStatus').textContent =
      complete ? '✓ Lesson completed' : 'Lesson not completed';

    $('lessonCompletionStatus').classList.toggle('complete', !!complete);

    const isLast = index === state.lessons.length - 1;

    $('nextLessonButton').textContent =
      isLast ? 'Complete Course →' : 'Next →';

    $('nextLessonButton').disabled =
      !complete && state.currentLesson?.is_required !== false;
  }

  async function nextLesson() {
    const index = state.currentLessonIndex;

    if (index < 0) return;

    if (!isLessonComplete(state.currentLesson.id)) {
      await markCurrentLessonReady();

      if (!isLessonComplete(state.currentLesson.id)) {
        return;
      }
    }

    if (index >= state.lessons.length - 1) {
      showCourseComplete();
      return;
    }

    await openLesson(state.lessons[index + 1].id);
  }

  async function previousLesson() {
    const index = state.currentLessonIndex;

    if (index <= 0) return;

    await openLesson(state.lessons[index - 1].id);
  }

  async function loadLessonAssessment(lessonId) {
    state.currentAssessment = null;
    state.currentAssessmentQuestions = [];

    $('assessmentPanel').hidden = true;

    /*
      Assessments are linked to lesson content blocks through:
        lms_content_blocks.settings.assessment_id

      Use that explicit connection first. This prevents the player from
      accidentally loading a different assessment when a lesson has more
      than one assessment-type content block.

      Keep a lesson-level fallback for older assessments that were created
      before the content-block link was added.
    */
    const { data: blocks, error: blockError } = await db()
      .from('lms_content_blocks')
      .select('id, block_type, settings, sort_order')
      .eq('lesson_id', lessonId)
      .in('block_type', ['quiz', 'knowledge_check'])
      .order('sort_order', { ascending: true });

    if (blockError) throw blockError;

    const linkedAssessmentId =
      (blocks || [])
        .map(block => block.settings?.assessment_id)
        .find(id => !!id) || null;

    let assessmentQuery = db()
      .from('lms_assessments')
      .select('*')
      .eq('is_published', true);

    if (linkedAssessmentId) {
      assessmentQuery = assessmentQuery.eq('id', linkedAssessmentId);
    } else {
      assessmentQuery = assessmentQuery
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    const { data, error } = await assessmentQuery.maybeSingle();

    if (error) throw error;

    if (!data) return;

    state.currentAssessment = data;

    const { data: questions, error: questionError } = await db()
      .from('lms_assessment_questions')
      .select(`
        id,
        question_text,
        question_type,
        points,
        sort_order,
        is_required,
        lms_assessment_options(
          id,
          option_text,
          sort_order,
          is_correct
        )
      `)
      .eq('assessment_id', data.id)
      .order('sort_order', { ascending: true });

    if (questionError) throw questionError;

    state.currentAssessmentQuestions = (questions || []).map(question => ({
      ...question,
      options: [...(question.lms_assessment_options || [])]
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    }));

    $('assessmentTitle').textContent = data.title;
    $('assessmentDescription').textContent = data.description || '';
    $('assessmentQuestionCount').textContent =
      state.currentAssessmentQuestions.length;
    $('assessmentPassingScore').textContent =
      `${Number(data.passing_score || 0)}%`;
    $('assessmentAttempts').textContent =
      Number(data.max_attempts || 0) > 0
        ? Number(data.max_attempts)
        : 'Unlimited';

    $('assessmentPanel').hidden = false;
  }

  async function hasPassedAssessment(assessmentId) {
    const user = await getCurrentUser();

    const { data, error } = await db()
      .from('lms_assessment_attempts')
      .select('passed')
      .eq('assessment_id', assessmentId)
      .eq('user_id', user.id)
      .eq('enrollment_id', state.enrollment.id)
      .eq('passed', true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  }

  async function startAssessment() {
    const assessment = state.currentAssessment;

    if (!assessment) return;

    const user = await getCurrentUser();

    if (Number(assessment.max_attempts || 0) > 0) {
      const { count, error } = await db()
        .from('lms_assessment_attempts')
        .select('id', { count:'exact', head:true })
        .eq('assessment_id', assessment.id)
        .eq('user_id', user.id)
        .eq('enrollment_id', state.enrollment.id);

      if (error) throw error;

      if ((count || 0) >= Number(assessment.max_attempts)) {
        toast('You have reached the maximum number of attempts.', 'error');
        return;
      }
    }

    const { data: attempt, error: attemptError } = await db()
      .from('lms_assessment_attempts')
      .insert({
        assessment_id: assessment.id,
        enrollment_id: state.enrollment.id,
        user_id: user.id,
        attempt_number: await getNextAttemptNumber(assessment.id, user.id),
        started_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (attemptError) throw attemptError;

    state.assessmentAttempt = attempt;

    renderAssessmentPlayer();
    openAssessmentModal();
  }

  async function getNextAttemptNumber(assessmentId, userId) {
    const { data, error } = await db()
      .from('lms_assessment_attempts')
      .select('attempt_number')
      .eq('assessment_id', assessmentId)
      .eq('user_id', userId)
      .eq('enrollment_id', state.enrollment.id)
      .order('attempt_number', { ascending:false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return Number(data?.attempt_number || 0) + 1;
  }

  function renderAssessmentPlayer() {
    const assessment = state.currentAssessment;
    const questions = state.currentAssessmentQuestions;

    $('assessmentPlayerTitle').textContent = assessment.title;

    $('assessmentPlayerBody').innerHTML = questions.map((question, index) => `
      <article class="student-question" data-question-id="${esc(question.id)}">
        <h3>${index + 1}. ${esc(question.question_text)}</h3>

        <div class="student-answer-list">
          ${question.options.map(option => `
            <label class="student-answer">
              <input
                type="radio"
                name="answer-${esc(question.id)}"
                value="${esc(option.id)}"
              >
              <span>${esc(option.option_text)}</span>
            </label>
          `).join('')}
        </div>
      </article>
    `).join('');

    $('assessmentPlayerFooter').innerHTML = `
      <button id="submitAssessmentButton" class="player-button primary" type="button">
        Submit Assessment
      </button>
    `;

    $('submitAssessmentButton').addEventListener(
      'click',
      submitAssessment
    );
  }

  async function submitAssessment() {
    const questions = state.currentAssessmentQuestions;

    const answers = questions.map(question => {
      const selected = document.querySelector(
        `input[name="answer-${CSS.escape(question.id)}"]:checked`
      );

      return {
        question_id: question.id,
        selected_option_id: selected?.value || null
      };
    });

    const requiredMissing = questions.some(question => {
      if (question.is_required === false) return false;

      return !answers.find(
        answer =>
          answer.question_id === question.id &&
          answer.selected_option_id
      );
    });

    if (requiredMissing) {
      toast('Answer all required questions before submitting.', 'error');
      return;
    }

    try {
      let earnedPoints = 0;
      let possiblePoints = 0;

      const answerRows = [];

      for (const answer of answers) {
        const question = questions.find(
          item => item.id === answer.question_id
        );

        if (!question) continue;

        const selectedOption = question.options.find(
          option => option.id === answer.selected_option_id
        );

        const correct = !!selectedOption?.is_correct;

        possiblePoints += Number(question.points || 0);

        if (correct) {
          earnedPoints += Number(question.points || 0);
        }

        answerRows.push({
          attempt_id: state.assessmentAttempt.id,
          question_id: question.id,
          selected_option_id: answer.selected_option_id,
          is_correct: correct
        });
      }

      const score = possiblePoints > 0
        ? Math.round((earnedPoints / possiblePoints) * 10000) / 100
        : 0;

      const passed =
        score >= Number(state.currentAssessment.passing_score || 0);

      const { error: answerError } = await db()
        .from('lms_assessment_attempt_answers')
        .insert(answerRows);

      if (answerError) throw answerError;

      const { data: attempt, error: attemptError } = await db()
        .from('lms_assessment_attempts')
        .update({
          score,
          passed,
          completed_at:new Date().toISOString()
        })
        .eq('id', state.assessmentAttempt.id)
        .select('*')
        .single();

      if (attemptError) throw attemptError;

      state.assessmentAttempt = attempt;

      renderAssessmentResult(score, passed);

    } catch (error) {
      console.error(error);
      toast(error.message || 'Unable to submit assessment.', 'error');
    }
  }

  function renderAssessmentResult(score, passed) {
    $('assessmentPlayerBody').innerHTML = `
      <div class="assessment-result ${passed ? 'passed' : 'failed'}">
        <p class="eyebrow">${passed ? 'PASSED' : 'NOT PASSED'}</p>
        <div class="assessment-score">${score}%</div>
        <p>
          ${passed
            ? 'You passed this assessment.'
            : `You need ${Number(state.currentAssessment.passing_score || 0)}% to pass.`}
        </p>
      </div>
    `;

    $('assessmentPlayerFooter').innerHTML = `
      <button id="assessmentResultClose" class="player-button primary" type="button">
        ${passed ? 'Continue Lesson' : 'Close'}
      </button>
    `;

    $('assessmentResultClose').addEventListener('click', async () => {
      closeAssessmentModal();

      if (passed) {
        await markCurrentLessonReady();
      }
    });
  }

  function openAssessmentModal() {
    $('assessmentPlayerModal').classList.add('open');
    $('assessmentPlayerModal').setAttribute('aria-hidden','false');
  }

  function closeAssessmentModal() {
    $('assessmentPlayerModal').classList.remove('open');
    $('assessmentPlayerModal').setAttribute('aria-hidden','true');
  }

  function showCourseComplete() {
    $('lessonView').hidden = true;
    $('playerLoading').hidden = true;
    $('courseCompleteView').hidden = false;

    $('completeCourseTitle').textContent =
      state.course?.title || 'Course Complete';

    if (Number(state.enrollment?.progress_percent || 0) >= 100) {
      $('certificateButton').hidden = false;
    }
  }

  function bindEvents() {
    $('previousLessonButton').addEventListener(
      'click',
      previousLesson
    );

    $('nextLessonButton').addEventListener(
      'click',
      nextLesson
    );

    $('startAssessmentButton').addEventListener(
      'click',
      () => startAssessment().catch(error => {
        console.error(error);
        toast(error.message || 'Unable to start assessment.', 'error');
      })
    );

    $('closeAssessmentButton').addEventListener(
      'click',
      closeAssessmentModal
    );

    document.querySelectorAll('[data-close-assessment]').forEach(
      element => element.addEventListener('click', closeAssessmentModal)
    );

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeAssessmentModal();
    });

    $('exitCourseButton').addEventListener('click', () => {
      if (history.length > 1) {
        history.back();
      } else {
        location.href = '/';
      }
    });

    $('certificateButton').addEventListener('click', () => {
      location.href =
        `client-certificate.html?course=${encodeURIComponent(courseId)}`;
    });
  }

  async function init() {
    bindEvents();

    try {
      await loadCourse();

      $('playerLoading').hidden = true;
    } catch (error) {
      console.error(error);

      $('playerLoading').textContent =
        error.message || 'Unable to load this course.';
    }
  }

  init();
})();