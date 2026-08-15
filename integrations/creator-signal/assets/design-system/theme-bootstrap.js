/* Generated from theme/source.json v0.1.0. Do not edit. */
(() => {
  const root = document.documentElement;
  let preference = "system";
  try {
    const stored = localStorage.getItem("creator-signal.theme.v1");
    if (stored === "system" || stored === "light" || stored === "dark") preference = stored;
  } catch {}
  let systemDark = false;
  if (preference === "system") {
    try {
      systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {}
  }
  const resolved = preference === "dark" || (preference === "system" && systemDark) ? "dark" : "light";
  root.setAttribute("data-cs-theme-preference", preference);
  root.setAttribute("data-cs-theme", resolved);
  root.style.colorScheme = resolved;
})();
