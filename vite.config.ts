import path from 'node:path'
import { reactRouter } from '@react-router/dev/vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons-ng'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
	test: {
		include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
	},
	plugins: [
		createSvgIconsPlugin({
			failOnError: true,
			htmlMode: 'none',
			iconDirs: [path.resolve(import.meta.dirname, 'src/shared/assets/icons')],
			symbolId: 'icon-[dir]-[name]',
		}),
		...(mode === 'test' ? [] : [reactRouter()]),
	],
	resolve: {
		alias: {
			'@': path.resolve(import.meta.dirname, './src'),
		},
	},
}))
