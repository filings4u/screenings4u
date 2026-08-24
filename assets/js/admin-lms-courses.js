(() => {
  'use strict';

  const state = {
    courses: [],
    filtered: [],
    view: localStorage.getItem('screenings4u_lms_course_view') || 'cards'
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
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c]));
  }

  function toast(message, type = 'error') {
    const el = $('coursesToast');
    if (!el) return;

    el.textContent = message;
    el.className = `admin-toast ${type} show`;

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  function statusLabel(status) {
    return String(status || 'draft').replace(/_/g, ' ');
  }

  function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function courseUrl(course) {
    return `admin-lms-course-manager.html?course=${encodeURIComponent(course.id)}`;
  }

  function previewUrl(course) {
    return `admin-lms-course-preview.html?course=${encodeURIComponent(course.id)}`;
  }

  async function loadCourses() {
    renderLoading();

    const client = db();

    const { data, error } = await client
      .from('lms_courses')
      .select(`
        id,
        slug,
        title,
        short_description,
        description,
        thumbnail_media_id,
        status,
        certificate_enabled,
        passing_score,
        navigation_mode,
        video_completion_percent,
        require_all_required_lessons,
        require_required_assessments,
        allow_student_downloads,
        preview_enabled,
        published_at,
        created_at,
        updated_at,
        lms_sections (
          id,
          sort_order,
          lms_lessons (
            id,
            status,
            sort_order
          )
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    state.courses = (data || []).map(course => {
      const sections = course.lms_sections || [];
      const lessons = sections.flatMap(section => section.lms_lessons || []);

      return {
        ...course,
        sectionCount: sections.length,
        lessonCount: lessons.length,
        draftLessonCount: lessons.filter(
          lesson => String(lesson.status || '').toLowerCase() === 'draft'
        ).length
      };
    });

    updateMetrics();
    applyFilters();
  }

  function updateMetrics() {
    const total = state.courses.length;
    const published = state.courses.filter(
      course => String(course.status).toLowerCase() === 'published'
    ).length;
    const drafts = state.courses.filter(
      course => String(course.status).toLowerCase() === 'draft'
    ).length;
    const lessons = state.courses.reduce(
      (sum, course) => sum + course.lessonCount,
      0
    );

    $('metricTotal').textContent = total;
    $('metricPublished').textContent = published;
    $('metricDrafts').textContent = drafts;
    $('metricLessons').textContent = lessons;
  }

  function applyFilters() {
    const search = ($('courseSearch')?.value || '').trim().toLowerCase();
    const status = $('statusFilter')?.value || 'all';

    state.filtered = state.courses.filter(course => {
      const matchesSearch =
        !search ||
        String(course.title || '').toLowerCase().includes(search) ||
        String(course.slug || '').toLowerCase().includes(search) ||
        String(course.short_description || '').toLowerCase().includes(search);

      const matchesStatus =
        status === 'all' ||
        String(course.status || '').toLowerCase() === status;

      return matchesSearch && matchesStatus;
    });

    renderCourses();
  }

  function renderLoading() {
    $('courseCards').innerHTML = `
      <div class="course-loading">Loading courses...</div>
    `;
    $('courseTableBody').innerHTML = `
      <tr><td colspan="6">Loading courses...</td></tr>
    `;
  }

  function renderCourses() {
    const empty = $('coursesEmpty');

    if (!state.filtered.length) {
      $('courseCards').innerHTML = '';
      $('courseTableBody').innerHTML = '';

      empty.hidden = false;

      const hasCourses = state.courses.length > 0;

      $('emptyTitle').textContent = hasCourses
        ? 'No matching courses'
        : 'No courses yet';

      $('emptyMessage').textContent = hasCourses
        ? 'Try a different search or status filter.'
        : 'Create your first course to start building your LMS curriculum.';

      $('emptyCreateBtn').style.display = hasCourses ? 'none' : '';
      return;
    }

    empty.hidden = true;

    $('courseCards').innerHTML =
      state.filtered.map(renderCard).join('');

    $('courseTableBody').innerHTML =
      state.filtered.map(renderTableRow).join('');
  }

  function renderCard(course) {
    const status = String(course.status || 'draft').toLowerCase();

    return `
      <article class="course-card">
        <div class="course-card-media ${course.thumbnail_media_id ? '' : 'no-image'}">
          <span class="course-card-status ${esc(status)}">
            ${esc(statusLabel(status))}
          </span>
        </div>

        <div class="course-card-body">
          <h2>${esc(course.title)}</h2>
          <p>${esc(course.short_description || course.description || 'No course description yet.')}</p>

          <div class="course-card-meta">
            <div>
              <span>Sections</span>
              <strong>${course.sectionCount}</strong>
            </div>
            <div>
              <span>Lessons</span>
              <strong>${course.lessonCount}</strong>
            </div>
            <div>
              <span>Passing Score</span>
              <strong>${esc(course.passing_score)}%</strong>
            </div>
            <div>
              <span>Video Completion</span>
              <strong>${esc(course.video_completion_percent)}%</strong>
            </div>
          </div>
        </div>

        <div class="course-card-footer">
          <span class="course-card-date">
            Updated ${esc(formatDate(course.updated_at))}
          </span>

          <div class="course-actions">
            <button class="course-action primary" data-action="manage" data-id="${esc(course.id)}">Manage</button>
            <button class="course-action" data-action="preview" data-id="${esc(course.id)}">Preview</button>
            <button class="course-action ${status === 'published' ? '' : 'publish'}"
                    data-action="toggle-status"
                    data-id="${esc(course.id)}">
              ${status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function renderTableRow(course) {
    const status = String(course.status || 'draft').toLowerCase();

    return `
      <tr>
        <td>
          <div class="table-course-name">${esc(course.title)}</div>
          <div class="table-course-description">${esc(course.slug)}</div>
        </td>
        <td>
          <span class="table-status ${esc(status)}">${esc(statusLabel(status))}</span>
        </td>
        <td>${course.sectionCount}</td>
        <td>${course.lessonCount}</td>
        <td>${esc(formatDate(course.updated_at))}</td>
        <td>
          <div class="course-actions">
            <button class="course-action primary" data-action="manage" data-id="${esc(course.id)}">Manage</button>
            <button class="course-action" data-action="preview" data-id="${esc(course.id)}">Preview</button>
            <button class="course-action ${status === 'published' ? '' : 'publish'}"
                    data-action="toggle-status"
                    data-id="${esc(course.id)}">
              ${status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function setView(view) {
    state.view = view;
    localStorage.setItem('screenings4u_lms_course_view', view);

    document.querySelectorAll('.view-toggle').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.view === view
      );
    });

    $('courseCardsView').hidden = view !== 'cards';
    $('courseTableView').hidden = view !== 'table';
  }

  async function toggleCourseStatus(courseId) {
    const course = state.courses.find(item => item.id === courseId);
    if (!course) return;

    const current = String(course.status || 'draft').toLowerCase();
    const next = current === 'published' ? 'draft' : 'published';

    const updates = {
      status: next
    };

    if (next === 'published') {
      updates.published_at = new Date().toISOString();
    } else {
      updates.published_at = null;
    }

    const { error } = await db()
      .from('lms_courses')
      .update(updates)
      .eq('id', courseId);

    if (error) throw error;

    toast(
      next === 'published'
        ? 'Course published.'
        : 'Course moved back to draft.',
      'success'
    );

    await loadCourses();
  }

  function createCourse() {
    location.href = 'admin-lms-course-manager.html?new=1';
  }

  function handleAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;
    const course = state.courses.find(item => item.id === id);

    if (!course) return;

    if (action === 'manage') {
      location.href = courseUrl(course);
      return;
    }

    if (action === 'preview') {
      location.href = previewUrl(course);
      return;
    }

    if (action === 'toggle-status') {
      toggleCourseStatus(id).catch(error => {
        console.error(error);
        toast(error.message || 'Unable to update course status.', 'error');
      });
    }
  }

  async function init() {
    try {
      setView(state.view);

      $('courseSearch').addEventListener('input', applyFilters);
      $('statusFilter').addEventListener('change', applyFilters);

      document.querySelectorAll('.view-toggle').forEach(button => {
        button.addEventListener('click', () => {
          setView(button.dataset.view);
        });
      });

      $('courseCards').addEventListener('click', handleAction);
      $('courseTableBody').addEventListener('click', handleAction);

      $('refreshCoursesBtn').addEventListener('click', () => {
        loadCourses().catch(error => {
          console.error(error);
          toast(error.message || 'Unable to load courses.', 'error');
        });
      });

      $('createCourseBtn').addEventListener('click', createCourse);
      $('emptyCreateBtn').addEventListener('click', createCourse);

      await loadCourses();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Unable to load LMS courses.', 'error');

      $('courseCards').innerHTML = `
        <div class="course-loading">
          Unable to load courses. Check the browser console for details.
        </div>
      `;
    }
  }

  init();
})();
