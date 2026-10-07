import { execFile } from 'node:child_process'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const execute = promisify(execFile)
const script = resolve(import.meta.dirname, '../create-package.mjs')

it('creates a bounded-context workspace with a public API and extraction decision', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-package-'))
	try {
		await writeFile(resolve(root, 'package.json'), '{"name":"field-notes","packageManager":"npm@11.6.2"}\n')
		await execute(process.execPath, [script, 'orderOperations', '--no-install'], { cwd: root })

		const rootManifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')) as { workspaces: string[] }
		const manifest = JSON.parse(await readFile(resolve(root, 'packages/orderOperations/package.json'), 'utf8')) as {
			exports: Record<string, string>
			jst: { architectureDecision: string }
			name: string
		}
		expect(rootManifest.workspaces).toContain('packages/*')
		expect(manifest.name).toBe('@field-notes/order-operations')
		expect(manifest.exports['.']).toBe('./src/orderOperations.public.ts')
		expect(await readFile(resolve(root, 'packages/orderOperations', manifest.jst.architectureDecision), 'utf8')).toContain('## Rollback')
		await expect(access(resolve(root, 'packages/orderOperations/src/orderOperations.public.ts'))).resolves.toBeUndefined()
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

it('requires an operational contract before creating a microfrontend', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-microfrontend-'))
	try {
		await writeFile(resolve(root, 'package.json'), '{"name":"field-notes"}\n')
		await expect(
			execute(process.execPath, [script, 'billing', '--kind', 'microfrontend', '--no-install'], { cwd: root }),
		).rejects.toThrow()
		await expect(access(resolve(root, 'packages/billing'))).rejects.toThrow()
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

it('registers packages for pnpm workspaces', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-package-pnpm-'))
	try {
		await writeFile(resolve(root, 'package.json'), '{"name":"field-notes","packageManager":"pnpm@10.0.0"}\n')
		await writeFile(resolve(root, 'pnpm-workspace.yaml'), 'packages:\n')
		await execute(process.execPath, [script, 'reporting', '--no-install'], { cwd: root })

		expect(await readFile(resolve(root, 'pnpm-workspace.yaml'), 'utf8')).toContain('- \'packages/*\'')
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})
