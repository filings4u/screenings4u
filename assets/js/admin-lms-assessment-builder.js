/* screenings4u LMS v1 — Assessment Builder */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const lessonId = params.get('lesson');
  const assessmentId = params.get('assessment');
  const blockId = params.get('block');

  const state = {
    assessment: null,
    questions: [],
    lessonId
  };

  const $ = id => document.getElementById(id);

  function db() {
    const client =
      window.Screenings4uAdmin?.supabase ||
      window.supabaseClient;

    if (!client || typeof client.from !== 'function') {
      throw new Error(
        'Shared Supabase client was not found. Check admin-config.js.'
      );
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
    const el = $('assessmentToast');

    el.textContent = message;
    el.className = `admin-toast ${type} visible`;

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      el.classList.remove('visible');
    }, 3500);
  }

  function openModal(title, body, actions = [], eyebrow = 'ASSESSMENT') {
    $('assessmentModalEyebrow').textContent = eyebrow;
    $('assessmentModalTitle').textContent = title;
    $('assessmentModalBody').innerHTML = body;
    $('assessmentModalActions').innerHTML = '';

    actions.forEach(action => {
      const button = document.createElement('button');

      button.type = 'button';
      button.className = action.className || 'secondary-button';
      button.textContent = action.label;

      button.addEventListener('click', async () => {
        await action.handler();
      });

      $('assessmentModalActions').appendChild(button);
    });

    $('assessmentModal').classList.add('open');
    $('assessmentModal').setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    $('assessmentModal').classList.remove('open');
    $('assessmentModal').setAttribute('aria-hidden', 'true');
  }

  async function loadLessonContext() {
    if (!lessonId) {
      throw new Error('No lesson ID was provided.');
    }

    const { data, error } = await db()
      .from('lms_lessons')
      .select('id, title, lms_sections(id, title, course_id, lms_courses(id, title))')
      .eq('id', lessonId)
      .single();

    if (error) throw error;

    $('assessmentPageDescription').textContent =
      `${data.lms_sections?.lms_courses?.title || 'Course'} · ${data.lms_sections?.title || 'Section'} · ${data.title || 'Lesson'}`;

    $('backToLesson').href =
      `admin-lms-lesson-builder.html?lesson=${encodeURIComponent(lessonId)}`;
  }

  async function loadAssessment() {
    let query = db()
      .from('lms_assessments')
      .select('*');

    if (assessmentId) {
      query = query.eq('id', assessmentId).single();
    } else {
      query = query
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    }

    const { data, error } = await query;

    if (error) throw error;

    state.assessment = data || null;

    if (!state.assessment) {
      initializeNewAssessment();
      return;
    }

    fillAssessmentForm();
    await loadQuestions();
  }

  function initializeNewAssessment() {
    state.assessment = {
      id: null,
      lesson_id: lessonId,
      title: 'New Assessment',
      description: '',
      assessment_type: 'quiz',
      passing_score: 80,
      max_attempts: 0,
      time_limit_minutes: 0,
      status: 'draft',
      randomize_questions: false,
      randomize_options: false,
      show_correct_answers: true,
      require_pass: true
    };

    fillAssessmentForm();

    state.questions = [];
    renderQuestions();
  }

  function fillAssessmentForm() {
    const a = state.assessment;

    $('assessmentTitle').value = a.title || '';
    $('assessmentDescription').value = a.description || '';
    $('assessmentType').value = a.assessment_type || 'quiz';
    $('passingScore').value = a.passing_score ?? 80;
    $('maxAttempts').value = a.max_attempts ?? 0;
    $('timeLimitMinutes').value = a.time_limit_minutes ?? 0;
    $('assessmentStatus').value = a.status || 'draft';

    $('randomizeQuestions').checked = a.randomize_questions === true;
    $('randomizeOptions').checked = a.randomize_options === true;
    $('showCorrectAnswers').checked = a.show_correct_answers !== false;
    $('requirePass').checked = a.require_pass !== false;

    updateStatusBadge();
    updateSummary();
  }

  async function loadQuestions() {
    if (!state.assessment?.id) {
      state.questions = [];
      renderQuestions();
      return;
    }

    const { data, error } = await db()
      .from('lms_assessment_questions')
      .select(`
        *,
        lms_assessment_options(*)
      `)
      .eq('assessment_id', state.assessment.id)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    state.questions = (data || []).map(question => ({
      ...question,
      options: [...(question.lms_assessment_options || [])]
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    }));

    renderQuestions();
  }

  function updateStatusBadge() {
    const status = $('assessmentStatus').value || 'draft';

    const badge = $('assessmentStatusBadge');

    badge.textContent = status;
    badge.className =
      `training-assessment-status training-assessment-status-${esc(status)}`;
  }

  function updateSummary() {
    const passing = Number($('passingScore').value || 0);
    const attempts = Number($('maxAttempts').value || 0);
    const time = Number($('timeLimitMinutes').value || 0);
    const total = state.questions.reduce(
      (sum, question) => sum + Number(question.points || 0),
      0
    );

    $('questionCount').textContent = state.questions.length;
    $('totalPoints').textContent = total;
    $('summaryPassingScore').textContent = `${passing}%`;
    $('summaryAttempts').textContent = attempts > 0 ? attempts : 'Unlimited';

    $('ruleQuestions').textContent = state.questions.length;
    $('rulePass').textContent = $('requirePass').checked ? 'Yes' : 'No';
    $('ruleTime').textContent = time > 0 ? `${time} min` : 'None';
  }

  function renderQuestions() {
    const container = $('questionsList');

    if (!state.questions.length) {
      container.innerHTML =
        '<div class="empty-state">No questions yet. Add the first question.</div>';
    } else {
      container.innerHTML = state.questions.map(question => {
        const options = question.options || [];

        return `
          <article class="question-card" data-question-id="${esc(question.id)}">

            <div class="question-card-header">

              <div class="question-heading">
                <div class="question-number">
                  Question ${esc(question.sort_order)}
                </div>

                <div class="question-title">
                  ${esc(question.question_text || 'Untitled question')}
                </div>
              </div>

              <div class="question-actions">
                <button class="secondary-button move-question-up" type="button">↑</button>
                <button class="secondary-button move-question-down" type="button">↓</button>
                <button class="secondary-button edit-question" type="button">Edit</button>
                <button class="secondary-button delete-question" type="button">Delete</button>
              </div>

            </div>

            <div class="question-card-body">

              <div class="question-preview">
                ${esc(question.explanation || '')}
              </div>

              <div class="option-preview-list">
                ${options.map((option, index) => `
                  <div class="option-preview ${option.is_correct ? 'correct' : ''}">
                    <span class="option-marker">${String.fromCharCode(65 + index)}</span>
                    <span>${esc(option.option_text)}</span>
                  </div>
                `).join('')}
              </div>

              <div class="question-meta">
                <span>${esc(question.points || 1)} point${Number(question.points || 1) === 1 ? '' : 's'}</span>
                <span>${options.length} option${options.length === 1 ? '' : 's'}</span>
                ${question.is_required !== false ? '<span>Required</span>' : '<span>Optional</span>'}
              </div>

            </div>
          </article>
        `;
      }).join('');
    }

    container.querySelectorAll('.question-card').forEach(card => {
      const question = state.questions.find(
        item => item.id === card.dataset.questionId
      );

      card.querySelector('.edit-question')?.addEventListener(
        'click',
        () => openQuestionEditor(question)
      );

      card.querySelector('.delete-question')?.addEventListener(
        'click',
        () => confirmDeleteQuestion(question)
      );

      card.querySelector('.move-question-up')?.addEventListener(
        'click',
        () => moveQuestion(question, -1)
      );

      card.querySelector('.move-question-down')?.addEventListener(
        'click',
        () => moveQuestion(question, 1)
      );
    });

    updateSummary();
  }

  function questionForm(question = {}) {
    const options = question.options?.length
      ? question.options
      : [
          { option_text:'', is_correct:true },
          { option_text:'', is_correct:false },
          { option_text:'', is_correct:false },
          { option_text:'', is_correct:false }
        ];

    return `
      <div class="assessment-modal-form">

        <label>
          Question
          <textarea id="questionText" rows="5" maxlength="1000">${esc(question.question_text || '')}</textarea>
        </label>

        <label>
          Explanation
          <textarea id="questionExplanation" rows="4" maxlength="2000">${esc(question.explanation || '')}</textarea>
          <small>Shown after completion when answer explanations are enabled.</small>
        </label>

        <div class="form-grid">

          <label>
            Points
            <input id="questionPoints" type="number" min="0.01" step="0.01" value="${Number(question.points || 1)}">
          </label>

          <label>
            Question Type
            <select id="questionType">
              <option value="multiple_choice" ${question.question_type === 'multiple_choice' ? 'selected' : ''}>Multiple Choice</option>
              <option value="true_false" ${question.question_type === 'true_false' ? 'selected' : ''}>True / False</option>
            </select>
          </label>

        </div>

        <label class="block-check">
          <input id="questionRequired" type="checkbox" ${question.is_required !== false ? 'checked' : ''}>
          Required question
        </label>

        <div>
          <strong>Answer Choices</strong>
          <small style="display:block;margin-top:4px;">
            Select exactly one correct answer for this question.
          </small>
        </div>

        <div id="optionEditor" class="option-editor">
          ${options.map((option, index) => `
            <div class="option-editor-row" data-option-index="${index}">
              <input
                class="option-correct"
                type="radio"
                name="correctOption"
                value="${index}"
                ${option.is_correct ? 'checked' : ''}
              >
              <input
                class="option-text"
                type="text"
                maxlength="500"
                placeholder="Answer choice ${index + 1}"
                value="${esc(option.option_text || '')}"
              >
              <button class="option-delete" type="button" title="Remove answer">×</button>
            </div>
          `).join('')}
        </div>

        <button id="addOptionButton" class="secondary-button add-option-button" type="button">
          + Add Answer Choice
        </button>

      </div>
    `;
  }

  function bindOptionEditor() {
    $('addOptionButton')?.addEventListener('click', () => {
      const editor = $('optionEditor');
      const index = editor.children.length;

      const row = document.createElement('div');
      row.className = 'option-editor-row';
      row.dataset.optionIndex = index;

      row.innerHTML = `
        <input
          class="option-correct"
          type="radio"
          name="correctOption"
          value="${index}"
        >
        <input
          class="option-text"
          type="text"
          maxlength="500"
          placeholder="Answer choice ${index + 1}"
        >
        <button class="option-delete" type="button" title="Remove answer">×</button>
      `;

      editor.appendChild(row);
      bindOptionRows();
    });

    bindOptionRows();
  }

  function bindOptionRows() {
    document.querySelectorAll('#optionEditor .option-delete').forEach(button => {
      button.onclick = () => {
        const editor = $('optionEditor');

        if (editor.children.length <= 2) {
          toast('A question must have at least two answer choices.', 'error');
          return;
        }

        button.closest('.option-editor-row').remove();

        [...editor.children].forEach((row, index) => {
          row.dataset.optionIndex = index;

          const radio = row.querySelector('.option-correct');
          radio.value = index;
        });
      };
    });
  }

  async function saveAssessment() {
    const saveButton = $('saveAssessmentButton');
    const originalSaveLabel = saveButton?.textContent || 'Save Assessment';

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Saving…';
    }

    const title = $('assessmentTitle').value.trim();

    if (!title) {
      toast('Assessment title is required.', 'error');
      return;
    }

    if (!lessonId) {
      toast('This assessment is not attached to a lesson.', 'error');
      return;
    }

    const payload = {
      lesson_id: lessonId,
      title,
      description: $('assessmentDescription').value.trim() || null,
      assessment_type: $('assessmentType').value,
      passing_score: Number($('passingScore').value || 0),
      max_attempts: Number($('maxAttempts').value || 0),
      time_limit_minutes: Number($('timeLimitMinutes').value || 0),
      status: $('assessmentStatus').value,
      randomize_questions: $('randomizeQuestions').checked,
      randomize_options: $('randomizeOptions').checked,
      show_correct_answers: $('showCorrectAnswers').checked,
      require_pass: $('requirePass').checked
    };

    try {
      let result;

      if (state.assessment?.id) {
        result = await db()
          .from('lms_assessments')
          .update(payload)
          .eq('id', state.assessment.id)
          .select('*')
          .single();
      } else {
        result = await db()
          .from('lms_assessments')
          .insert(payload)
          .select('*')
          .single();
      }

      if (result.error) throw result.error;

      state.assessment = result.data;

      if (blockId) {
        const { data: block, error: blockLoadError } = await db()
          .from('lms_content_blocks')
          .select('id, settings')
          .eq('id', blockId)
          .eq('lesson_id', lessonId)
          .single();

        if (blockLoadError) throw blockLoadError;

        const nextSettings = {
          ...(block.settings || {}),
          assessment_id: state.assessment.id
        };

        const { error: blockUpdateError } = await db()
          .from('lms_content_blocks')
          .update({ settings: nextSettings })
          .eq('id', blockId)
          .eq('lesson_id', lessonId);

        if (blockUpdateError) throw blockUpdateError;
      }

      history.replaceState(
        null,
        '',
        `admin-lms-assessment-builder.html?lesson=${encodeURIComponent(lessonId)}&assessment=${encodeURIComponent(state.assessment.id)}${blockId ? `&block=${encodeURIComponent(blockId)}` : ''}`
      );

      updateStatusBadge();
      toast(blockId ? 'Assessment saved and linked to the lesson block.' : 'Assessment saved.');
      await loadQuestions();

    } catch (error) {
      console.error(error);
      toast(error.message || 'Unable to save assessment.', 'error');
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = originalSaveLabel;
      }
    }
  }

  async function saveQuestion(question = null) {
    const questionText = $('questionText').value.trim();

    if (!questionText) {
      toast('Question text is required.', 'error');
      return;
    }

    const rows = [...document.querySelectorAll('#optionEditor .option-editor-row')];

    const options = rows.map((row, index) => ({
      option_text: row.querySelector('.option-text').value.trim(),
      is_correct: row.querySelector('.option-correct').checked,
      sort_order: index + 1
    }));

    if (options.length < 2) {
      toast('Add at least two answer choices.', 'error');
      return;
    }

    if (options.some(option => !option.option_text)) {
      toast('Every answer choice needs text.', 'error');
      return;
    }

    if (options.filter(option => option.is_correct).length !== 1) {
      toast('Select exactly one correct answer.', 'error');
      return;
    }

    if (!state.assessment?.id) {
      toast('Save the assessment before adding questions.', 'error');
      return;
    }

    const questionPayload = {
      assessment_id: state.assessment.id,
      question_text: questionText,
      explanation: $('questionExplanation').value.trim() || null,
      question_type: $('questionType').value,
      points: Number($('questionPoints').value || 1),
      sort_order: question?.sort_order || state.questions.length + 1,
      is_required: $('questionRequired').checked
    };

    try {
      let savedQuestion;

      if (question?.id) {
        const result = await db()
          .from('lms_assessment_questions')
          .update(questionPayload)
          .eq('id', question.id)
          .select('*')
          .single();

        if (result.error) throw result.error;
        savedQuestion = result.data;

        const { error: deleteOptionsError } = await db()
          .from('lms_assessment_options')
          .delete()
          .eq('question_id', question.id);

        if (deleteOptionsError) throw deleteOptionsError;
      } else {
        const result = await db()
          .from('lms_assessment_questions')
          .insert(questionPayload)
          .select('*')
          .single();

        if (result.error) throw result.error;
        savedQuestion = result.data;
      }

      const optionPayload = options.map(option => ({
        question_id: savedQuestion.id,
        option_text: option.option_text,
        is_correct: option.is_correct,
        sort_order: option.sort_order
      }));

      const optionResult = await db()
        .from('lms_assessment_options')
        .insert(optionPayload);

      if (optionResult.error) throw optionResult.error;

      closeModal();
      await loadQuestions();

      toast(question?.id ? 'Question updated.' : 'Question added.');

    } catch (error) {
      console.error(error);
      toast(error.message || 'Unable to save question.', 'error');
    }
  }

  function openQuestionEditor(question = null) {
    openModal(
      question ? 'Edit Question' : 'Add Question',
      questionForm(question || {}),
      [
        {
          label:'Cancel',
          className:'secondary-button',
          handler:closeModal
        },
        {
          label:question ? 'Save Question' : 'Add Question',
          className:'primary-button',
          handler:() => saveQuestion(question)
        }
      ],
      'QUESTION BUILDER'
    );

    bindOptionEditor();
  }

  function confirmDeleteQuestion(question) {
    openModal(
      'Delete Question?',
      `
        <p>Delete this question and all of its answer choices?</p>
        <p><strong>${esc(question.question_text)}</strong></p>
        <p>This does not delete historical student attempts.</p>
      `,
      [
        {
          label:'Cancel',
          className:'secondary-button',
          handler:closeModal
        },
        {
          label:'Delete Question',
          className:'primary-button',
          handler:async () => {
            try {
              const { error } = await db()
                .from('lms_assessment_questions')
                .delete()
                .eq('id', question.id);

              if (error) throw error;

              closeModal();
              await loadQuestions();
              toast('Question deleted.');
            } catch (error) {
              toast(error.message || 'Unable to delete question.', 'error');
            }
          }
        }
      ],
      'DANGER ZONE'
    );
  }

  async function moveQuestion(question, direction) {
    const index = state.questions.findIndex(item => item.id === question.id);
    const target = index + direction;

    if (
      index < 0 ||
      target < 0 ||
      target >= state.questions.length
    ) {
      return;
    }

    const other = state.questions[target];

    try {
      const firstOrder = question.sort_order;
      const secondOrder = other.sort_order;

      let result = await db()
        .from('lms_assessment_questions')
        .update({ sort_order: -999999 })
        .eq('id', question.id);

      if (result.error) throw result.error;

      result = await db()
        .from('lms_assessment_questions')
        .update({ sort_order: firstOrder })
        .eq('id', other.id);

      if (result.error) throw result.error;

      result = await db()
        .from('lms_assessment_questions')
        .update({ sort_order: secondOrder })
        .eq('id', question.id);

      if (result.error) throw result.error;

      await loadQuestions();

    } catch (error) {
      toast(error.message || 'Unable to reorder question.', 'error');
    }
  }

  function bindEvents() {
    $('saveAssessmentButton').addEventListener('click', saveAssessment);
    $('addQuestionButton').addEventListener('click', () => {
      if (!state.assessment?.id) {
        toast('Save the assessment first.', 'error');
        return;
      }

      openQuestionEditor();
    });

    $('assessmentStatus').addEventListener('change', updateStatusBadge);

    [
      'passingScore',
      'maxAttempts',
      'timeLimitMinutes',
      'requirePass'
    ].forEach(id => {
      $(id).addEventListener('input', updateSummary);
      $(id).addEventListener('change', updateSummary);
    });

    $('assessmentModalClose').addEventListener('click', closeModal);

    document
      .querySelectorAll('[data-modal-close]')
      .forEach(element => {
        element.addEventListener('click', closeModal);
      });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeModal();
    });
  }

  async function enforceAdminGuard() {
    const client = db();

    const { data, error } = await client.auth.getSession();

    if (
      error ||
      !data?.session?.user
    ) {
      location.href = 'admin-login.html';
      return false;
    }

    const user = data.session.user;

    const { data: adminProfile, error: profileError } = await client
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Assessment admin authorization error:', profileError);
      toast(profileError.message || 'Unable to verify administrator access.', 'error');
      return false;
    }

    if (!adminProfile || adminProfile.is_active !== true) {
      await client.auth.signOut();
      location.href = 'admin-login.html';
      return false;
    }

    window.screenings4uAdminProfile = adminProfile;
    window.screenings4uAdminRole =
      String(adminProfile.admin_level || 'admin').toLowerCase() === 'superadmin'
        ? 'superadmin'
        : 'admin';

    return true;
  }

  async function init() {
    bindEvents();

    try {
      if (!(await enforceAdminGuard())) return;

      await loadLessonContext();
      await loadAssessment();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Unable to load assessment builder.', 'error');
    }
  }

  init();
})();