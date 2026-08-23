import { control, defineModule, html, raw, safeUrl } from '@core/plugin-sdk'
import { creatorSignalRenderProfile } from '../pack/design-system'

export const CRM_IFRAME_FORM_MESSAGE_TYPE = 'creator-signal.crm-form.resize.v1'
export const CRM_IFRAME_FORM_MIN_HEIGHT = 160
export const CRM_IFRAME_FORM_MAX_HEIGHT = 6_000
const CRM_FORM_HOST = 'marketing.creatorsignal.me'

function boundedHeight(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(CRM_IFRAME_FORM_MAX_HEIGHT, Math.max(CRM_IFRAME_FORM_MIN_HEIGHT, Math.round(parsed)))
}

type CrmIframeFormProps = {
  eyebrow: string
  heading: string
  introduction: string
  sectionId: string
  formUrl: string
  iframeTitle: string
  fallbackLabel: string
  loadingMessage: string
  unavailableMessage: string
  initialHeight: number
  minimumHeight: number
  maximumHeight: number
}

export function crmIframeFormOrigin(value: unknown): string | null {
  try {
    const url = new URL(String(value ?? ''))
    return url.protocol === 'https:' && url.hostname === CRM_FORM_HOST
      ? url.origin
      : null
  } catch {
    return null
  }
}

export function crmIframeFormHeights(props: Pick<
  CrmIframeFormProps,
  'initialHeight' | 'minimumHeight' | 'maximumHeight'
>): { initial: number; minimum: number; maximum: number } {
  const maximum = boundedHeight(props.maximumHeight, 2_400)
  const minimum = Math.min(maximum, boundedHeight(props.minimumHeight, 320))
  return {
    initial: Math.min(maximum, Math.max(minimum, boundedHeight(props.initialHeight, 640))),
    minimum,
    maximum,
  }
}

const runtime = String.raw`(() => {
  if (window.__creatorSignalCrmIframeFormRuntimeLoaded) return;
  window.__creatorSignalCrmIframeFormRuntimeLoaded = true;

  const selector = '[data-cs-crm-iframe-form]';
  const messageType = '${CRM_IFRAME_FORM_MESSAGE_TYPE}';
  const cleanups = [];
  const setStatus = (host, message) => {
    const status = host.querySelector('[data-cs-crm-form-status]');
    if (status) status.textContent = message;
  };
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Math.round(value)));
  const number = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const heightOf = (document) => Math.max(
    document.documentElement ? document.documentElement.scrollHeight : 0,
    document.body ? document.body.scrollHeight : 0,
  );
  const mount = (host) => {
    if (host.dataset.csCrmIframeMounted === 'true') return;
    const frame = host.querySelector('[data-cs-crm-form-frame]');
    const source = String(host.dataset.csCrmFormUrl || '');
    const instanceId = String(host.dataset.csCrmFormInstance || '');
    let origin = '';
    try { origin = new URL(source).origin; } catch { /* published fallback is already visible */ }
    if (!frame || !origin || !instanceId) {
      setStatus(host, host.dataset.csCrmFormUnavailable || 'This form is not configured yet.');
      return;
    }
    host.dataset.csCrmIframeMounted = 'true';
    const minimum = clamp(number(host.dataset.csCrmFormMinimum, ${CRM_IFRAME_FORM_MIN_HEIGHT}), ${CRM_IFRAME_FORM_MIN_HEIGHT}, ${CRM_IFRAME_FORM_MAX_HEIGHT});
    const maximum = clamp(number(host.dataset.csCrmFormMaximum, 2400), minimum, ${CRM_IFRAME_FORM_MAX_HEIGHT});
    const resize = (height) => {
      if (!Number.isFinite(height)) return;
      frame.style.height = clamp(height, minimum, maximum) + 'px';
      host.dataset.csCrmFormResized = 'true';
    };
    const message = (event) => {
      if (event.origin !== origin || event.source !== frame.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || Array.isArray(data) ||
        data.type !== messageType || data.instanceId !== instanceId ||
        typeof data.height !== 'number') return;
      resize(data.height);
    };
    const observeSameOrigin = () => {
      if (origin !== window.location.origin) return false;
      try {
        const childDocument = frame.contentDocument;
        if (!childDocument) return false;
        const update = () => resize(heightOf(childDocument));
        update();
        if (typeof ResizeObserver === 'function' && childDocument.documentElement) {
          const observer = new ResizeObserver(update);
          observer.observe(childDocument.documentElement);
          cleanups.push(() => observer.disconnect());
        }
        return true;
      } catch {
        return false;
      }
    };
    const loaded = () => {
      if (observeSameOrigin()) {
        setStatus(host, '');
        return;
      }
      setStatus(host, 'The form is ready. Its CRM page can send resize updates as its content changes.');
    };
    const unavailable = () => {
      setStatus(host, host.dataset.csCrmFormUnavailable || 'This form could not be displayed here.');
    };
    window.addEventListener('message', message);
    frame.addEventListener('load', loaded);
    frame.addEventListener('error', unavailable);
    cleanups.push(() => {
      window.removeEventListener('message', message);
      frame.removeEventListener('load', loaded);
      frame.removeEventListener('error', unavailable);
    });
  };
  const scan = () => document.querySelectorAll(selector).forEach(mount);
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  cleanups.push(() => observer.disconnect());
  window.__creatorSignalCrmIframeFormRuntimeCleanup = () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    delete window.__creatorSignalCrmIframeFormRuntimeLoaded;
    delete window.__creatorSignalCrmIframeFormRuntimeCleanup;
  };
})();`

