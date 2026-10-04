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

it('creates complete slices without empty scaffolding', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-'))
	try {
		await execute(process.execPath, [script, '--', 'entity', 'accountSettings', '--ui', '--repository', '--tests', '--no-install'], { cwd: root })
		await expect(access(resolve(root, 'src/entities/accountSettings/model/accountSettings.model.ts'))).resolves.toBeUndefined()
		await expect(access(resolve(root, 'src/entities/accountSettings/repository/accountSettings.dto.ts'))).resolves.toBeUndefined()
		await expect(access(resolve(root, 'src/entities/accountSettings/ui/accountSettings.component.module.css'))).resolves.toBeUndefined()
		await expect(access(resolve(root, 'src/entities/accountSettings/__tests__/accountSettings.test.tsx'))).resolves.toBeUndefined()
		await expect(access(resolve(root, 'src/entities/accountSettings/model/.gitkeep'))).rejects.toThrow()
		await prepareTypecheckFixture(root)
		await execute(process.execPath, [script, 'feature', 'readingList', '--stateful', '--no-install'], { cwd: root })
		expect(await readFile(resolve(root, 'src/features/readingList/readingList.public.ts'), 'utf8'))
			.toContain('ReadingListEntry')
		expect(await readFile(resolve(root, 'src/features/readingList/readingList.entry.tsx'), 'utf8'))
			.toContain('reatomComponent')
		expect(await readFile(resolve(root, 'src/features/readingList/readingList.store.ts'), 'utf8'))
			.toContain('class ReadingListStore')
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
}, 20_000)

async function prepareTypecheckFixture(root: string) {
	await mkdir(resolve(root, 'src/shared/http'), { recursive: true })
	await symlink(resolve(repositoryRoot, 'node_modules'), resolve(root, 'node_modules'), 'dir')
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
	export function wrap<T extends (...args: never[]) => unknown>(callback: T): T
}
declare module '@reatom/react' {
	export function reatomComponent<T>(component: T, name?: string): T
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

it('rolls back source and manifests when dependency installation fails', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-rollback-'))
	const manifest = '{"name":"rollback-probe","packageManager":"npm@11.6.2"}\n'
	try {
		await mkdir(resolve(root, 'bin'))
		await writeFile(resolve(root, 'package.json'), manifest)
		await writeFile(resolve(root, 'bin/npm'), '#!/bin/sh\nexit 23\n')
		await chmod(resolve(root, 'bin/npm'), 0o755)

		await expect(execute(process.execPath, [script, 'entity', 'failedOrder', '--repository'], {
			cwd: root,
			env: { ...process.env, PATH: `${resolve(root, 'bin')}:${process.env.PATH}` },
		})).rejects.toThrow()

		expect(await readFile(resolve(root, 'package.json'), 'utf8')).toBe(manifest)
		await expect(access(resolve(root, 'src/entities/failedOrder'))).rejects.toThrow()
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
