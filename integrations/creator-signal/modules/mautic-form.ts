import { control, defineModule, html, raw, safeUrl } from '@core/plugin-sdk'
import { creatorSignalRenderProfile } from '../pack/design-system'

const runtime = String.raw`(() => {
  const selector = '[data-cs-mautic-form]';
  const loaded = new Map();
  const loadScript = (src, key, parent = document.head, cache = true) => {
    if (cache && loaded.has(key)) return loaded.get(key);
    const pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('script_load_failed'));
      parent.appendChild(script);
    });
    if (cache) loaded.set(key, pending);
    return pending;
  };
  const formEntry = (alias) => {
    const registry = window.CreatorSignalMauticForms;
    if (!registry || registry.schema !== 'creator-signal.mautic-forms/v1' || !registry.forms) return null;
    const entry = registry.forms[alias];
    if (!entry || !Number.isInteger(entry.id) || entry.id < 1 ||
      !/^[a-zA-Z0-9_-]+$/.test(String(entry.apiName || '')) || entry.code !== alias) return null;
    const legacyTimestampField = entry.consentTimestampField;
    if (legacyTimestampField !== undefined && !/^[a-zA-Z0-9_-]+$/.test(String(legacyTimestampField))) return null;
    const declaredTimestampFields = entry.consentTimestampFields === undefined
      ? (legacyTimestampField ? [{ choiceField: null, timestampField: legacyTimestampField }] : [])
      : entry.consentTimestampFields;
    if (!Array.isArray(declaredTimestampFields) || !declaredTimestampFields.every((field) =>
      field && /^[a-zA-Z0-9_-]+$/.test(String(field.timestampField)) &&
      (field.choiceField === null || /^[a-zA-Z0-9_-]+$/.test(String(field.choiceField))))) return null;
    return { ...entry, consentTimestampFields: declaredTimestampFields };
  };
  const syncConsentTimestamps = (target, fields) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    fields.forEach(({ choiceField, timestampField }) => {
      const timestampInput = target.querySelector('input[name="mauticform[' + timestampField + ']"]');
      if (!timestampInput) return;
      const choices = choiceField
        ? [...target.querySelectorAll('input[name^="mauticform[' + choiceField + ']"]')]
        : [];
      const permitted = choiceField ? choices.some((choice) => choice.checked) : true;
      timestampInput.value = permitted ? (timestampInput.value || timestamp) : '';
    });
  };
  const waitForForm = (target) => {
    if (target.querySelector('form')) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        if (!target.querySelector('form')) return;
        observer.disconnect();
        clearTimeout(timeout);
        resolve();
      });
      const timeout = setTimeout(() => {
        observer.disconnect();
        reject(new Error('form_markup_missing'));
      }, 5000);
      observer.observe(target, { childList: true, subtree: true });
    });
  };
  const setBusy = (root, target, busy) => {
    const shell = root.querySelector('.cs-mautic-form-shell');
    const form = target.querySelector('form');
    [root, shell, form].filter(Boolean).forEach((element) => {
      if (busy) element.setAttribute('aria-busy', 'true');
      else element.removeAttribute('aria-busy');
    });
    target.querySelectorAll('button[type="submit"], input[type="submit"], .mauticform-button').forEach((control) => {
      if (busy && !control.disabled) {
        control.disabled = true;
        control.dataset.csBusyDisabled = 'true';
      } else if (!busy && control.dataset.csBusyDisabled === 'true') {
        control.disabled = false;
        delete control.dataset.csBusyDisabled;
      }
    });
  };
  const dispatch = (root, result, safeErrorCode) => {
    document.dispatchEvent(new CustomEvent('creator-signal:form-result', {
      detail: {
        result,
        page_code: location.pathname === '/' ? 'creator_signal_home' : location.pathname.slice(1).replace(/[^a-z0-9]+/g, '_'),
        form_code: root.dataset.formCode || 'creator_signal_contact',
        campaign_code: root.dataset.campaignCode || undefined,
        safe_error_code: safeErrorCode || undefined,
      },
    }));
  };
  const mount = async (root) => {
    if (root.dataset.mounted === 'true') return;
    root.dataset.mounted = 'true';
    const base = String(root.dataset.baseUrl || '').replace(/\/+$/, '');
    const alias = String(root.dataset.formAlias || '');
    const registryPath = String(root.dataset.registryPath || '');
    const status = root.querySelector('[data-form-status]');
    const target = root.querySelector('[data-form-mount]');
    if (!/^https:\/\//.test(base) || !/^[a-zA-Z0-9_-]+$/.test(alias) ||
      !/^\/[a-zA-Z0-9_./-]+\.js$/.test(registryPath) || registryPath.includes('..') || !target) {
      if (status) status.textContent = 'This form is not configured yet.';
      dispatch(root, 'failure', 'invalid_configuration');
      return;
    }
    try {
      if (status) status.textContent = 'Loading form…';
      await loadScript(base + registryPath, 'mautic-registry:' + base + ':' + registryPath);
    } catch {
      if (status) status.textContent = 'The form is temporarily unavailable.';
      dispatch(root, 'failure', 'registry_load_failed');
      return;
    }
    const entry = formEntry(alias);
    if (!entry) {
      if (status) status.textContent = 'The form is temporarily unavailable.';
      dispatch(root, 'failure', 'registry_invalid');
      return;
    }
    const formId = String(entry.id);
    const apiName = String(entry.apiName);
    window.MauticFormCallback = window.MauticFormCallback || {};
    window.MauticFormCallback[apiName] = {
      onResponse(response) {
        const success = response && (response.success === true || response.success === 1 || response.success === '1');
        setBusy(root, target, false);
        if (success) {
          target.hidden = true;
          if (status) status.textContent = root.dataset.successMessage || 'Thanks — your message has been received.';
          dispatch(root, 'success');
        } else {
          if (status) status.textContent = 'The form could not be sent. Please try again.';
          dispatch(root, 'failure', 'mautic_response_failed');
        }
        return true;
      },
    };
    try {
      await loadScript(base + '/media/js/mautic-form.js', 'mautic-runtime:' + base);
      window.MauticSDKLoaded = true;
      await loadScript(
        base + '/form/generate.js?id=' + encodeURIComponent(formId),
        'mautic-form:' + base + ':' + formId,
        target,
        false,
      );
      await waitForForm(target);
      const form = target.querySelector('form');
      if (form && form.dataset.csSubmitBound !== 'true') {
        form.dataset.csSubmitBound = 'true';
        form.addEventListener('change', () => syncConsentTimestamps(target, entry.consentTimestampFields));
        form.addEventListener('submit', () => {
          syncConsentTimestamps(target, entry.consentTimestampFields);
          if (!form.checkValidity()) return;
          setBusy(root, target, true);
          if (status) status.textContent = 'Sending...';
        });
      }
      syncConsentTimestamps(target, entry.consentTimestampFields);
      if (status) status.textContent = '';
    } catch (error) {
      setBusy(root, target, false);
      if (status) status.textContent = 'The form is temporarily unavailable.';
      dispatch(root, 'failure', error instanceof Error && error.message === 'form_markup_missing'
        ? 'form_markup_missing'
        : 'form_script_load_failed');
    }
  };
  const scan = () => document.querySelectorAll(selector).forEach(mount);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', scan, { once: true }) : scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();`

