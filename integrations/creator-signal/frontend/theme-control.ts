import {
  createBrowserThemeRuntime,
  isThemePreference,
} from '../assets/design-system/theme-runtime.js'

const runtime = createBrowserThemeRuntime(window)
const selector = '[data-cs-theme-control]'

function synchronizeControls(snapshot = runtime.getSnapshot()) {
  for (const control of document.querySelectorAll(selector)) {
    if (control instanceof HTMLSelectElement) {
      control.value = snapshot.preference
    }
  }
}

document.addEventListener('change', (event) => {
  const control = event.target
  if (!(control instanceof HTMLSelectElement) || !control.matches(selector)) return
  if (!isThemePreference(control.value)) return
  runtime.setPreference(control.value)
})

runtime.subscribe(synchronizeControls)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => synchronizeControls(), { once: true })
} else {
  synchronizeControls()
}

window.addEventListener('pagehide', () => runtime.destroy(), { once: true })
