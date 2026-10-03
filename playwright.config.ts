import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const fullBrowserMatrix = process.env.PLAYWRIGHT_FULL_MATRIX === '1'

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.spec.ts',
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 1 : 0,
	workers: isCI ? 1 : undefined,
	reporter: isCI
		? [['github'], ['html', { open: 'never' }]]
		: 'list',
	timeout: 30_000,

	use: {
		baseURL: `http://localhost:${port}`,
		screenshot: 'only-on-failure',
		trace: 'on-first-retry',
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		...(fullBrowserMatrix
			? [
					{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
					{ name: 'webkit', use: { ...devices['Desktop Safari'] } },
					{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
					{ name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
				]
			: []),
	],

	webServer: {
		command: isCI ? 'npm start' : 'npm run build && npm start',
		env: { PORT: String(port) },
		port,
		reuseExistingServer: false,
		timeout: 60_000,
	},
})
