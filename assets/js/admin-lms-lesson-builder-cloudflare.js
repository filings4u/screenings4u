/* screenings4u LMS v1 — Lesson Builder */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const lessonId = params.get('lesson');

  const state = {
    lesson: null,
    blocks: [],
    courseId: null
  };

  const $ = id => document.getElementById(id);

  const BLOCK_TYPES = [
    ['heading', 'Heading'],
    ['text', 'Text'],
    ['video', 'Video'],
    ['audio', 'Audio'],
    ['image', 'Image'],
    ['pdf', 'PDF'],
    ['download', 'Download'],
    ['link', 'Link'],
    ['embed', 'Embed'],
    ['quiz', 'Quiz'],
    ['knowledge_check', 'Knowledge Check'],
    ['form', 'Form'],
    ['divider', 'Divider']
  ];

  function db() {
    const candidates = [window.supabaseClient, window.supabaseAdmin, window.supabase];
    const client = candidates.find(v => v && typeof v.from === 'function');
    if (!client) throw new Error('Supabase client was not found. Check admin-config.js.');
    return client;
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));
  }

  function toast(message, type = 'success') {
    const el = $('lessonToast');
    el.textContent = message;
    el.className = `admin-toast ${type} show`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  function openModal(title, body, actions = [], eyebrow = 'LESSON') {
    $('lessonModalEyebrow').textContent = eyebrow;
    $('lessonModalTitle').textContent = title;
    $('lessonModalBody').innerHTML = body;
    $('lessonModalActions').innerHTML = '';

    actions.forEach(action => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.className || 'secondary-button';
      button.textContent = action.label;
      button.addEventListener('click', async () => {
        try {
          button.disabled = true;
          await action.handler();
        } catch (error) {
          console.error('Lesson modal action failed:', error);
          toast(error.message || 'Unable to complete this action.', 'error');
          button.disabled = false;
        }
      });
      $('lessonModalActions').appendChild(button);
    });

    $('lessonModal').classList.add('open');
    $('lessonModal').setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    $('lessonModal').classList.remove('open');
    $('lessonModal').setAttribute('aria-hidden', 'true');
  }

  async function loadLesson() {
    if (!lessonId) throw new Error('No lesson ID was provided.');

    const { data, error } = await db()
      .from('lms_lessons')
      .select('*, lms_sections(course_id, title, lms_courses(id, title))')
      .eq('id', lessonId)
      .single();

    if (error) throw error;

    state.lesson = data;
    state.courseId = data.lms_sections?.course_id || null;

    $('lessonTitle').value = data.title || '';
    $('lessonDescription').value = data.description || '';
    $('lessonOrder').value = data.sort_order || 1;
    $('estimatedMinutes').value = data.estimated_minutes ?? '';
    $('lessonStatus').value = data.status || 'draft';
    $('lessonRequired').checked = data.is_required !== false;
    $('completionRequired').checked = data.completion_required !== false;
    $('lockPrevious').checked = data.lock_until_previous_complete === true;

    $('lessonPageTitle').textContent = data.title || 'Lesson';
    $('lessonPageDescription').textContent =
      `${data.lms_sections?.lms_courses?.title || 'Course'} · ${data.lms_sections?.title || 'Section'}`;

    updateStatusBadge();
    if (state.courseId) {
      $('backToCourse').href = `admin-lms-course-builder.html?course=${encodeURIComponent(state.courseId)}`;
    }

    await loadBlocks();
  }

  async function loadBlocks() {
    const { data, error } = await db()
      .from('lms_content_blocks')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    state.blocks = data || [];
    renderBlocks();
  }

  function updateStatusBadge() {
    const status = $('lessonStatus').value || state.lesson?.status || 'draft';
    const badge = $('lessonStatusBadge');

    if (!badge) return;

    badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    badge.className = `training-lesson-status training-lesson-status-${status}`;
  }

  function blockLabel(type) {
    return BLOCK_TYPES.find(x => x[0] === type)?.[1] || type;
  }

  async function openAssessmentBuilder(block = null) {
    try {
      if (!lessonId) {
        toast('No lesson ID was provided.', 'error');
        return;
      }

      const assessmentId = block?.settings?.assessment_id || null;

      if (assessmentId) {
        location.href =
          `admin-lms-assessment-builder.html?lesson=${encodeURIComponent(lessonId)}&assessment=${encodeURIComponent(assessmentId)}${block?.id ? `&block=${encodeURIComponent(block.id)}` : ''}`;
        return;
      }

      const { data, error } = await db()
        .from('lms_assessments')
        .select('id')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.id) {
        location.href =
          `admin-lms-assessment-builder.html?lesson=${encodeURIComponent(lessonId)}&assessment=${encodeURIComponent(data.id)}${block?.id ? `&block=${encodeURIComponent(block.id)}` : ''}`;
        return;
      }

      location.href =
        `admin-lms-assessment-builder.html?lesson=${encodeURIComponent(lessonId)}${block?.id ? `&block=${encodeURIComponent(block.id)}` : ''}`;
    } catch (error) {
      console.error(error);
      toast(error.message || 'Unable to open assessment builder.', 'error');
    }
  }

  function previewBlock(block) {
    const settings = block.settings || {};
    const content = block.content || '';

    if (block.block_type === 'heading') {
      return `<div class="block-preview"><h3>${esc(content || block.title || 'Heading')}</h3></div>`;
    }

    if (block.block_type === 'text') {
      return `<div class="block-preview">${esc(content).replace(/\n/g, '<br>') || '<em>No text entered.</em>'}</div>`;
    }

    if (block.block_type === 'video') {
      const videoId = block.settings?.cloudflare_video_id || '';
      return videoId
        ? `<div class="block-preview">
             <div class="cloudflare-video-card">
               <strong>Cloudflare Stream Video</strong>
               <span>Video ID: ${esc(videoId)}</span>
               <small>Secure playback is generated when the lesson is viewed.</small>
             </div>
           </div>`
        : `<div class="block-preview"><div class="file-card"><div><strong>Video</strong><span>${esc(block.title || 'Cloudflare video not configured')}</span></div></div></div>`;
    }

    if (block.block_type === 'audio') {
      return block.external_url
        ? `<div class="block-preview"><audio controls src="${esc(block.external_url)}" style="width:100%"></audio></div>`
        : `<div class="block-preview"><em>Audio media not configured.</em></div>`;
    }

    if (block.block_type === 'image') {
      return block.external_url
        ? `<div class="block-preview"><img src="${esc(block.external_url)}" alt="${esc(block.title || 'Course image')}"></div>`
        : `<div class="block-preview"><em>Image media not configured.</em></div>`;
    }

    if (['pdf','download'].includes(block.block_type)) {
      return `<div class="block-preview"><div class="file-card"><div><strong>${esc(block.title || blockLabel(block.block_type))}</strong><span>${esc(block.external_url || 'File not configured')}</span></div></div></div>`;
    }

    if (block.block_type === 'link') {
      return `<div class="block-preview"><a href="${esc(block.external_url || '#')}" target="_blank" rel="noopener">${esc(block.title || block.external_url || 'Open link')}</a></div>`;
    }

    if (block.block_type === 'embed') {
      return `<div class="block-preview"><iframe src="${esc(block.external_url || '')}" title="${esc(block.title || 'Embedded content')}" style="width:100%;min-height:300px;border:0"></iframe></div>`;
    }

    if (block.block_type === 'divider') {
      return `<div class="block-preview"><hr></div>`;
    }

    if (block.block_type === 'quiz') {
      return `<div class="block-preview"><div class="file-card"><div><strong>Quiz</strong><span>${esc(block.title || 'Quiz block')}</span></div></div></div>`;
    }

    if (block.block_type === 'knowledge_check') {
      return `<div class="block-preview"><div class="file-card"><div><strong>Knowledge Check</strong><span>${esc(block.title || 'Knowledge check block')}</span></div></div></div>`;
    }

    if (block.block_type === 'form') {
      return `<div class="block-preview"><div class="file-card"><div><strong>Form</strong><span>${esc(block.title || 'Form block')}</span></div></div></div>`;
    }

    return `<div class="block-preview">${esc(content)}</div>`;
  }

  function renderBlocks() {
    const container = $('contentBlocks');

    if (!state.blocks.length) {
      container.innerHTML = '<div class="empty-state">No content yet. Add your first content block.</div>';
    } else {
      container.innerHTML = state.blocks.map(block => `
        <article class="content-block" data-block-id="${esc(block.id)}">
          <div class="content-block-header">
            <div class="content-block-title">
              ${esc(block.sort_order)}. ${esc(block.title || blockLabel(block.block_type))}
              <span class="content-block-type">${esc(blockLabel(block.block_type))}</span>
            </div>
            <div class="content-block-actions">
              <button class="secondary-button move-up" type="button">↑</button>
              <button class="secondary-button move-down" type="button">↓</button>
              <button class="secondary-button edit-block" type="button">Edit</button>
              <button class="secondary-button delete-block" type="button">Delete</button>
            </div>
          </div>
          <div class="content-block-body">${previewBlock(block)}</div>
          ${
            ['quiz', 'knowledge_check'].includes(block.block_type)
              ? `
                <div class="content-block-assessment-action">
                  <button class="primary-button open-assessment" type="button">
                    Open Assessment Builder
                  </button>
                </div>
              `
              : ''
          }
        </article>
      `).join('');
    }

    container.querySelectorAll('.content-block').forEach(article => {
      const block = state.blocks.find(b => b.id === article.dataset.blockId);
      article.querySelector('.edit-block')?.addEventListener('click', () => openBlockEditor(block));
      article.querySelector('.delete-block')?.addEventListener('click', () => confirmDelete(block));
      article.querySelector('.move-up')?.addEventListener('click', () => moveBlock(block, -1));
      article.querySelector('.move-down')?.addEventListener('click', () => moveBlock(block, 1));
      article.querySelector('.open-assessment')?.addEventListener(
        'click',
        () => openAssessmentBuilder(block)
      );
    });

    $('blockCount').textContent = state.blocks.length;
    $('requiredBlockCount').textContent = state.blocks.filter(b => b.is_required).length;
    $('mediaBlockCount').textContent = state.blocks.filter(b => ['video','audio','image','pdf','download'].includes(b.block_type)).length;
  }

  async function saveLesson() {
    const title = $('lessonTitle').value.trim();
    if (!title) {
      toast('Lesson title is required.', 'error');
      return;
    }

    const payload = {
      title,
      description: $('lessonDescription').value.trim() || null,
      sort_order: Number($('lessonOrder').value || 1),
      estimated_minutes: $('estimatedMinutes').value === '' ? null : Number($('estimatedMinutes').value),
      status: $('lessonStatus').value,
      is_required: $('lessonRequired').checked,
      completion_required: $('completionRequired').checked,
      lock_until_previous_complete: $('lockPrevious').checked
    };

    const { error } = await db()
      .from('lms_lessons')
      .update(payload)
      .eq('id', lessonId);

    if (error) {
      console.error('Lesson save failed:', error);
      toast(error.message || 'Unable to save lesson.', 'error');
      return;
    }

    state.lesson = {...state.lesson, ...payload};
    $('lessonPageTitle').textContent = payload.title;
    updateStatusBadge();
    toast('Lesson saved.');
  }

  function addContentTypeButtons() {
    $('contentTypeQuickAdd').innerHTML = BLOCK_TYPES.map(([type, label]) =>
      `<button class="content-type-button" type="button" data-block-type="${esc(type)}">${esc(label)}</button>`
    ).join('');

    $('contentTypeQuickAdd').querySelectorAll('.content-type-button').forEach(button => {
      button.addEventListener('click', () => openBlockEditor({ block_type: button.dataset.blockType }));
    });
  }

  function blockForm(block) {
    const type = block.block_type;
    const common = `
      <label>Block Title
        <input id="blockTitle" value="${esc(block.title || '')}" maxlength="200">
      </label>
      <label class="block-check">
        <input id="blockRequired" type="checkbox" ${block.is_required ? 'checked' : ''}>
        Required content block
      </label>
    `;

    if (type === 'divider') return common;

    if (type === 'heading') return common + `
      <label>Heading Text
        <input id="blockContent" value="${esc(block.content || '')}">
      </label>
    `;

    if (type === 'text') return common + `
      <label>Text Content
        <textarea id="blockContent" rows="10">${esc(block.content || '')}</textarea>
      </label>
    `;

    if (type === 'video') return common + `
      <div class="cloudflare-video-editor">
        <label>Cloudflare Stream Video ID
          <input id="cloudflareVideoId" type="text"
            value="${esc(block.settings?.cloudflare_video_id || '')}"
            placeholder="Paste the Cloudflare Stream Video UID">
        </label>

        <div class="cloudflare-video-divider">
          <span>OR</span>
        </div>

        <label>Upload Video to Cloudflare Stream
          <input id="blockFile" type="file" accept="video/*">
        </label>

        <div class="cloudflare-upload-actions">
          <button id="uploadCloudflareButton" class="secondary-button" type="button">
            Upload to Cloudflare
          </button>
          <button id="useCloudflareVideoButton" class="secondary-button" type="button">
            Use Video ID
          </button>
        </div>

        <div id="cloudflareUploadProgressWrap" class="cloudflare-upload-progress-wrap" hidden>
          <div class="cloudflare-upload-progress-track">
            <div id="cloudflareUploadProgress" class="cloudflare-upload-progress"></div>
          </div>
          <span id="cloudflareUploadProgressLabel">0%</span>
        </div>

        <div id="cloudflareUploadStatus" class="cloudflare-upload-status"></div>

        <small>
          Videos are stored and streamed by Cloudflare Stream. Supabase stores the
          course media record, Cloudflare Video ID, status, thumbnail, duration,
          and playback metadata.
        </small>
      </div>
    `;

    if (['audio','image','pdf','download'].includes(type)) return common + `
      <label>Media URL
        <input id="blockUrl" type="url" value="${esc(block.external_url || '')}" placeholder="Supabase Storage URL or external URL">
      </label>
      <label>Upload File
        <input id="blockFile" type="file">
      </label>
      <small>Non-video course media can continue to use your Supabase Storage bucket.</small>
    `;

    if (type === 'link') return common + `
      <label>URL
        <input id="blockUrl" type="url" value="${esc(block.external_url || '')}" placeholder="https://...">
      </label>
    `;

    if (type === 'embed') return common + `
      <label>Embed URL
        <input id="blockUrl" type="url" value="${esc(block.external_url || '')}" placeholder="https://...">
      </label>
      <label>Embed Height
        <input id="embedHeight" type="number" min="150" value="${Number(block.settings?.height || 350)}">
      </label>
    `;

    if (['quiz','knowledge_check'].includes(type)) return common + `
      <label>Assessment ID
        <input
          id="assessmentId"
          type="text"
          value="${esc(block.settings?.assessment_id || '')}"
          placeholder="Created automatically by the Assessment Builder"
        >
      </label>
      <small>
        This content block is connected to the assessment for this lesson.
      </small>
      <button id="openAssessmentFromEditor" class="secondary-button" type="button">
        Open Assessment Builder
      </button>
    `;

    if (type === 'form') return common + `
      <label>Configuration JSON
        <textarea id="blockSettings" rows="8">${esc(JSON.stringify(block.settings || {}, null, 2))}</textarea>
      </label>
      <small>This block is reserved for the form builder.</small>
    `;

    return common + `
      <label>Content
        <textarea id="blockContent" rows="8">${esc(block.content || '')}</textarea>
      </label>
    `;
  }

  /*
   * Cloudflare Stream integration
   *
   * Videos are uploaded directly to Cloudflare Stream through a one-time
   * upload URL created by the Supabase Edge Function:
   *   cloudflare-stream-upload
   *
   * The Cloudflare API token NEVER belongs in browser JavaScript.
   * Supabase stores the token as an Edge Function secret.
   */
  async function getSupabaseAccessToken() {
    const client = db();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data?.session?.access_token) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    return data.session.access_token;
  }

  async function callSupabaseFunction(name, body) {
    const client = db();
    const token = await getSupabaseAccessToken();

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

  function setVideoUploadStatus(message, type = '') {
    const el = $('cloudflareUploadStatus');
    if (!el) return;
    el.className = `cloudflare-upload-status ${type}`.trim();
    el.textContent = message || '';
  }

  function updateVideoUploadProgress(percent) {
    const wrap = $('cloudflareUploadProgressWrap');
    const bar = $('cloudflareUploadProgress');
    const label = $('cloudflareUploadProgressLabel');

    if (!wrap || !bar || !label) return;

    wrap.hidden = false;
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    bar.style.width = `${safePercent}%`;
    label.textContent = `${Math.round(safePercent)}%`;
  }

  function encodeTusMetadata(metadata) {
    return Object.entries(metadata)
      .map(([key, value]) => `${key} ${btoa(unescape(encodeURIComponent(String(value))))}`)
      .join(',');
  }

  /*
   * Initiates a resumable TUS upload through our Supabase Edge Function,
   * then uploads the file directly to Cloudflare in chunks.
   *
   * TUS is used for every video here. This is especially important for
   * large videos because Cloudflare requires TUS for files over 200 MB.
   */
  async function uploadVideoToCloudflare(file, options = {}) {
    if (!file) throw new Error('Please choose a video file.');

    const maxBytes = 30 * 1024 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error('Cloudflare Stream accepts video files under 30 GB.');
    }

    const meta = {
      name: file.name,
      requiresignedurls: 'true'
    };

    const init = await callSupabaseFunction('cloudflare-stream-upload', {
      mode: 'init',
      fileSize: file.size,
      fileName: file.name,
      creator: options.creator || null,
      maxDurationSeconds: 36000,
      requireSignedURLs: true,
      allowedOrigins: options.allowedOrigins || []
    });

    const uploadUrl = init.uploadURL;
    const uid = init.uid;

    if (!uploadUrl || !uid) {
      throw new Error('Cloudflare did not return a valid upload URL.');
    }

    const chunkSize = 50 * 1024 * 1024;
    let offset = 0;

    setVideoUploadStatus(`Uploading ${file.name}…`, 'uploading');
    updateVideoUploadProgress(0);

    while (offset < file.size) {
      const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));

      const response = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream'
        },
        body: chunk
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Cloudflare upload failed (${response.status}). ${text}`.trim());
      }

      const returnedOffset = Number(response.headers.get('Upload-Offset'));
      if (!Number.isFinite(returnedOffset) || returnedOffset <= offset) {
        throw new Error('Cloudflare returned an invalid upload offset.');
      }

      offset = returnedOffset;
      updateVideoUploadProgress((offset / file.size) * 100);
    }

    setVideoUploadStatus('Upload complete. Cloudflare is processing the video…', 'processing');

    return {
      uid,
      fileName: file.name,
      fileSize: file.size
    };
  }

  async function getCloudflareVideoDetails(videoId) {
    return callSupabaseFunction('cloudflare-stream-video', {
      mode: 'details',
      videoId
    });
  }

  async function createCloudflareMediaRecord(videoId, blockTitle, fileName = null) {
    const details = await getCloudflareVideoDetails(videoId);
    const video = details.video || {};

    const { data, error } = await db()
      .from('lms_media')
      .insert({
        media_type: 'video',
        title: blockTitle || fileName || 'Course Video',
        provider: 'cloudflare_stream',
        provider_video_id: videoId,
        provider_status: video.readyToStream ? 'ready' : 'processing',
        playback_url: video.preview || null,
        thumbnail_url: video.thumbnail || null,
        duration_seconds: Number(video.duration || 0) || null,
        metadata: video
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async function attachExistingCloudflareVideo(videoId, blockTitle) {
    const cleanId = String(videoId || '').trim();
    if (!cleanId) throw new Error('Enter a Cloudflare Stream Video ID.');

    setVideoUploadStatus('Checking Cloudflare video…', 'processing');

    const media = await createCloudflareMediaRecord(cleanId, blockTitle);

    setVideoUploadStatus(
      media.provider_status === 'ready'
        ? 'Cloudflare video is ready.'
        : 'Video found. Cloudflare is still processing it.',
      media.provider_status === 'ready' ? 'success' : 'processing'
    );

    return media;
  }
  async function uploadNonVideoMedia(file, blockType) {
    if (!file) return null;

    const bucket = 'lms-media';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const path = `lessons/${lessonId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await db().storage.from(bucket).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false
    });

    if (uploadError) throw uploadError;

    const mediaType =
      blockType === 'audio' ? 'audio' :
      blockType === 'image' ? 'image' :
      blockType === 'pdf' ? 'pdf' :
      'document';

    const { data: media, error: mediaError } = await db()
      .from('lms_media')
      .insert({
        media_type: mediaType,
        original_filename: file.name,
        storage_bucket: bucket,
        storage_path: path,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        title: file.name,
        provider: 'supabase_storage'
      })
      .select('*')
      .single();

    if (mediaError) throw mediaError;
    return media;
  }

  async function openBlockEditor(block) {
    const isEdit = !!block.id;
    const type = block.block_type || 'text';

    openModal(
      isEdit ? `Edit ${blockLabel(type)}` : `Add ${blockLabel(type)}`,
      `<div class="block-form">
        <input id="blockType" type="hidden" value="${esc(type)}">
        ${blockForm(block)}
      </div>`,
      [
        { label:'Cancel', className:'secondary-button', handler:closeModal },
        { label:isEdit ? 'Save Block' : 'Add Block', className:'primary-button', handler:async () => {
          try {
            const payload = {
              lesson_id: lessonId,
              block_type: type,
              title: $('blockTitle')?.value.trim() || null,
              sort_order: isEdit ? block.sort_order : state.blocks.length + 1,
              content: $('blockContent')?.value || null,
              external_url: $('blockUrl')?.value.trim() || null,
              is_required: $('blockRequired')?.checked || false,
              settings: {}
            };

            if (type === 'video') {
              const cloudflareVideoId =
                $('cloudflareVideoId')?.value.trim() ||
                block.settings?.cloudflare_video_id ||
                null;

              if (!cloudflareVideoId) {
                throw new Error('Add a Cloudflare Stream Video ID or upload a video.');
              }

              const existingMediaId = block.media_id || null;
              let mediaId = existingMediaId;

              if (!mediaId) {
                const media = await createCloudflareMediaRecord(
                  cloudflareVideoId,
                  payload.title
                );
                mediaId = media.id;
              }

              payload.media_id = mediaId;
              payload.external_url = null;
              payload.settings = {
                cloudflare_video_id: cloudflareVideoId,
                provider: 'cloudflare_stream'
              };
            }

            if ($('embedHeight')) payload.settings.height = Number($('embedHeight').value || 350);

            if ($('blockSettings')) {
              try {
                payload.settings = JSON.parse($('blockSettings').value || '{}');
              } catch {
                toast('Configuration JSON is invalid.', 'error');
                return;
              }
            }

            if ($('assessmentId')) {
              payload.settings.assessment_id =
                $('assessmentId').value.trim() || null;
            }

            if (type !== 'video') {
              const file = $('blockFile')?.files?.[0];
              if (file) {
                const media = await uploadNonVideoMedia(file, type);
                payload.media_id = media.id;
                payload.external_url = media.storage_path;
              } else if (isEdit && block.media_id) {
                payload.media_id = block.media_id;
              }
            } else if (isEdit && block.media_id) {
              payload.media_id = block.media_id;
            }

            let result;
            if (isEdit) {
              result = await db()
                .from('lms_content_blocks')
                .update(payload)
                .eq('id', block.id);
            } else {
              result = await db()
                .from('lms_content_blocks')
                .insert(payload);
            }

            if (result.error) throw result.error;

            closeModal();
            await loadBlocks();
            toast(isEdit ? 'Content block updated.' : 'Content block added.');
          } catch (error) {
            console.error(error);
            toast(error.message || 'Unable to save content block.', 'error');
          }
        }}
      ],
      'CONTENT'
    );

    $('openAssessmentFromEditor')?.addEventListener(
      'click',
      () => openAssessmentBuilder(block)
    );

    if (type === 'video') {
      $('uploadCloudflareButton')?.addEventListener('click', async () => {
        const button = $('uploadCloudflareButton');
        const file = $('blockFile')?.files?.[0];
        const title = $('blockTitle')?.value.trim() || file?.name || 'Course Video';

        if (!file) {
          setVideoUploadStatus('Choose a video file first.', 'error');
          return;
        }

        try {
          button.disabled = true;

          const result = await uploadVideoToCloudflare(file, {
            creator: state.lesson?.created_by || null
          });

          $('cloudflareVideoId').value = result.uid;

          setVideoUploadStatus(
            'Upload finished. Saving the Cloudflare Video ID…',
            'processing'
          );

          const media = await createCloudflareMediaRecord(
            result.uid,
            title,
            file.name
          );

          $('cloudflareVideoId').value = media.provider_video_id;

          setVideoUploadStatus(
            media.provider_status === 'ready'
              ? 'Video is ready and stored in Supabase.'
              : 'Video uploaded and stored. Cloudflare is processing it.',
            media.provider_status === 'ready' ? 'success' : 'processing'
          );
        } catch (error) {
          console.error('Cloudflare upload failed:', error);
          setVideoUploadStatus(error.message || 'Video upload failed.', 'error');
        } finally {
          button.disabled = false;
        }
      });

      $('useCloudflareVideoButton')?.addEventListener('click', async () => {
        const button = $('useCloudflareVideoButton');
        const videoId = $('cloudflareVideoId')?.value.trim();
        const title = $('blockTitle')?.value.trim() || 'Course Video';

        if (!videoId) {
          setVideoUploadStatus('Paste a Cloudflare Video ID first.', 'error');
          return;
        }

        try {
          button.disabled = true;
          const media = await attachExistingCloudflareVideo(videoId, title);
          $('cloudflareVideoId').value = media.provider_video_id;
        } catch (error) {
          console.error('Cloudflare video lookup failed:', error);
          setVideoUploadStatus(error.message || 'Unable to find that Cloudflare video.', 'error');
        } finally {
          button.disabled = false;
        }
      });
    }
  }

  async function moveBlock(block, direction) {
    const index = state.blocks.findIndex(b => b.id === block.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= state.blocks.length) return;

    const other = state.blocks[target];

    try {
      const firstOrder = block.sort_order;
      const secondOrder = other.sort_order;

      let result = await db()
        .from('lms_content_blocks')
        .update({ sort_order: -999999 })
        .eq('id', block.id);
      if (result.error) throw result.error;

      result = await db()
        .from('lms_content_blocks')
        .update({ sort_order: firstOrder })
        .eq('id', other.id);
      if (result.error) throw result.error;

      result = await db()
        .from('lms_content_blocks')
        .update({ sort_order: secondOrder })
        .eq('id', block.id);
      if (result.error) throw result.error;

      await loadBlocks();
    } catch (error) {
      toast(error.message || 'Unable to reorder content.', 'error');
    }
  }

  function confirmDelete(block) {
    openModal(
      'Delete Content Block?',
      `<p>Delete <strong>${esc(block.title || blockLabel(block.block_type))}</strong>?</p>
       <p>This removes the block from the lesson. Uploaded media is not automatically removed from storage.</p>`,
      [
        { label:'Cancel', className:'secondary-button', handler:closeModal },
        { label:'Delete', className:'primary-button', handler:async () => {
          const { error } = await db()
            .from('lms_content_blocks')
            .delete()
            .eq('id', block.id);

          if (error) {
            toast(error.message || 'Unable to delete block.', 'error');
            return;
          }

          closeModal();
          await loadBlocks();
          toast('Content block deleted.');
        }}
      ],
      'DANGER ZONE'
    );
  }

  function bindEvents() {
    $('saveLessonButton').addEventListener('click', saveLesson);
    $('lessonStatus').addEventListener('change', updateStatusBadge);
    $('addContentButton').addEventListener('click', () => openBlockPicker());

    $('previewLessonButton').addEventListener('click', () => {
      if (!lessonId) return;
      window.open(`admin-lms-lesson-preview.html?lesson=${encodeURIComponent(lessonId)}`, '_blank', 'noopener');
    });

    $('lessonModalClose').addEventListener('click', closeModal);
    document.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function openBlockPicker() {
    openModal(
      'Add Content',
      `<p>Choose the content students should see at this point in the lesson.</p>
       <div class="content-type-list" id="modalContentTypes">
         ${BLOCK_TYPES.map(([type,label]) => `<button class="content-type-button" data-type="${esc(type)}" type="button">${esc(label)}</button>`).join('')}
       </div>`,
      [{ label:'Cancel', className:'secondary-button', handler:closeModal }],
      'CONTENT LIBRARY'
    );

    document.querySelectorAll('#modalContentTypes .content-type-button').forEach(button => {
      button.addEventListener('click', () => {
        const type = button.dataset.type;
        closeModal();
        openBlockEditor({ block_type:type });
      });
    });
  }

  async function init() {
    bindEvents();
    addContentTypeButtons();

    try {
      await loadLesson();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Unable to load lesson.', 'error');
    }
  }

  init();
})();