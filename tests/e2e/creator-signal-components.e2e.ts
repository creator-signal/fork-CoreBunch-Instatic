import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  canvasFrame,
  openComponentsPanel,
  openSiteEditor,
  openSitePanel,
  setPropValue,
} from './helpers'

type FormRoute = {
  path: string
  title: string
  provider: 'Managed Form' | 'Embedded CRM Form'
}

const FORM_ROUTES: readonly FormRoute[] = [
  { path: '/contact', title: 'Contact', provider: 'Managed Form' },
  { path: '/feedback', title: 'Feedback', provider: 'Embedded CRM Form' },
  { path: '/wishlist', title: 'Join the wishlist', provider: 'Managed Form' },
  { path: '/early-access', title: 'Creator Signal Early Access', provider: 'Managed Form' },
  { path: '/waitlist', title: 'Join the waitlist', provider: 'Managed Form' },
  { path: '/beta', title: 'Try it early', provider: 'Managed Form' },
  { path: '/ask-a-question', title: 'Ask a question', provider: 'Managed Form' },
  { path: '/feature-request', title: 'Feature request', provider: 'Managed Form' },
  { path: '/report-an-error', title: 'Report an error', provider: 'Managed Form' },
]

const TWO_COLUMN_LAYOUT_CANVAS_SELECTOR =
  '[data-plugin-module="creator-signal.site.two-column-layout-shell"] > [data-plugin-children="true"]'

test.describe('Creator Signal route-wide WYSIWYG component projection', () => {
  test('Two Column Layout exposes its two regions as a WYSIWYG component canvas', async ({ page }) => {
    await openSiteEditor(page)
    await openSitePanel(page)
    await page.getByRole('button', {
      name: 'Open component Two Column Layout',
      exact: true,
    }).click()

    const frame = canvasFrame(page)
    const layout = frame.locator(TWO_COLUMN_LAYOUT_CANVAS_SELECTOR)
    const columns = layout.locator('.two-column-layout-column')
    const placeholders = layout.locator(
      '[data-canvas-module-placeholder][data-variant="block"]',
    )

    await expect(layout).toBeVisible()
    await expect(columns).toHaveCount(2)
    await expect(placeholders).toHaveCount(2)
    await expect(placeholders.nth(0)).toContainText('Left column')
    await expect(placeholders.nth(1)).toContainText('Right column')
    await expect(placeholders).toContainText([
      'Page components placed here render in this column.',
      'Page components placed here render in this column.',
    ])

    const boxes = await columns.evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return { height: rect.height, left: rect.left, top: rect.top, width: rect.width }
    }))
    expect(boxes[0].height).toBeGreaterThanOrEqual(100)
    expect(boxes[1].height).toBeGreaterThanOrEqual(100)
    expect(Math.abs(boxes[0].top - boxes[1].top)).toBeLessThanOrEqual(1)
    expect(boxes[1].left).toBeGreaterThan(boxes[0].left + boxes[0].width)
  })

  test('every installed public route exposes selectable real components without a page-pattern wrapper', async ({ page }) => {
    await openSiteEditor(page)
    await openSitePanel(page)
    const installedPages = page.getByRole('treeitem', { name: /^Open page / })
    await expect(installedPages).toHaveCount(26)
    const pageNames = await installedPages.evaluateAll((items) => items.map((item) =>
      item.getAttribute('aria-label') ?? item.textContent ?? '',
    ))

    for (const pageName of pageNames) {
      await test.step(pageName, async () => {
        await openSitePanel(page)
        const pageItem = page.getByRole('treeitem', { name: pageName, exact: true })
        await pageItem.click()
        await openComponentsPanel(page)

        const tree = page.getByRole('tree', { name: 'Component page hierarchy' })
        await expect(tree).not.toContainText('Missing library entry')
        await expect(tree).not.toContainText('creator-signal.site.pattern.')

        const selectableComponents = tree.locator(
          '[role="treeitem"][data-node-id]:not([aria-level="1"])',
        )
        const selectableCount = await selectableComponents.count()
        expect(selectableCount).toBeGreaterThan(0)
        const pageTitle = pageName.replace(/^Open page /, '')
        for (let index = 0; index < selectableCount; index += 1) {
          const row = selectableComponents.nth(index)
          const label = (await row.innerText()).trim()
          if (label === pageTitle || label.startsWith('Slot:')) continue
          await row.click()
          await expect(page.getByTestId('component-properties-view')).toBeVisible()
        }

        const renderedPage = canvasFrame(page).locator('body')
        await expect(renderedPage).toBeVisible()
        await expect.poll(async () => (await renderedPage.innerText()).trim().length)
          .toBeGreaterThan(0)
        await expect(renderedPage).not.toContainText('Slot: left')
        await expect(renderedPage).not.toContainText('Slot: right')
        if (await tree.getByRole('treeitem', {
          name: 'Two Column Layout',
          exact: true,
        }).count()) {
          const layout = canvasFrame(page).locator(TWO_COLUMN_LAYOUT_CANVAS_SELECTOR)
          await expect(layout).toBeVisible()
          await expect(layout.locator('.two-column-layout-column')).toHaveCount(2)
          await expect.poll(async () => layout.evaluate((element) => {
            const style = getComputedStyle(element)
            return [style.display, style.gridTemplateColumns]
          })).toEqual(expect.arrayContaining(['grid']))
        }
      })
    }
  })
})

