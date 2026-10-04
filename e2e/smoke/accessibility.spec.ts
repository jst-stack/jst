import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { APP_CONFIG } from '../../src/shared/app.config'

const colorSchemes = getTestColorSchemes(APP_CONFIG.colorScheme)

for (const colorScheme of colorSchemes) {
	test(`home page has no automatically detectable accessibility violations in ${colorScheme} mode`, async ({ page }) => {
		await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
		await page.goto('/')
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

		const { violations } = await new AxeBuilder({ page }).analyze()

		expect(violations).toEqual([])
	})
}

function getTestColorSchemes(colorScheme: 'auto' | 'dark' | 'light') {
	return colorScheme === 'auto' ? ['light', 'dark'] as const : [colorScheme]
}

test('keyboard users can bypass repeated navigation', async ({ page }) => {
	await page.goto('/')
	await page.keyboard.press('Tab')

	const skipLink = page.getByRole('link', { name: 'Skip to content' })
	await expect(skipLink).toBeFocused()

	await skipLink.press('Enter')
	await expect(page.getByRole('main')).toBeFocused()
})
