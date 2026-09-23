import { expect, test } from '@playwright/test'

test.describe('SSR / hydration', () => {
	test('renders usable server-side HTML without JavaScript', async ({ page }) => {
		await page.route('**/*.{js,mjs}', route => route.abort())

		const response = await page.goto('/')

		expect(response?.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
		expect(response?.headers()['x-content-type-options']).toBe('nosniff')
		await expect(page.locator('html')).toHaveAttribute('lang', /\S+/)
		await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', /^(dark|light)$/)
		await expect(page).toHaveTitle(/\S+/)
		await expect(page.locator('meta[name="description"]')).toHaveAttribute(
			'content',
			/\S+/,
		)
		await expect(page.getByRole('main')).toBeVisible()
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
		await expect(page.locator('symbol#icon-app')).toHaveCount(1)
	})

	test('hydrates without browser errors', async ({ page }) => {
		const errors: string[] = []
		page.on('pageerror', error => errors.push(error.message))
		page.on('console', (message) => {
			if (message.type() === 'error') {
				errors.push(message.text())
			}
		})

		await page.goto('/')
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
		await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', /^(dark|light)$/)

		expect(errors).toEqual([])
	})
})
