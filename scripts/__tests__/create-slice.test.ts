import { execFile } from 'node:child_process'
import { access, chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const execute = promisify(execFile)
const script = resolve(import.meta.dirname, '../create-slice.mjs')
const repositoryRoot = resolve(import.meta.dirname, '../..')

it('prints discoverable command help', async () => {
	const { stdout } = await execute(process.execPath, [script, '--help'])

	expect(stdout).toContain('Usage: npm run create:slice')
	expect(stdout).toContain('--stateful')
	expect(stdout).toContain('--repository')
	expect(stdout).toContain('--no-install')
})

it('creates complete slices without empty scaffolding', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-'))
	try {
		await execute(process.execPath, [script, '--', 'entity', 'accountSettings', '--ui', '--repository', '--persistence', '--tests', '--no-install'], { cwd: root })
		await expect(access(resolve(root, 'src/entities/accountSettings/model/accountSettings.model.ts'))).resolves.toBeUndefined()
		await expect(access(resolve(root, 'src/entities/accountSettings/repository/accountSettings.dto.ts'))).resolves.toBeUndefined()
		await expect(access(resolve(root, 'src/entities/accountSettings/ui/accountSettings.component.module.css'))).resolves.toBeUndefined()
		await expect(access(resolve(root, 'src/entities/accountSettings/__tests__/accountSettings.test.tsx'))).resolves.toBeUndefined()
		await expect(access(resolve(root, 'src/entities/accountSettings/model/.gitkeep'))).rejects.toThrow()
		expect(await readFile(resolve(root, 'src/entities/accountSettings/repository/accountSettings.repository.ts'), 'utf8'))
			.toContain('findById: (id: string) => Promise<AccountSettings>')
		expect(await readFile(resolve(root, 'src/entities/accountSettings/repository/accountSettings.persister.ts'), 'utf8'))
			.toContain('clear: () => Promise<void>')
		await prepareTypecheckFixture(root)
		const { stdout } = await execute(process.execPath, [script, 'feature', 'readingList', '--stateful', '--no-install'], { cwd: root })
		expect(stdout).toContain('compose @/features/readingList/readingList.public')
		expect(stdout).toContain('quality gate red until the new slice is reachable')
		expect(await readFile(resolve(root, 'src/features/readingList/readingList.public.ts'), 'utf8'))
			.toContain('ReadingListEntry')
		const entry = await readFile(resolve(root, 'src/features/readingList/readingList.entry.tsx'), 'utf8')
		expect(entry).toContain('reatomComponent')
		expect(entry).toContain('useWrap(store.increment)')
		expect(await readFile(resolve(root, 'src/features/readingList/readingList.store.ts'), 'utf8'))
			.toContain('class ReadingListStore')
		expect(await getKnipFailure(root)).toContain('readingList.public.ts')
		await writeFile(resolve(root, 'src/owner.ts'), 'import { ReadingListEntry } from \'./features/readingList/readingList.public\'\nvoid ReadingListEntry\n')
		await expect(runKnip(root)).resolves.toMatchObject({ stdout: '' })
		await execute(process.execPath, [script, 'module', 'projectManagement', '--stateful', '--tests', '--no-install'], { cwd: root })
		expect(await readFile(resolve(root, 'src/modules/projectManagement/projectManagement.public.ts'), 'utf8'))
			.toContain('ProjectManagementEntry')
		await expect(access(resolve(root, 'src/modules/projectManagement/__tests__/projectManagement.test.tsx'))).resolves.toBeUndefined()
		try {
			await execute(process.execPath, [
				resolve(repositoryRoot, 'node_modules/typescript/bin/tsc'),
				'--project',
				resolve(root, 'tsconfig.json'),
			], { cwd: root })
		}
		catch (error) {
			throw new Error(error instanceof Error && 'stdout' in error ? String(error.stdout) : String(error))
		}
		await expect(execute(process.execPath, [script, 'feature', '../escape'], { cwd: root })).rejects.toThrow()
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
}, 40_000)

async function prepareTypecheckFixture(root: string) {
	await mkdir(resolve(root, 'src/shared/http'), { recursive: true })
	await symlink(resolve(repositoryRoot, 'node_modules'), resolve(root, 'node_modules'), 'dir')
	await writeFile(resolve(root, 'package.json'), '{"knip":{"entry":["src/owner.ts"],"ignore":["src/entities/**","src/shared/**"]}}\n')
	await writeFile(resolve(root, 'src/owner.ts'), 'export {}\n')
	await writeFile(resolve(root, 'src/shared/http/httpClient.types.ts'), `
import { InjectionToken } from '@needle-di/core'
export interface HttpClient { request: (url: string, init?: RequestInit) => Promise<unknown> }
export const HTTP_CLIENT_TOKEN = new InjectionToken<HttpClient>('HTTP_CLIENT')
`)
	await writeFile(resolve(root, 'src/vite-env.d.ts'), 'declare module \'*.module.css\' { const classes: Record<string, string>; export default classes }\n')
	await writeFile(resolve(root, 'src/testing-library.d.ts'), `declare module '@testing-library/react' { export function render(value: unknown): void; export const screen: { getByRole(role: string, options?: unknown): unknown } }\n`)
	await writeFile(resolve(root, 'src/reatom.d.ts'), `
declare module '@reatom/core' {
	export function action<T extends (...args: never[]) => unknown>(callback: T, name?: string): T
	export function atom<T>(value: T, name?: string): { (): T; set(value: T): void }
}
declare module '@reatom/react' {
	export function reatomComponent<T>(component: T, name?: string): T
	export function useWrap<T extends (...args: never[]) => unknown>(callback: T): T
}
`)
	await writeFile(resolve(root, 'tsconfig.json'), `${JSON.stringify({
		compilerOptions: {
			baseUrl: '.',
			jsx: 'react-jsx',
			lib: ['ESNext', 'DOM'],
			module: 'ESNext',
			moduleResolution: 'bundler',
			paths: { '@/*': ['./src/*'] },
			skipLibCheck: true,
			strict: true,
			target: 'ES2023',
		},
		include: ['src'],
	}, null, '\t')}\n`)
}

function runKnip(root: string) {
	return execute(process.execPath, [resolve(repositoryRoot, 'node_modules/knip/bin/knip.js'), '--include', 'files'], { cwd: root })
}

async function getKnipFailure(root: string) {
	try {
		await runKnip(root)
	}
	catch (error) {
		if (error instanceof Error && 'stdout' in error && typeof error.stdout === 'string') {
			return error.stdout
		}
		throw error
	}
	throw new Error('Knip unexpectedly passed')
}

it('rolls back source and manifests when dependency installation fails', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-rollback-'))
	const manifest = '{"name":"rollback-probe","packageManager":"npm@11.6.2"}\n'
	const bin = resolve(root, 'bin')

	try {
		await mkdir(bin)
		await writeFile(resolve(root, 'package.json'), manifest)

		// Use a platform-specific executable to intercept npm.
		if (process.platform === 'win32') {
			await writeFile(
				resolve(bin, 'npm.cmd'),
				'@echo off\r\nexit /b 23\r\n',
			)
		}
		else {
			await writeFile(
				resolve(bin, 'npm'),
				'#!/bin/sh\nexit 23\n',
			)
			await chmod(resolve(bin, 'npm'), 0o755)
		}

		// Prepend the fixture directory using the platform's PATH separator.
		const path = [bin, process.env.PATH]
			.filter(Boolean)
			.join(process.platform === 'win32' ? ';' : ':')

		await expect(execute(process.execPath, [
			script,
			'entity',
			'failedOrder',
			'--repository',
		], {
			cwd: root,
			env: { ...process.env, PATH: path },
		})).rejects.toThrow()

		// The failed transaction must restore the original manifest.
		expect(await readFile(resolve(root, 'package.json'), 'utf8')).toBe(manifest)

		// The generated slice must not survive the failed installation.
		await expect(
			access(resolve(root, 'src/entities/failedOrder')),
		).rejects.toThrow()
	}
	finally {
		// Remove the isolated fixture regardless of the test outcome.
		await rm(root, { force: true, recursive: true })
	}
}, 15_000)

