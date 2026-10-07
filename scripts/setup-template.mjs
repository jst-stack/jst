import { readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = fileURLToPath(new URL('..', import.meta.url))
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
const templateOnlyPaths = [
	'.github/workflows/release.yml',
	'.gitmodules',
	'AUDIT.md',
	'CHANGELOG.md',
	'CONTRIBUTING.md',
	'SECURITY.md',
	'docs/assets',
	'docs/compatibility.md',
	'docs/migrations.md',
	'docs/releasing.md',
	'jst.template.json',
	'scripts/__tests__',
	'showcase',
]

await main()

async function main() {
	try {
		const { values } = parseArgs({
			options: {
				'color-scheme': { type: 'string' },
				'description': { type: 'string' },
				'help': { type: 'boolean', short: 'h' },
				'lang': { type: 'string' },
				'name': { type: 'string' },
				'primary-color': { type: 'string' },
				'quiet': { type: 'boolean' },
				'style': { type: 'string' },
				'title': { type: 'string' },
				'yes': { type: 'boolean', short: 'y' },
			},
			strict: true,
		})

		if (values.help) {
			console.log(getHelp())
			return
		}

		const options = await resolveOptions(values)
		validateOptions(options)
		await setupProject(options)
		if (!values.quiet) {
			printSummary(options)
		}
	}
	catch (error) {
		console.error(error instanceof Error ? error.message : error)
		process.exitCode = 1
	}
}

async function resolveOptions(values) {
	const interactive = process.stdin.isTTY && !values.yes
	const defaultName = normalizeDefaultPackageName(basename(process.cwd()))

	if (!interactive) {
		const name = values.name ?? defaultName
		const title = values.title ?? packageNameToTitle(name)

		return {
			colorScheme: values['color-scheme'] ?? 'dark',
			description: values.description ?? `${title} web application.`,
			language: values.lang ?? 'en',
			name,
			primaryColor: values['primary-color'] ?? 'lime',
			style: values.style ?? 'css',
			title,
		}
	}

	const prompts = createInterface({ input: process.stdin, output: process.stdout })

	try {
		const name = values.name ?? await ask(prompts, 'Package name', defaultName)
		const title = values.title ?? await ask(prompts, 'Application title', packageNameToTitle(name))

		return {
			colorScheme: values['color-scheme'] ?? await ask(prompts, `Color scheme (${colorSchemes.join('/')})`, 'dark'),
			description: values.description ?? await ask(prompts, 'SEO description', `${title} web application.`),
			language: values.lang ?? await ask(prompts, 'Document language', 'en'),
			name,
			primaryColor: values['primary-color'] ?? await ask(prompts, `Mantine primary color (${primaryColors.join('/')})`, 'lime'),
			style: values.style ?? await ask(prompts, `CSS Modules language (${styles.join('/')})`, 'css'),
			title,
		}
	}
	finally {
		prompts.close()
	}
}

async function ask(prompts, label, fallback) {
	const answer = (await prompts.question(`${label} [${fallback}]: `)).trim()
	return answer || fallback
}

function validateOptions(options) {
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

async function setupProject(options) {
	for (const templatePath of templateOnlyPaths) {
		await rm(resolve(root, templatePath), { force: true, recursive: true })
	}

	await writeAppConfig(options)
	await configureStyles(options.style)
	await updatePackageJson(options)
	await updatePackageLock(options)
	await writeReadme(options)
	await rm(resolve(root, 'scripts/setup-template.mjs'), { force: true })
}

async function writeAppConfig(options) {
	await writeFile(
		resolve(root, 'src/shared/app.config.ts'),
		`export const APP_CONFIG = {
\tcolorScheme: ${toTsString(options.colorScheme)},
\tdescription: ${toTsString(options.description)},
\tlanguage: ${toTsString(options.language)},
\tname: ${toTsString(options.title)},
\tprimaryColor: ${toTsString(options.primaryColor)},
} as const
`,
	)
}

async function updatePackageJson(options) {
	const packageJsonPath = resolve(root, 'package.json')
	const packageJson = await readJson(packageJsonPath)

	packageJson.name = options.name
	if (options.style === 'scss') {
		delete packageJson.devDependencies['stylelint-config-standard']
		packageJson.devDependencies.sass = '^1.105.0'
		packageJson.devDependencies['stylelint-config-standard-scss'] = '^17.0.0'
		packageJson.devDependencies = Object.fromEntries(
			Object.entries(packageJson.devDependencies).sort(([left], [right]) => left.localeCompare(right)),
		)
	}
	delete packageJson.scripts['template:setup']
	packageJson.knip = { ignore: ['src/shared/lib/react.lib.ts', 'src/shared/ui/svgIcon.component.tsx'] }

	await writeJson(packageJsonPath, packageJson)
}

async function configureStyles(style) {
	await writeFile(resolve(root, 'jst.config.ts'), `import { defineConfig } from '@jst-stack/eslint-plugin'\n\nexport default defineConfig({\n\tstyles: {\n\t\tmoduleExtension: '${style}',\n\t},\n})\n`)
	if (style === 'css') {
		return
	}
	await writeFile(resolve(root, 'stylelint.config.mjs'), createScssStylelintConfig())
	for (const path of await listFiles(resolve(root, 'src'))) {
		if (path.endsWith('.module.css')) {
			await rename(path, path.replace(/\.module\.css$/u, '.module.scss'))
			continue
		}
		if (/\.[jt]sx?$/u.test(path)) {
			const source = await readFile(path, 'utf8')
			await writeFile(path, source.replaceAll('.module.css', '.module.scss'))
		}
	}
}

function createScssStylelintConfig() {
	return `export default {
\textends: ['stylelint-config-standard-scss'],
\toverrides: [
\t\t{
\t\t\tfiles: ['src/**/*.module.scss'],
\t\t\trules: {
\t\t\t\t'no-descending-specificity': null,
\t\t\t\t'selector-class-pattern': [
\t\t\t\t\t'^[a-z][a-zA-Z0-9]*$',
\t\t\t\t\t{ message: 'Use camelCase class names in SCSS Modules' },
\t\t\t\t],
\t\t\t},
\t\t},
\t\t{
\t\t\tfiles: ['src/index.css'],
\t\t\trules: { 'selector-class-pattern': null },
\t\t},
\t],
}
`
}

async function listFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true })
	return (await Promise.all(entries.map((entry) => {
		const path = resolve(directory, entry.name)
		return entry.isDirectory() ? listFiles(path) : [path]
	}))).flat()
}

