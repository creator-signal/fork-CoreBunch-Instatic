/**
 * Shared published runtime for governed tabs.
 *
 * The authored HTML keeps every panel visible as a no-JavaScript fallback.
 * This runtime progressively adds the tablist, roving focus and one-active-
 * panel behavior. Event delegation keeps late hole fragments functional.
 */
export const TABS_RUNTIME_JS = `(() => {
  if (window.__instaticTabsRuntimeLoaded) return;
  window.__instaticTabsRuntimeLoaded = true;

  const TABS_SELECTOR = '[data-instatic-tabs]';
  const PANEL_SELECTOR = '[data-instatic-tab-panel]';
  let runtimeId = 0;

  for (const tabs of document.querySelectorAll(TABS_SELECTOR)) attachTabs(tabs);

  document.addEventListener('focusin', (event) => {
    const tabs = event.target && event.target.closest ? event.target.closest(TABS_SELECTOR) : null;
    if (tabs) attachTabs(tabs);
  });

  document.addEventListener('click', (event) => {
    const tab = event.target && event.target.closest
      ? event.target.closest('[role="tab"][data-instatic-tab-target]')
      : null;
    if (!tab) return;
    const tabs = tab.closest(TABS_SELECTOR);
    if (!tabs || tab.disabled) return;
    event.preventDefault();
    attachTabs(tabs);
    activatePanel(tabs, tab.getAttribute('data-instatic-tab-target') || '', true);
  });

  document.addEventListener('keydown', (event) => {
    const tab = event.target && event.target.closest
      ? event.target.closest('[role="tab"][data-instatic-tab-target]')
      : null;
    if (!tab) return;
    const tabs = tab.closest(TABS_SELECTOR);
    if (!tabs) return;
    attachTabs(tabs);

    const enabled = tabButtons(tabs).filter((candidate) => !candidate.disabled);
    const index = enabled.indexOf(tab);
    if (index < 0) return;
    const orientation = tabs.getAttribute('data-instatic-tabs-orientation') || 'horizontal';
    let nextIndex = -1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = enabled.length - 1;
    if (
      (orientation === 'horizontal' && event.key === 'ArrowRight')
      || (orientation === 'vertical' && event.key === 'ArrowDown')
    ) nextIndex = (index + 1) % enabled.length;
    if (
      (orientation === 'horizontal' && event.key === 'ArrowLeft')
      || (orientation === 'vertical' && event.key === 'ArrowUp')
    ) nextIndex = (index - 1 + enabled.length) % enabled.length;

    if (nextIndex >= 0) {
      event.preventDefault();
      const next = enabled[nextIndex];
      next.focus();
      if (tabs.getAttribute('data-instatic-tabs-activation') !== 'manual') {
        activatePanel(tabs, next.getAttribute('data-instatic-tab-target') || '', false);
      }
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && !tab.disabled) {
      event.preventDefault();
      activatePanel(tabs, tab.getAttribute('data-instatic-tab-target') || '', true);
    }
  });

  window.__instaticActivateTabPanel = (panel, focusTab) => {
    if (!panel || !panel.closest) return;
    const tabs = panel.closest(TABS_SELECTOR);
    if (!tabs) return;
    attachTabs(tabs);
    activatePanel(tabs, panel.id || '', focusTab !== false);
  };

  function attachTabs(tabs) {
    if (tabs.__instaticTabsAttached) return;
    const panels = panelsForTabs(tabs);
    if (panels.length === 0) return;
    tabs.__instaticTabsAttached = true;

    const tabsId = tabs.id || 'instatic-tabs-' + nextRuntimeId();
    tabs.id = tabsId;
    const tablist = document.createElement('div');
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute(
      'aria-orientation',
      tabs.getAttribute('data-instatic-tabs-orientation') || 'horizontal',
    );
    const label = tabs.getAttribute('aria-label') || '';
    if (label) tablist.setAttribute('aria-label', label);

    for (let index = 0; index < panels.length; index += 1) {
      const panel = panels[index];
      const panelId = tabsId + '-panel-' + (index + 1);
      const tabId = tabsId + '-tab-' + (index + 1);
      panel.id = panelId;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.id = tabId;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panelId);
      tab.setAttribute('data-instatic-tab-target', panelId);
      tab.textContent = panel.getAttribute('data-instatic-tab-label') || 'Tab ' + (index + 1);
      tab.disabled = panel.getAttribute('data-instatic-tab-disabled') === 'true';
      tablist.appendChild(tab);
    }

    tabs.insertBefore(tablist, panels[0]);
    const selected = panels.find((panel) => {
      return panel.getAttribute('data-instatic-tab-selected') === 'true'
        && panel.getAttribute('data-instatic-tab-disabled') !== 'true';
    }) || panels.find((panel) => panel.getAttribute('data-instatic-tab-disabled') !== 'true')
      || panels[0];
    activatePanel(tabs, selected.id, false);
  }

  function activatePanel(tabs, panelId, focusTab) {
    const panels = panelsForTabs(tabs);
    const buttons = tabButtons(tabs);
    for (const panel of panels) {
      const active = panel.id === panelId;
      panel.hidden = !active;
      panel.setAttribute('data-instatic-tab-active', active ? 'true' : 'false');
    }
    for (const tab of buttons) {
      const active = tab.getAttribute('data-instatic-tab-target') === panelId;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
      if (active && focusTab) tab.focus();
    }
  }

  function panelsForTabs(tabs) {
    return Array.from(tabs.querySelectorAll(PANEL_SELECTOR)).filter((panel) => {
      return panel.closest(TABS_SELECTOR) === tabs;
    });
  }

  function tabButtons(tabs) {
    return Array.from(tabs.querySelectorAll('[role="tab"][data-instatic-tab-target]')).filter((tab) => {
      return tab.closest(TABS_SELECTOR) === tabs;
    });
  }

  function nextRuntimeId() {
    runtimeId += 1;
    return runtimeId;
  }
})();`