const css = String.raw`
${creatorSignalRenderProfile.stylesheet}
.cs-crm-iframe-form {
  display: grid;
  grid-template-columns: minmax(0, .8fr) minmax(320px, 1.2fr);
  align-items: start;
  gap: 72px;
}
.cs-crm-iframe-form-copy { max-width: 32rem; padding-top: 12px; }
.cs-crm-iframe-form-copy h2 {
  margin: 0;
  color: var(--cs-text-primary);
  font-family: var(--cs-site-font-heading);
  font-size: 4rem;
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -.035em;
}
.cs-crm-iframe-form-copy > p:last-child { color: var(--cs-muted); font-size: 1.08rem; line-height: 1.7; }
.cs-crm-iframe-form-shell {
  min-width: 0;
  min-height: 240px;
  padding: 28px;
  border: 1px solid var(--cs-line);
  border-radius: 24px;
  background: color-mix(in srgb, var(--cs-brand-cream) 72%, white);
}
.cs-crm-iframe-form-frame { display: block; width: 100%; min-height: 10rem; border: 0; }
.cs-crm-iframe-form-status { min-height: 1.5em; margin: 14px 0 0; color: var(--cs-muted); }
.cs-crm-iframe-form-fallback { display: inline-block; margin-top: 12px; color: var(--cs-ink); font-weight: 750; }
.cs-crm-iframe-form-fallback:focus-visible { outline: 3px solid var(--cs-sage); outline-offset: 4px; }
@media (max-width: 720px) {
  .cs-crm-iframe-form { grid-template-columns: 1fr; gap: 30px; }
  .cs-crm-iframe-form-copy { max-width: none; padding-top: 0; }
  .cs-crm-iframe-form-copy h2 { font-size: 3.3rem; }
}
@media (max-width: 560px) {
  .cs-crm-iframe-form-copy h2 { font-size: 2.6rem; }
  .cs-crm-iframe-form-shell { padding: 22px 18px; border-radius: 20px; }
}
`

const escapedProp = (value: unknown) => raw(typeof value === 'string' ? value : '')

