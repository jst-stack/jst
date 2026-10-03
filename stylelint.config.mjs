export default {
	extends: ['stylelint-config-standard'],
	overrides: [
		{
			files: ['src/**/*.module.{css,scss}'],
			rules: {
				'no-descending-specificity': null,
				'selector-class-pattern': [
					'^[a-z][a-zA-Z0-9]*$',
					{ message: 'Use camelCase class names in CSS Modules' },
				],
			},
		},
		{
			files: ['src/index.css'],
			rules: {
				'selector-class-pattern': null,
			},
		},
	],
}
