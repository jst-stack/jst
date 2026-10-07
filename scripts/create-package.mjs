import { spawn } from 'node:child_process'
import { access, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'

const { positionals, values } = parseArgs({
	allowNegative: true,
	allowPositionals: true,
	args: process.argv.slice(2),
	options: {
		'dry-run': { type: 'boolean' },
		'fallback': { type: 'string' },
		'host-contract': { type: 'string' },
		'install': { default: true, type: 'boolean' },
		'kind': { default: 'bounded-context', type: 'string' },
		'owner': { type: 'string' },
	},
	strict: true,
})

const [name] = positionals
validateInput(name, positionals, values)
const root = process.cwd()
const packageRoot = resolve(root, 'packages', name)
const rootManifestPath = resolve(root, 'package.json')
const rootManifestSource = await readFile(rootManifestPath, 'utf8')
const rootManifest = JSON.parse(rootManifestSource)
const projectFiles = await snapshotFiles(root)
const decisionName = await nextDecisionName(root, name)
const decisionPath = resolve(root, 'docs/decisions', decisionName)
const packageName = createPackageName(rootManifest.name, name)
const plan = createPlan({ decisionName, name, packageName, values })

await assertMissing(packageRoot)
if (values['dry-run']) {
	process.stdout.write(`${JSON.stringify({ files: [...plan.keys()], packageName }, null, 2)}\n`)
	process.exit(0)
}

const temporary = resolve(dirname(packageRoot), `.${basename(packageRoot)}-${process.pid}.tmp`)
try {
	for (const [path, source] of plan) {
		const target = path === decisionName ? decisionPath : resolve(temporary, path)
		await mkdir(dirname(target), { recursive: true })
		await writeFile(target, source)
	}
	await rename(temporary, packageRoot)
	await registerWorkspace(root, rootManifestPath, rootManifest)
	if (values.install) {
		await installWorkspace(root, rootManifest.packageManager)
	}
	process.stdout.write(`Created ${values.kind} package ${packageName} at packages/${name}.\n`)
}
catch (error) {
	await rm(temporary, { force: true, recursive: true })
	await rm(packageRoot, { force: true, recursive: true })
	await rm(decisionPath, { force: true })
	await restoreFiles(projectFiles)
	throw error
}

function createPlan({ decisionName, name, packageName, values }) {
	const typeName = `${name[0].toUpperCase()}${name.slice(1)}`
	const jst = {
		architectureDecision: `../../docs/decisions/${decisionName}`,
		kind: values.kind,
	}
	if (values.kind === 'microfrontend') {
		Object.assign(jst, {
			fallback: values.fallback,
			hostContract: values['host-contract'],
			owner: values.owner,
		})
	}
	const manifest = {
		jst,
		name: packageName,
		type: 'module',
		private: true,
		exports: { '.': `./src/${name}.public.ts` },
		scripts: { build: 'tsc --noEmit', test: 'vitest run --passWithNoTests' },
	}
	return new Map([
		['package.json', `${JSON.stringify(manifest, null, '\t')}\n`],
		[`src/${name}.model.ts`, `export interface ${typeName} {\n\treadonly id: string\n}\n`],
		[`src/${name}.public.ts`, `export type { ${typeName} } from './${name}.model'\n`],
		['tsconfig.json', `${JSON.stringify({ extends: '../../tsconfig.app.json', include: ['src'] }, null, '\t')}\n`],
		[decisionName, createDecision(name, values.kind)],
	])
}

function createDecision(name, kind) {
	return `# Extract ${name} as ${kind}\n\n## Context\n\nDescribe the demonstrated ownership, reuse, or release pressure.\n\n## Decision\n\nMove ${name} behind one package public API without changing its internal dependency direction.\n\n## Consequences\n\nRecord added build, testing, and coordination costs.\n\n## Revisit when\n\nState the evidence that would justify another boundary change.\n\n## Rollback\n\nMove the package back into the application module and remove the workspace dependency.\n`
}

async function registerWorkspace(root, manifestPath, manifest) {
	const workspaces = Array.isArray(manifest.workspaces) ? manifest.workspaces : manifest.workspaces?.packages ?? []
	if (!workspaces.includes('packages/*')) {
		const packages = [...workspaces, 'packages/*']
		manifest.workspaces = Array.isArray(manifest.workspaces) || !manifest.workspaces
			? packages
			: { ...manifest.workspaces, packages }
	}
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`)
	if (!manifest.packageManager?.startsWith('pnpm@')) {
		return
	}
	const workspacePath = resolve(root, 'pnpm-workspace.yaml')
	const source = await readFile(workspacePath, 'utf8').catch(() => 'packages:\n')
	if (!source.includes('\'packages/*\'') && !source.includes('"packages/*"') && !/^\s*-\s+packages\/\*\s*$/mu.test(source)) {
		await writeFile(workspacePath, `${source.trimEnd()}\n  - 'packages/*'\n`)
	}
}

async function installWorkspace(root, packageManager) {
	const command = packageManager?.startsWith('pnpm@') ? 'pnpm' : 'npm'
	await run(command, ['install', '--ignore-scripts'], root)
}

async function nextDecisionName(root, name) {
	const directory = resolve(root, 'docs/decisions')
	const entries = await readdir(directory).catch(() => [])
	const next = entries.reduce((maximum, entry) => Math.max(maximum, Number.parseInt(entry, 10) || 0), 0) + 1
	return `${String(next).padStart(4, '0')}-extract-${name}.md`
}

function createPackageName(rootName, name) {
	const scope = String(rootName ?? 'app').split('/').at(-1).replace(/[^a-z0-9-]/gu, '-') || 'app'
	const packageName = name.replace(/[A-Z]/gu, match => `-${match.toLowerCase()}`)
	return `@${scope}/${packageName}`
}

async function snapshotFiles(root) {
	return Promise.all(['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'].map(async (name) => {
		const path = resolve(root, name)
		return { content: await readFile(path).catch(() => undefined), path }
	}))
}

async function restoreFiles(files) {
	await Promise.all(files.map(file => file.content ? writeFile(file.path, file.content) : rm(file.path, { force: true })))
}

function validateInput(name, positionals, options) {
	if (!name || positionals.length !== 1 || !/^[a-z][A-Za-z0-9]*$/u.test(name)) {
		fail('Usage: npm run create:package -- <lowerCamelName> [--kind bounded-context|microfrontend]')
	}
	if (!['bounded-context', 'library', 'microfrontend'].includes(options.kind)) {
		fail('Package kind must be bounded-context, library, or microfrontend.')
	}
	if (options.kind === 'microfrontend' && [options.owner, options['host-contract'], options.fallback].some(value => !value)) {
		fail('Microfrontends require --owner, --host-contract, and --fallback.')
	}
}

async function assertMissing(path) {
	await access(path).then(() => fail(`Package already exists: ${path}`), () => undefined)
}

function run(command, args, cwd) {
	return new Promise((resolvePromise, reject) => {
		const child = spawn(command, args, { cwd, shell: process.platform === 'win32', stdio: 'inherit' })
		child.once('error', reject)
		child.once('close', code => code === 0 ? resolvePromise() : reject(new Error(`${command} failed with exit code ${code}.`)))
	})
}

function fail(message) {
	throw new Error(message)
}
