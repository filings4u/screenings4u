/* screenings4u LMS v1 - Admin Course Builder
 *
 * Depends on:
 *   admin-config.js exposing a Supabase client as window.supabaseClient
 *   OR window.supabaseAdmin
 *   OR window.supabase
 *
 * This builder uses ONLY the new lms_* schema.
 */

(() => {
  'use strict';

  const state = {
    courseId: new URLSearchParams(location.search).get('course'),
    course: null,
    sections: [],
    expandedSections: new Set(),
    expandedLessons: new Set()
  };

  const $ = (id) => document.getElementById(id);

  function getClient() {
    const client =
      window.Screenings4uAdmin?.supabase ||
      window.supabaseClient ||
      window.screenings4uSupabase;

    if (!client || typeof client.from !== 'function') {
      throw new Error(
        'Supabase client was not initialized. Check assets/js/admin-config.js.'
      );
    }

    window.screenings4uSupabase = client;
    return client;
  }

  const db = () => getClient();

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[char]));
  }

  function slugify(value) {
    return String(value || '')
      .trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180);
  }

  function toast(message, type = 'success') {
    const el = $('lmsToast');
    if (!el) return;
    el.textContent = message;
    el.className = `admin-toast ${type}`;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  function modal({ title, eyebrow = 'LMS', body, actions = [] }) {
    $('lmsModalEyebrow').textContent = eyebrow;
    $('lmsModalTitle').textContent = title;
    $('lmsModalBody').innerHTML = body;
    $('lmsModalActions').innerHTML = '';

    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.className || 'secondary-button';
      button.textContent = action.label;
      button.addEventListener('click', async () => {
        if (action.handler) await action.handler();
      });
      $('lmsModalActions').appendChild(button);
    });

    $('lmsModal').classList.add('open');
    $('lmsModal').setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    $('lmsModal').classList.remove('open');
    $('lmsModal').setAttribute('aria-hidden', 'true');
    $('lmsModalBody').innerHTML = '';
    $('lmsModalActions').innerHTML = '';
  }

  function resultPopup({
    title,
    eyebrow = 'LMS',
    message,
    type = 'success',
    buttonLabel = 'Done'
  }) {
    const icon =
      type === 'success' ? '✓' :
      type === 'error' ? '!' :
      type === 'warning' ? '!' : 'i';

    modal({
      eyebrow,
      title,
      body: `
        <div class="lms-result-popup ${type}">
          <div class="lms-result-icon" aria-hidden="true">${icon}</div>
          <div class="lms-result-message">
            ${escapeHtml(message)}
          </div>
        </div>
      `,
      actions: [
        {
          label: buttonLabel,
          className: 'primary-button',
          handler: closeModal
        }
      ]
    });
  }

  function setTab(name) {
    document.querySelectorAll('.training-course-nav-item').forEach((button) => {
      button.classList.toggle('active', button.dataset.builderTab === name);
    });
    document.querySelectorAll('.training-course-tab').forEach((section) => {
      section.classList.toggle('active', section.id === `builderTab${name[0].toUpperCase()}${name.slice(1)}`);
    });
    if (name === 'publish') renderPublishChecklist();
    if (name === 'curriculum') loadCurriculum();
  }

  function readCourseForm() {
    const title = $('courseTitle').value.trim();
    return {
      title,
      slug: ($('courseSlug').value.trim() || slugify(title)),
      short_description: $('courseShortDescription').value.trim() || null,
      description: $('courseDescription').value.trim() || null,
      passing_score: Number($('passingScore').value || 80),
      navigation_mode: $('navigationMode').value,
      video_completion_percent: Number($('videoCompletionPercent').value || 90),
      certificate_enabled: $('certificateEnabled').checked,
      require_all_required_lessons: $('requireAllLessons').checked,
      require_required_assessments: $('requireAssessments').checked,
      allow_student_downloads: $('allowDownloads').checked,
      preview_enabled: $('previewEnabled').checked
    };
  }

  function fillCourseForm(course) {
    $('courseTitle').value = course.title || '';
    $('courseSlug').value = course.slug || '';
    $('courseShortDescription').value = course.short_description || '';
    $('courseDescription').value = course.description || '';
    $('passingScore').value = course.passing_score ?? 80;
    $('navigationMode').value = course.navigation_mode || 'free';
    $('videoCompletionPercent').value = course.video_completion_percent ?? 90;
    $('certificateEnabled').checked = course.certificate_enabled !== false;
    $('requireAllLessons').checked = course.require_all_required_lessons !== false;
    $('requireAssessments').checked = course.require_required_assessments !== false;
    $('allowDownloads').checked = course.allow_student_downloads !== false;
    $('previewEnabled').checked = course.preview_enabled !== false;
    updateCourseHeader();
  }

  function updateCourseHeader() {
    const title = $('courseTitle').value.trim() || 'New Course';
    $('pageTitle').textContent = state.course ? `Edit: ${title}` : 'New Course';
    $('sidebarCourseTitle').textContent = title;

    const status = String(state.course?.status || 'draft').toLowerCase();
    $('courseStatusBadge').textContent =
      status.charAt(0).toUpperCase() + status.slice(1);

    $('courseStatusBadge').className =
      `training-course-status training-course-status-${escapeHtml(status)}`;
  }

  async function loadCourse() {
    if (!state.courseId) {
      updateCourseHeader();
      renderCurriculumEmpty();
      return;
    }

    const { data, error } = await db()
      .from('lms_courses')
      .select('*')
      .eq('id', state.courseId)
      .single();

    if (error) throw error;

    state.course = data;
    fillCourseForm(data);
    await loadCurriculum();
  }

  async function saveCourse({ status } = {}) {
    const payload = readCourseForm();

    if (!payload.title) {
      setTab('details');
      resultPopup({
        eyebrow: 'COURSE DETAILS',
        title: 'Course Title Required',
        message: 'Enter a course title before saving.',
        type: 'warning'
      });
      return null;
    }

    if (!payload.slug) {
      setTab('details');
      resultPopup({
        eyebrow: 'COURSE DETAILS',
        title: 'Course Slug Required',
        message: 'Enter a course slug before saving.',
        type: 'warning'
      });
      return null;
    }

    if (payload.passing_score < 0 || payload.passing_score > 100) {
      setTab('settings');
      resultPopup({
        eyebrow: 'COURSE SETTINGS',
        title: 'Invalid Passing Score',
        message: 'Passing score must be between 0 and 100.',
        type: 'warning'
      });
      return null;
    }

    const nextStatus = status || state.course?.status || 'draft';
    const row = {
      ...payload,
      status: nextStatus
    };

    try {
      const client = getClient();

      /*
       * Make sure the existing admin login session is available before
       * attempting the database write.
       */
      if (client.auth && typeof client.auth.getSession === 'function') {
        const sessionResult = await client.auth.getSession();

        if (sessionResult.error) {
          throw sessionResult.error;
        }

        if (!sessionResult.data?.session) {
          resultPopup({
            eyebrow: 'ADMIN SESSION',
            title: 'Sign In Required',
            message: 'Your admin session has expired. Sign in again before saving the course.',
            type: 'warning',
            buttonLabel: 'Close'
          });
          return null;
        }
      }

      let savedCourse;

      if (!state.courseId) {
        /*
         * A course with this slug may already exist from an earlier
         * save attempt. Check first so we never hit the unique constraint
         * blindly.
         */
        const { data: existingCourse, error: lookupError } = await client
          .from('lms_courses')
          .select('*')
          .eq('slug', row.slug)
          .maybeSingle();

        if (lookupError) {
          throw lookupError;
        }

        if (existingCourse) {
          const sameTitle =
            String(existingCourse.title || '').trim().toLowerCase() ===
            String(row.title || '').trim().toLowerCase();

          if (!sameTitle) {
            resultPopup({
              eyebrow: 'COURSE SLUG',
              title: 'Course Slug Already In Use',
              message:
                `The slug "${row.slug}" already belongs to another course. ` +
                'Change the Course Slug and save again.',
              type: 'warning',
              buttonLabel: 'Close'
            });
            return null;
          }

          /*
           * Same course title + same slug means this is the existing
           * course record. Adopt it instead of creating a duplicate.
           */
          savedCourse = existingCourse;
          state.courseId = existingCourse.id;

          const { data: updatedCourse, error: updateExistingError } =
            await client
              .from('lms_courses')
              .update(row)
              .eq('id', existingCourse.id)
              .select('*')
              .single();

          if (updateExistingError) {
            throw updateExistingError;
          }

          savedCourse = updatedCourse;
        } else {
          const { data, error } = await client
            .from('lms_courses')
            .insert(row)
            .select('*')
            .single();

          if (error) throw error;
          if (!data?.id) {
            throw new Error(
              'The course was inserted but no course ID was returned.'
            );
          }

          savedCourse = data;
          state.courseId = data.id;
        }

        history.replaceState(
          {},
          '',
          `${location.pathname}?course=${encodeURIComponent(state.courseId)}`
        );
      } else {
        const { data, error } = await client
          .from('lms_courses')
          .update(row)
          .eq('id', state.courseId)
          .select('*')
          .single();

        if (error) throw error;
        if (!data?.id) throw new Error('The course save completed but no course record was returned.');

        savedCourse = data;
      }

      state.course = savedCourse;
      state.courseId = savedCourse.id;

      fillCourseForm(savedCourse);
      await loadCurriculum();
      renderPublishChecklist();

      resultPopup({
        eyebrow: nextStatus === 'published' ? 'COURSE PUBLISHED' : 'COURSE SAVED',
        title: nextStatus === 'published' ? 'Course Published' : 'Course Saved',
        message:
          nextStatus === 'published'
            ? 'The course was successfully published.'
            : 'The course was successfully saved. You can now add sections and lessons.',
        type: 'success'
      });

      return savedCourse;

    } catch (error) {
      console.error('Course save failed:', error);

      resultPopup({
        eyebrow: 'COURSE SAVE ERROR',
        title: 'Course Could Not Be Saved',
        message:
          error?.message ||
          'The course could not be saved. Check the database connection and permissions.',
        type: 'error',
        buttonLabel: 'Close'
      });

      return null;
    }
  }

  function renderCurriculumEmpty(message = 'No sections yet. Add a section to begin building the course.') {
    $('curriculumList').innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  async function loadCurriculum() {
    if (!state.courseId) {
      renderCurriculumEmpty('Save the course first, then add your first section.');
      return;
    }

    const { data, error } = await db()
      .from('lms_sections')
      .select(`
        id,
        course_id,
        title,
        description,
        sort_order,
        is_published,
        lms_lessons (
          id,
          title,
          description,
          status,
          sort_order,
          is_required,
          completion_required,
          estimated_minutes,
          lms_content_blocks (
            id,
            title,
            block_type,
            sort_order,
            content,
            external_url,
            is_required
          )
        )
      `)
      .eq('course_id', state.courseId)
      .order('sort_order', { ascending: true });

    if (error) {
      toast(error.message || 'Unable to load curriculum.', 'error');
      return;
    }

    state.sections = (data || []).map(section => ({
      ...section,
      lms_lessons: [...(section.lms_lessons || [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(lesson => ({
          ...lesson,
          lms_content_blocks: [...(lesson.lms_content_blocks || [])]
            .sort((a, b) => a.sort_order - b.sort_order)
        }))
    }));

    state.sections.forEach(section => {
      if (!state.expandedSections.has(section.id)) {
        state.expandedSections.add(section.id);
      }
      section.lms_lessons.forEach(lesson => {
        if (!state.expandedLessons.has(lesson.id)) {
          state.expandedLessons.add(lesson.id);
        }
      });
    });

    renderCurriculum();
  }

  function getBlockLabel(block) {
    const type = String(block?.block_type || 'content')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());

    return block?.title?.trim() || type;
  }

  function getBlockDetail(block) {
    const type = String(block?.block_type || 'content')
      .replace(/_/g, ' ');

    if (block?.external_url) return `${type} · External resource`;
    if (block?.content) return type;
    return type;
  }

  function renderCurriculum() {
    if (!state.sections.length) {
      renderCurriculumEmpty();
      return;
    }

    $('curriculumList').innerHTML = state.sections.map((section) => {
      const sectionOpen = state.expandedSections?.has(section.id) !== false;

      return `
        <article
          class="curriculum-section ${sectionOpen ? 'is-open' : ''}"
          data-section-id="${escapeHtml(section.id)}"
        >
          <div class="curriculum-section-header">
            <button
              class="curriculum-tree-toggle"
              type="button"
              aria-expanded="${sectionOpen ? 'true' : 'false'}"
              aria-label="${sectionOpen ? 'Collapse' : 'Expand'} section"
            >
              <span class="curriculum-tree-chevron" aria-hidden="true">›</span>
            </button>

            <div class="curriculum-section-heading">
              <div class="curriculum-section-title">
                ${escapeHtml(section.sort_order)}. ${escapeHtml(section.title)}
              </div>
              <div class="curriculum-section-description">
                ${escapeHtml(section.description || 'No section description')}
              </div>
            </div>

            <div class="curriculum-actions">
              <button class="secondary-button edit-section" type="button">Edit</button>
              <button class="secondary-button add-lesson" type="button">+ Lesson</button>
              <button class="secondary-button delete-section" type="button">Delete</button>
            </div>
          </div>

          <div class="curriculum-section-body" ${sectionOpen ? '' : 'hidden'}>
            ${
              section.lms_lessons.length
              ? section.lms_lessons.map(lesson => {
                  const lessonOpen =
                    state.expandedLessons?.has(lesson.id) !== false;
                  const blocks = lesson.lms_content_blocks || [];

                  return `
                    <div
                      class="curriculum-lesson"
                      data-lesson-id="${escapeHtml(lesson.id)}"
                    >
                      <div class="lesson-row">
                        <button
                          class="curriculum-tree-toggle lesson-tree-toggle"
                          type="button"
                          aria-expanded="${lessonOpen ? 'true' : 'false'}"
                          aria-label="${lessonOpen ? 'Collapse' : 'Expand'} lesson"
                        >
                          <span class="curriculum-tree-chevron" aria-hidden="true">›</span>
                        </button>

                        <div class="lesson-meta">
                          <div class="lesson-title">
                            ${escapeHtml(lesson.sort_order)}. ${escapeHtml(lesson.title)}
                          </div>
                          <div class="lesson-subtitle">
                            ${escapeHtml(lesson.status)}
                            · ${lesson.is_required ? 'Required' : 'Optional'}
                            · ${lesson.completion_required ? 'Completion required' : 'Completion not required'}
                            · ${blocks.length} ${blocks.length === 1 ? 'content block' : 'content blocks'}
                          </div>
                        </div>

                        <div class="lesson-actions">
                          <button class="secondary-button edit-lesson" type="button">Edit</button>
                          <button class="secondary-button delete-lesson" type="button">Delete</button>
                        </div>
                      </div>

                      <div
                        class="lesson-content-tree"
                        ${lessonOpen ? '' : 'hidden'}
                      >
                        ${
                          blocks.length
                          ? blocks.map(block => `
                              <div
                                class="content-block-row"
                                data-block-id="${escapeHtml(block.id)}"
                              >
                                <span class="content-block-branch" aria-hidden="true"></span>
                                <span class="content-block-icon" aria-hidden="true">•</span>
                                <div class="content-block-meta">
                                  <div class="content-block-title">
                                    ${escapeHtml(block.sort_order)}. ${escapeHtml(getBlockLabel(block))}
                                  </div>
                                  <div class="content-block-subtitle">
                                    ${escapeHtml(getBlockDetail(block))}
                                    ${block.is_required ? ' · Required' : ' · Optional'}
                                  </div>
                                </div>
                              </div>
                            `).join('')
                          : `
                            <div class="content-block-empty">
                              <span>No content blocks yet.</span>
                              <button class="secondary-button open-lesson-empty" type="button">
                                + Add Content
                              </button>
                            </div>
                          `
                        }
                      </div>
                    </div>
                  `;
                }).join('')
              : '<div class="empty-state curriculum-empty-lessons">No lessons in this section yet. Add a lesson to begin building content.</div>'
            }
          </div>
        </article>
      `;
    }).join('');

    $('curriculumList').querySelectorAll('.curriculum-section').forEach((article) => {
      const section = state.sections.find(s => s.id === article.dataset.sectionId);
      if (!section) return;

      const sectionToggle = article.querySelector('.curriculum-section-header .curriculum-tree-toggle');
      sectionToggle?.addEventListener('click', () => {
        state.expandedSections ??= new Set();
        if (state.expandedSections.has(section.id)) {
          state.expandedSections.delete(section.id);
        } else {
          state.expandedSections.add(section.id);
        }
        renderCurriculum();
      });

      article.querySelector('.edit-section')?.addEventListener(
        'click',
        () => openSectionModal(section)
      );

      article.querySelector('.add-lesson')?.addEventListener(
        'click',
        () => openLessonModal(section)
      );

      article.querySelector('.delete-section')?.addEventListener(
        'click',
        () => confirmDeleteSection(section)
      );

      article.querySelectorAll('.curriculum-lesson').forEach((lessonArticle) => {
        const lesson = section.lms_lessons.find(
          item => item.id === lessonArticle.dataset.lessonId
        );
        if (!lesson) return;

        const lessonToggle = lessonArticle.querySelector('.lesson-tree-toggle');
        lessonToggle?.addEventListener('click', () => {
          state.expandedLessons ??= new Set();
          if (state.expandedLessons.has(lesson.id)) {
            state.expandedLessons.delete(lesson.id);
          } else {
            state.expandedLessons.add(lesson.id);
          }
          renderCurriculum();
        });

        lessonArticle.querySelector('.open-lesson-empty')?.addEventListener(
          'click',
          () => {
            location.href =
              `admin-lms-lesson-builder.html?lesson=${encodeURIComponent(lesson.id)}`;
          }
        );

        lessonArticle.querySelector('.edit-lesson')?.addEventListener(
          'click',
          () => openLessonModal(section, lesson)
        );

        lessonArticle.querySelector('.delete-lesson')?.addEventListener(
          'click',
          () => confirmDeleteLesson(lesson)
        );
      });
    });
  }

  function openSectionModal(section = null) {
    const isEdit = !!section;
    const nextOrder = isEdit ? section.sort_order : (state.sections.length + 1);

    modal({
      eyebrow: 'CURRICULUM',
      title: isEdit ? 'Edit Section' : 'Add Section',
      body: `
        <div class="modal-form">
          <label>Section Title
            <input id="modalSectionTitle" value="${escapeHtml(section?.title || '')}" maxlength="200">
          </label>
          <label>Description
            <textarea id="modalSectionDescription" rows="4">${escapeHtml(section?.description || '')}</textarea>
          </label>
          <label>Display Order
            <input id="modalSectionOrder" type="number" min="1" value="${nextOrder}">
          </label>
          <label class="check-row">
            <input id="modalSectionPublished" type="checkbox" ${section?.is_published ? 'checked' : ''}>
            Published
          </label>
        </div>
      `,
      actions: [
        { label: 'Cancel', className: 'secondary-button', handler: closeModal },
        { label: isEdit ? 'Save Section' : 'Create Section', className: 'primary-button', handler: async () => {
          const title = $('modalSectionTitle').value.trim();
          if (!title) {
            toast('Section title is required.', 'error');
            return;
          }

          const payload = {
            course_id: state.courseId,
            title,
            description: $('modalSectionDescription').value.trim() || null,
            sort_order: Number($('modalSectionOrder').value || nextOrder),
            is_published: $('modalSectionPublished').checked
          };

          const query = isEdit
            ? db().from('lms_sections').update(payload).eq('id', section.id)
            : db().from('lms_sections').insert(payload);

          const { error } = await query;
          if (error) {
            resultPopup({
              eyebrow: 'CURRICULUM ERROR',
              title: 'Section Was Not Saved',
              message: error.message || 'Unable to save section.',
              type: 'error'
            });
            return;
          }

          closeModal();
          await loadCurriculum();

          resultPopup({
            eyebrow: 'CURRICULUM',
            title: isEdit ? 'Section Updated' : 'Section Created',
            message: isEdit
              ? 'The section was successfully updated.'
              : 'The section was successfully created.',
            type: 'success'
          });
        }}
      ]
    });
  }

  function openLessonModal(section, lesson = null) {
    const isEdit = !!lesson;
    const nextOrder = isEdit ? lesson.sort_order : ((section.lms_lessons?.length || 0) + 1);

    modal({
      eyebrow: 'LESSON',
      title: isEdit ? 'Edit Lesson' : 'Add Lesson',
      body: `
        <div class="modal-form">
          <label>Lesson Title
            <input id="modalLessonTitle" value="${escapeHtml(lesson?.title || '')}" maxlength="200">
          </label>
          <label>Description
            <textarea id="modalLessonDescription" rows="4">${escapeHtml(lesson?.description || '')}</textarea>
          </label>
          <label>Display Order
            <input id="modalLessonOrder" type="number" min="1" value="${nextOrder}">
          </label>
          <label>Status
            <select id="modalLessonStatus">
              <option value="draft" ${lesson?.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="published" ${lesson?.status === 'published' ? 'selected' : ''}>Published</option>
              <option value="archived" ${lesson?.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </label>
          <label class="check-row">
            <input id="modalLessonRequired" type="checkbox" ${lesson?.is_required !== false ? 'checked' : ''}>
            Required lesson
          </label>
          <label class="check-row">
            <input id="modalLessonCompletion" type="checkbox" ${lesson?.completion_required !== false ? 'checked' : ''}>
            Completion required
          </label>
        </div>
      `,
      actions: [
        { label: 'Cancel', className: 'secondary-button', handler: closeModal },
        { label: isEdit ? 'Save Lesson' : 'Create Lesson', className: 'primary-button', handler: async () => {
          const title = $('modalLessonTitle').value.trim();
          if (!title) {
            toast('Lesson title is required.', 'error');
            return;
          }

          const payload = {
            section_id: section.id,
            title,
            description: $('modalLessonDescription').value.trim() || null,
            sort_order: Number($('modalLessonOrder').value || nextOrder),
            status: $('modalLessonStatus').value,
            is_required: $('modalLessonRequired').checked,
            completion_required: $('modalLessonCompletion').checked
          };

          let result;
          if (isEdit) {
            result = await db().from('lms_lessons').update(payload).eq('id', lesson.id);
          } else {
            result = await db().from('lms_lessons').insert(payload).select('id').single();
          }

          if (result.error) {
            toast(result.error.message || 'Unable to save lesson.', 'error');
            return;
          }

          const lessonId = lesson?.id || result.data?.id;
          if (lessonId) {
            state.expandedLessons.add(lessonId);
          }
          state.expandedSections.add(section.id);

          closeModal();
          await loadCurriculum();
          toast(isEdit ? 'Lesson updated.' : 'Lesson created.');

          if (!isEdit && lessonId) {
            openLessonContentModal(lessonId, title);
          }
        }}
      ]
    });
  }

  function openLessonContentModal(lessonId, lessonTitle) {
    modal({
      eyebrow: 'LESSON CONTENT',
      title: 'Continue Building Lesson',
      body: `
        <p><strong>${escapeHtml(lessonTitle)}</strong> has been created.</p>
        <p>The next builder screen will contain the lesson canvas for video, text, files, downloads, embeds, forms and quizzes.</p>
      `,
      actions: [
        { label: 'Close', className: 'secondary-button', handler: closeModal },
        { label: 'Open Lesson Builder', className: 'primary-button', handler: () => {
          location.href = `admin-lms-lesson-builder.html?lesson=${encodeURIComponent(lessonId)}`;
        }}
      ]
    });
  }

  function confirmDeleteSection(section) {
    modal({
      eyebrow: 'DANGER ZONE',
      title: 'Delete Section?',
      body: `<p>Delete <strong>${escapeHtml(section.title)}</strong> and all lessons inside it?</p><p>This cannot be undone.</p>`,
      actions: [
        { label: 'Cancel', className: 'secondary-button', handler: closeModal },
        { label: 'Delete Section', className: 'primary-button', handler: async () => {
          const { error } = await db().from('lms_sections').delete().eq('id', section.id);
          if (error) {
            toast(error.message || 'Unable to delete section.', 'error');
            return;
          }
          closeModal();
          await loadCurriculum();
          toast('Section deleted.');
        }}
      ]
    });
  }

  function confirmDeleteLesson(lesson) {
    modal({
      eyebrow: 'DANGER ZONE',
      title: 'Delete Lesson?',
      body: `<p>Delete <strong>${escapeHtml(lesson.title)}</strong> and its content?</p><p>This cannot be undone.</p>`,
      actions: [
        { label: 'Cancel', className: 'secondary-button', handler: closeModal },
        { label: 'Delete Lesson', className: 'primary-button', handler: async () => {
          const { error } = await db().from('lms_lessons').delete().eq('id', lesson.id);
          if (error) {
            toast(error.message || 'Unable to delete lesson.', 'error');
            return;
          }
          closeModal();
          await loadCurriculum();
          toast('Lesson deleted.');
        }}
      ]
    });
  }

  function renderPublishChecklist() {
    const checks = [
      ['Course title', !!$('courseTitle').value.trim()],
      ['Course slug', !!($('courseSlug').value.trim() || slugify($('courseTitle').value))],
      ['Course description', !!$('courseDescription').value.trim()],
      ['At least one section', state.sections.length > 0],
      ['At least one lesson', state.sections.some(s => s.lms_lessons.length > 0)],
      ['Every lesson has a title', state.sections.every(s => s.lms_lessons.every(l => l.title.trim()))]
    ];

    $('publishChecklist').innerHTML = checks.map(([label, ok]) =>
      `<div class="check-item ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '×'} ${escapeHtml(label)}</div>`
    ).join('');

    $('publishSummary').textContent = checks.every(c => c[1])
      ? 'The course meets the basic publishing requirements.'
      : 'Complete the items below before publishing.';
  }

  function validatePublish() {
    const checks = [
      $('courseTitle').value.trim(),
      $('courseDescription').value.trim(),
      state.sections.length > 0,
      state.sections.some(s => s.lms_lessons.length > 0)
    ];
    return checks.every(Boolean);
  }

  function bindEvents() {
    document.querySelectorAll('.training-course-nav-item').forEach(button => {
      button.addEventListener('click', () => setTab(button.dataset.builderTab));
    });

    $('courseTitle').addEventListener('input', () => {
      if (!$('courseSlug').value.trim()) $('courseSlug').value = slugify($('courseTitle').value);
      updateCourseHeader();
    });

    $('courseSlug').addEventListener('blur', () => {
      $('courseSlug').value = slugify($('courseSlug').value);
    });

    $('saveAllButton').addEventListener('click', () => saveCourse());
    $('saveDraftButton').addEventListener('click', () => saveCourse({ status: 'draft' }));

    $('publishButton').addEventListener('click', async () => {
      if (!validatePublish()) {
        renderPublishChecklist();
        toast('Complete the publishing checklist first.', 'error');
        return;
      }
      await saveCourse({ status: 'published' });
    });

    $('addSectionButton').addEventListener('click', () => {
      if (!state.courseId) {
        resultPopup({
          eyebrow: 'CURRICULUM',
          title: 'Save the Course First',
          message: 'Save the course before adding a section.',
          type: 'warning'
        });
        setTab('details');
        return;
      }
      openSectionModal();
    });

    $('previewCourseButton').addEventListener('click', () => {
      if (!state.courseId) {
        toast('Save the course before previewing it.', 'error');
        return;
      }
      window.open(`admin-lms-preview.html?course=${encodeURIComponent(state.courseId)}`, '_blank', 'noopener');
    });

    $('lmsModalClose').addEventListener('click', closeModal);
    document.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }

  async function enforceAdminGuard() {
    const client = getClient();

    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    if (!data?.session?.user) {
      window.location.replace('admin-login.html');
      return false;
    }

    const { data: profile, error: profileError } = await client
      .from('admin_profiles')
      .select('*')
      .eq('id', data.session.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      await client.auth.signOut();
      window.location.replace('admin-login.html');
      return false;
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, 'is_active') &&
      profile.is_active === false
    ) {
      await client.auth.signOut();
      window.location.replace('admin-login.html');
      return false;
    }

    window.screenings4uAdminProfile = profile;
    window.screenings4uAdminRole =
      String(profile.admin_level || 'admin').toLowerCase();

    return true;
  }

  async function init() {
    bindEvents();

    try {
      if (!(await enforceAdminGuard())) return;

      await loadCourse();
      renderPublishChecklist();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Unable to initialize LMS builder.', 'error');
    }
  }

  init();
})();