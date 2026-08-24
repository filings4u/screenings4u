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
        await action.handler();
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
    $('lessonStatusBadge').textContent = status;
    $('lessonStatusBadge').className = `status-badge ${status}`;
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
      const videoId =
        block.settings?.cloudflare_video_id ||
        block.provider_video_id ||
        '';

      if (videoId) {
        return `
          <div class="block-preview cloudflare-video-card">
            <div class="file-card">
              <div>
                <strong>Cloudflare Stream Video</strong>
                <span>Video UID: ${esc(videoId)}</span>
              </div>
            </div>
          </div>
        `;
      }

      const url = block.external_url || '';
      return url
        ? `<div class="block-preview"><video controls preload="metadata" src="${esc(url)}"></video></div>`
        : `<div class="block-preview"><div class="file-card"><div><strong>Video</strong><span>${esc(block.title || 'Video media not configured')}</span></div></div></div>`;
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

    const { data, error } = await db()
      .from('lms_lessons')
      .update(payload)
      .eq('id', lessonId)
      .select('*')
      .single();

    if (error) {
      toast(error.message || 'Unable to save lesson.', 'error');
      return;
    }

    state.lesson = {...state.lesson, ...data};
    $('lessonPageTitle').textContent = data.title;
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

    if (type === 'video') {
      const existingVideoId =
        block.settings?.cloudflare_video_id ||
        '';

      return common + `
        <label>Cloudflare Stream Video ID
          <input
            id="cloudflareVideoId"
            type="text"
            value="${esc(existingVideoId)}"
            placeholder="Paste a Cloudflare Stream Video UID"
          >
        </label>

        <label>Upload Video to Cloudflare Stream
          <input
            id="blockFile"
            type="file"
            accept="video/*"
          >
        </label>

        <div id="cloudflareUploadStatus" class="cloudflare-upload-status" aria-live="polite">
          Video files upload directly to Cloudflare Stream. They are not sent through the Supabase 50 MB Storage bucket.
        </div>

        <small>
          Use an existing Cloudflare Video ID, or select a video file to upload it directly to Cloudflare Stream.
        </small>
      `;
    }

    if (['audio','image','pdf','download'].includes(type)) return common + `
      <label>Media URL
        <input id="blockUrl" type="url" value="${esc(block.external_url || '')}" placeholder="Supabase Storage URL or external URL">
      </label>
      <label>Upload File
        <input id="blockFile" type="file">
      </label>
      <small>You can upload directly to the private lms-media bucket. The application records the file in lms_media.</small>
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

  async function getAuthAccessToken() {
    const client = db();
    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    const token = data?.session?.access_token;

    if (!token) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    return token;
  }

  async function invokeFunction(name, body) {
    const client = db();
    const token = await getAuthAccessToken();

    const { data, error } = await client.functions.invoke(name, {
      body,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (error) throw error;

    if (!data?.success) {
      throw new Error(data?.error || `${name} failed.`);
    }

    return data;
  }

  async function ensureTusClient() {
    if (window.tus?.Upload) return window.tus;

    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-tus-client="true"]');

      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tus-js-client@4/dist/tus.min.js';
      script.async = true;
      script.dataset.tusClient = 'true';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Unable to load the resumable video uploader.'));
      document.head.appendChild(script);
    });

    if (!window.tus?.Upload) {
      throw new Error('The resumable video uploader did not initialize.');
    }

    return window.tus;
  }

  async function uploadVideoToCloudflare(file) {
    if (!file) return null;

    if (!file.type.startsWith('video/')) {
      throw new Error('Please select a video file.');
    }

    if (file.size <= 0) {
      throw new Error('The selected video file is empty.');
    }

    if (file.size > 30 * 1024 * 1024 * 1024) {
      throw new Error('Video must be under 30 GB.');
    }

    const statusEl = $('cloudflareUploadStatus');

    const setStatus = message => {
      if (statusEl) statusEl.textContent = message;
    };

    setStatus('Preparing secure Cloudflare Stream upload...');

    const init = await invokeFunction('cloudflare-stream-upload', {
      mode: 'init',
      fileSize: file.size,
      fileName: file.name
    });

    const tus = await ensureTusClient();

    return await new Promise((resolve, reject) => {
      let lastPercent = -1;

      const upload = new tus.Upload(file, {
        uploadUrl: init.uploadURL,
        chunkSize: 8 * 1024 * 1024,
        retryDelays: [0, 1000, 3000, 5000, 10000],

        onError(error) {
          console.error('Cloudflare Stream upload failed:', error);
          setStatus(`Upload failed: ${error.message || 'Unknown upload error.'}`);
          reject(error);
        },

        onProgress(bytesUploaded, bytesTotal) {
          const percent = Math.floor((bytesUploaded / bytesTotal) * 100);

          if (percent !== lastPercent) {
            lastPercent = percent;
            setStatus(`Uploading to Cloudflare Stream… ${percent}%`);
          }
        },

        onSuccess() {
          setStatus('Upload complete. Cloudflare is processing the video…');

          resolve({
            uid: init.uid,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'video/mp4'
          });
        }
      });

      upload.start();
    });
  }

  async function getCloudflareVideoDetails(videoId) {
    const result = await invokeFunction('cloudflare-stream-video', {
      videoId
    });

    return result.video || null;
  }

  async function saveCloudflareMediaRecord(file, videoId, videoDetails = null) {
    const client = db();

    const {
      data: { user },
      error: userError
    } = await client.auth.getUser();

    if (userError || !user) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    const duration =
      Number.isFinite(Number(videoDetails?.duration))
        ? Math.round(Number(videoDetails.duration))
        : null;

    const status =
      videoDetails?.status?.state ||
      (videoDetails?.readyToStream ? 'ready' : 'processing');

    const customerCode =
      window.CLOUDFLARE_STREAM_CUSTOMER_CODE ||
      '';

    const playbackUrl = customerCode
      ? `https://customer-${customerCode}.cloudflarestream.com/${encodeURIComponent(videoId)}/iframe`
      : null;

    const thumbnailUrl = customerCode
      ? `https://customer-${customerCode}.cloudflarestream.com/${encodeURIComponent(videoId)}/thumbnails/thumbnail.jpg`
      : null;

    const { data, error } = await client
      .from('lms_media')
      .insert({
        uploaded_by: user.id,
        media_type: 'video',
        original_filename: file?.name || `${videoId}.mp4`,
        storage_bucket: 'cloudflare_stream',
        storage_path: `stream/${videoId}`,
        mime_type: file?.type || 'video/mp4',
        file_size_bytes: file?.size || null,
        duration_seconds: duration,
        title: file?.name || 'Cloudflare Stream Video',
        description: null,
        provider: 'cloudflare_stream',
        provider_video_id: videoId,
        provider_status: status,
        playback_url: playbackUrl,
        thumbnail_url: thumbnailUrl,
        metadata: {
          cloudflare_customer_code: customerCode || null,
          ready_to_stream: videoDetails?.readyToStream ?? null
        }
      })
      .select('*')
      .single();

    if (error) throw error;

    return data;
  }

  async function uploadMedia(file, blockType) {
    if (!file) return null;

    if (blockType === 'video') {
      const upload = await uploadVideoToCloudflare(file);

      let details = null;

      try {
        details = await getCloudflareVideoDetails(upload.uid);
      } catch (error) {
        console.warn(
          'Video was uploaded, but details are not ready yet.',
          error
        );
      }

      return await saveCloudflareMediaRecord(
        file,
        upload.uid,
        details
      );
    }

    const bucket = 'lms-media';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const path = `lessons/${lessonId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await db()
      .storage
      .from(bucket)
      .upload(path, file, {
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
        uploaded_by: (await db().auth.getUser()).data?.user?.id || null,
        media_type: mediaType,
        original_filename: file.name,
        storage_bucket: bucket,
        storage_path: path,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        title: file.name
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

            if ($('embedHeight')) {
              payload.settings.height =
                Number($('embedHeight').value || 350);
            }

            if ($('blockSettings')) {
              try {
                payload.settings =
                  JSON.parse($('blockSettings').value || '{}');
              } catch {
                toast('Configuration JSON is invalid.', 'error');
                return;
              }
            }

            if ($('assessmentId')) {
              payload.settings.assessment_id =
                $('assessmentId').value.trim() || null;
            }

            // Cloudflare Stream videos use the Video UID in settings,
            // never as external_url. This prevents the browser from
            // treating the UID as a localhost URL.
            if (type === 'video') {
              const pastedVideoId =
                $('cloudflareVideoId')?.value.trim() || '';

              const file = $('blockFile')?.files?.[0];

              let videoId = pastedVideoId;
              let media = null;

              if (file) {
                media = await uploadMedia(file, 'video');
                videoId = media.provider_video_id;
              }

              if (!videoId) {
                toast(
                  'Enter a Cloudflare Video ID or choose a video file to upload.',
                  'error'
                );
                return;
              }

              payload.media_id = media?.id || block?.media_id || null;
              payload.external_url = null;
              payload.settings.cloudflare_video_id = videoId;
              payload.settings.provider = 'cloudflare_stream';

            } else {
              const file = $('blockFile')?.files?.[0];

              if (file) {
                const media = await uploadMedia(file, type);
                payload.media_id = media.id;
                payload.external_url = media.storage_path;
              } else if (isEdit && block.media_id) {
                payload.media_id = block.media_id;
              }
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