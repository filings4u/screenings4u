(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const courseId = params.get('course');
  const isNew = params.get('new') === '1';

  const state = {
    course: null,
    sections: []
  };

  const $ = id => document.getElementById(id);

  function db() {
    const candidates = [
      window.supabaseClient,
      window.supabaseAdmin,
      window.supabase
    ];

    const client = candidates.find(
      value => value && typeof value.from === 'function'
    );

    if (!client) {
      throw new Error('Supabase client was not found. Check admin-config.js.');
    }

    return client;
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));
  }

  function toast(message, type = 'error') {
    const el = $('managerToast');
    if (!el) return;
    el.textContent = message;
    el.className = `admin-toast ${type} show`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180);
  }

  function openModal(id) {
    $(id).hidden = false;
  }

  function closeModal(id) {
    $(id).hidden = true;
  }

  function sectionNextOrder() {
    return state.sections.length
      ? Math.max(...state.sections.map(section => Number(section.sort_order) || 0)) + 1
      : 1;
  }

  function lessonNextOrder(sectionId) {
    const section = state.sections.find(item => item.id === sectionId);
    const lessons = section?.lms_lessons || [];
    return lessons.length
      ? Math.max(...lessons.map(lesson => Number(lesson.sort_order) || 0)) + 1
      : 1;
  }

  async function loadCourse() {
    if (!courseId) {
      await createNewCourse();
      return;
    }

    const { data: course, error: courseError } = await db()
      .from('lms_courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    const { data: sections, error: sectionError } = await db()
      .from('lms_sections')
      .select(`
        *,
        lms_lessons (
          id,
          section_id,
          title,
          description,
          status,
          sort_order,
          is_required,
          completion_required,
          lock_until_previous_complete,
          estimated_minutes,
          created_at,
          updated_at
        )
      `)
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true });

    if (sectionError) throw sectionError;

    state.course = course;
    state.sections = (sections || []).map(section => ({
      ...section,
      lms_lessons: (section.lms_lessons || []).sort(
        (a,b) => Number(a.sort_order) - Number(b.sort_order)
      )
    }));

    render();
  }

  async function createNewCourse() {
    const client = db();

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) throw new Error('Please sign in again.');

    const title = 'New Course';
    const slugBase = `new-course-${Date.now()}`;

    const { data: course, error } = await client
      .from('lms_courses')
      .insert({
        slug: slugBase,
        title,
        status: 'draft',
        created_by: user.id,
        updated_by: user.id
      })
      .select('*')
      .single();

    if (error) throw error;

    history.replaceState({}, '', `admin-lms-course-manager.html?course=${encodeURIComponent(course.id)}`);
    state.course = course;
    state.sections = [];
    openModal('courseSettingsModal');
    populateCourseSettings();
    render();
    toast('Course created. Add your course details.', 'success');
  }

  function render() {
    const course = state.course;
    if (!course) return;

    $('courseTitle').textContent = course.title || 'Course';
    $('courseSubtitle').textContent =
      course.short_description || 'Build and manage your course curriculum.';

    const status = String(course.status || 'draft').toLowerCase();
    $('summaryStatus').textContent = status.charAt(0).toUpperCase() + status.slice(1);
    $('summarySections').textContent = state.sections.length;

    const lessonCount = state.sections.reduce(
      (sum, section) => sum + (section.lms_lessons || []).length,
      0
    );

    $('summaryLessons').textContent = lessonCount;
    $('summaryPassing').textContent = `${course.passing_score ?? 80}%`;

    $('publishCourseBtn').textContent =
      status === 'published' ? 'Unpublish' : 'Publish';

    $('sideNavigation').textContent =
      String(course.navigation_mode || 'free') === 'sequential'
        ? 'Sequential'
        : 'Free';

    $('sideVideoCompletion').textContent =
      `${course.video_completion_percent ?? 90}%`;

    $('sideCertificate').textContent =
      course.certificate_enabled ? 'Enabled' : 'Disabled';

    $('sideDownloads').textContent =
      course.allow_student_downloads ? 'Allowed' : 'Disabled';

    renderChecklist(lessonCount);
    renderCurriculum();
    loadCourseEnrollments().catch(error => {
      console.error(error);
      toast(error.message || 'Unable to load enrollments.', 'error');
    });
    wireDragAndDrop();
    populateCourseSettings();
  }

  function renderChecklist(lessonCount) {
    const checks = [
      {
        label: 'Course title and slug',
        done: Boolean(state.course?.title && state.course?.slug)
      },
      {
        label: 'At least one section',
        done: state.sections.length > 0
      },
      {
        label: 'At least one lesson',
        done: lessonCount > 0
      },
      {
        label: 'All lessons have titles',
        done: state.sections.every(section =>
          (section.lms_lessons || []).every(lesson => Boolean(lesson.title))
        )
      }
    ];

    $('courseChecklist').innerHTML = checks.map(check => `
      <li class="${check.done ? 'done' : ''}">
        <span class="course-check">${check.done ? '✓' : '○'}</span>
        ${esc(check.label)}
      </li>
    `).join('');
  }

  function renderCurriculum() {
    const list = $('curriculumList');
    const empty = $('curriculumEmpty');

    if (!state.sections.length) {
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    list.innerHTML = state.sections.map((section, sectionIndex) => {
      const lessons = section.lms_lessons || [];

      return `
        <article class="section-card" draggable="true" data-section-id="${esc(section.id)}">
          <header class="section-header">
            <span class="section-drag" title="Drag section">☷</span>
            <div class="section-info">
              <h3 class="section-title">${sectionIndex + 1}. ${esc(section.title)}</h3>
              ${section.description ? `<p class="section-description">${esc(section.description)}</p>` : ''}
            </div>
            <div class="section-actions">
              <button class="icon-button" data-action="add-lesson" data-section-id="${esc(section.id)}" title="Add lesson">+</button>
              <button class="icon-button" data-action="edit-section" data-section-id="${esc(section.id)}" title="Edit section">✎</button>
              <button class="icon-button danger" data-action="delete-section" data-section-id="${esc(section.id)}" title="Delete section">×</button>
            </div>
          </header>

          <div class="section-lessons">
            ${lessons.length ? lessons.map((lesson, index) => renderLesson(lesson, index)).join('') : `
              <div class="curriculum-empty" style="padding:24px 10px;">
                <strong>No lessons in this section.</strong>
              </div>
            `}

            <div class="add-lesson-row">
              <button class="add-lesson-button" data-action="add-lesson" data-section-id="${esc(section.id)}">
                + Add Lesson
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderLesson(lesson, index) {
    const status = String(lesson.status || 'draft').toLowerCase();

    return `
      <div class="lesson-row" draggable="true" data-lesson-id="${esc(lesson.id)}">
        <span class="lesson-drag" title="Drag lesson">☷</span>
        <div class="lesson-number">${index + 1}</div>
        <div class="lesson-info">
          <div class="lesson-title">${esc(lesson.title)}</div>
          <div class="lesson-meta">
            <span class="status-pill ${esc(status)}">${esc(status)}</span>
            ${lesson.is_required ? '<span>Required</span>' : '<span>Optional</span>'}
            ${lesson.estimated_minutes != null ? `<span>${esc(lesson.estimated_minutes)} min</span>` : ''}
          </div>
        </div>
        <div class="lesson-actions">
          <button class="icon-button" data-action="edit-lesson" data-lesson-id="${esc(lesson.id)}" title="Edit lesson">✎</button>
          <button class="icon-button" data-action="open-builder" data-lesson-id="${esc(lesson.id)}" title="Open lesson builder">Build</button>
          <button class="icon-button" data-action="move-lesson" data-lesson-id="${esc(lesson.id)}" title="Move lesson">Move</button>
          <button class="icon-button danger" data-action="delete-lesson" data-lesson-id="${esc(lesson.id)}" title="Delete lesson">×</button>
        </div>
      </div>
    `;
  }

  function populateCourseSettings() {
    const course = state.course;
    if (!course) return;

    $('courseTitleInput').value = course.title || '';
    $('courseSlugInput').value = course.slug || '';
    $('courseShortDescriptionInput').value = course.short_description || '';
    $('courseDescriptionInput').value = course.description || '';
    $('courseStatusInput').value = course.status || 'draft';
    $('courseNavigationInput').value = course.navigation_mode || 'free';
    $('coursePassingInput').value = course.passing_score ?? 80;
    $('courseVideoCompletionInput').value = course.video_completion_percent ?? 90;
    $('certificateEnabledInput').checked = Boolean(course.certificate_enabled);
    $('downloadsEnabledInput').checked = Boolean(course.allow_student_downloads);
    $('previewEnabledInput').checked = Boolean(course.preview_enabled);
    $('requiredLessonsInput').checked = Boolean(course.require_all_required_lessons);
    $('requiredAssessmentsInput').checked = Boolean(course.require_required_assessments);
  }

  function openCourseSettings() {
    populateCourseSettings();
    openModal('courseSettingsModal');
  }

  async function saveCourseSettings(event) {
    event.preventDefault();

    const title = $('courseTitleInput').value.trim();
    const slug = $('courseSlugInput').value.trim();

    if (!title || !slug) {
      toast('Course title and slug are required.', 'error');
      return;
    }

    const { data: { user } } = await db().auth.getUser();
    if (!user) throw new Error('Please sign in again.');

    const status = $('courseStatusInput').value;

    const updates = {
      title,
      slug,
      short_description: $('courseShortDescriptionInput').value.trim() || null,
      description: $('courseDescriptionInput').value.trim() || null,
      status,
      navigation_mode: $('courseNavigationInput').value,
      passing_score: Number($('coursePassingInput').value || 80),
      video_completion_percent: Number($('courseVideoCompletionInput').value || 90),
      certificate_enabled: $('certificateEnabledInput').checked,
      allow_student_downloads: $('downloadsEnabledInput').checked,
      preview_enabled: $('previewEnabledInput').checked,
      require_all_required_lessons: $('requiredLessonsInput').checked,
      require_required_assessments: $('requiredAssessmentsInput').checked,
      updated_by: user.id,
      published_at: status === 'published'
        ? (state.course.published_at || new Date().toISOString())
        : null
    };

    const { data, error } = await db()
      .from('lms_courses')
      .update(updates)
      .eq('id', courseId)
      .select('*')
      .single();

    if (error) throw error;

    state.course = data;
    closeModal('courseSettingsModal');
    render();
    toast('Course settings saved.', 'success');
  }

  function openAddSection() {
    $('sectionModalTitle').textContent = 'Add Section';
    $('sectionIdInput').value = '';
    $('sectionTitleInput').value = '';
    $('sectionDescriptionInput').value = '';
    openModal('sectionModal');
  }

  function openEditSection(sectionId) {
    const section = state.sections.find(item => item.id === sectionId);
    if (!section) return;

    $('sectionModalTitle').textContent = 'Edit Section';
    $('sectionIdInput').value = section.id;
    $('sectionTitleInput').value = section.title || '';
    $('sectionDescriptionInput').value = section.description || '';
    openModal('sectionModal');
  }

  async function saveSection(event) {
    event.preventDefault();

    const id = $('sectionIdInput').value;
    const title = $('sectionTitleInput').value.trim();
    const description = $('sectionDescriptionInput').value.trim() || null;

    if (!title) {
      toast('Section title is required.', 'error');
      return;
    }

    if (id) {
      const { error } = await db()
        .from('lms_sections')
        .update({ title, description })
        .eq('id', id);

      if (error) throw error;
      toast('Section updated.', 'success');
    } else {
      const { error } = await db()
        .from('lms_sections')
        .insert({
          course_id: courseId,
          title,
          description,
          sort_order: sectionNextOrder()
        });

      if (error) throw error;
      toast('Section added.', 'success');
    }

    closeModal('sectionModal');
    await loadCourse();
  }

  async function deleteSection(sectionId) {
    const section = state.sections.find(item => item.id === sectionId);
    if (!section) return;

    const lessonCount = (section.lms_lessons || []).length;

    const message = lessonCount
      ? `Delete "${section.title}" and its ${lessonCount} lesson${lessonCount === 1 ? '' : 's'}? This cannot be undone.`
      : `Delete "${section.title}"?`;

    if (!confirm(message)) return;

    const { error } = await db()
      .from('lms_sections')
      .delete()
      .eq('id', sectionId);

    if (error) throw error;

    await normalizeSectionOrders();
    toast('Section deleted.', 'success');
    await loadCourse();
  }

  async function normalizeSectionOrders() {
    const ordered = [...state.sections].sort(
      (a,b) => Number(a.sort_order) - Number(b.sort_order)
    );

    for (let index = 0; index < ordered.length; index++) {
      const desired = index + 1;
      if (Number(ordered[index].sort_order) !== desired) {
        const { error } = await db()
          .from('lms_sections')
          .update({ sort_order: desired })
          .eq('id', ordered[index].id);

        if (error) throw error;
      }
    }
  }

  function openAddLesson(sectionId) {
    $('lessonModalTitle').textContent = 'Add Lesson';
    $('lessonIdInput').value = '';
    $('lessonSectionIdInput').value = sectionId;
    $('lessonTitleInput').value = '';
    $('lessonDescriptionInput').value = '';
    $('lessonStatusInput').value = 'draft';
    $('lessonMinutesInput').value = '';
    $('lessonRequiredInput').checked = true;
    $('lessonCompletionInput').checked = true;
    $('lessonLockInput').checked = false;
    openModal('lessonModal');
  }

  function openEditLesson(lessonId) {
    for (const section of state.sections) {
      const lesson = (section.lms_lessons || []).find(item => item.id === lessonId);
      if (!lesson) continue;

      $('lessonModalTitle').textContent = 'Edit Lesson';
      $('lessonIdInput').value = lesson.id;
      $('lessonSectionIdInput').value = section.id;
      $('lessonTitleInput').value = lesson.title || '';
      $('lessonDescriptionInput').value = lesson.description || '';
      $('lessonStatusInput').value = lesson.status || 'draft';
      $('lessonMinutesInput').value = lesson.estimated_minutes ?? '';
      $('lessonRequiredInput').checked = Boolean(lesson.is_required);
      $('lessonCompletionInput').checked = Boolean(lesson.completion_required);
      $('lessonLockInput').checked = Boolean(lesson.lock_until_previous_complete);
      openModal('lessonModal');
      return;
    }
  }

  async function saveLesson(event) {
    event.preventDefault();

    const id = $('lessonIdInput').value;
    const sectionId = $('lessonSectionIdInput').value;
    const title = $('lessonTitleInput').value.trim();

    if (!title) {
      toast('Lesson title is required.', 'error');
      return;
    }

    const payload = {
      title,
      description: $('lessonDescriptionInput').value.trim() || null,
      status: $('lessonStatusInput').value,
      estimated_minutes: $('lessonMinutesInput').value
        ? Number($('lessonMinutesInput').value)
        : null,
      is_required: $('lessonRequiredInput').checked,
      completion_required: $('lessonCompletionInput').checked,
      lock_until_previous_complete: $('lessonLockInput').checked
    };

    if (id) {
      const { error } = await db()
        .from('lms_lessons')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      toast('Lesson updated.', 'success');
    } else {
      const { error } = await db()
        .from('lms_lessons')
        .insert({
          ...payload,
          section_id: sectionId,
          sort_order: lessonNextOrder(sectionId)
        });

      if (error) throw error;
      toast('Lesson added.', 'success');
    }

    closeModal('lessonModal');
    await loadCourse();
  }

  async function deleteLesson(lessonId) {
    let lesson = null;

    for (const section of state.sections) {
      lesson = (section.lms_lessons || []).find(item => item.id === lessonId);
      if (lesson) break;
    }

    if (!lesson) return;

    if (!confirm(`Delete "${lesson.title}"? This cannot be undone.`)) return;

    const { error } = await db()
      .from('lms_lessons')
      .delete()
      .eq('id', lessonId);

    if (error) throw error;

    toast('Lesson deleted.', 'success');
    await loadCourse();
  }

  function openBuilder(lessonId) {
    location.href =
      `admin-lms-lesson-builder.html?lesson=${encodeURIComponent(lessonId)}`;
  }

  function openPreview() {
    location.href =
      `admin-lms-course-preview.html?course=${encodeURIComponent(courseId)}`;
  }

  function collectPublishingChecks() {
    const course = state.course;
    const sections = state.sections;
    const lessons = sections.flatMap(section => section.lms_lessons || []);

    const checks = [];
    const blockers = [];

    const addCheck = (title, detail, pass, blocker = detail) => {
      checks.push({ title, detail, pass });
      if (!pass) blockers.push(blocker);
    };

    addCheck(
      'Course information',
      course?.title && course?.slug
        ? 'Title and slug are configured.'
        : 'A title and slug are required.',
      Boolean(course?.title && course?.slug)
    );

    addCheck(
      'Course curriculum',
      sections.length
        ? `${sections.length} section${sections.length === 1 ? '' : 's'} configured.`
        : 'At least one section is required.',
      sections.length > 0
    );

    addCheck(
      'Lessons',
      lessons.length
        ? `${lessons.length} lesson${lessons.length === 1 ? '' : 's'} configured.`
        : 'At least one lesson is required.',
      lessons.length > 0
    );

    const emptySections = sections.filter(
      section => !(section.lms_lessons || []).length
    );

    addCheck(
      'No empty sections',
      emptySections.length
        ? `${emptySections.length} section${emptySections.length === 1 ? '' : 's'} have no lessons.`
        : 'Every section contains at least one lesson.',
      emptySections.length === 0,
      emptySections.length
        ? `Add a lesson to: ${emptySections.map(section => section.title).join(', ')}.`
        : ''
    );

    const untitledLessons = lessons.filter(lesson => !String(lesson.title || '').trim());

    addCheck(
      'Lesson titles',
      untitledLessons.length
        ? `${untitledLessons.length} lesson${untitledLessons.length === 1 ? '' : 's'} are missing titles.`
        : 'All lessons have titles.',
      untitledLessons.length === 0
    );

    const draftLessons = lessons.filter(
      lesson => String(lesson.status || 'draft').toLowerCase() !== 'published'
    );

    addCheck(
      'Lesson publishing status',
      draftLessons.length
        ? `${draftLessons.length} lesson${draftLessons.length === 1 ? '' : 's'} are not published.`
        : 'All lessons are published.',
      draftLessons.length === 0,
      draftLessons.length
        ? 'Publish every lesson before publishing the course.'
        : ''
    );

    const requiredLessonsWithoutCompletion = lessons.filter(
      lesson => lesson.is_required && lesson.completion_required === false
    );

    addCheck(
      'Required lesson completion',
      course.require_all_required_lessons && requiredLessonsWithoutCompletion.length
        ? `${requiredLessonsWithoutCompletion.length} required lesson${requiredLessonsWithoutCompletion.length === 1 ? '' : 's'} do not require completion.`
        : 'Required lessons have completion requirements configured.',
      !(course.require_all_required_lessons && requiredLessonsWithoutCompletion.length)
    );

    return { checks, blockers };
  }

  function openPublishWorkflow() {
    const isPublished =
      String(state.course?.status || 'draft').toLowerCase() === 'published';

    if (isPublished) {
      $('publishModalTitle').textContent = 'Unpublish Course';
      $('publishSummary').innerHTML = `
        This course is currently <strong>published</strong>.
        Moving it back to draft will remove its published status.
      `;
      $('publishChecks').innerHTML = '';
      $('publishBlockers').hidden = true;
      $('confirmPublishBtn').disabled = false;
      $('confirmPublishBtn').textContent = 'Move to Draft';
      openModal('publishModal');
      return;
    }

    const { checks, blockers } = collectPublishingChecks();

    $('publishModalTitle').textContent = 'Publish Course';
    $('publishSummary').innerHTML = `
      Review the course before publishing.
      <strong>${state.course.title || 'Untitled course'}</strong>
      will become available according to your LMS access rules.
    `;

    $('publishChecks').innerHTML = checks.map(check => `
      <div class="publish-check ${check.pass ? 'pass' : 'fail'}">
        <span class="publish-check-icon">${check.pass ? '✓' : '!'}</span>
        <div>
          <div class="publish-check-title">${esc(check.title)}</div>
          <div class="publish-check-detail">${esc(check.detail)}</div>
        </div>
      </div>
    `).join('');

    $('publishBlockers').hidden = blockers.length === 0;
    $('publishBlockerList').innerHTML = blockers
      .map(blocker => `<li>${esc(blocker)}</li>`)
      .join('');

    $('confirmPublishBtn').disabled = blockers.length > 0;
    $('confirmPublishBtn').textContent =
      blockers.length ? 'Resolve Blockers' : 'Publish Course';

    openModal('publishModal');
  }

  async function confirmPublishWorkflow() {
    const current = String(state.course.status || 'draft').toLowerCase();

    if (current === 'published') {
      const { data: { user } } = await db().auth.getUser();
      if (!user) throw new Error('Please sign in again.');

      const { data, error } = await db()
        .from('lms_courses')
        .update({
          status: 'draft',
          published_at: null,
          updated_by: user.id
        })
        .eq('id', courseId)
        .select('*')
        .single();

      if (error) throw error;

      state.course = data;
      closeModal('publishModal');
      render();
      toast('Course moved back to draft.', 'success');
      return;
    }

    const { blockers } = collectPublishingChecks();

    if (blockers.length) {
      toast('Resolve the publishing blockers first.', 'error');
      return;
    }

    const { data: { user } } = await db().auth.getUser();
    if (!user) throw new Error('Please sign in again.');

    const now = new Date().toISOString();

    const { data, error } = await db()
      .from('lms_courses')
      .update({
        status: 'published',
        published_at: state.course.published_at || now,
        updated_by: user.id
      })
      .eq('id', courseId)
      .select('*')
      .single();

    if (error) throw error;

    state.course = data;
    closeModal('publishModal');
    render();
    toast('Course published successfully.', 'success');
  }

  function getSectionCards() {
    return [...$('curriculumList').querySelectorAll('.section-card')];
  }

  function getLessonRows(sectionCard) {
    return [...sectionCard.querySelectorAll('.lesson-row')];
  }

  async function saveSectionOrder(orderedIds) {
    if (!orderedIds.length) return;

    /*
     * Two-phase ordering avoids the UNIQUE(course_id, sort_order)
     * constraint while rows exchange positions.
     */
    const offset = orderedIds.length + 1000;

    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await db()
        .from('lms_sections')
        .update({ sort_order: offset + i + 1 })
        .eq('id', orderedIds[i]);

      if (error) throw error;
    }

    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await db()
        .from('lms_sections')
        .update({ sort_order: i + 1 })
        .eq('id', orderedIds[i]);

      if (error) throw error;
    }
  }

  async function saveLessonOrder(sectionId, orderedIds) {
    if (!orderedIds.length) return;

    const offset = orderedIds.length + 1000;

    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await db()
        .from('lms_lessons')
        .update({ sort_order: offset + i + 1 })
        .eq('id', orderedIds[i])
        .eq('section_id', sectionId);

      if (error) throw error;
    }

    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await db()
        .from('lms_lessons')
        .update({ sort_order: i + 1 })
        .eq('id', orderedIds[i])
        .eq('section_id', sectionId);

      if (error) throw error;
    }
  }

  function wireDragAndDrop() {
    const list = $('curriculumList');
    let draggedSection = null;
    let draggedLesson = null;

    list.querySelectorAll('.section-card').forEach(card => {
      card.addEventListener('dragstart', event => {
        if (event.target.closest('.lesson-row')) return;

        draggedSection = card;
        draggedLesson = null;
        card.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', card.dataset.sectionId);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        getSectionCards().forEach(item => item.classList.remove('drag-over'));
        draggedSection = null;
      });

      card.addEventListener('dragover', event => {
        if (!draggedSection || draggedSection === card) return;
        if (event.target.closest('.lesson-row')) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        card.classList.add('drag-over');
      });

      card.addEventListener('dragleave', event => {
        if (!card.contains(event.relatedTarget)) {
          card.classList.remove('drag-over');
        }
      });

      card.addEventListener('drop', async event => {
        if (!draggedSection || draggedSection === card) return;
        if (event.target.closest('.lesson-row')) return;

        event.preventDefault();
        card.classList.remove('drag-over');

        const cards = getSectionCards();
        const fromIndex = cards.indexOf(draggedSection);
        const toIndex = cards.indexOf(card);

        if (fromIndex < 0 || toIndex < 0) return;

        if (fromIndex < toIndex) {
          card.parentNode.insertBefore(draggedSection, card.nextSibling);
        } else {
          card.parentNode.insertBefore(draggedSection, card);
        }

        try {
          toast('Saving section order…', 'info');
          await saveSectionOrder(
            getSectionCards().map(item => item.dataset.sectionId)
          );
          await loadCourse();
          toast('Section order saved.', 'success');
        } catch (error) {
          console.error(error);
          toast(error.message || 'Unable to save section order.', 'error');
          await loadCourse();
        }
      });
    });

    list.querySelectorAll('.lesson-row').forEach(row => {
      row.addEventListener('dragstart', event => {
        event.stopPropagation();
        draggedLesson = row;
        draggedSection = null;
        row.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', row.dataset.lessonId);
      });

      row.addEventListener('dragend', event => {
        event.stopPropagation();
        row.classList.remove('dragging');
        list.querySelectorAll('.lesson-row').forEach(item => item.classList.remove('drag-over'));
        draggedLesson = null;
      });

      row.addEventListener('dragover', event => {
        if (!draggedLesson || draggedLesson === row) return;

        const sourceSection = draggedLesson.closest('.section-card');
        const targetSection = row.closest('.section-card');

        // Lessons are intentionally reorderable only inside their current section.
        if (!sourceSection || !targetSection || sourceSection !== targetSection) return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        row.classList.add('drag-over');
      });

      row.addEventListener('dragleave', event => {
        event.stopPropagation();
        if (!row.contains(event.relatedTarget)) {
          row.classList.remove('drag-over');
        }
      });

      row.addEventListener('drop', async event => {
        if (!draggedLesson || draggedLesson === row) return;

        event.preventDefault();
        event.stopPropagation();
        row.classList.remove('drag-over');

        const sourceSection = draggedLesson.closest('.section-card');
        const targetSection = row.closest('.section-card');

        if (!sourceSection || sourceSection !== targetSection) return;

        const rows = getLessonRows(sourceSection);
        const fromIndex = rows.indexOf(draggedLesson);
        const toIndex = rows.indexOf(row);

        if (fromIndex < 0 || toIndex < 0) return;

        if (fromIndex < toIndex) {
          row.parentNode.insertBefore(draggedLesson, row.nextSibling);
        } else {
          row.parentNode.insertBefore(draggedLesson, row);
        }

        try {
          toast('Saving lesson order…', 'info');
          await saveLessonOrder(
            sourceSection.dataset.sectionId,
            getLessonRows(sourceSection).map(item => item.dataset.lessonId)
          );
          await loadCourse();
          toast('Lesson order saved.', 'success');
        } catch (error) {
          console.error(error);
          toast(error.message || 'Unable to save lesson order.', 'error');
          await loadCourse();
        }
      });
    });
  }


  function normalizeEnrollmentStatus(value) {
    return String(value || 'active').toLowerCase();
  }

  function studentDisplayName(profile) {
    const name = [profile?.first_name, profile?.last_name]
      .filter(Boolean).join(' ').trim();
    return name || profile?.email || 'Student';
  }

  async function loadCourseEnrollments() {
    const table = $('enrollmentTable');
    if (table) table.innerHTML = '<div class="enrollment-empty">Loading enrollments…</div>';

    const { data, error } = await db()
      .from('lms_enrollments')
      .select(`
        id,
        user_id,
        course_id,
        status,
        progress_percent,
        enrolled_at,
        started_at,
        completed_at,
        last_activity_at
      `)
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;

    state.enrollments = data || [];

    const userIds = [...new Set(state.enrollments.map(item => item.user_id).filter(Boolean))];

    if (userIds.length) {
      const { data: profiles, error: profileError } = await db()
        .from('client_profiles')
        .select('id, first_name, last_name, email, phone, company_name, is_active')
        .in('id', userIds);

      if (profileError) {
        console.warn('Unable to load client profiles:', profileError);
        state.studentProfiles = [];
      } else {
        state.studentProfiles = profiles || [];
      }
    } else {
      state.studentProfiles = [];
    }

    renderEnrollments();
  }

  function getStudentProfile(userId) {
    return state.studentProfiles.find(profile => profile.id === userId) || null;
  }

  function renderEnrollments() {
    const search = String($('enrollmentSearch')?.value || '').trim().toLowerCase();
    const status = String($('enrollmentStatusFilter')?.value || 'all');

    const profileMap = new Map(
      state.studentProfiles.map(profile => [profile.id, profile])
    );

    const rows = state.enrollments.filter(enrollment => {
      const profile = profileMap.get(enrollment.user_id);
      const name = studentDisplayName(profile).toLowerCase();
      const email = String(profile?.email || '').toLowerCase();
      const currentStatus = normalizeEnrollmentStatus(enrollment.status);

      const matchesSearch = !search || name.includes(search) || email.includes(search);
      const matchesStatus = status === 'all' || currentStatus === status;

      return matchesSearch && matchesStatus;
    });

    const counts = state.enrollments.reduce((acc, item) => {
      const value = normalizeEnrollmentStatus(item.status);
      acc.total++;
      if (value === 'active') acc.active++;
      if (value === 'completed') acc.completed++;
      return acc;
    }, { total: 0, active: 0, completed: 0 });

    if ($('enrollmentTotal')) $('enrollmentTotal').textContent = counts.total;
    if ($('enrollmentActive')) $('enrollmentActive').textContent = counts.active;
    if ($('enrollmentCompleted')) $('enrollmentCompleted').textContent = counts.completed;

    if (!rows.length) {
      $('enrollmentTable').innerHTML = `
        <div class="enrollment-empty">
          ${state.enrollments.length ? 'No enrollments match your filters.' : 'No students are enrolled in this course yet.'}
        </div>
      `;
      return;
    }

    $('enrollmentTable').innerHTML = `
      <div class="enrollment-row header">
        <div>Student</div>
        <div>Status</div>
        <div>Progress</div>
        <div>Enrolled</div>
        <div>Last Activity</div>
        <div></div>
      </div>
      ${rows.map(enrollment => {
        const profile = profileMap.get(enrollment.user_id);
        const currentStatus = normalizeEnrollmentStatus(enrollment.status);
        const progress = Math.max(0, Math.min(100, Number(enrollment.progress_percent) || 0));

        return `
          <div class="enrollment-row">
            <div>
              <div class="enrollment-student-name">${esc(studentDisplayName(profile))}</div>
              <div class="enrollment-student-email">${esc(profile?.email || '—')}</div>
            </div>
            <div>
              <span class="enrollment-status ${esc(currentStatus)}">${esc(currentStatus)}</span>
            </div>
            <div>
              <strong>${progress.toFixed(0)}%</strong>
              <div class="enrollment-progress"><span style="width:${progress}%"></span></div>
            </div>
            <div>${esc(formatDate(enrollment.enrolled_at))}</div>
            <div>${esc(formatDate(enrollment.last_activity_at))}</div>
            <div>
              <button class="icon-button" data-action="open-enrollment" data-enrollment-id="${esc(enrollment.id)}">View</button>
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  async function searchStudentsForEnrollment() {
    const input = $('enrollStudentSearch');
    const results = $('enrollStudentResults');
    const term = String(input?.value || '').trim();

    if (!term) {
      results.innerHTML = '<div class="enrollment-empty">Start typing to find a student.</div>';
      return;
    }

    results.innerHTML = '<div class="enrollment-empty">Searching…</div>';

    const enrolledIds = new Set(state.enrollments.map(item => item.user_id));

    const { data, error } = await db()
      .from('client_profiles')
      .select('id, first_name, last_name, email, phone, company_name, is_active')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
      .eq('is_active', true)
      .order('last_name', { ascending: true })
      .limit(20);

    if (error) throw error;

    const available = (data || []).filter(profile => !enrolledIds.has(profile.id));

    if (!available.length) {
      results.innerHTML = '<div class="enrollment-empty">No available students found.</div>';
      return;
    }

    results.innerHTML = available.map(profile => `
      <button type="button" class="student-picker-result"
              data-student-id="${esc(profile.id)}">
        <strong>${esc(studentDisplayName(profile))}</strong>
        <small>${esc(profile.email || '')}</small>
      </button>
    `).join('');
  }

  function selectStudentForEnrollment(studentId) {
    const profile = state.studentProfiles.find(item => item.id === studentId)
      || null;

    state.selectedStudentId = studentId;
    $('selectedStudentId').value = studentId;

    if ($('selectedStudentPreview')) {
      $('selectedStudentPreview').hidden = false;
      $('selectedStudentPreview').textContent =
        `${studentDisplayName(profile)} · ${profile?.email || ''}`;
    }

    $('confirmEnrollBtn').disabled = !studentId;
  }

  async function openEnrollStudent() {
    state.selectedStudentId = '';
    $('selectedStudentId').value = '';
    $('enrollStudentSearch').value = '';
    $('selectedStudentPreview').hidden = true;
    $('confirmEnrollBtn').disabled = true;
    $('enrollStudentResults').innerHTML =
      '<div class="enrollment-empty">Start typing to find a student.</div>';

    openModal('enrollStudentModal');
    $('enrollStudentSearch').focus();
  }

  async function createEnrollment(event) {
    event.preventDefault();

    const studentId = String($('selectedStudentId').value || '').trim();
    if (!studentId) {
      toast('Select a student first.', 'error');
      return;
    }

    const existing = state.enrollments.find(item => item.user_id === studentId);
    if (existing) {
      toast('This student is already enrolled in this course.', 'error');
      return;
    }

    const { data: enrollment, error } = await db()
      .from('lms_enrollments')
      .insert({
        user_id: studentId,
        course_id: courseId,
        status: 'active',
        progress_percent: 0
      })
      .select(`
        id,
        user_id,
        course_id,
        status,
        progress_percent,
        enrolled_at,
        started_at,
        completed_at,
        last_activity_at
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        toast('This student is already enrolled in this course.', 'error');
      } else {
        throw error;
      }
      return;
    }

    state.enrollments.unshift(enrollment);
    closeModal('enrollStudentModal');
    await loadCourseEnrollments();
    toast('Student enrolled successfully.', 'success');
  }

  function openEnrollmentDetail(enrollmentId) {
    const enrollment = state.enrollments.find(item => item.id === enrollmentId);
    if (!enrollment) return;

    const profile = getStudentProfile(enrollment.user_id);
    const params = new URLSearchParams({
      enrollment: enrollment.id,
      course: courseId
    });

    window.location.href = `admin-student-detail.html?${params.toString()}`;
  }

  function findLesson(lessonId) {
    for (const section of state.sections) {
      const lesson = (section.lms_lessons || []).find(item => item.id === lessonId);
      if (lesson) return { lesson, section };
    }
    return null;
  }

  function openMoveLesson(lessonId) {
    const found = findLesson(lessonId);
    if (!found) return;

    $('moveLessonIdInput').value = lessonId;
    $('moveLessonName').textContent =
      `${found.lesson.title} · currently in ${found.section.title}`;

    const select = $('moveLessonTargetSectionInput');
    select.innerHTML = state.sections.map(section => `
      <option value="${esc(section.id)}" ${section.id === found.section.id ? 'selected' : ''}>
        ${esc(section.title)}
      </option>
    `).join('');

    openModal('moveLessonModal');
  }

  async function moveLesson(lessonId, targetSectionId) {
    const found = findLesson(lessonId);
    if (!found) throw new Error('Lesson could not be found.');

    const sourceSection = found.section;
    const targetSection = state.sections.find(section => section.id === targetSectionId);

    if (!targetSection) throw new Error('Target section could not be found.');

    if (sourceSection.id === targetSection.id) {
      closeModal('moveLessonModal');
      return;
    }

    const sourceLessons = [...(sourceSection.lms_lessons || [])]
      .sort((a,b) => Number(a.sort_order) - Number(b.sort_order))
      .filter(lesson => lesson.id !== lessonId);

    const targetLessons = [...(targetSection.lms_lessons || [])]
      .sort((a,b) => Number(a.sort_order) - Number(b.sort_order));

    /*
     * The lesson is appended to the target section. Both source and target
     * get a safe temporary ordering before their final 1..N values are saved.
     */
    const sourceIds = sourceLessons.map(lesson => lesson.id);
    const targetIds = [...targetLessons.map(lesson => lesson.id), lessonId];

    const tempBase = 10000;

    // Temporary orders for source section.
    for (let i = 0; i < sourceIds.length; i++) {
      const { error } = await db()
        .from('lms_lessons')
        .update({
          section_id: sourceSection.id,
          sort_order: tempBase + i + 1
        })
        .eq('id', sourceIds[i]);

      if (error) throw error;
    }

    // Temporary order for moved lesson and target lessons.
    for (let i = 0; i < targetIds.length; i++) {
      const id = targetIds[i];

      const { error } = await db()
        .from('lms_lessons')
        .update({
          section_id: targetSection.id,
          sort_order: tempBase + 1000 + i + 1
        })
        .eq('id', id);

      if (error) throw error;
    }

    // Final source order.
    for (let i = 0; i < sourceIds.length; i++) {
      const { error } = await db()
        .from('lms_lessons')
        .update({
          section_id: sourceSection.id,
          sort_order: i + 1
        })
        .eq('id', sourceIds[i]);

      if (error) throw error;
    }

    // Final target order. Moved lesson is appended.
    for (let i = 0; i < targetIds.length; i++) {
      const { error } = await db()
        .from('lms_lessons')
        .update({
          section_id: targetSection.id,
          sort_order: i + 1
        })
        .eq('id', targetIds[i]);

      if (error) throw error;
    }

    closeModal('moveLessonModal');
    await loadCourse();
    toast(`Lesson moved to ${targetSection.title}.`, 'success');
  }

  function handleCurriculumAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    if (action === 'add-lesson') {
      openAddLesson(button.dataset.sectionId);
      return;
    }

    if (action === 'edit-section') {
      openEditSection(button.dataset.sectionId);
      return;
    }

    if (action === 'delete-section') {
      deleteSection(button.dataset.sectionId).catch(error => {
        console.error(error);
        toast(error.message || 'Unable to delete section.', 'error');
      });
      return;
    }

    if (action === 'edit-lesson') {
      openEditLesson(button.dataset.lessonId);
      return;
    }

    if (action === 'open-enrollment') {
      openEnrollmentDetail(button.dataset.enrollmentId);
      return;
    }

    if (action === 'open-builder') {
      openBuilder(button.dataset.lessonId);
      return;
    }

    if (action === 'move-lesson') {
      openMoveLesson(button.dataset.lessonId);
      return;
    }

    if (action === 'delete-lesson') {
      deleteLesson(button.dataset.lessonId).catch(error => {
        console.error(error);
        toast(error.message || 'Unable to delete lesson.', 'error');
      });
    }
  }

  function bind() {
    $('backToCourses').addEventListener('click', () => {
      location.href = 'admin-lms-courses.html';
    });

    $('previewCourseBtn').addEventListener('click', openPreview);
    $('courseSettingsBtn').addEventListener('click', openCourseSettings);
    $('publishCourseBtn').addEventListener('click', openPublishWorkflow);

    $('openEnrollStudentBtn').addEventListener('click', () => {
      openEnrollStudent().catch(error => {
        console.error(error);
        toast(error.message || 'Unable to open enrollment.', 'error');
      });
    });

    $('enrollStudentForm').addEventListener('submit', event => {
      createEnrollment(event).catch(error => {
        console.error(error);
        toast(error.message || 'Unable to enroll student.', 'error');
      });
    });

    $('enrollStudentSearch').addEventListener('input', () => {
      clearTimeout(state.enrollmentSearchTimer);
      state.enrollmentSearchTimer = setTimeout(() => {
        searchStudentsForEnrollment().catch(error => {
          console.error(error);
          $('enrollStudentResults').innerHTML =
            `<div class="enrollment-empty">${esc(error.message || 'Unable to search students.')}</div>`;
        });
      }, 250);
    });

    $('enrollStudentResults').addEventListener('click', event => {
      const button = event.target.closest('[data-student-id]');
      if (!button) return;
      selectStudentForEnrollment(button.dataset.studentId);
    });

    $('enrollmentSearch').addEventListener('input', renderEnrollments);
    $('enrollmentStatusFilter').addEventListener('change', renderEnrollments);


    $('confirmPublishBtn').addEventListener('click', () => {
      if ($('confirmPublishBtn').disabled) return;

      confirmPublishWorkflow().catch(error => {
        console.error(error);
        toast(error.message || 'Unable to change course status.', 'error');
      });
    });

    $('addSectionBtn').addEventListener('click', openAddSection);
    $('emptyAddSectionBtn').addEventListener('click', openAddSection);

    $('courseSettingsForm').addEventListener('submit', event => {
      saveCourseSettings(event).catch(error => {
        console.error(error);
        toast(error.message || 'Unable to save course.', 'error');
      });
    });

    $('sectionForm').addEventListener('submit', event => {
      saveSection(event).catch(error => {
        console.error(error);
        toast(error.message || 'Unable to save section.', 'error');
      });
    });

    $('lessonForm').addEventListener('submit', event => {
      saveLesson(event).catch(error => {
        console.error(error);
        toast(error.message || 'Unable to save lesson.', 'error');
      });
    });

    $('moveLessonForm').addEventListener('submit', event => {
      event.preventDefault();

      const lessonId = $('moveLessonIdInput').value;
      const targetSectionId = $('moveLessonTargetSectionInput').value;

      moveLesson(lessonId, targetSectionId).catch(error => {
        console.error(error);
        toast(error.message || 'Unable to move lesson.', 'error');
      });
    });

    $('curriculumList').addEventListener('click', handleCurriculumAction);

    document.querySelectorAll('[data-close-modal]').forEach(button => {
      button.addEventListener('click', () => closeModal(button.dataset.closeModal));
    });

    document.querySelectorAll('.lms-modal').forEach(modal => {
      modal.addEventListener('click', event => {
        if (event.target === modal) closeModal(modal.id);
      });
    });

    $('courseTitleInput').addEventListener('input', event => {
      if (!$('courseSlugInput').dataset.touched) {
        $('courseSlugInput').value = slugify(event.target.value);
      }
    });

    $('courseSlugInput').addEventListener('input', () => {
      $('courseSlugInput').dataset.touched = 'true';
    });
  }

  async function init() {
    try {
      bind();
      await loadCourse();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Unable to load course manager.', 'error');
    }
  }

  init();
})();