const formCss = String.raw`
.cs-mautic {
  display: grid;
  grid-template-columns: minmax(0, .8fr) minmax(320px, 1.2fr);
  align-items: start;
  gap: 72px;
}
.cs-mautic-copy {
  max-width: 32rem;
  padding-top: 12px;
}
.cs-mautic-copy h2 {
  margin: 0;
  font-family: var(--cs-site-font-heading);
  font-size: 4rem;
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -.035em;
}
.cs-mautic-copy > p:last-child {
  color: var(--cs-muted);
  font-size: 1.08rem;
  line-height: 1.7;
}
.cs-eyebrow {
  margin: 0 0 12px;
  color: var(--cs-sage);
  font-size: .76rem;
  font-weight: 750;
  letter-spacing: .13em;
  text-transform: uppercase;
}
.cs-mautic-form-shell {
  min-width: 0;
  min-height: 240px;
  padding: 40px;
  border: 1px solid var(--cs-line);
  border-radius: 24px;
  background: var(--cs-card);
  color: var(--cs-ink);
  box-shadow: var(--cs-shadow);
}
.cs-mautic [data-form-mount][hidden] { display: none; }
.cs-mautic-form-shell[aria-busy="true"] :is(button[type="submit"], input[type="submit"], .mauticform-button) {
  cursor: wait;
  opacity: .72;
}
.cs-mautic [data-form-mount] form { display: grid; gap: 18px; }
.cs-mautic .mauticform-row { margin: 0; }
.cs-mautic fieldset.mauticform-row {
  min-width: 0;
  padding: 0;
  border: 0;
}
.cs-mautic label, .cs-mautic .mauticform-label {
  display: block;
  margin: 0 0 7px;
  color: var(--cs-ink);
  font-size: .92rem;
  font-weight: 700;
  line-height: 1.35;
}
.cs-mautic fieldset.mauticform-row legend {
  margin: 0 0 7px;
  color: var(--cs-ink);
  font-size: .92rem;
  font-weight: 700;
  line-height: 1.35;
}
.cs-mautic fieldset.mauticform-row label {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 8px;
}
.cs-mautic input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]),
.cs-mautic textarea,
.cs-mautic select {
  display: block;
  width: 100%;
  min-height: 48px;
  padding: 11px 14px;
  border: 1px solid var(--cs-line);
  border-radius: 11px;
  background: var(--cs-card);
  color: var(--cs-ink);
  font: inherit;
  line-height: 1.4;
  transition: border-color .16s ease, box-shadow .16s ease;
}
.cs-mautic textarea { min-height: 140px; resize: vertical; }
.cs-mautic input[type="checkbox"], .cs-mautic input[type="radio"] {
  width: auto;
  min-height: 0;
  margin-inline-end: 8px;
  accent-color: var(--cs-sage);
}
.cs-mautic .mauticform-checkboxgrp-row,
.cs-mautic .mauticform-radiogrp-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 8px;
}
.cs-mautic .mauticform-errormsg {
  display: block;
  margin-top: 6px;
  color: #9b443c;
  font-size: .84rem;
  font-weight: 650;
}
.cs-mautic .mauticform-errormsg[hidden] { display: none; }
.cs-mautic .mauticform-helpmessage {
  display: block;
  margin: 0 0 7px;
  color: var(--cs-muted);
  font-size: .84rem;
}
.cs-mautic button[type="submit"],
.cs-mautic input[type="submit"],
.cs-mautic .mauticform-button {
  display: inline-flex;
  width: auto;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  padding: 0 22px;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  background: var(--cs-sage);
  color: var(--cs-card);
  font: inherit;
  font-weight: 700;
  box-shadow: var(--cs-site-shadow-action);
  transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
}
.cs-mautic button[type="submit"]:hover,
.cs-mautic input[type="submit"]:hover,
.cs-mautic .mauticform-button:hover { transform: translateY(-1px); }
.cs-mautic :is(input, textarea, select, button):focus-visible {
  outline: 3px solid var(--cs-blue);
  outline-offset: 2px;
  border-color: var(--cs-sage);
  box-shadow: 0 0 0 4px rgba(147, 169, 179, .18);
}
.cs-mautic [data-form-status] {
  margin: 18px 0 0;
  color: var(--cs-sage);
  font-weight: 700;
}
@media (max-width: 900px) {
  .cs-mautic { grid-template-columns: 1fr; gap: 40px; }
  .cs-mautic-copy h2 { font-size: 3.2rem; }
}
@media (max-width: 560px) {
  .cs-mautic-copy h2 { font-size: 2.6rem; }
  .cs-mautic-form-shell {
    padding: 22px 18px;
    border-radius: 20px;
  }
}
`

