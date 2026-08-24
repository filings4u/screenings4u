/* screenings4u LMS — Lesson Preview — Cloudflare Stream */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const lessonId = params.get('lesson');

  const state = {
    lesson: null,
    blocks: []
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
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c]));
  }

  function toast(message, type = 'error') {
    const el = $('previewToast');
    if (!el) return;

    el.textContent = message;
    el.className = `admin-toast ${type} show`;

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 4000);
  }

  function blockLabel(type) {
    return BLOCK_TYPES[type] || String(type || 'Content');
  }

  async function getSessionAccessToken() {
    const client = db();
    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    const token = data?.session?.access_token;

    if (!token) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    return token;
  }

  async function callSupabaseFunction(name, body) {
    const client = db();
    const token = await getSessionAccessToken();

    const { data, error } = await client.functions.invoke(name, {
      body,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (error) throw error;

    if (!data?.success) {
      throw new Error(data?.error || `The ${name} function failed.`);
    }

    return data;
  }

  async function getCloudflarePlaybackUrl(videoId) {
    const cleanId = String(videoId || '').trim();

    if (!cleanId) {
      throw new Error('Cloudflare Stream Video ID is missing.');
    }

    /*
     * First try the secure token function.
     *
     * The updated cloudflare-stream-token function returns:
     * {
     *   success: true,
     *   token: "...",
     *   embedUrl: "https://customer-...cloudflarestream.com/<TOKEN>/iframe"
     * }
     *
     * If the token function has not yet been updated, fall back to the
     * normal Cloudflare Stream UID player for admin preview.
     */
    try {
      const result = await callSupabaseFunction('cloudflare-stream-token', {
        videoId: cleanId
      });

      if (result.embedUrl) {
        return {
          url: result.embedUrl,
          secure: true
        };
      }

      if (result.customerCode && result.token) {
        return {
          url: `https://customer-${result.customerCode}.cloudflarestream.com/${encodeURIComponent(result.token)}/iframe`,
          secure: true
        };
      }
    } catch (error) {
      console.warn(
        'Secure Cloudflare playback token was unavailable. Falling back to admin preview playback.',
        error
      );
    }

    /*
     * Public/admin preview fallback.
     * This works while the Cloudflare video is not configured to require
     * signed URLs. Do not use this fallback for the student-facing player.
     */
    const customerCode = window.CLOUDFLARE_STREAM_CUSTOMER_CODE;

    if (!customerCode) {
      throw new Error(
        'Cloudflare secure playback is not configured yet. Add the customer code to the preview configuration or update the token function.'
      );
    }

    return {
      url: `https://customer-${customerCode}.cloudflarestream.com/${encodeURIComponent(cleanId)}/iframe`,
      secure: false
    };
  }

  async function resolveMediaUrl(block) {
    const value = String(block.external_url || '').trim();

    if (!value) return '';

    // Full external URLs are already usable.
    if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) {
      return value;
    }

    // Uploaded LMS media stores the storage path in external_url.
    try {
      const { data, error } = await db()
        .storage
        .from('lms-media')
        .createSignedUrl(value, 3600);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (error) {
      console.warn('Unable to create signed media URL.', error);
    }

    return value;
  }

  function cloudflarePlayerMarkup(playerUrl, title) {
    return `
      <div class="preview-video-player">
        <iframe
          src="${esc(playerUrl)}"
          title="${esc(title)}"
          frameborder="0"
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }

  async function renderBlock(block) {
    const content = block.content || '';
    const title = block.title || blockLabel(block.block_type);

    if (block.block_type === 'heading') {
      return `
        <section class="preview-block preview-heading">
          <h2>${esc(content || title)}</h2>
        </section>
      `;
    }

    if (block.block_type === 'text') {
      return `
        <section class="preview-block preview-text">
          ${esc(content).replace(/\n/g, '<br>') || '<em>No text entered.</em>'}
        </section>
      `;
    }

    if (block.block_type === 'video') {
      const cloudflareVideoId =
        block.settings?.cloudflare_video_id ||
        block.media?.provider_video_id ||
        '';

      /*
       * New Cloudflare Stream video.
       */
      if (cloudflareVideoId) {
        try {
          const playback = await getCloudflarePlaybackUrl(cloudflareVideoId);

          return `
            <section class="preview-block preview-video-block">
              <h3 class="preview-block-label">${esc(title)}</h3>

              ${cloudflarePlayerMarkup(playback.url, title)}

              <div class="preview-video-meta">
                <span>Cloudflare Stream</span>
                ${playback.secure
                  ? '<span class="preview-video-secure">Secure playback</span>'
                  : '<span>Admin preview</span>'
                }
              </div>
            </section>
          `;
        } catch (error) {
          console.error('Cloudflare video playback failed:', error);

          return `
            <section class="preview-block preview-video-block">
              <h3 class="preview-block-label">${esc(title)}</h3>
              <div class="preview-placeholder preview-video-error">
                Unable to load the Cloudflare video.
                <br>
                <small>${esc(error.message || 'Video playback is not configured.')}</small>
              </div>
            </section>
          `;
        }
      }

      /*
       * Legacy Supabase Storage video fallback.
       */
      const url = await resolveMediaUrl(block);

      return `
        <section class="preview-block preview-video-block">
          <h3 class="preview-block-label">${esc(title)}</h3>
          ${
            url
              ? `<video class="preview-native-video" controls preload="metadata" src="${esc(url)}"></video>`
              : `<div class="preview-placeholder">Video media is not configured.</div>`
          }
        </section>
      `;
    }

    if (block.block_type === 'audio') {
      const url = await resolveMediaUrl(block);

      return `
        <section class="preview-block">
          <h3 class="preview-block-label">${esc(title)}</h3>
          ${
            url
              ? `<audio controls src="${esc(url)}"></audio>`
              : `<div class="preview-placeholder">Audio media is not configured.</div>`
          }
        </section>
      `;
    }

    if (block.block_type === 'image') {
      const url = await resolveMediaUrl(block);

      return `
        <section class="preview-block">
          <h3 class="preview-block-label">${esc(title)}</h3>
          ${
            url
              ? `<img class="preview-image" src="${esc(url)}" alt="${esc(title)}">`
              : `<div class="preview-placeholder">Image media is not configured.</div>`
          }
        </section>
      `;
    }

    if (block.block_type === 'pdf' || block.block_type === 'download') {
      const url = await resolveMediaUrl(block);

      return `
        <section class="preview-block preview-file-block">
          <h3 class="preview-block-label">${esc(title)}</h3>
          ${
            url
              ? `
                <a
                  class="preview-file-link"
                  href="${esc(url)}"
                  target="_blank"
                  rel="noopener"
                >
                  Open ${esc(blockLabel(block.block_type))}
                </a>
              `
              : `<div class="preview-placeholder">File is not configured.</div>`
          }
        </section>
      `;
    }

    if (block.block_type === 'link') {
      const url = block.external_url || '#';

      return `
        <section class="preview-block">
          <a
            class="preview-link"
            href="${esc(url)}"
            target="_blank"
            rel="noopener"
          >
            ${esc(title)}
          </a>
        </section>
      `;
    }

    if (block.block_type === 'embed') {
      const url = block.external_url || '';
      const height = Number(block.settings?.height || 350);

      return `
        <section class="preview-block">
          <h3 class="preview-block-label">${esc(title)}</h3>
          ${
            url
              ? `
                <iframe
                  src="${esc(url)}"
                  title="${esc(title)}"
                  style="width:100%;height:${Math.max(150, height)}px;border:0;border-radius:10px;"
                ></iframe>
              `
              : `<div class="preview-placeholder">Embed URL is not configured.</div>`
          }
        </section>
      `;
    }

    if (block.block_type === 'divider') {
      return `<hr class="preview-divider">`;
    }

    if (block.block_type === 'quiz' || block.block_type === 'knowledge_check') {
      return `
        <section class="preview-block preview-assessment">
          <span class="preview-assessment-type">
            ${esc(blockLabel(block.block_type))}
          </span>
          <h3>${esc(title)}</h3>
          <p>This assessment block is connected to the assessment builder.</p>
        </section>
      `;
    }

    if (block.block_type === 'form') {
      return `
        <section class="preview-block preview-assessment">
          <span class="preview-assessment-type">FORM</span>
          <h3>${esc(title)}</h3>
          <p>This form block is connected to the form builder.</p>
        </section>
      `;
    }

    return `
      <section class="preview-block preview-text">
        ${esc(content).replace(/\n/g, '<br>')}
      </section>
    `;
  }

  async function loadPreview() {
    if (!lessonId) {
      throw new Error('No lesson ID was provided.');
    }

    const { data: lesson, error: lessonError } = await db()
      .from('lms_lessons')
      .select(`
        *,
        lms_sections (
          id,
          title,
          course_id,
          lms_courses (
            id,
            title
          )
        )
      `)
      .eq('id', lessonId)
      .single();

    if (lessonError) throw lessonError;

    const { data: blocks, error: blocksError } = await db()
      .from('lms_content_blocks')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: true });

    if (blocksError) throw blocksError;

    state.lesson = lesson;
    state.blocks = blocks || [];

    $('previewTitle').textContent = lesson.title || 'Lesson';

    $('previewSubtitle').textContent =
      `${lesson.lms_sections?.lms_courses?.title || 'Course'} · ${lesson.lms_sections?.title || 'Section'}`;

    $('backToLesson').addEventListener('click', () => {
      location.href =
        `admin-lms-lesson-builder.html?lesson=${encodeURIComponent(lessonId)}`;
    }, { once: true });

    if (!state.blocks.length) {
      $('previewContent').innerHTML = `
        <div class="preview-empty">
          <h2>No content yet</h2>
          <p>This lesson does not contain any content blocks.</p>
        </div>
      `;
      return;
    }

    const rendered = [];

    for (const block of state.blocks) {
      rendered.push(await renderBlock(block));
    }

    $('previewContent').innerHTML = `
      <div class="preview-lesson-intro">
        <span class="preview-eyebrow">LESSON PREVIEW</span>
        <h2>${esc(lesson.title || 'Lesson')}</h2>
        ${
          lesson.description
            ? `<p>${esc(lesson.description).replace(/\n/g, '<br>')}</p>`
            : ''
        }
      </div>

      <div class="preview-block-list">
        ${rendered.join('')}
      </div>
    `;
  }

  async function init() {
    try {
      await loadPreview();
    } catch (error) {
      console.error(error);

      $('previewContent').innerHTML = `
        <div class="preview-error">
          <h2>Unable to load lesson preview</h2>
          <p>${esc(error.message || 'An unexpected error occurred.')}</p>
          <button
            class="primary-button"
            type="button"
            onclick="history.back()"
          >
            ← Return
          </button>
        </div>
      `;

      toast(error.message || 'Unable to load lesson preview.', 'error');
    }
  }

  init();
})();
