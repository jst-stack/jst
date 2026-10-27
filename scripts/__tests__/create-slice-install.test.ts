import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const execute = promisify(execFile)
const script = resolve(import.meta.dirname, '../create-slice.mjs')

it('preserves package.json formatting after dependency installation', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-slice-format-'))
	try {
		await mkdir(resolve(root, 'bin'))
		const manifest = `${JSON.stringify({
			name: 'format-probe',
			packageManager: 'npm@11.6.2',
		}, null, '\t')}\n`
		await writeFile(resolve(root, 'package.json'), manifest)
		await writeFile(resolve(root, 'bin/npm'), `#!/usr/bin/env node
const fs = require('node:fs')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.dependencies = { zod: '4.6.7' }
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n')
`)
		await chmod(resolve(root, 'bin/npm'), 0o755)

		await execute(process.execPath, [script, 'entity', 'customer', '--repository', '--yes'], {
			cwd: root,
			env: { ...process.env, PATH: `${resolve(root, 'bin')}:${process.env.PATH}` },
		})

		const updated = await readFile(resolve(root, 'package.json'), 'utf8')
		expect(updated).toContain('\n\t"dependencies"')
		expect(updated).not.toContain('\n  "dependencies"')
		expect(updated.endsWith('\n')).toBe(true)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
}, 30_000)
