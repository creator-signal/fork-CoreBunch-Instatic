import { strict as assert } from 'node:assert'
import type { Page } from '@playwright/test'

const formRegistry = `window.CreatorSignalMauticForms=${JSON.stringify({
  schema: 'creator-signal.mautic-forms/v1',
  forms: Object.fromEntries([
    'creator_signal_contact',
    'creator_signal_feedback',
    'creator_signal_wishlist',
    'creator_signal_waitlist',
    'creator_signal_beta_application',
    'creator_signal_question',
    'creator_signal_feature_request',
    'creator_signal_error_report',
  ].map((alias, index) => [alias, {
    id: index + 1,
    apiName: `${alias}_form`,
    code: alias,
    consentTimestampFields: [{ choiceField: 'optional_follow_up', timestampField: 'consent_timestamp' }],
  }])),
})};`

const generatedForm = String.raw`(() => {
  const target = document.currentScript && document.currentScript.parentElement;
  if (!target) return;
  const formId = new URL(document.currentScript.src).searchParams.get('id');
  const preference = formId === '3'
    ? '<fieldset class="mauticform-row mauticform-required" data-validate="contact_preference"><legend>Which updates would you like?</legend><label><input type="radio" name="contact_preference" value="launch"> Launch notification</label><label><input type="radio" name="contact_preference" value="testing"> Early testing</label><label><input type="radio" name="contact_preference" value="both"> Both</label></fieldset>'
    : '';
  const choiceCase = new URL(location.href).searchParams.get('formCase') === 'choices'
    ? '<fieldset class="mauticform-row mauticform-required" data-validate="topics"><legend>Topics</legend><label><input type="checkbox" name="topics[]" value="sales"> Sales</label><label><input type="checkbox" name="topics[]" value="design"> Design</label></fieldset><div class="mauticform-row mauticform-required" data-validate="area"><label for="acceptance-area">Product area</label><select id="acceptance-area" name="area"><option value="">Choose</option><option value="website">Website</option></select></div><label><input type="checkbox" name="optional_follow_up"> Optional follow-up</label>'
    : '';
  // Match real generated metadata: the provider marks rows, not controls.
  target.innerHTML = '<form><div class="mauticform-row mauticform-required" data-validate="email"><label for="acceptance-email">Email address</label><input id="acceptance-email" name="email" type="email" aria-describedby="acceptance-email-error"><span id="acceptance-email-error" class="mauticform-errormsg" hidden>Enter a valid email address.</span></div>' + preference + choiceCase + '<div class="mauticform-row mauticform-required" data-validate="message"><label for="acceptance-message">Message</label><textarea id="acceptance-message" name="message"></textarea></div><input name="mauticform[consent_timestamp]" type="hidden"><button type="submit">Send message</button></form>';
})();`

export async function routeMarketing(page: Page, registryAvailable = true): Promise<void> {
  await page.route('https://marketing.creatorsignal.me/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/media/creator-signal/forms-v1.js')) {
      if (!registryAvailable) return route.abort('failed')
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        body: formRegistry,
      })
    }
    if (url.pathname.endsWith('/media/js/mautic-form.js')) {
      return route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: '' })
    }
    if (url.pathname.endsWith('/form/generate.js')) {
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        body: generatedForm,
      })
    }
    if (url.pathname.endsWith('/form/submit')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ success: !page.url().includes('formResult=failure') }),
      })
    }
    return route.abort('blockedbyclient')
  })
}


