(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const courseId = params.get('course');

  const state = {
    course: null,
    sections: [],
    selectedLessonId: null,
    mediaUrlCache: new Map()
  };

  const $ = id => document.getElementById(id);

  const BLOCK_TYPES = {
    heading: 'Heading',
    text: 'Text',
    video: 'Video',
    audio: 'Audio',
    image: 'Image',
    pdf: 'PDF',
    download: 'Download',
    link: 'Link',
    embed: 'Embed',
    quiz: 'Quiz',
    knowledge_check: 'Knowledge Check',
    form: 'Form',
    divider: 'Divider'
  };

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
    const el = $('coursePreviewToast');
    if (!el) return;
    el.textContent = message;
    el.className = `admin-toast ${type} show`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  function blockLabel(type) {
    return BLOCK_TYPES[type] || String(type || 'Content');
  }

  async function resolveMediaUrl(block) {
    const settings = block.settings || {};
    const provider = settings.provider || '';

    if (provider === 'cloudflare_stream') {
      const videoId = String(
        settings.cloudflare_video_id ||
        block.external_url ||
        ''
      ).trim();

      if (!videoId) return '';

      if (state.mediaUrlCache.has(videoId)) {
        return state.mediaUrlCache.get(videoId);
      }

      try {
        const { data, error } = await db().functions.invoke(
          'cloudflare-stream-token',
          { body: { videoId } }
        );

        if (!error && data?.success && data.embedUrl) {
          state.mediaUrlCache.set(videoId, data.embedUrl);
          return data.embedUrl;
        }

        console.warn('Cloudflare playback token unavailable.', error, data);
      } catch (error) {
        console.warn('Unable to create Cloudflare playback URL.', error);
      }

      return '';
    }

    const value = String(block.external_url || '').trim();
    if (!value) return '';

    if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) {
      return value;
    }

    if (block.media_id) {
      try {
        const { data, error } = await db()
          .from('lms_media')
          .select('storage_bucket, storage_path, provider, provider_video_id, playback_url')
          .eq('id', block.media_id)
          .single();

        if (!error && data) {
          if (data.provider === 'cloudflare_stream' && data.provider_video_id) {
            const fakeBlock = {
              settings: {
                provider: 'cloudflare_stream',
                cloudflare_video_id: data.provider_video_id
              }
            };
            return resolveMediaUrl(fakeBlock);
          }

          if (data.playback_url) return data.playback_url;

          if (data.storage_path) {
            const { data: signed, error: signedError } = await db()
              .storage
              .from(data.storage_bucket || 'lms-media')
              .createSignedUrl(data.storage_path, 3600);

            if (!signedError && signed?.signedUrl) return signed.signedUrl;
          }
        }
      } catch (error) {
        console.warn('Unable to resolve LMS media.', error);
      }
    }

    return value;
  }

  async function loadCourse() {
    if (!courseId) throw new Error('No course ID was provided.');

    const { data: course, error: courseError } = await db()
      .from('lms_courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    const { data: sections, error: sectionError } = await db()
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
          section_id,
          title,
          description,
          status,
          sort_order,
          is_required,
          completion_required,
          lock_until_previous_complete,
          estimated_minutes
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

    const firstLesson = state.sections
      .flatMap(section => section.lms_lessons || [])
      .find(Boolean);

    state.selectedLessonId = firstLesson?.id || null;

    renderCourse();
    renderOutline();

    if (state.selectedLessonId) {
      await selectLesson(state.selectedLessonId, false);
    }
  }

  function renderCourse() {
    const course = state.course;
    const lessons = state.sections.flatMap(section => section.lms_lessons || []);

    $('courseTitle').textContent = course.title || 'Course';
    $('courseDescription').textContent =
      course.description || 'Preview the complete student-facing course structure.';
    $('courseHeroTitle').textContent = course.title || 'Course';
    $('courseShortDescription').textContent =
      course.short_description || course.description || 'No course description yet.';

    const status = String(course.status || 'draft').toLowerCase();
    $('courseStatus').textContent = status.toUpperCase();
    $('courseStatus').className = `preview-status ${esc(status)}`;

    $('statSections').textContent = state.sections.length;
    $('statLessons').textContent = lessons.length;
    $('statPassing').textContent = `${course.passing_score ?? 80}%`;
    $('statVideo').textContent = `${course.video_completion_percent ?? 90}%`;
    $('outlineCount').textContent =
      `${lessons.length} lesson${lessons.length === 1 ? '' : 's'}`;
  }

  function renderOutline() {
    $('outlineList').innerHTML = state.sections.length
      ? state.sections.map((section, sectionIndex) => `
          <div class="outline-section">
            <div class="outline-section-title">
              ${sectionIndex + 1}. ${esc(section.title)}
            </div>

            ${(section.lms_lessons || []).length
              ? section.lms_lessons.map((lesson, lessonIndex) => `
                  <button
                    class="outline-lesson ${lesson.id === state.selectedLessonId ? 'active' : ''}"
                    type="button"
                    data-lesson-id="${esc(lesson.id)}"
                  >
                    <span class="outline-number">${lessonIndex + 1}</span>
                    <span>
                      <span class="outline-lesson-title">${esc(lesson.title)}</span>
                      <span class="outline-lesson-meta">
                        ${lesson.estimated_minutes != null
                          ? `${esc(lesson.estimated_minutes)} min · `
                          : ''}
                        ${lesson.is_required ? 'Required' : 'Optional'}
                      </span>
                    </span>
                  </button>
                `).join('')
              : '<div class="outline-section-title">No lessons</div>'}
          </div>
        `).join('')
      : `
        <div class="preview-loading">
          This course does not have any sections yet.
        </div>
      `;
  }

  async function selectLesson(lessonId, updateOutline = true) {
    state.selectedLessonId = lessonId;

    if (updateOutline) renderOutline();

    const lesson = state.sections
      .flatMap(section => section.lms_lessons || [])
      .find(item => item.id === lessonId);

    if (!lesson) return;

    $('selectedLessonTitle').textContent = lesson.title || 'Lesson';
    $('selectedLessonDescription').textContent =
      lesson.description || 'This lesson does not have a description yet.';

    $('previewLessonBuilderBtn').disabled = false;
    $('previewLessonBuilderBtn').dataset.lessonId = lesson.id;

    $('lessonPreviewContent').innerHTML = `
      <div class="preview-loading">Loading lesson content...</div>
    `;

    const { data: blocks, error } = await db()
      .from('lms_content_blocks')
      .select('*')
      .eq('lesson_id', lesson.id)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const rendered = [];

    for (const block of blocks || []) {
      rendered.push(await renderBlock(block));
    }

    const navigation = renderLessonNavigation(lesson.id);

    $('lessonPreviewContent').innerHTML = rendered.length
      ? rendered.join('') + navigation
      : `
        <div class="preview-welcome">
          <div class="welcome-icon">LMS</div>
          <h3>This lesson has no content yet</h3>
          <p>Open the Lesson Builder to add content blocks.</p>
          ${navigation}
        </div>
      `;
  }

  async function renderBlock(block) {
    const content = block.content || '';
    const title = block.title || blockLabel(block.block_type);

    if (block.block_type === 'heading') {
      return `
        <article class="lesson-content-block">
          <div class="block-label">Heading</div>
          <h3 class="block-heading">${esc(content || title)}</h3>
        </article>
      `;
    }

    if (block.block_type === 'text') {
      return `
        <article class="lesson-content-block">
          <div class="block-label">Text</div>
          <div class="block-text">${esc(content).replace(/\n/g, '<br>') || '<span class="block-placeholder">No text entered.</span>'}</div>
        </article>
      `;
    }

    if (block.block_type === 'video') {
      const url = await resolveMediaUrl(block);

      return `
        <article class="lesson-content-block">
          <div class="block-label">${esc(title)}</div>
          ${url
            ? `
              <div class="block-video-wrap">
                <iframe
                  src="${esc(url)}"
                  title="${esc(title)}"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowfullscreen
                ></iframe>
              </div>
            `
            : `<div class="block-placeholder">Video playback could not be resolved.</div>`
          }
        </article>
      `;
    }

    if (block.block_type === 'audio') {
      const url = await resolveMediaUrl(block);

      return `
        <article class="lesson-content-block">
          <div class="block-label">${esc(title)}</div>
          ${url
            ? `<audio class="block-audio" controls src="${esc(url)}"></audio>`
            : `<div class="block-placeholder">Audio media is not configured.</div>`
          }
        </article>
      `;
    }

    if (block.block_type === 'image') {
      const url = await resolveMediaUrl(block);

      return `
        <article class="lesson-content-block">
          <div class="block-label">${esc(title)}</div>
          ${url
            ? `<img class="block-image" src="${esc(url)}" alt="${esc(title)}">`
            : `<div class="block-placeholder">Image media is not configured.</div>`
          }
        </article>
      `;
    }

    if (block.block_type === 'pdf' || block.block_type === 'download') {
      const url = await resolveMediaUrl(block);

      return `
        <article class="lesson-content-block">
          <div class="block-label">${esc(title)}</div>
          ${url
            ? `<a class="block-file-link" href="${esc(url)}" target="_blank" rel="noopener">Open ${esc(blockLabel(block.block_type))}</a>`
            : `<div class="block-placeholder">File is not configured.</div>`
          }
        </article>
      `;
    }

    if (block.block_type === 'link') {
      const url = block.external_url || '#';

      return `
        <article class="lesson-content-block">
          <div class="block-label">Link</div>
          <a class="block-external-link" href="${esc(url)}" target="_blank" rel="noopener">
            ${esc(title)}
          </a>
        </article>
      `;
    }

    if (block.block_type === 'embed') {
      const url = block.external_url || '';
      const height = Math.max(150, Number(block.settings?.height || 350));

      return `
        <article class="lesson-content-block">
          <div class="block-label">${esc(title)}</div>
          ${url
            ? `<iframe src="${esc(url)}" title="${esc(title)}" style="width:100%;height:${height}px;border:0;border-radius:10px;"></iframe>`
            : `<div class="block-placeholder">Embed URL is not configured.</div>`
          }
        </article>
      `;
    }

    if (block.block_type === 'divider') {
      return `<div class="lesson-content-block"><hr class="block-divider"></div>`;
    }

    if (
      block.block_type === 'quiz' ||
      block.block_type === 'knowledge_check' ||
      block.block_type === 'form'
    ) {
      return `
        <article class="lesson-content-block assessment-preview">
          <div class="block-label">${esc(blockLabel(block.block_type))}</div>
          <h3>${esc(title)}</h3>
          <p>This assessment/form block is connected to its builder and will be rendered here for the student experience.</p>
        </article>
      `;
    }

    return `
      <article class="lesson-content-block">
        <div class="block-label">${esc(blockLabel(block.block_type))}</div>
        <div class="block-text">${esc(content).replace(/\n/g, '<br>')}</div>
      </article>
    `;
  }

  function renderLessonNavigation(lessonId) {
    const lessons = state.sections.flatMap(section => section.lms_lessons || []);
    const index = lessons.findIndex(lesson => lesson.id === lessonId);

    const previous = index > 0 ? lessons[index - 1] : null;
    const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;

    return `
      <div class="lesson-nav">
        <button type="button" data-nav-lesson="${previous ? esc(previous.id) : ''}" ${previous ? '' : 'disabled'}>
          ← Previous
        </button>
        <button type="button" data-nav-lesson="${next ? esc(next.id) : ''}" ${next ? '' : 'disabled'}>
          Next →
        </button>
      </div>
    `;
  }

  function bind() {
    $('backToManager').addEventListener('click', () => {
      location.href =
        `admin-lms-course-manager.html?course=${encodeURIComponent(courseId)}`;
    });

    $('editCourseBtn').addEventListener('click', () => {
      location.href =
        `admin-lms-course-manager.html?course=${encodeURIComponent(courseId)}`;
    });

    $('previewLessonBuilderBtn').addEventListener('click', () => {
      const lessonId = $('previewLessonBuilderBtn').dataset.lessonId;
      if (!lessonId) return;

      location.href =
        `admin-lms-lesson-builder.html?lesson=${encodeURIComponent(lessonId)}`;
    });

    $('outlineList').addEventListener('click', event => {
      const button = event.target.closest('[data-lesson-id]');
      if (!button) return;

      selectLesson(button.dataset.lessonId).catch(error => {
        console.error(error);
        toast(error.message || 'Unable to load lesson.', 'error');
      });
    });

    $('lessonPreviewContent').addEventListener('click', event => {
      const button = event.target.closest('[data-nav-lesson]');
      if (!button || button.disabled || !button.dataset.navLesson) return;

      selectLesson(button.dataset.navLesson).catch(error => {
        console.error(error);
        toast(error.message || 'Unable to load lesson.', 'error');
      });
    });
  }

  async function init() {
    try {
      if (!courseId) throw new Error('No course ID was provided.');

      bind();
      await loadCourse();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Unable to load course preview.', 'error');
      $('lessonPreviewContent').innerHTML = `
        <div class="preview-welcome">
          <h3>Unable to load course preview</h3>
          <p>${esc(error.message || 'Unexpected error.')}</p>
        </div>
      `;
    }
  }

  init();
})();