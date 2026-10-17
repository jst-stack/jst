import { spawn } from 'node:child_process'
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { resolveValues } from './lib/slice-options.mjs'
import { createPlan } from './lib/slice-plan.mjs'
import { fail } from './lib/slice-shared.mjs'

const dependencySpecs = {
	'@reatom/core': '@reatom/core@1001.3.0',
	'@reatom/react': '@reatom/react@1001.0.1',
	'@testing-library/react': '@testing-library/react@16.3.3',
	'jsdom': 'jsdom@30.1.2',
	'msw': 'msw@3.0.3',
	'sass': 'sass@1.105.1',
	'zod': 'zod@4.6.7',
}

const rawArguments = process.argv.slice(2)
if (rawArguments.includes('--help') || rawArguments.includes('-h')) {
	process.stdout.write(`Usage: npm run create:slice -- <entity|feature|module|widget> <lowerCamelName> [options]

Options:
  --stateful       add a Reatom store and reactive entry
  --repository     add an entity repository, DTO, mapper, HTTP adapter, and provider
  --service        add an entity service
  --persistence    add an entity persistence port
  --ui             add Mantine UI
  --tests          add a colocated test
  --msw            add an MSW handler (requires --repository)
  --public         expose a feature or module public API
  --style <value>  use css or scss modules
  --no-install     do not install required packages
  --dry-run        print the file and dependency plan without writing
  -y, --yes        accept non-interactive defaults
`)
	process.exit(0)
}
const command = parseArgs({
	allowNegative: true,
	allowPositionals: true,
	args: rawArguments[0] === '--' ? rawArguments.slice(1) : rawArguments,
	options: {
		'dry-run': { type: 'boolean' },
		'install': { default: true, type: 'boolean' },
		'msw': { type: 'boolean' },
		'persistence': { type: 'boolean' },
		'public': { type: 'boolean' },
		'repository': { type: 'boolean' },
		'service': { type: 'boolean' },
		'stateful': { type: 'boolean' },
		'style': { type: 'string' },
		'tests': { type: 'boolean' },
		'ui': { type: 'boolean' },
		'yes': { short: 'y', type: 'boolean' },
	},
	strict: true,
})

const [kind, name] = command.positionals
validateInput(kind, name, command.positionals, command.values)
const values = await resolveValues(kind, command.values)
const root = process.cwd()
const policy = await readPolicy(root)
const layer = policy.generator.layers[kind]
const target = resolve(root, 'src', layer, name)
const style = values.style ?? policy.styles.moduleExtension
const plan = createPlan({ kind, name, policy, style, values })

await assertMissing(target)
if (values['dry-run']) {
	process.stdout.write(`${JSON.stringify({ dependencies: plan.dependencies, devDependencies: plan.devDependencies, files: [...plan.files.keys()] }, null, 2)}\n`)
	process.exit(0)
}

const temporary = resolve(dirname(target), `.${basename(target)}-${process.pid}.tmp`)
const projectFiles = await snapshotProjectFiles(root)
let movedToTarget = false
const rollback = async () => {
	await rm(temporary, { force: true, recursive: true })
	if (movedToTarget) {
		await rm(target, { force: true, recursive: true })
	}
	await restoreProjectFiles(projectFiles)
}
const onSignal = (signal) => {
	rollback().catch(() => {}).finally(() => process.exit(signal === 'SIGINT' ? 130 : 143))
}
process.once('SIGINT', onSignal)
process.once('SIGTERM', onSignal)
try {
	for (const [relativePath, source] of plan.files) {
		const path = resolve(temporary, relativePath)
		await mkdir(dirname(path), { recursive: true })
		await writeFile(path, source)
	}
	await rename(temporary, target)
	movedToTarget = true
	if (values.install && (plan.dependencies.length || plan.devDependencies.length)) {
		await installDependencies(root, plan)
	}
	process.stdout.write(`${[
		`Created ${kind} slice at src/${layer}/${name}.`,
		`Next: compose @/${layer}/${name}/${name}${policy.imports.publicApiSuffix} from an owning page or higher layer.`,
		'Knip intentionally keeps the quality gate red until the new slice is reachable.',
		...(values.install && (plan.dependencies.length || plan.devDependencies.length)
			? ['JST installed tested dependency versions. Extend the generated imports and API; do not replace or inspect package internals.']
			: []),
	].join('\n')}\n`)
}

catch (error) {
	try {
		await rollback()
	}
	catch (rollbackError) {
		error.cause = rollbackError
	}
	throw error
}

finally {
	process.off('SIGINT', onSignal)
	process.off('SIGTERM', onSignal)
}

async function readPolicy(root) {
	const { defineConfig } = await import('@jst-stack/eslint-plugin')
	const path = resolve(root, 'jst.config.ts')
	try {
		await access(path)
	}
	catch (error) {
		if (error?.code === 'ENOENT') {
			return defineConfig()
		}
		throw error
	}
	const config = await import(pathToFileURL(path).href)
	return defineConfig(config.default)
}

async function installDependencies(root, plan) {
	const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
	const packageManager = manifest.packageManager?.startsWith('pnpm@') ? 'pnpm' : 'npm'
	const install = packageManager === 'pnpm'
		? ['add', '--ignore-workspace-root-check']
		: ['install']
	if (plan.dependencies.length) {
		await run(packageManager, [...install, ...plan.dependencies.map(toDependencySpec)], root)
	}
	if (plan.devDependencies.length) {
		await run(packageManager, [...install, '--save-dev', ...plan.devDependencies.map(toDependencySpec)], root)
	}
	if (packageManager === 'npm' && plan.dependencies.length && plan.devDependencies.length) {
		await run(packageManager, ['install', '--ignore-scripts'], root)
	}
}

function toDependencySpec(name) {
	return dependencySpecs[name] ?? name
}

async function snapshotProjectFiles(root) {
	return Promise.all(['package.json', 'package-lock.json', 'pnpm-lock.yaml'].map(async (name) => {
		const path = resolve(root, name)
		try {
			return { content: await readFile(path), path }
		}
		catch (error) {
			if (error?.code === 'ENOENT') {
				return { path }
			}
			throw error
		}
	}))
}

async function restoreProjectFiles(files) {
	await Promise.all(files.map(async (file) => {
		if (file.content) {
			await writeFile(file.path, file.content)
		}
		else {
			await rm(file.path, { force: true })
		}
	}))
}

function run(command, args, cwd) {
	return new Promise((resolvePromise, reject) => {
		const child = spawn(command, args, { cwd, shell: process.platform === 'win32', stdio: 'inherit' })
		child.once('error', reject)
		child.once('close', code => code === 0
			? resolvePromise()
			: reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}.`)))
	})
}

async function assertMissing(path) {
	try {
		await access(path)
		fail(`Slice already exists: ${path}`)
	}
	catch (error) {
		if (error?.code !== 'ENOENT') {
			throw error
		}
	}
}

function validateInput(kind, name, positionals, values) {
	if (!['entity', 'feature', 'module', 'widget'].includes(kind) || !name || positionals.length !== 2) {
		fail('Usage: npm run create:slice -- <entity|feature|module|widget> <lowerCamelName> [options]')
	}
	if (!/^[a-z][A-Za-z0-9]*$/u.test(name)) {
		fail('Slice name must be lowerCamelCase, for example accountSettings.')
	}
	if (values.style && !['css', 'scss'].includes(values.style)) {
		fail('Style must be css or scss.')
	}
}
