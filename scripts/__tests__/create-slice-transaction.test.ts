import { execFile, spawn } from 'node:child_process'
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const execute = promisify(execFile)
const script = resolve(import.meta.dirname, '../create-slice.mjs')

it('does not delete the winner when the same slice name is created concurrently', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-race-'))
	try {
		await writeFile(resolve(root, 'package.json'), '{"packageManager":"npm@11.6.2"}\n')
		const args = [script, 'entity', 'collision', '--no-install', '--yes']
		const outcomes = await Promise.allSettled([
			execute(process.execPath, args, { cwd: root }),
			execute(process.execPath, args, { cwd: root }),
		])

		expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1)
		expect(outcomes.filter(outcome => outcome.status === 'rejected')).toHaveLength(1)
		await expect(access(resolve(root, 'src/entities/collision'))).resolves.toBeUndefined()
		expect(await readFile(resolve(root, 'src/entities/collision/collision.public.ts'), 'utf8')).toContain('Collision')
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
}, 30_000)

it('rolls back the slice and manifests when interrupted during install', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-interrupt-'))
	const manifest = '{"name":"interrupt-probe","packageManager":"npm@11.6.2"}\n'
	try {
		await mkdir(resolve(root, 'bin'))
		await writeFile(resolve(root, 'package.json'), manifest)
		await writeFile(resolve(root, 'bin/npm'), '#!/bin/sh\necho started > npm-started\nsleep 10\n')
		await chmod(resolve(root, 'bin/npm'), 0o755)

		const child = spawn(process.execPath, [script, 'entity', 'interruptedOrder', '--repository', '--yes'], {
			cwd: root,
			env: { ...process.env, PATH: `${resolve(root, 'bin')}:${process.env.PATH}` },
			stdio: 'ignore',
		})
		const exit = new Promise<{ code: number | null, signal: NodeJS.Signals | null }>((resolveExit) => {
			child.once('close', (code, signal) => resolveExit({ code, signal }))
		})

		await waitForFile(resolve(root, 'npm-started'))
		child.kill('SIGINT')

		expect((await exit).code).toBe(130)
		expect(await readFile(resolve(root, 'package.json'), 'utf8')).toBe(manifest)
		await expect(access(resolve(root, 'src/entities/interruptedOrder'))).rejects.toThrow()
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
}, 30_000)

it('fails cleanly without touching a pre-existing slice', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-existing-'))
	try {
		await mkdir(resolve(root, 'src/entities/existing'), { recursive: true })
		await writeFile(resolve(root, 'src/entities/existing/keep.txt'), 'precious\n')

		await expect(execute(process.execPath, [script, 'entity', 'existing', '--no-install', '--yes'], { cwd: root })).rejects.toThrow()

		expect(await readFile(resolve(root, 'src/entities/existing/keep.txt'), 'utf8')).toBe('precious\n')
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
}, 30_000)

it('preserves the install error when manifest rollback fails', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-rollback-fail-'))
	try {
		await mkdir(resolve(root, 'bin'))
		await writeFile(resolve(root, 'package.json'), '{"name":"rollback-fail-probe","packageManager":"npm@11.6.2"}\n')
		await chmod(resolve(root, 'package.json'), 0o444)
		await writeFile(resolve(root, 'bin/npm'), '#!/bin/sh\nexit 23\n')
		await chmod(resolve(root, 'bin/npm'), 0o755)

		let stderr = ''
		try {
			await execute(process.execPath, [script, 'entity', 'stuckOrder', '--repository', '--yes'], {
				cwd: root,
				env: { ...process.env, PATH: `${resolve(root, 'bin')}:${process.env.PATH}` },
			})
		}
		catch (error) {
			stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : String(error)
		}

		expect(stderr).toContain('failed with exit code 23')
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
}, 30_000)

it('restores npm manifests and a freshly written lockfile when install fails midway', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-midway-'))
	const manifest = '{"name":"midway-probe","packageManager":"npm@11.6.2"}\n'
	try {
		await mkdir(resolve(root, 'bin'))
		await writeFile(resolve(root, 'package.json'), manifest)
		await writeFile(resolve(root, 'bin/npm'), '#!/bin/sh\necho \'{"name":"corrupted"}\' > package.json\necho corrupted > package-lock.json\nexit 23\n')
		await chmod(resolve(root, 'bin/npm'), 0o755)

		await expect(execute(process.execPath, [script, 'entity', 'midwayOrder', '--repository'], {
			cwd: root,
			env: { ...process.env, PATH: `${resolve(root, 'bin')}:${process.env.PATH}` },
		})).rejects.toThrow()

		expect(await readFile(resolve(root, 'package.json'), 'utf8')).toBe(manifest)
		await expect(access(resolve(root, 'package-lock.json'))).rejects.toThrow()
		await expect(access(resolve(root, 'src/entities/midwayOrder'))).rejects.toThrow()
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
}, 30_000)

it('rolls back pnpm manifests and lockfile when installation fails', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-pnpm-'))
	const manifest = '{"name":"pnpm-probe","packageManager":"pnpm@10.12.0"}\n'
	const lockfile = 'lockfileVersion: 9\n'
	try {
		await mkdir(resolve(root, 'bin'))
		await writeFile(resolve(root, 'package.json'), manifest)
		await writeFile(resolve(root, 'pnpm-lock.yaml'), lockfile)
		await writeFile(resolve(root, 'bin/pnpm'), '#!/bin/sh\necho corrupted > pnpm-lock.yaml\nexit 23\n')
		await chmod(resolve(root, 'bin/pnpm'), 0o755)

		await expect(execute(process.execPath, [script, 'entity', 'pnpmOrder', '--repository'], {
			cwd: root,
			env: { ...process.env, PATH: `${resolve(root, 'bin')}:${process.env.PATH}` },
		})).rejects.toThrow()

		expect(await readFile(resolve(root, 'package.json'), 'utf8')).toBe(manifest)
		expect(await readFile(resolve(root, 'pnpm-lock.yaml'), 'utf8')).toBe(lockfile)
		await expect(access(resolve(root, 'src/entities/pnpmOrder'))).rejects.toThrow()
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
}, 30_000)

it('rolls back SCSS slices when installation fails', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-scss-rollback-'))
	try {
		await mkdir(resolve(root, 'bin'))
		await writeFile(resolve(root, 'package.json'), '{"packageManager":"npm@11.6.2"}\n')
		await writeFile(resolve(root, 'bin/npm'), '#!/bin/sh\nexit 23\n')
		await chmod(resolve(root, 'bin/npm'), 0o755)

		await expect(execute(process.execPath, [script, 'widget', 'heroBanner', '--style', 'scss'], {
			cwd: root,
			env: { ...process.env, PATH: `${resolve(root, 'bin')}:${process.env.PATH}` },
		})).rejects.toThrow()

		await expect(access(resolve(root, 'src/widgets/heroBanner'))).rejects.toThrow()
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
}, 30_000)

async function waitForFile(path: string) {
	const deadline = Date.now() + 10_000
	for (;;) {
		try {
			await access(path)
			return
		}
		catch {
			if (Date.now() > deadline) {
				throw new Error(`Timed out waiting for ${path}`)
			}
			await new Promise(resolve => setTimeout(resolve, 50))
		}
	}
}
