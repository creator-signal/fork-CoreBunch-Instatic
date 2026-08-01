/**
 * Progressive Save Draft + wizard runtime. The ordinary CMS form runtime
 * remains independent; this script is emitted only for a form whose author
 * selected session or persistent recovery.
 */
export const FORM_DRAFT_RUNTIME_JS = `(() => {
  if (window.__instaticFormDraftRuntimeLoaded) return;
  window.__instaticFormDraftRuntimeLoaded = true;

  const FORM_SELECTOR = 'form[data-instatic-form-mode="cms"][data-instatic-draft-mode]';
  const timers = new WeakMap();
  for (const form of document.querySelectorAll(FORM_SELECTOR)) attach(form);

  const onFocus = (event) => {
    const form = closestForm(event.target);
    if (form) attach(form);
  };
  const onInput = (event) => {
    const form = closestForm(event.target);
    if (!form) return;
    attach(form);
    if (form.getAttribute('data-instatic-draft-mode') !== 'session') return;
    clearTimeout(timers.get(form));
    timers.set(form, setTimeout(() => saveSession(form), 250));
  };
  const onClick = (event) => {
    const action = event.target && event.target.closest
      ? event.target.closest('[data-instatic-draft-action]')
      : null;
    const form = action ? action.closest(FORM_SELECTOR) : null;
    if (!action || !form) return;
    event.preventDefault();
    attach(form);
    const kind = action.getAttribute('data-instatic-draft-action');
    if (kind === 'save-draft') savePersistent(form, action);
    if (kind === 'delete-draft') deletePersistent(form, action);
    if (kind === 'next-step') moveStep(form, 1);
    if (kind === 'previous-step') moveStep(form, -1);
  };
  document.addEventListener('focusin', onFocus);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);
  document.addEventListener('click', onClick);

  window.__instaticFormDraftRuntimeCleanup = () => {
    document.removeEventListener('focusin', onFocus);
    document.removeEventListener('input', onInput);
    document.removeEventListener('change', onInput);
    document.removeEventListener('click', onClick);
    delete window.__instaticFormDraftRuntimeLoaded;
    delete window.__instaticFormDraftRuntimeCleanup;
  };

  function closestForm(target) {
    return target && target.closest ? target.closest(FORM_SELECTOR) : null;
  }

  function attach(form) {
    if (form.__instaticDraftAttached) return;
    form.__instaticDraftAttached = true;
    form.__instaticDraft = { id: '', token: '', revision: 0 };
    initWizard(form);
    if (form.getAttribute('data-instatic-draft-mode') === 'session') {
      loadSession(form);
    } else {
      loadPersistent(form);
    }
  }

  function storageKey(form) {
    return 'instatic:form-draft:v1:' + window.location.origin + ':'
      + (form.getAttribute('data-instatic-page-id') || '') + ':'
      + (form.getAttribute('data-instatic-form-id') || '');
  }

  function context(form) {
    return {
      pageId: form.getAttribute('data-instatic-page-id') || '',
      formId: form.getAttribute('data-instatic-form-id') || '',
      pageToken: form.getAttribute('data-instatic-page-token') || '',
    };
  }

  function saveSession(form) {
    const record = {
      version: 1,
      values: collectValues(form, true),
      wizard: wizardState(form),
      savedAt: new Date().toISOString(),
    };
    try {
      window.sessionStorage.setItem(storageKey(form), JSON.stringify(record));
      announce(form, 'Progress saved for this browser session.');
    } catch (_err) {
      announce(form, 'Session draft could not be saved.');
    }
  }

  function loadSession(form) {
    try {
      const raw = window.sessionStorage.getItem(storageKey(form));
      if (!raw) return;
      const record = JSON.parse(raw);
      if (!record || record.version !== 1) return;
      applyValues(form, record.values || {});
      applyWizard(form, record.wizard || {});
      announce(form, 'Session progress restored.');
    } catch (_err) {
      announce(form, 'Session progress could not be restored.');
    }
  }

  async function loadPersistent(form) {
    const stored = readRecovery(form);
    if (stored) form.__instaticDraft = stored;
    const payload = {
      ...context(form),
      ...(stored && stored.id ? { draftId: stored.id } : {}),
      ...(stored && stored.token ? { recoveryToken: stored.token } : {}),
    };
    if (!payload.pageId || !payload.formId || !payload.pageToken) {
      announce(form, 'Persistent recovery is unavailable on this page.');
      return;
    }
    try {
      const result = await post('/_instatic/form/draft/load', payload);
      applyDraftResult(form, result, 'Draft restored.');
    } catch (err) {
      if (err.code !== 'draft_not_found') {
        announce(form, err.message || 'Saved progress could not be restored.');
      }
    }
  }

  async function savePersistent(form, button) {
    if (window.navigator.onLine === false) {
      announce(form, 'You are offline. Progress was not saved to the server.');
      return;
    }
    setActionBusy(button, true);
    const state = form.__instaticDraft || { id: '', token: '', revision: 0 };
    try {
      const result = await post('/_instatic/form/draft/save', {
        ...context(form),
        ...(state.id ? { draftId: state.id } : {}),
        ...(state.token ? { recoveryToken: state.token } : {}),
        ...(state.revision ? { revision: state.revision } : {}),
        values: collectValues(form, false),
        wizard: wizardState(form),
      });
      applyDraftResult(form, result, 'Draft saved.');
    } catch (err) {
      if (err.code === 'draft_conflict') {
        announce(form, 'A newer draft exists. Reload it before saving; your current fields were not overwritten.');
      } else {
        announce(form, err.message || 'Draft could not be saved.');
      }
    } finally {
      setActionBusy(button, false);
    }
  }

  async function deletePersistent(form, button) {
    const state = form.__instaticDraft;
    if (!state || !state.id || !state.revision) {
      announce(form, 'There is no persistent draft to delete.');
      return;
    }
    setActionBusy(button, true);
    try {
      await post('/_instatic/form/draft/delete', {
        ...context(form),
        draftId: state.id,
        ...(state.token ? { recoveryToken: state.token } : {}),
        revision: state.revision,
      });
      window.localStorage.removeItem(storageKey(form));
      clearRecoveryHash();
      form.__instaticDraft = { id: '', token: '', revision: 0 };
      announce(form, 'Saved draft deleted.');
    } catch (err) {
      announce(form, err.code === 'draft_conflict'
        ? 'A newer draft exists. Reload it before deleting.'
        : err.message || 'Draft could not be deleted.');
    } finally {
      setActionBusy(button, false);
    }
  }

  function applyDraftResult(form, result, fallbackMessage) {
    const draft = result && result.draft;
    if (!draft) return;
    const old = form.__instaticDraft || {};
    const next = {
      id: draft.id,
      token: result.recoveryToken || old.token || '',
      revision: draft.revision,
    };
    form.__instaticDraft = next;
    writeRecovery(form, next);
    applyValues(form, draft.values || {});
    applyWizard(form, draft.wizard || {});
    const warnings = Array.isArray(draft.warnings) ? draft.warnings : [];
    const message = draft.schemaStatus === 'migrated'
      ? 'Draft restored with form changes. ' + warnings.join(' ')
      : warnings.length ? fallbackMessage + ' ' + warnings.join(' ') : fallbackMessage;
    announce(form, message);
  }

  function collectValues(form, includeSessionOnly) {
    const values = {};
    const controls = Array.from(form.querySelectorAll('[data-instatic-field-id]'));
    for (const control of controls) {
      const fieldId = control.getAttribute('data-instatic-field-id') || '';
      const behavior = control.getAttribute('data-instatic-draft-behavior') || 'include';
      if (!fieldId || behavior === 'exclude' || (!includeSessionOnly && behavior === 'session-only')) continue;
      if (control instanceof HTMLInputElement && ['password', 'file', 'hidden'].includes(control.type)) continue;
      if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
        const group = controls.filter((candidate) =>
          candidate.getAttribute('data-instatic-field-id') === fieldId
          && candidate instanceof HTMLInputElement
          && candidate.type === control.type);
        const selected = group.filter((candidate) => candidate.checked).map((candidate) => candidate.value);
        values[fieldId] = control.type === 'checkbox' && group.length === 1
          ? control.checked
          : selected;
        continue;
      }
      if (control instanceof HTMLSelectElement && control.multiple) {
        values[fieldId] = Array.from(control.selectedOptions).map((option) => option.value);
      } else if ('value' in control) {
        values[fieldId] = control.value;
      }
    }
    return values;
  }

  function applyValues(form, values) {
    for (const [fieldId, value] of Object.entries(values || {})) {
      const controls = Array.from(form.querySelectorAll('[data-instatic-field-id]'))
        .filter((control) => control.getAttribute('data-instatic-field-id') === fieldId);
      for (const control of controls) {
        if (control instanceof HTMLInputElement && ['password', 'file', 'hidden'].includes(control.type)) continue;
        if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
          control.checked = Array.isArray(value)
            ? value.map(String).includes(control.value)
            : typeof value === 'boolean' ? value : String(value) === control.value;
        } else if (control instanceof HTMLSelectElement && control.multiple) {
          const selected = Array.isArray(value) ? value.map(String) : [String(value)];
          for (const option of control.options) option.selected = selected.includes(option.value);
        } else if ('value' in control && (typeof value === 'string' || typeof value === 'number')) {
          control.value = String(value);
        }
        control.dispatchEvent(new Event('change', { bubbles: false }));
      }
    }
  }

  function initWizard(form) {
    const steps = wizardSteps(form);
    if (steps.length === 0) return;
    form.__instaticWizard = {
      stepId: steps[0].getAttribute('data-instatic-form-step') || '',
      visited: new Set(),
    };
    showStep(form, form.__instaticWizard.stepId);
  }

  function moveStep(form, direction) {
    const steps = wizardSteps(form);
    if (steps.length === 0) return;
    const current = form.__instaticWizard && form.__instaticWizard.stepId;
    const index = Math.max(0, steps.findIndex((step) =>
      step.getAttribute('data-instatic-form-step') === current));
    const next = steps[Math.max(0, Math.min(steps.length - 1, index + direction))];
    if (!next) return;
    const nextId = next.getAttribute('data-instatic-form-step') || '';
    form.__instaticWizard.visited.add(current);
    form.__instaticWizard.stepId = nextId;
    showStep(form, nextId);
    const focusTarget = next.querySelector('input, select, textarea, button, [tabindex]');
    if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
  }

  function showStep(form, stepId) {
    for (const step of wizardSteps(form)) {
      step.hidden = step.getAttribute('data-instatic-form-step') !== stepId;
    }
  }

  function wizardSteps(form) {
    return Array.from(form.querySelectorAll('[data-instatic-form-step]'));
  }

  function wizardState(form) {
    const wizard = form.__instaticWizard;
    const active = wizard && wizard.stepId ? wizard.stepId : '';
    const step = wizardSteps(form).find((candidate) =>
      candidate.getAttribute('data-instatic-form-step') === active);
    return {
      ...(active ? { stepId: active } : {}),
      visitedStepIds: wizard ? Array.from(wizard.visited) : [],
      review: !!(step && step.getAttribute('data-instatic-form-review') === 'true'),
    };
  }

  function applyWizard(form, value) {
    if (!form.__instaticWizard || !value || typeof value !== 'object') return;
    const ids = new Set(wizardSteps(form).map((step) =>
      step.getAttribute('data-instatic-form-step') || ''));
    if (typeof value.stepId === 'string' && ids.has(value.stepId)) {
      form.__instaticWizard.stepId = value.stepId;
    }
    form.__instaticWizard.visited = new Set(
      Array.isArray(value.visitedStepIds)
        ? value.visitedStepIds.filter((id) => ids.has(id))
        : [],
    );
    showStep(form, form.__instaticWizard.stepId);
  }

  function readRecovery(form) {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashId = hash.get('instatic-draft-id') || '';
    const hashToken = hash.get('instatic-draft-token') || '';
    if (hashId && hashToken) return { id: hashId, token: hashToken, revision: 0 };
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey(form)) || 'null');
      return parsed && parsed.version === 1
        ? { id: parsed.id || '', token: parsed.token || '', revision: parsed.revision || 0 }
        : null;
    } catch (_err) {
      return null;
    }
  }

  function writeRecovery(form, state) {
    try {
      window.localStorage.setItem(storageKey(form), JSON.stringify({ version: 1, ...state }));
    } catch (_err) {}
    if (!state.token) return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    hash.set('instatic-draft-id', state.id);
    hash.set('instatic-draft-token', state.token);
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search + '#' + hash.toString(),
    );
  }

  function clearRecoveryHash() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    hash.delete('instatic-draft-id');
    hash.delete('instatic-draft-token');
    const suffix = hash.toString() ? '#' + hash.toString() : '';
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search + suffix,
    );
  }

  async function post(path, payload) {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let body = {};
    try { body = await response.json(); } catch (_err) {}
    if (!response.ok) {
      const error = new Error(body && body.error ? body.error : 'Draft request failed.');
      error.code = body && body.code ? body.code : '';
      error.revision = body && body.revision ? body.revision : 0;
      throw error;
    }
    return body;
  }

  function announce(form, text) {
    let status = form.querySelector('[data-instatic-draft-status]');
    if (!status) {
      status = document.createElement('div');
      status.setAttribute('data-instatic-draft-status', '');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      form.appendChild(status);
    }
    status.textContent = text;
  }

  function setActionBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
  }
})();`
