import { spawn } from 'node:child_process'
import { access, readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const rootManifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const packageManager = rootManifest.packageManager?.startsWith('pnpm@') ? 'pnpm' : 'npm'
const packagesRoot = resolve(root, 'packages')

if (await exists(packagesRoot)) {
	const entries = await readdir(packagesRoot, { withFileTypes: true })
	for (const entry of entries.filter(item => item.isDirectory())) {
		const cwd = resolve(packagesRoot, entry.name)
		await runScript(packageManager, 'build', cwd)
		await runScript(packageManager, 'test', cwd)
	}
}

function runScript(packageManager, script, cwd) {
	const args = packageManager === 'pnpm'
		? ['run', '--if-present', script]
		: ['run', script, '--if-present']
	return run(packageManager, args, cwd)
}

function run(command, args, cwd) {
	return new Promise((resolvePromise, reject) => {
		const child = spawn(command, args, { cwd, stdio: 'inherit' })
		child.once('error', reject)
		child.once('close', code => code === 0 ? resolvePromise() : reject(new Error(`${command} failed with exit code ${code}.`)))
	})
}

async function exists(path) {
	return access(path).then(() => true, () => false)
}
