/**
 * Consent-delayed runtime for validated provider iframe plans.
 *
 * Non-essential providers do not receive a network request until the consent
 * category is present or the visitor explicitly activates that instance.
 */
export const PROVIDER_EMBED_RUNTIME_JS = `(() => {
  if (window.__instaticProviderEmbedRuntimeLoaded) return;
  window.__instaticProviderEmbedRuntimeLoaded = true;

  const SELECTOR = '[data-instatic-provider-embed]';
  for (const host of document.querySelectorAll(SELECTOR)) attach(host);

  document.addEventListener('click', (event) => {
    const button = event.target && event.target.closest
      ? event.target.closest('[data-instatic-provider-load]')
      : null;
    if (!button) return;
    const host = button.closest(SELECTOR);
    if (!host) return;
    event.preventDefault();
    load(host);
  });

  document.addEventListener('focusin', (event) => {
    const host = event.target && event.target.closest ? event.target.closest(SELECTOR) : null;
    if (host) attach(host);
  });

  document.addEventListener('instatic:consent-changed', (event) => {
    if (event.detail && Array.isArray(event.detail.categories)) {
      window.__instaticConsentCategories = event.detail.categories;
    }
    for (const host of document.querySelectorAll(SELECTOR)) attach(host);
  });

  function attach(host) {
    if (host.getAttribute('data-instatic-provider-loaded') === 'true') return;
    const category = host.getAttribute('data-instatic-provider-consent') || 'essential';
    if (category === 'essential' || consentCategories().includes(category)) load(host);
  }

  function consentCategories() {
    return Array.isArray(window.__instaticConsentCategories)
      ? window.__instaticConsentCategories.map(String)
      : [];
  }

  function load(host) {
    if (host.getAttribute('data-instatic-provider-loaded') === 'true') return;
    const src = host.getAttribute('data-instatic-provider-src') || '';
    if (!src) return;
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = host.getAttribute('data-instatic-provider-title') || 'Provider content';
    frame.loading = 'lazy';
    frame.setAttribute('sandbox', host.getAttribute('data-instatic-provider-sandbox') || '');
    frame.referrerPolicy = host.getAttribute('data-instatic-provider-referrer') || 'no-referrer';
    const allow = host.getAttribute('data-instatic-provider-allow') || '';
    if (allow) frame.setAttribute('allow', allow);
    frame.setAttribute('allowfullscreen', '');
    const aspectRatio = host.getAttribute('data-instatic-provider-aspect') || '16 / 9';
    frame.style.aspectRatio = aspectRatio;
    host.replaceChildren(frame);
    host.setAttribute('data-instatic-provider-loaded', 'true');
  }
})();`
