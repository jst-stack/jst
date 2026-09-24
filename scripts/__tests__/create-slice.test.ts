import { execFile } from 'node:child_process'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const script = resolve(import.meta.dirname, '../create-slice.mjs')

it('creates the canonical entity slice structure and rejects invalid names', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-'))

	try {
		await execFileAsync(process.execPath, [script, 'entity', 'accountSettings'], { cwd: root })
		for (const directory of ['model', 'repository', 'services', 'ui']) {
			await expect(access(resolve(root, 'src/entities/accountSettings', directory, '.gitkeep'))).resolves.toBeUndefined()
		}
		await expect(execFileAsync(process.execPath, [script, 'feature', '../escape'], { cwd: root })).rejects.toThrow()
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})
