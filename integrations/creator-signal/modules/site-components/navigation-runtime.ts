/** Native disclosure remains expanded and usable if scripting is unavailable. */
export const navigationRuntime = String.raw`
(() => {
  const narrow = window.matchMedia('(max-width: 900px)');
  document.querySelectorAll('details.site-navigation').forEach((menu) => {
    if (menu.dataset.navigationReady) return;
    menu.dataset.navigationReady = 'true';
    const toggle = menu.querySelector('summary');
    const synchronize = () => {
      if (narrow.matches && menu.contains(document.activeElement)) toggle.focus();
      menu.open = !narrow.matches;
    };
    synchronize();
    narrow.addEventListener('change', synchronize);
    menu.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !narrow.matches || !menu.open) return;
      event.preventDefault();
      menu.open = false;
      toggle.focus();
    });
    menu.addEventListener('click', (event) => {
      if (!narrow.matches || !(event.target instanceof Element)) return;
      if (event.target.closest('a')) {
        menu.open = false;
        toggle.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (narrow.matches && menu.open && event.target instanceof Node && !menu.contains(event.target)) {
        const restoreFocus = menu.contains(document.activeElement);
        menu.open = false;
        if (restoreFocus) toggle.focus();
      }
    });
  });
})();
`