test.describe('Creator Signal direct top-level page composition', () => {
  test('Home supports add, configure, drag, remove and reload without a pattern owner', async ({ page }) => {
    const replacementHeading = 'A directly authored final step'
    await openSiteEditor(page)
    await openSitePanel(page)
    const pageItem = page.getByRole('treeitem', {
      name: /^Open page Creator Signal —/,
    })
    await pageItem.click()
    await openComponentsPanel(page)

    const tree = page.getByRole('tree', { name: 'Component page hierarchy' })
    const callToActions = () => tree.getByRole('treeitem', {
      name: 'Call to Action',
      exact: true,
    })
    await expect(tree).not.toContainText('creator-signal.site.pattern.home-v2-page')
    await expect(callToActions()).toHaveCount(1)
    const originalId = await requiredNodeId(callToActions())

    await tree.locator('[role="treeitem"][aria-level="1"]').click()
    await page.getByRole('button', { name: 'Open Component Library' }).click()
    const dialog = page.getByRole('dialog', { name: 'Component Library' })
    await dialog.getByRole('searchbox', { name: 'Search Component Library' })
      .fill('Call to Action')
    await dialog.getByRole('option', { name: /Call to Action/ }).click()
    await dialog.getByRole('button', { name: 'Insert component' }).click()
    await expect(dialog).toBeHidden()

    await expect(callToActions()).toHaveCount(2)
    const ids = await componentNodeIds(callToActions())
    const replacementId = ids.find((id) => id !== originalId) ?? ''
    expect(replacementId).not.toBe('')
    const replacement = tree.locator(`[data-node-id="${replacementId}"]`)
    const original = tree.locator(`[data-node-id="${originalId}"]`)
    await replacement.click()
    await setPropValue(page, 'heading', replacementHeading)
    await expect(canvasFrame(page).getByText(replacementHeading, { exact: true }))
      .toBeVisible()

    await dragTreeRowBefore(page, replacement, original)
    await expect.poll(async () => componentNodeIds(callToActions()))
      .toEqual([replacementId, originalId])

    await original.click()
    const shortcut = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${shortcut}+Backspace`)
    await confirmDeleteIfShown(page)
    await expect(callToActions()).toHaveCount(1)

    await page.reload()
    await openSiteEditor(page)
    await openSitePanel(page)
    await page.getByRole('treeitem', { name: /^Open page Creator Signal —/ }).click()
    await openComponentsPanel(page)
    await expect(page.getByRole('tree', { name: 'Component page hierarchy' }))
      .not.toContainText('creator-signal.site.pattern.home-v2-page')
    await expect(canvasFrame(page).getByText(replacementHeading, { exact: true }))
      .toBeVisible()
  })
})

test.describe('Creator Signal page-body authoring through Components', () => {
  for (const route of FORM_ROUTES) {
    test(`${route.path} supports select, replace, move, remove and reload`, async ({ page }) => {
      const replacementHeading = `Authenticated replacement ${route.path.slice(1)}`

      await test.step('open the installed pack page as the authenticated owner', async () => {
        await openSiteEditor(page)
        await openSitePanel(page)
        const pageItem = page.getByRole('treeitem', {
          name: `Open page ${route.title}`,
        })
        await pageItem.click()
        await expect(pageItem).toHaveAttribute('aria-selected', 'true')
        await openComponentsPanel(page)
      })

      const tree = page.getByRole('tree', { name: 'Component page hierarchy' })
      const componentRows = (name: string): Locator =>
        tree.getByRole('treeitem', { name, exact: true })

      await test.step('select the independently authorable layout, slots and provider', async () => {
        await expect(tree).not.toContainText('Missing library entry')
        await expect(tree).not.toContainText('missing')

        await componentRows('Two Column Layout').click()
        await expectComponentProperties(page, 'Two Column Layout')

        await componentRows('Slot: left').click()
        await componentRows('Slot: right').click()

        await componentRows('Section Intro').click()
        await expectComponentProperties(page, 'Section Intro')

        await componentRows(route.provider).click()
        await expectComponentProperties(page, route.provider)
      })

      let originalIntroId = ''
      let replacementIntroId = ''
      await test.step('insert and configure a replacement in the left slot', async () => {
        const originalIntro = componentRows('Section Intro')
        await expect(originalIntro).toHaveCount(1)
        originalIntroId = await requiredNodeId(originalIntro)

        await componentRows('Slot: left').click()
        await page.getByRole('button', { name: 'Open Component Library' }).click()
        const dialog = page.getByRole('dialog', { name: 'Component Library' })
        await expect(dialog).toBeVisible()
        await dialog.getByRole('searchbox', { name: 'Search Component Library' })
          .fill('Section Intro')
        await dialog.getByRole('option', { name: /Section Intro/ }).click()
        await dialog.getByRole('button', { name: 'Insert component' }).click()
        await expect(dialog).toBeHidden()

        const intros = componentRows('Section Intro')
        await expect(intros).toHaveCount(2)
        const introIds = await intros.evaluateAll((rows) =>
          rows.map((row) => row.getAttribute('data-node-id')),
        )
        replacementIntroId = introIds.find((id) => id && id !== originalIntroId) ?? ''
        expect(replacementIntroId).not.toBe('')

        await tree.locator(`[data-node-id="${replacementIntroId}"]`).click()
        await setPropValue(page, 'heading', replacementHeading)
        await expect(canvasFrame(page).getByText(replacementHeading, { exact: true }))
          .toBeVisible()
      })

      await test.step('move the replacement before the original through drag and drop', async () => {
        const replacement = tree.locator(`[data-node-id="${replacementIntroId}"]`)
        const original = tree.locator(`[data-node-id="${originalIntroId}"]`)
        await dragTreeRowBefore(page, replacement, original)
        await expect.poll(async () => componentNodeIds(componentRows('Section Intro')))
          .toEqual([replacementIntroId, originalIntroId])
      })

      await test.step('remove the replaced component through the focused Components tree', async () => {
        const original = tree.locator(`[data-node-id="${originalIntroId}"]`)
        await original.click()
        await expect(original).toBeFocused()
        const shortcut = process.platform === 'darwin' ? 'Meta' : 'Control'
        await page.keyboard.press(`${shortcut}+Backspace`)
        await confirmDeleteIfShown(page)
        await expect(tree.locator(`[data-node-id="${originalIntroId}"]`)).toHaveCount(0)
        await expect(componentRows('Section Intro')).toHaveCount(1)
      })

      await test.step('reload and prove the draft composition persisted', async () => {
        await expect.poll(async () => componentNodeIds(componentRows('Section Intro')))
          .toEqual([replacementIntroId])
        await page.reload()
        await openSiteEditor(page)
        await openSitePanel(page)
        const pageItem = page.getByRole('treeitem', {
          name: `Open page ${route.title}`,
        })
        await pageItem.click()
        await expect(pageItem).toHaveAttribute('aria-selected', 'true')
        await openComponentsPanel(page)

        const reloadedTree = page.getByRole('tree', { name: 'Component page hierarchy' })
        await expect(reloadedTree).not.toContainText('Missing library entry')
        await expect(reloadedTree.getByRole('treeitem', {
          name: 'Section Intro',
          exact: true,
        })).toHaveCount(1)
        await expect(reloadedTree.getByRole('treeitem', {
          name: route.provider,
          exact: true,
        })).toHaveCount(1)
        await expect(canvasFrame(page).getByText(replacementHeading, { exact: true }))
          .toBeVisible()
      })
    })
  }
})

async function expectComponentProperties(page: Page, name: string): Promise<void> {
  const properties = page.getByTestId('component-properties-view')
  await expect(properties).toBeVisible()
  await expect(properties.getByRole('heading', { name, exact: true })).toBeVisible()
}

async function requiredNodeId(row: Locator): Promise<string> {
  const id = await row.getAttribute('data-node-id')
  expect(id).toBeTruthy()
  return id!
}

async function componentNodeIds(rows: Locator): Promise<string[]> {
  return (await rows.evaluateAll((items) =>
    items.map((item) => item.getAttribute('data-node-id')),
  )).filter((id): id is string => Boolean(id))
}

async function confirmDeleteIfShown(page: Page): Promise<void> {
  const dialog = page.getByRole('alertdialog', { name: 'Delete layer?' })
  const visible = await dialog.isVisible({ timeout: 1_000 }).catch(() => false)
  if (!visible) return
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(dialog).toBeHidden()
}

async function dragTreeRowBefore(
  page: Page,
  sourceRow: Locator,
  targetRow: Locator,
): Promise<void> {
  const sourceBox = await sourceRow.boundingBox()
  const targetBox = await targetRow.boundingBox()
  expect(sourceBox, 'Source component row must be measurable').not.toBeNull()
  expect(targetBox, 'Target component row must be measurable').not.toBeNull()

  await page.mouse.move(
    sourceBox!.x + sourceBox!.width / 2,
    sourceBox!.y + sourceBox!.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBox!.x + targetBox!.width / 2,
    targetBox!.y + 2,
    { steps: 10 },
  )
  await page.mouse.up()
}
