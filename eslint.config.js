import antfu from '@antfu/eslint-config'
import jst from '@jst-stack/eslint-plugin'

export default antfu(
	{
		react: true,
		typescript: {
			tsconfigPath: 'tsconfig.json',
			overridesTypeAware: {
				'ts/no-misused-promises': ['error', {
					checksVoidReturn: { attributes: false },
				}],
				'ts/promise-function-async': 'off',
				'ts/strict-boolean-expressions': 'off',
			},
		},
		lessOpinionated: true,
		stylistic: {
			indent: 'tab',
			quotes: 'single',
			semi: false,
		},
		formatters: {
			html: true,
			css: true,
		},
		ignores: ['.react-router/**', 'build/**', 'coverage/**', 'playwright-report/**', 'showcase/**', 'test-results/**'],
		rules: {
			'no-console': ['error', { allow: ['log', 'error'] }],
		},
	},
	{
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
		},
	},
	...jst.configs.recommended,
)
