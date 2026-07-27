/**
 * Shared progressive runtime for the governed Overlay and Carousel modules.
 *
 * Without JavaScript overlays remain native details disclosures and carousel
 * items remain visible in document order. Enhancement adds modal focus
 * containment/restoration and one-slide carousel behavior.
 */
export const INTERACTIVE_RUNTIME_JS = `(() => {
  if (window.__instaticInteractiveRuntimeLoaded) return;
  window.__instaticInteractiveRuntimeLoaded = true;

  const OVERLAY = '[data-instatic-overlay]';
  const TRIGGER = '[data-instatic-overlay-trigger]';
  const PANEL = '[data-instatic-overlay-panel]';
  const CAROUSEL = '[data-instatic-carousel]';
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const carouselTimers = new WeakMap();
  let previousBodyOverflow = '';
  let activeOverlay = null;

  for (const overlay of document.querySelectorAll(OVERLAY)) attachOverlay(overlay);
  for (const carousel of document.querySelectorAll(CAROUSEL)) attachCarousel(carousel);

  document.addEventListener('focusin', (event) => {
    if (activeOverlay && activeOverlay.open) {
      const activePanel = activeOverlay.querySelector(PANEL);
      if (activePanel && !activePanel.contains(event.target)) {
        const first = focusable(activePanel)[0] || activePanel;
        if (!first.hasAttribute('tabindex')) first.setAttribute('tabindex', '-1');
        first.focus();
        return;
      }
    }
    const overlay = closest(event.target, OVERLAY);
    const carousel = closest(event.target, CAROUSEL);
    if (overlay) attachOverlay(overlay);
    if (carousel) {
      attachCarousel(carousel);
      pauseCarousel(carousel);
    }
  });

  document.addEventListener('focusout', (event) => {
    const carousel = closest(event.target, CAROUSEL);
    if (carousel && !carousel.contains(event.relatedTarget)) startCarousel(carousel);
  });

  document.addEventListener('pointerenter', (event) => {
    const carousel = closest(event.target, CAROUSEL);
    if (carousel) pauseCarousel(carousel);
  }, true);

  document.addEventListener('pointerleave', (event) => {
    const carousel = closest(event.target, CAROUSEL);
    if (carousel) startCarousel(carousel);
  }, true);

  document.addEventListener('click', (event) => {
    const trigger = closest(event.target, TRIGGER);
    if (trigger) {
      const overlay = trigger.closest(OVERLAY);
      if (!overlay) return;
      event.preventDefault();
      attachOverlay(overlay);
      openOverlay(overlay);
      return;
    }

    const close = closest(event.target, '[data-instatic-overlay-close]');
    if (close) {
      const overlay = close.closest(OVERLAY);
      if (overlay) closeOverlay(overlay);
      return;
    }

    const overlay = closest(event.target, OVERLAY);
    if (
      overlay
      && overlay.open
      && event.target === overlay
      && overlay.getAttribute('data-instatic-overlay-dismiss-backdrop') !== 'false'
    ) {
      closeOverlay(overlay);
      return;
    }

    const control = closest(event.target, '[data-instatic-carousel-action]');
    if (control) {
      const carousel = control.closest(CAROUSEL);
      if (!carousel) return;
      attachCarousel(carousel);
      const delta = control.getAttribute('data-instatic-carousel-action') === 'previous' ? -1 : 1;
      showSlide(carousel, currentSlide(carousel) + delta, true);
      startCarousel(carousel);
    }
  });

  document.addEventListener('keydown', (event) => {
    const overlay = closest(event.target, OVERLAY);
    if (overlay && overlay.open) {
      if (
        event.key === 'Escape'
        && overlay.getAttribute('data-instatic-overlay-dismiss-escape') !== 'false'
      ) {
        event.preventDefault();
        closeOverlay(overlay);
        return;
      }
      if (event.key === 'Tab') containFocus(event, overlay);
    }

    const carousel = closest(event.target, CAROUSEL);
    if (!carousel) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showSlide(carousel, currentSlide(carousel) - 1, true);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showSlide(carousel, currentSlide(carousel) + 1, true);
    }
  });

  function attachOverlay(overlay) {
    if (overlay.__instaticOverlayAttached) return;
    const trigger = overlay.querySelector(TRIGGER);
    const panel = overlay.querySelector(PANEL);
    if (!trigger || !panel) return;
    overlay.__instaticOverlayAttached = true;
    overlay.removeAttribute('open');
    overlay.setAttribute('data-instatic-overlay-enhanced', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
  }

  function openOverlay(overlay) {
    const panel = overlay.querySelector(PANEL);
    const trigger = overlay.querySelector(TRIGGER);
    if (!panel || !trigger) return;
    if (activeOverlay && activeOverlay !== overlay) closeOverlay(activeOverlay);
    overlay.__instaticRestoreFocus = document.activeElement;
    const hadOpenOverlay = Boolean(document.querySelector(OVERLAY + '[open]'));
    overlay.open = true;
    trigger.setAttribute('aria-expanded', 'true');
    if (!hadOpenOverlay) previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    activeOverlay = overlay;
    const first = focusable(panel)[0] || panel;
    if (!first.hasAttribute('tabindex')) first.setAttribute('tabindex', '-1');
    first.focus();
  }

  function closeOverlay(overlay) {
    const trigger = overlay.querySelector(TRIGGER);
    overlay.open = false;
    if (activeOverlay === overlay) activeOverlay = null;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (!document.querySelector(OVERLAY + '[open]')) document.body.style.overflow = previousBodyOverflow;
    const restore = overlay.__instaticRestoreFocus;
    if (restore && restore.isConnected && typeof restore.focus === 'function') restore.focus();
  }

  function containFocus(event, overlay) {
    const panel = overlay.querySelector(PANEL);
    if (!panel) return;
    const items = focusable(panel);
    if (items.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function attachCarousel(carousel) {
    if (carousel.__instaticCarouselAttached) return;
    const track = carousel.querySelector('[data-instatic-carousel-track]');
    if (!track) return;
    const slides = Array.from(track.children);
    if (slides.length === 0) return;
    carousel.__instaticCarouselAttached = true;
    carousel.setAttribute('data-instatic-carousel-enhanced', 'true');
    for (let index = 0; index < slides.length; index += 1) {
      slides[index].setAttribute('role', 'group');
      slides[index].setAttribute('aria-roledescription', 'slide');
      slides[index].setAttribute('aria-label', 'Slide ' + (index + 1) + ' of ' + slides.length);
    }
    showSlide(carousel, 0, false);
    startCarousel(carousel);
  }

  function slidesFor(carousel) {
    const track = carousel.querySelector('[data-instatic-carousel-track]');
    return track ? Array.from(track.children) : [];
  }

  function currentSlide(carousel) {
    const value = Number(carousel.getAttribute('data-instatic-carousel-current'));
    return Number.isFinite(value) ? value : 0;
  }

  function showSlide(carousel, requested, announce) {
    const slides = slidesFor(carousel);
    if (slides.length === 0) return;
    const index = (requested % slides.length + slides.length) % slides.length;
    carousel.setAttribute('data-instatic-carousel-current', String(index));
    for (let position = 0; position < slides.length; position += 1) {
      slides[position].hidden = position !== index;
    }
    const status = carousel.querySelector('[data-instatic-carousel-status]');
    if (status) status.textContent = announce ? 'Slide ' + (index + 1) + ' of ' + slides.length : '';
  }

  function startCarousel(carousel) {
    pauseCarousel(carousel);
    if (carousel.getAttribute('data-instatic-carousel-autoplay') !== 'true') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const interval = Math.max(2000, Number(carousel.getAttribute('data-instatic-carousel-interval')) || 5000);
    carouselTimers.set(carousel, window.setInterval(() => {
      showSlide(carousel, currentSlide(carousel) + 1, false);
    }, interval));
  }

  function pauseCarousel(carousel) {
    const timer = carouselTimers.get(carousel);
    if (timer) window.clearInterval(timer);
    carouselTimers.delete(carousel);
  }

  function focusable(root) {
    return Array.from(root.querySelectorAll(FOCUSABLE)).filter((element) => !element.hidden);
  }

  function closest(target, selector) {
    return target && target.closest ? target.closest(selector) : null;
  }
})();`
