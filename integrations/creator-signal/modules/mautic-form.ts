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
          <div><p class="cs-eyebrow">Contact</p><h2>${props.heading}</h2><p>${props.introduction}</p></div>
          <div data-form-mount></div>
          <p role="status" aria-live="polite" data-form-status></p>
        </section>`,
      css: '.cs-mautic{display:grid;gap:1.5rem;padding:clamp(2rem,5vw,4rem);background:#eef3ec;border-radius:1.5rem}.cs-mautic h2{font-size:clamp(2rem,4vw,3.5rem);margin:.25rem 0}.cs-mautic [data-form-mount][hidden]{display:none}',
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