async function updatePackageLock(options) {
	const packageLockPath = resolve(root, 'package-lock.json')
	if (options.style === 'scss') {
		await rm(packageLockPath, { force: true })
		return
	}
	const packageLock = await readJson(packageLockPath)

	packageLock.name = options.name
	if (packageLock.packages?.['']) {
		packageLock.packages[''].name = options.name
	}

	await writeJson(packageLockPath, packageLock)
}

async function writeReadme(options) {
	await writeFile(
		resolve(root, 'README.md'),
		`# ${options.title}

${options.description}

## Development

\`\`\`bash
npm ci
npm run dev
\`\`\`

## First feature

Create a props-driven feature with a public API:

\`\`\`bash
npm run create:slice -- feature firstFeature
\`\`\`

Use \`--stateful\` when the workflow needs a Reatom view model. Use \`entity\` for reusable domain capabilities, \`module\` for a bounded context spanning routes, and \`widget\` for reusable page composition.

## Quality

- \`npm run validate\` is the fast local gate: lint, architecture, types, and unit tests.
- \`npm run check\` adds React Doctor, a production build, budgets, and unused-code checks.
- \`npm run check:release\` is the complete release gate and includes browser, SSR, hydration, and accessibility contracts.

## Architecture

Routes are discovered from \`src/pages\`. Read \`docs/architecture.md\` before adding a non-trivial vertical slice. It explains dependency direction, public APIs, DI, state, tests, and file contracts.

Generate additional slices with \`npm run create:slice -- <entity|feature|module|widget> <lowerCamelName>\`. Extract a proven boundary with \`npm run create:package -- <lowerCamelName>\` only when reuse, ownership, build, or release pressure is real.

Coding agents should also follow \`skills/frontend-architecture/SKILL.md\`.
`,
	)
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

function toTsString(value) {
	return `'${value.replaceAll('\\', '\\\\').replaceAll('\'', '\\\'').replaceAll('\n', '\\n')}'`
}

async function readJson(path) {
	return JSON.parse(await readFile(path, 'utf8'))
}

async function writeJson(path, value) {
	await writeFile(path, `${JSON.stringify(value, null, '\t')}\n`)
}

function printSummary(options) {
	console.log(`Configured ${options.title} (${options.name}).`)
	console.log(`Language: ${options.language}; theme: ${options.colorScheme}/${options.primaryColor}.`)
	console.log('Start with npm run dev.')
}

function getHelp() {
	return `Usage: npm run template:setup -- [options]

In an interactive terminal, omitting --yes prompts for missing options.

Options:
  --name <name>                 npm package name
  --title <title>               user-facing application name
  --description <text>          default SEO description
  --lang <tag>                  document language, for example en or uk-UA
  --color-scheme <value>        light, dark, or auto
  --primary-color <value>       Mantine default color name
  --style <language>            css or scss
  -y, --yes                     accept defaults for missing options
  -h, --help                    show this help
`
}
