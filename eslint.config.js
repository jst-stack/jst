import antfu from '@antfu/eslint-config'
import boundaries from '@boundaries/eslint-plugin'

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
	{
		files: ['src/{app,pages,widgets,features,entities,shared}/**/*.{ts,tsx}'],
		plugins: { boundaries },
		settings: {
			'import/resolver': {
				typescript: { project: './tsconfig.json' },
			},
			'boundaries/elements': [
				{ type: 'app', pattern: 'src/app/**' },
				{ type: 'pages', pattern: 'src/pages/**' },
				{ type: 'widgets', pattern: 'src/widgets/**' },
				{ type: 'features', pattern: 'src/features/**' },
				{ type: 'entities', pattern: 'src/entities/**' },
				{ type: 'shared', pattern: 'src/shared/**' },
			],
			'boundaries/files': [
				{ category: 'test', pattern: '**/*.{test,spec}.{ts,tsx}' },
			],
		},
		rules: {
			'boundaries/dependencies': ['error', {
				default: 'disallow',
				policies: [
					{
						from: { file: { categories: 'test' } },
						allow: { to: { element: { types: { anyOf: ['app', 'pages', 'widgets', 'features', 'entities', 'shared'] } } } },
					},
					{
						from: { element: { types: { anyOf: ['app', 'pages'] } } },
						allow: { to: { element: { types: { anyOf: ['app', 'pages', 'widgets', 'features', 'entities', 'shared'] } } } },
					},
					{
						from: { element: { type: 'widgets' } },
						allow: { to: { element: { types: { anyOf: ['widgets', 'features', 'entities', 'shared'] } } } },
					},
					{
						from: { element: { type: 'features' } },
						allow: { to: { element: { types: { anyOf: ['features', 'entities', 'shared'] } } } },
					},
					{
						from: { element: { type: 'entities' } },
						allow: { to: { element: { types: { anyOf: ['entities', 'shared'] } } } },
					},
					{
						from: { element: { type: 'shared' } },
						allow: { to: { element: { type: 'shared' } } },
					},
				],
			}],
		},
	},
	{
		files: ['src/features/*/ui/**/*.{ts,tsx}'],
		rules: {
			'no-restricted-imports': ['error', {
				patterns: [{
					group: ['**/*.injector', '**/*.store', '**/data/**', '**/repository/**', '**/services/**'],
					message: 'Feature UI must receive state and actions through props. Keep DI and orchestration in the feature entry.',
				}],
			}],
		},
	},
)
