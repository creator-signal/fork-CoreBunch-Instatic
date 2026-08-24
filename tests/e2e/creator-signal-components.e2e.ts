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
