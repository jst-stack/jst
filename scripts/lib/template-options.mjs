import { basename } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'

const colorSchemes = ['light', 'dark', 'auto']
const styles = ['css', 'scss']
const primaryColors = [
	'dark',
	'gray',
	'red',
	'pink',
	'grape',
	'violet',
	'indigo',
	'blue',
	'cyan',
	'teal',
	'green',
	'lime',
	'yellow',
	'orange',
]

export async function resolveOptions(values) {
	const defaultName = normalizeDefaultPackageName(basename(process.cwd()))
	if (process.stdin.isTTY && !values.yes) {
		return resolveInteractiveOptions(values, defaultName)
	}
	return resolveNonInteractiveOptions(values, defaultName)
}

export function validateOptions(options) {
	if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(options.name) || options.name.length > 214) {
		throw new Error(`Invalid npm package name: ${options.name}`)
	}
	if (!options.title.trim()) {
		throw new Error('Application title cannot be empty.')
	}
	if (!options.description.trim()) {
		throw new Error('SEO description cannot be empty.')
	}
	if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(options.language)) {
		throw new Error(`Invalid document language: ${options.language}`)
	}
	if (!colorSchemes.includes(options.colorScheme)) {
		throw new Error(`Color scheme must be one of: ${colorSchemes.join(', ')}.`)
	}
	if (!primaryColors.includes(options.primaryColor)) {
		throw new Error(`Primary color must be one of: ${primaryColors.join(', ')}.`)
	}
	if (!styles.includes(options.style)) {
		throw new Error(`Style language must be one of: ${styles.join(', ')}.`)
	}
}

function resolveNonInteractiveOptions(values, defaultName) {
	const name = values.name ?? defaultName
	const title = values.title ?? packageNameToTitle(name)
	return buildOptions({
		colorScheme: values['color-scheme'],
		description: values.description,
		language: values.lang,
		name,
		primaryColor: values['primary-color'],
		style: values.style,
		title,
	})
}

async function resolveInteractiveOptions(values, defaultName) {
	const prompts = createInterface({ input: process.stdin, output: process.stdout })
	try {
		const name = values.name ?? await ask(prompts, 'Package name', defaultName)
		const title = values.title ?? await ask(prompts, 'Application title', packageNameToTitle(name))
		return buildOptions({
			colorScheme: values['color-scheme'] ?? await ask(prompts, `Color scheme (${colorSchemes.join('/')})`, 'dark'),
			description: values.description ?? await ask(prompts, 'SEO description', `${title} web application.`),
			language: values.lang ?? await ask(prompts, 'Document language', 'en'),
			name,
			primaryColor: values['primary-color'] ?? await ask(prompts, `Mantine primary color (${primaryColors.join('/')})`, 'lime'),
			style: values.style ?? await ask(prompts, `CSS Modules language (${styles.join('/')})`, 'css'),
			title,
		})
	}
	finally {
		prompts.close()
	}
}

function buildOptions({ colorScheme, description, language, name, primaryColor, style, title }) {
	return {
		colorScheme: colorScheme ?? 'dark',
		description: description ?? `${title} web application.`,
		language: language ?? 'en',
		name,
		primaryColor: primaryColor ?? 'lime',
		style: style ?? 'css',
		title,
	}
}

async function ask(prompts, label, fallback) {
	const answer = (await prompts.question(`${label} [${fallback}]: `)).trim()
	return answer || fallback
}

function normalizeDefaultPackageName(value) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^[._-]+|[._-]+$/g, '')
		|| 'new-project'
}

function packageNameToTitle(value) {
	return value
		.split('/')
		.at(-1)
		.split(/[-_]/)
		.filter(Boolean)
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}