const defaultProps: CrmIframeFormProps = {
  eyebrow: 'Contact',
  heading: 'Share your details',
  introduction: 'Complete the form and we will respond through the channel you choose.',
  sectionId: 'crm-form',
  formUrl: 'https://marketing.creatorsignal.me/form/creator-signal-contact',
  iframeTitle: 'Creator Signal contact form',
  fallbackLabel: 'Open the form in a new tab',
  loadingMessage: 'Loading form…',
  unavailableMessage: 'This form could not be displayed here. Open it in a new tab.',
  initialHeight: 640,
  minimumHeight: 320,
  maximumHeight: 2_400,
}

export default defineModule({
  id: 'creator-signal.site.crm-iframe-form',
  name: 'Embedded CRM Form',
  description: 'An authorable Mautic form URL with a responsive iframe and validated seamless-resize protocol.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: defaultProps,
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Heading'),
    introduction: control.textarea('Introduction', { rows: 3 }),
    sectionId: control.text('Section anchor', { description: 'Unique identifier used to match resize messages from this CRM form.' }),
    formUrl: control.url('CRM form URL', { description: 'HTTPS Mautic form page hosted at marketing.creatorsignal.me.' }),
    iframeTitle: control.text('Accessible iframe title'),
    fallbackLabel: control.text('Fallback link label'),
    loadingMessage: control.text('Loading message'),
    unavailableMessage: control.text('Unavailable message'),
    initialHeight: control.number('Initial height', { min: CRM_IFRAME_FORM_MIN_HEIGHT, max: CRM_IFRAME_FORM_MAX_HEIGHT, step: 10, unit: 'px' }),
    minimumHeight: control.number('Minimum height', { min: CRM_IFRAME_FORM_MIN_HEIGHT, max: CRM_IFRAME_FORM_MAX_HEIGHT, step: 10, unit: 'px' }),
    maximumHeight: control.number('Maximum height', { min: CRM_IFRAME_FORM_MIN_HEIGHT, max: CRM_IFRAME_FORM_MAX_HEIGHT, step: 10, unit: 'px' }),
  },
  render: ({ props }) => {
    const origin = crmIframeFormOrigin(props.formUrl)
    if (!origin) {
      return {
        html: html`<section class="content-section"><div class="cs-crm-iframe-form-shell" role="status">${escapedProp(props.unavailableMessage)}</div></section>`,
        css,
      }
    }
    const heights = crmIframeFormHeights(props)
    const formUrl = safeUrl(props.formUrl)
    return {
      html: html`
        <section class="content-section" id="${escapedProp(props.sectionId)}">
          <section class="cs-crm-iframe-form" data-cs-crm-iframe-form
            data-cs-crm-form-url="${formUrl}"
            data-cs-crm-form-instance="${escapedProp(props.sectionId)}"
            data-cs-crm-form-minimum="${heights.minimum}"
            data-cs-crm-form-maximum="${heights.maximum}"
            data-cs-crm-form-unavailable="${escapedProp(props.unavailableMessage)}">
            <div class="cs-crm-iframe-form-copy"><p class="cs-eyebrow">${escapedProp(props.eyebrow)}</p><h2>${escapedProp(props.heading)}</h2><p>${escapedProp(props.introduction)}</p></div>
            <div class="cs-crm-iframe-form-shell">
              <iframe class="cs-crm-iframe-form-frame" data-cs-crm-form-frame src="${formUrl}" title="${escapedProp(props.iframeTitle)}" loading="eager" sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerpolicy="strict-origin-when-cross-origin" style="height:${heights.initial}px"></iframe>
              <p class="cs-crm-iframe-form-status" role="status" aria-live="polite" data-cs-crm-form-status>${escapedProp(props.loadingMessage)}</p>
              <a class="cs-crm-iframe-form-fallback" data-cs-crm-form-fallback href="${formUrl}" target="_blank" rel="noopener noreferrer">${escapedProp(props.fallbackLabel)}</a>
            </div>
          </section>
        </section>`,
      css,
      js: runtime,
      cspSources: [{ directive: 'frame-src', sources: [origin] }],
    }
  },
})