it('keeps concurrent writes to the same slice consistent', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-concurrent-'))

	try {
		const results = await Promise.allSettled([
			execute(process.execPath, [
				script,
				'entity',
				'concurrentOrder',
				'--no-install',
			], { cwd: root }),

			execute(process.execPath, [
				script,
				'entity',
				'concurrentOrder',
				'--no-install',
			], { cwd: root }),
		])
		// Exactly one process should create the slice successfully.
		const successes = results.filter(result => result.status === 'fulfilled')
		expect(successes).toHaveLength(1)

		// The other process must fail rather than silently succeeding.
		const failures = results.filter(result => result.status === 'rejected')
		expect(failures).toHaveLength(1)

		// The successful process must leave the complete slice behind.
		const target = resolve(root, 'src/entities/concurrentOrder')
		await expect(
			access(resolve(target, 'model/concurrentOrder.model.ts')),
		).resolves.toBeUndefined()
		await expect(
			access(resolve(target, 'concurrentOrder.public.ts')),
		).resolves.toBeUndefined()
		// No temporary generator directory should remain.
		const parent = resolve(root, 'src/entities')
		const entries = await import('node:fs/promises').then(
			({ readdir }) => readdir(parent),
		)

		expect(entries.filter(name => name.endsWith('.tmp'))).toEqual([])
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
}, 15_000)

