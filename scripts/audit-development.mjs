import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import process from 'node:process'

const policy = JSON.parse(await readFile(new URL('../security/development-advisories.json', import.meta.url), 'utf8'))
const audit = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8', shell: process.platform === 'win32' })
if (!audit.stdout) {
	throw new Error(audit.stderr || 'npm audit returned no report.')
}
const report = JSON.parse(audit.stdout)
const actual = new Set(Object.values(report.vulnerabilities ?? {})
	.flatMap(vulnerability => vulnerability.via)
	.filter(value => typeof value === 'object')
	.map(advisory => String(advisory.source)))
const today = new Date().toISOString().slice(0, 10)
const allowed = new Map(policy.advisories.map(advisory => [advisory.id, advisory]))
const unexpected = [...actual].filter(id => !allowed.has(id))
const expired = [...actual].filter(id => allowed.get(id).expires < today)
const stale = [...allowed.keys()].filter(id => !actual.has(id))
if (unexpected.length || expired.length || stale.length) {
	throw new Error(`Development advisory policy mismatch. Unexpected: ${unexpected.join(', ') || 'none'}; expired: ${expired.join(', ') || 'none'}; stale: ${stale.join(', ') || 'none'}.`)
}
process.stdout.write(`Reviewed ${actual.size} development-only advisory source(s).\n`)
