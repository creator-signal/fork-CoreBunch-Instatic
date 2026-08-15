export const THEME_PREFERENCES = Object.freeze(["system", "light", "dark"]);
export const THEME_STORAGE_KEY = "creator-signal.theme.v1";
export const THEME_ATTRIBUTE = "data-cs-theme";
export const THEME_PREFERENCE_ATTRIBUTE = "data-cs-theme-preference";
export const SYSTEM_DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
export const DEFAULT_THEME_PREFERENCE = "system";
export const FALLBACK_RESOLVED_THEME = "light";

export function isThemePreference(value) {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(preference, systemDark = false) {
  if (!isThemePreference(preference)) preference = DEFAULT_THEME_PREFERENCE;
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return systemDark ? "dark" : FALLBACK_RESOLVED_THEME;
}

export function readThemePreference(storage) {
  if (!storage || typeof storage.getItem !== "function") return DEFAULT_THEME_PREFERENCE;
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function persistThemePreference(storage, preference) {
  if (!isThemePreference(preference)) throw new TypeError(`Unsupported theme preference: ${String(preference)}`);
  if (!storage) return false;
  try {
    if (preference === DEFAULT_THEME_PREFERENCE && typeof storage.removeItem === "function") {
      storage.removeItem(THEME_STORAGE_KEY);
    } else if (typeof storage.setItem === "function") {
      storage.setItem(THEME_STORAGE_KEY, preference);
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function applyTheme(root, preference, systemDark = false) {
  if (!root || typeof root.setAttribute !== "function") return resolveTheme(preference, systemDark);
  const safePreference = isThemePreference(preference) ? preference : DEFAULT_THEME_PREFERENCE;
  const resolved = resolveTheme(safePreference, systemDark);
  root.setAttribute(THEME_PREFERENCE_ATTRIBUTE, safePreference);
  root.setAttribute(THEME_ATTRIBUTE, resolved);
  if (root.style) root.style.colorScheme = resolved;
  return resolved;
}

function addMediaListener(media, listener) {
  if (!media) return () => {};
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", listener);
    return () => media.removeEventListener?.("change", listener);
  }
  if (typeof media.addListener === "function") {
    media.addListener(listener);
    return () => media.removeListener?.(listener);
  }
  return () => {};
}

export function createThemeRuntime({ root, storage, media } = {}) {
  let preference = readThemePreference(storage);
  let resolved = applyTheme(root, preference, Boolean(media?.matches));
  const listeners = new Set();

  const publish = () => {
    resolved = applyTheme(root, preference, Boolean(media?.matches));
    const snapshot = Object.freeze({ preference, resolvedTheme: resolved });
    for (const listener of listeners) listener(snapshot);
    return snapshot;
  };

  const stopMedia = addMediaListener(media, () => {
    if (preference === "system") publish();
  });

  return {
    getSnapshot() {
      return Object.freeze({ preference, resolvedTheme: resolved });
    },
    setPreference(nextPreference) {
      if (!isThemePreference(nextPreference)) throw new TypeError(`Unsupported theme preference: ${String(nextPreference)}`);
      preference = nextPreference;
      persistThemePreference(storage, nextPreference);
      return publish();
    },
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("Theme listener must be a function");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      stopMedia();
      listeners.clear();
    }
  };
}

export function createBrowserThemeRuntime(windowLike = globalThis.window) {
  if (!windowLike?.document?.documentElement) return createThemeRuntime();
  let media;
  try {
    media = typeof windowLike.matchMedia === "function" ? windowLike.matchMedia(SYSTEM_DARK_MEDIA_QUERY) : undefined;
  } catch {
    media = undefined;
  }
  let storage;
  try {
    storage = windowLike.localStorage;
  } catch {
    storage = undefined;
  }
  return createThemeRuntime({ root: windowLike.document.documentElement, storage, media });
}
