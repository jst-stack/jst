import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'

const executable = resolve('node_modules', '.bin', process.platform === 'win32' ? 'react-doctor.cmd' : 'react-doctor')
const result = spawnSync(executable, [
	'--staged',
	'--blocking',
	'warning',
	'--no-supply-chain',
	'--no-telemetry',
	'--yes',
	'--json',
	'--json-compact',
], {
	encoding: 'utf8',
	shell: process.platform === 'win32',
})

if (result.error) {
	throw result.error
}

let report
try {
	report = JSON.parse(result.stdout)
}
catch {
	process.stderr.write(result.stderr || result.stdout || 'React Doctor did not return a report.\n')
	process.exit(1)
}

const diagnostics = report.diagnostics ?? []
if (!diagnostics.length) {
	process.stdout.write('React Doctor: staged files are healthy.\n')
	process.exit(0)
}

for (const diagnostic of diagnostics) {
	const file = diagnostic.filePath ?? diagnostic.file ?? 'unknown file'
	const line = diagnostic.location?.start?.line ?? diagnostic.line
	const rule = diagnostic.ruleId ?? diagnostic.rule ?? 'react-doctor'
	process.stderr.write(`${file}${line ? `:${line}` : ''} ${rule} ${diagnostic.message}\n`)
}
process.exit(1)
