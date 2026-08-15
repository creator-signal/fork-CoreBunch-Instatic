import { control, defineModule, html, safeUrl } from '@core/plugin-sdk'
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
    if (entry.consentTimestampField !== undefined &&
      !/^[a-zA-Z0-9_-]+$/.test(String(entry.consentTimestampField))) return null;
    return entry;
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
      if (entry.consentTimestampField) {
        const timestamp = target.querySelector('input[name="mauticform[' + entry.consentTimestampField + ']"]');
        if (timestamp && !timestamp.value) timestamp.value = new Date().toISOString().replace('T', ' ').slice(0, 19);
      }
      if (status) status.textContent = '';
    } catch (error) {
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
  gap: var(--cs-spacing-16);
}
.cs-mautic-copy {
  max-width: 32rem;
  padding-top: var(--cs-spacing-3);
}
.cs-mautic-copy h2 {
  margin: 0;
  font-family: var(--cs-type-heading2-family);
  font-size: var(--cs-type-heading2-size);
  font-weight: var(--cs-type-heading2-weight);
  line-height: var(--cs-type-heading2-line-height);
  letter-spacing: var(--cs-type-heading2-tracking);
}
.cs-mautic-copy > p:last-child {
  color: var(--cs-text-secondary);
  font-size: var(--cs-type-body-large-size);
  line-height: var(--cs-type-body-large-line-height);
}
.cs-mautic-form-shell {
  min-width: 0;
  min-height: 240px;
  padding: var(--cs-spacing-10);
  border: 1px solid var(--cs-component-card-border);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-component-card-background);
  color: var(--cs-component-card-foreground);
  box-shadow: var(--cs-shadow-md);
}
.cs-mautic [data-form-mount][hidden] { display: none; }
.cs-mautic [data-form-mount] form { display: grid; gap: var(--cs-spacing-5); }
.cs-mautic .mauticform-row { margin: 0; }
.cs-mautic label, .cs-mautic .mauticform-label {
  display: block;
  margin: 0 0 var(--cs-spacing-2);
  color: var(--cs-component-field-foreground);
  font-size: var(--cs-type-label-size);
  font-weight: var(--cs-type-label-weight);
  line-height: var(--cs-type-label-line-height);
}
.cs-mautic input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]),
.cs-mautic textarea,
.cs-mautic select {
  display: block;
  width: 100%;
  min-height: var(--cs-size-control-min-target);
  padding: var(--cs-spacing-3) var(--cs-spacing-4);
  border: 1px solid var(--cs-component-field-border);
  border-radius: var(--cs-radius-md);
  background: var(--cs-component-field-background);
  color: var(--cs-component-field-foreground);
  font-family: var(--cs-font-family-ui);
  line-height: var(--cs-type-control-line-height);
  transition: border-color var(--cs-motion-duration-fast) var(--cs-motion-easing-standard);
}
.cs-mautic textarea { min-height: 140px; resize: vertical; }
.cs-mautic input[type="checkbox"], .cs-mautic input[type="radio"] {
  width: auto;
  min-height: 0;
  margin-inline-end: var(--cs-spacing-2);
  accent-color: var(--cs-action-primary-background);
}
.cs-mautic .mauticform-checkboxgrp-row,
.cs-mautic .mauticform-radiogrp-row {
  display: flex;
  align-items: flex-start;
  gap: var(--cs-spacing-1);
  margin-top: var(--cs-spacing-2);
}
.cs-mautic .mauticform-errormsg {
  display: block;
  margin-top: var(--cs-spacing-2);
  color: var(--cs-status-error-foreground);
  font-size: var(--cs-type-body-small-size);
  font-weight: var(--cs-type-label-weight);
}
.cs-mautic .mauticform-helpmessage {
  display: block;
  margin: 0 0 var(--cs-spacing-2);
  color: var(--cs-text-muted);
  font-size: var(--cs-type-body-small-size);
}
.cs-mautic button[type="submit"],
.cs-mautic input[type="submit"],
.cs-mautic .mauticform-button {
  display: inline-flex;
  width: auto;
  min-height: var(--cs-size-control-min-target);
  align-items: center;
  justify-content: center;
  padding: 0 var(--cs-spacing-5);
  border: 1px solid transparent;
  border-radius: var(--cs-radius-pill);
  cursor: pointer;
  background: var(--cs-component-button-primary-background);
  color: var(--cs-component-button-primary-foreground);
  font-family: var(--cs-font-family-ui);
  font-weight: var(--cs-type-control-weight);
  box-shadow: var(--cs-shadow-sm);
  transition: transform var(--cs-motion-duration-fast) var(--cs-motion-easing-standard);
}
.cs-mautic button[type="submit"]:hover,
.cs-mautic input[type="submit"]:hover,
.cs-mautic .mauticform-button:hover { transform: translateY(-1px); }
.cs-mautic :is(input, textarea, select, button):focus-visible {
  outline: 3px solid var(--cs-focus-ring);
  outline-offset: 2px;
  border-color: var(--cs-component-field-border-focus);
}
.cs-mautic [data-form-status] {
  margin: var(--cs-spacing-5) 0 0;
  color: var(--cs-status-success-foreground);
  font-weight: var(--cs-type-label-weight);
}
@media (max-width: 64rem) {
  .cs-mautic { grid-template-columns: 1fr; gap: var(--cs-spacing-10); }
}
@media (max-width: 36rem) {
  .cs-mautic-form-shell {
    padding: var(--cs-spacing-5) var(--cs-spacing-4);
    border-radius: var(--cs-radius-md);
  }
}
`

/** One byte-identical public stylesheet shared by every site component. */
export const creatorSignalSiteCss = `${creatorSignalRenderProfile.stylesheet}\n${formCss}`

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
        <section class="content-section">
          <section class="cs-mautic" data-cs-mautic-form
            data-base-url="${safeUrl(props.mauticBaseUrl)}"
            data-form-alias="${props.formAlias}"
            data-registry-path="${props.registryPath}"
            data-form-code="${props.formCode}"
            data-campaign-code="${props.campaignCode}"
            data-success-message="${props.successMessage}">
            <div class="cs-mautic-copy"><p class="cs-eyebrow">${props.eyebrow}</p><h2>${props.heading}</h2><p>${props.introduction}</p></div>
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