it('installs JST-tested dependency versions instead of floating latest releases', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-versions-'))
	try {
		const bin = resolve(root, 'bin')

		await mkdir(bin)
		await writeFile(resolve(root, 'package.json'), '{"packageManager":"npm@11.6.2"}\n')

		// Use a platform-specific shim so the test never launches real npm.
		if (process.platform === 'win32') {
			await writeFile(
				resolve(bin, 'npm.cmd'),
				'@echo off\r\necho %*>>npm-calls.txt\r\nexit /b 0\r\n',
			)
		}
		else {
			await writeFile(
				resolve(bin, 'npm'),
				'#!/bin/sh\nprintf "%s\\n" "$*" >> npm-calls.txt\n',
			)
			await chmod(resolve(bin, 'npm'), 0o755)
		}

		await execute(
			process.execPath,
			[script, 'feature', 'reviewQueue', '--stateful', '--tests', '--yes'],
			{
				cwd: root,
				env: {
					...process.env,
					PATH: [bin, process.env.PATH]
						.filter(Boolean)
						.join(process.platform === 'win32' ? ';' : ':'),
				},
			},
		)

		const calls = await readFile(resolve(root, 'npm-calls.txt'), 'utf8')
		expect(calls).toContain('@reatom/core@1001.3.0')
		expect(calls).toContain('@reatom/react@1001.0.1')
		expect(calls).toContain('@testing-library/react@16.3.3')
		expect(calls).toContain('jsdom@30.1.2')
		expect(calls).toContain('install --ignore-scripts')
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

it('uses SCSS policy and reports exact dry-run output without writing', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-scss-'))
	try {
		await symlink(resolve(repositoryRoot, 'node_modules'), resolve(root, 'node_modules'), 'dir')
		await writeFile(resolve(root, 'jst.config.ts'), `import { defineConfig } from '@jst-stack/eslint-plugin'

export default defineConfig({
	files: { roleDirectories: { component: 'views' }, testSuffixes: ['spec'] },
	generator: { layers: { widget: 'blocks' }, testDirectory: 'tests' },
	imports: {
		alias: '~/',
		layers: { blocks: ['blocks', 'features', 'entities', 'shared'] },
		slicedLayers: ['pages', 'blocks', 'features', 'entities'],
	},
	styles: { moduleExtension: 'scss' },
})
`)
		const { stdout } = await execute(process.execPath, [script, 'widget', 'accountMenu', '--dry-run', '--tests'], { cwd: root })
		expect(stdout).toContain('views/accountMenu.component.module.scss')
		expect(stdout).toContain('tests/accountMenu.spec.tsx')
		expect(stdout).toContain('@testing-library/react')
		expect(stdout).toContain('sass')
		await expect(access(resolve(root, 'src/blocks/accountMenu'))).rejects.toThrow()

		await execute(process.execPath, [script, 'entity', 'auditLog', '--repository', '--tests', '--no-install'], { cwd: root })
		await expect(access(resolve(root, 'src/entities/auditLog/tests/auditLog.spec.ts'))).resolves.toBeUndefined()
		expect(await readFile(resolve(root, 'src/entities/auditLog/repository/auditLog.adapter.ts'), 'utf8')).toContain('from \'~/shared/http/httpClient.types\'')
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

it('plans every optional dependency through replaceable slice adapters', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-adapters-'))
	try {
		const { stdout } = await execute(process.execPath, [
			script,
			'entity',
			'orderHistory',
			'--repository',
			'--stateful',
			'--ui',
			'--tests',
			'--msw',
			'--dry-run',
		], { cwd: root })

		for (const dependency of ['@reatom/core', '@testing-library/react', 'jsdom', 'msw', 'zod']) {
			expect(stdout).toContain(dependency)
		}
		expect(stdout).toContain('orderHistory.handler.ts')
		expect(stdout).toContain('orderHistory.store.ts')
		await expect(access(resolve(root, 'src/entities/orderHistory'))).rejects.toThrow()
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})
