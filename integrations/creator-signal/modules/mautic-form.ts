import { control, defineModule, html, safeUrl } from '@core/plugin-sdk'

const runtime = String.raw`(() => {
  const selector = '[data-cs-mautic-form]';
  const loaded = new Map();
  const loadScript = (src, key) => {
    if (loaded.has(key)) return loaded.get(key);
    const pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('script_load_failed'));
      document.head.appendChild(script);
    });
    loaded.set(key, pending);
    return pending;
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
    const formId = String(root.dataset.formId || '');
    const apiName = String(root.dataset.formApiName || '');
    const status = root.querySelector('[data-form-status]');
    const target = root.querySelector('[data-form-mount]');
    if (!/^https:\/\//.test(base) || !/^\d+$/.test(formId) || !/^[a-zA-Z0-9_-]+$/.test(apiName) || !target) {
      if (status) status.textContent = 'This form is not configured yet.';
      dispatch(root, 'failure', 'invalid_configuration');
      return;
    }
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
      if (status) status.textContent = 'Loading form…';
      await loadScript(base + '/media/js/mautic-form.js', 'mautic-runtime:' + base);
      await loadScript(base + '/form/generate.js?id=' + encodeURIComponent(formId), 'mautic-form:' + base + ':' + formId);
      if (status) status.textContent = '';
    } catch {
      if (status) status.textContent = 'The form is temporarily unavailable.';
      dispatch(root, 'failure', 'script_load_failed');
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
  font-family: Georgia, "Times New Roman", serif;
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
  background: white;
  box-shadow: var(--cs-shadow);
}
.cs-mautic [data-form-mount][hidden] { display: none; }
.cs-mautic [data-form-mount] form { display: grid; gap: 18px; }
.cs-mautic .mauticform-row { margin: 0; }
.cs-mautic label, .cs-mautic .mauticform-label {
  display: block;
  margin: 0 0 7px;
  color: var(--cs-ink);
  font-size: .92rem;
  font-weight: 700;
  line-height: 1.35;
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
  background: white;
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
  color: white;
  font: inherit;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(94, 111, 87, .18);
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

export default defineModule({
  id: 'creator-signal.site.mautic-form',
  name: 'Mautic form',
  description: 'Embeds a governed Creator Signal Mautic form and emits typed result events.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    heading: 'Send a message',
    introduction: 'Required fields are identified in the form.',
    successMessage: 'Thanks — your message has been received.',
    mauticBaseUrl: 'https://marketing.creatorsignal.me',
    formId: '3',
    formApiName: 'creatorsignalcontactenquiry',
    formCode: 'creator_signal_contact',
    campaignCode: 'contact',
  },
  schema: {
    heading: control.text('Heading'),
    introduction: control.textarea('Introduction', { rows: 3 }),
    successMessage: control.textarea('Success message', { rows: 2 }),
    mauticBaseUrl: control.url('Mautic public URL'),
    formId: control.text('Mautic form ID'),
    formApiName: control.text('Mautic API name'),
    formCode: control.text('Analytics form code'),
    campaignCode: control.text('Analytics campaign code'),
  },
  render: ({ props }) => {
    const origin = String(props.mauticBaseUrl).match(/^https:\/\/[^/]+/i)?.[0] ?? ''
    return {
      html: html`
        <section class="cs-mautic" data-cs-mautic-form
          data-base-url="${safeUrl(props.mauticBaseUrl)}"
          data-form-id="${props.formId}"
          data-form-api-name="${props.formApiName}"
          data-form-code="${props.formCode}"
          data-campaign-code="${props.campaignCode}"
          data-success-message="${props.successMessage}">
          <div class="cs-mautic-copy"><p class="cs-eyebrow">Contact</p><h2>${props.heading}</h2><p>${props.introduction}</p></div>
          <div class="cs-mautic-form-shell">
            <div data-form-mount></div>
            <p role="status" aria-live="polite" data-form-status></p>
          </div>
        </section>`,
      css: formCss,
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
