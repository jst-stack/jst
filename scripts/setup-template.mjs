import { readFile, rm, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = fileURLToPath(new URL('..', import.meta.url))
const colorSchemes = ['light', 'dark', 'auto']
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
const templateOnlyPaths = ['.gitmodules', 'AUDIT.md', 'scripts/__tests__', 'showcase']

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
		printSummary(options)
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
}

async function setupProject(options) {
	for (const templatePath of templateOnlyPaths) {
		await rm(resolve(root, templatePath), { force: true, recursive: true })
	}

	await writeAppConfig(options)
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
	delete packageJson.scripts['template:setup']
	packageJson.knip = { ignore: ['src/shared/lib/react.lib.ts', 'src/shared/ui/svgIcon.component.tsx'] }

	await writeJson(packageJsonPath, packageJson)
}

async function updatePackageLock(options) {
	const packageLockPath = resolve(root, 'package-lock.json')
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

## Quality

\`npm run check\` runs code, style, architecture, unit, type, build, and unused-code checks. Run browser contracts with \`npm run test:e2e\`.

## Architecture

Routes are discovered from \`src/pages\`. Follow \`skills/frontend-architecture/SKILL.md\` when adding a vertical slice or reviewing dependency boundaries.

Create a compliant slice with \`npm run create:slice -- <entity|feature|widget> <lowerCamelName>\`.
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
  -y, --yes                     accept defaults for missing options
  -h, --help                    show this help
`
}
