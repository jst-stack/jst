import { existsSync } from 'node:fs'
import process from 'node:process'

if (existsSync('.git')) {
	const { default: husky } = await import('husky')
	const message = husky()
	if (message) {
		process.stderr.write(`${message}\n`)
	}
}