export async function verifyManagedForm(page: Page, baseUrl: string): Promise<void> {
  let submissions = 0
  const submittedConsent: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/form/submit') {
      submissions += 1
      submittedConsent.push(new URLSearchParams(request.postData() ?? '').get('mauticform[consent_timestamp]') ?? '')
    }
  })
  await page.goto(`${baseUrl}/contact?formResult=success`, { waitUntil: 'load' })
  const form = page.locator('[data-form-mount] form')
  await form.waitFor({ state: 'attached' })
  await page.getByRole('button', { name: 'Send message' }).click({ noWaitAfter: true })
  const email = page.getByLabel('Email address')
  assert.equal(await email.getAttribute('aria-invalid'), 'true')
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'acceptance-email')
  assert.equal(await page.locator('[data-cs-mautic-form]').getAttribute('aria-busy'), null)
  assert.equal(submissions, 0, 'empty provider-required fields must not send')
  await email.fill('not-an-email')
  await page.getByRole('button', { name: 'Send message' }).click({ noWaitAfter: true })
  assert.equal(submissions, 0, 'invalid email must not send')
  await email.fill('creator@example.com')
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Please send a useful signal.')
  await page.getByRole('button', { name: 'Send message' }).click({ noWaitAfter: true })
  await form.waitFor({ state: 'hidden' })
  await page.getByText('Thanks — your message has been received.', { exact: true }).waitFor()
  assert.equal(submissions, 1)

  await page.goto(`${baseUrl}/contact?formResult=failure`, { waitUntil: 'load' })
  await page.locator('[data-form-mount] form').waitFor({ state: 'attached' })
  await page.getByLabel('Email address').fill('creator@example.com')
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Please retry this signal.')
  await page.getByRole('button', { name: 'Send message' }).click({ noWaitAfter: true })
  await page.getByText('The form could not be sent. Please try again.', { exact: true }).waitFor()
  assert.equal(await page.locator('[data-form-mount]').isVisible(), true)
  assert.equal(await page.locator('[data-cs-mautic-form]').getAttribute('aria-busy'), null)
  assert.equal(await page.getByRole('button', { name: 'Send message' }).isEnabled(), true)
  assert.equal(await page.getByLabel('Email address').inputValue(), 'creator@example.com')
  assert.equal(await page.getByRole('textbox', { name: 'Message', exact: true }).inputValue(), 'Please retry this signal.')
  assert.equal(submissions, 2)

  let releaseSubmission: (() => void) | undefined
  let holdSubmission = false
  let providerUnavailable = true
  await page.route(/^https:\/\/marketing\.creatorsignal\.me\/form\/submit\?/, async (route) => {
    if (providerUnavailable) return route.abort('failed')
    if (holdSubmission) await new Promise<void>((resolve) => { releaseSubmission = resolve })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  })
  await page.getByRole('button', { name: 'Send message' }).click({ noWaitAfter: true })
  await page.getByText('The form could not be sent. Please try again.', { exact: true }).waitFor()
  assert.equal(submissions, 3, 'provider transport failure is recoverable')
  assert.equal(await page.getByRole('button', { name: 'Send message' }).isEnabled(), true)
  providerUnavailable = false
  await page.getByRole('button', { name: 'Send message' }).click({ noWaitAfter: true })
  await page.locator('[data-form-mount] form').waitFor({ state: 'hidden' })
  assert.equal(submissions, 4, 'provider failure can retry without losing fields')

  await page.goto(`${baseUrl}/contact?formCase=choices`, { waitUntil: 'load' })
  const choiceForm = page.locator('[data-form-mount] form')
  await choiceForm.waitFor({ state: 'attached' })
  await page.getByLabel('Email address').fill('creator@example.com')
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Synthetic choice validation.')
  await page.getByRole('button', { name: 'Send message' }).click({ noWaitAfter: true })
  assert.equal(submissions, 4)
  assert.equal(await page.getByRole('checkbox', { name: 'Sales', exact: true }).getAttribute('aria-invalid'), 'true')
  assert.equal(await page.getByLabel('Product area').getAttribute('aria-invalid'), 'true')
  await page.getByRole('checkbox', { name: 'Design', exact: true }).check()
  await page.getByLabel('Product area').selectOption('website')
  assert.equal(await page.getByRole('checkbox', { name: 'Sales', exact: true }).isChecked(), false)
  assert.equal(await page.getByRole('checkbox', { name: 'Optional follow-up', exact: true }).isChecked(), false)
  holdSubmission = true
  const requested = page.waitForRequest((request) => new URL(request.url()).pathname === '/form/submit')
  await page.getByRole('button', { name: 'Send message' }).click({ noWaitAfter: true })
  await requested
  assert.equal(submissions, 5)
  assert.equal(await page.getByRole('button', { name: 'Send message' }).isDisabled(), true)
  assert.equal(await page.locator('[data-cs-mautic-form]').getAttribute('aria-busy'), 'true')
  await choiceForm.evaluate((element) => element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(submissions, 5, 'a concurrent submit event must not send twice')
  assert.ok(releaseSubmission)
  releaseSubmission()
  await choiceForm.waitFor({ state: 'hidden' })
  await choiceForm.evaluate((element) => element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(submissions, 5, 'an acknowledged form must not replay')
  holdSubmission = false

  await page.goto(`${baseUrl}/early-access`, { waitUntil: 'load' })
  await page.locator('[data-form-mount] form').waitFor({ state: 'attached' })
  assert.equal(await page.locator('[data-cs-mautic-form]').count(), 1)
  assert.equal(await page.locator('[data-cs-mautic-form]').getAttribute('data-form-alias'), 'creator_signal_wishlist')
  assert.equal(await page.locator('[data-cs-mautic-form]').getAttribute('data-campaign-code'), 'early_access')
  assert.equal(await page.getByRole('radio').count(), 3)
  await page.getByText('Which updates would you like?', { exact: true }).waitFor()
  await page.getByLabel('Email address').fill('creator@example.com')
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Synthetic required radio validation.')
  await page.getByRole('button', { name: 'Send message' }).click({ noWaitAfter: true })
  assert.equal(submissions, 5, 'a required radio group must not send without a selection')
  await page.getByRole('radio', { name: 'Early testing', exact: true }).check()
  await page.getByRole('button', { name: 'Send message' }).click({ noWaitAfter: true })
  await page.locator('[data-form-mount] form').waitFor({ state: 'hidden' })
  assert.equal(submissions, 6, 'a non-first radio selection satisfies its group')
  assert.deepEqual(submittedConsent, Array(6).fill(''), 'optional follow-up must not invent a consent timestamp')
}