/** One byte-identical public stylesheet shared by every site component. */
export const creatorSignalSiteCss = `${creatorSignalRenderProfile.stylesheet}\n${formCss}`

// Scalar text controls arrive HTML-escaped from the publisher. The SDK html
// tag would escape them a second time unless they are explicitly marked safe.
const escapedProp = (value: unknown) => raw(typeof value === 'string' ? value : '')

export default defineModule({
  id: 'creator-signal.site.mautic-form',
  name: 'Mautic form',
  description: 'Embeds a governed Creator Signal Mautic form and emits typed result events.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    eyebrow: 'Contact',
    heading: 'Send a message',
    introduction: 'Required fields are identified in the form.',
    successMessage: 'Thanks — your message has been received.',
    sectionId: 'managed-form',
    mauticBaseUrl: 'https://marketing.creatorsignal.me',
    formAlias: 'creator_signal_contact',
    registryPath: '/media/creator-signal/forms-v1.js',
    formCode: 'creator_signal_contact',
    campaignCode: 'contact',
  },
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Heading'),
    introduction: control.textarea('Introduction', { rows: 3 }),
    successMessage: control.textarea('Success message', { rows: 2 }),
    sectionId: control.text('Section anchor'),
    mauticBaseUrl: control.url('Mautic public URL'),
    formAlias: control.text('Governed form alias'),
    registryPath: control.text('Mautic form registry path'),
    formCode: control.text('Analytics form code'),
    campaignCode: control.text('Analytics campaign code'),
  },
  render: ({ props }) => {
    const origin = String(props.mauticBaseUrl).match(/^https:\/\/[^/]+/i)?.[0] ?? ''
    return {
      html: html`
        <section class="content-section" id="${escapedProp(props.sectionId)}">
          <section class="cs-mautic" data-cs-mautic-form
            data-base-url="${safeUrl(props.mauticBaseUrl)}"
            data-form-alias="${escapedProp(props.formAlias)}"
            data-registry-path="${escapedProp(props.registryPath)}"
            data-form-code="${escapedProp(props.formCode)}"
            data-campaign-code="${escapedProp(props.campaignCode)}"
            data-success-message="${escapedProp(props.successMessage)}">
            <div class="cs-mautic-copy"><p class="cs-eyebrow">${escapedProp(props.eyebrow)}</p><h2>${escapedProp(props.heading)}</h2><p>${escapedProp(props.introduction)}</p></div>
            <div class="cs-mautic-form-shell">
              <div data-form-mount></div>
              <p role="status" aria-live="polite" data-form-status></p>
            </div>
          </section>
        </section>`,
      css: creatorSignalSiteCss,
      js: runtime,
      ...(origin ? {
        cspSources: [
          { directive: 'script-src' as const, sources: [origin] },
          { directive: 'connect-src' as const, sources: [origin] },
          { directive: 'form-action' as const, sources: [origin] },
        ],
      } : {}),
    }
  },
})
