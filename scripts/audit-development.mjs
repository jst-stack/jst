import { appendFile } from 'node:fs/promises'
import process from 'node:process'
import { auditPackages, classify, describePackage, readPolicy } from './development-advisories.mjs'

const RENEWAL = 'npm run audit:development:sync -- --review'
const classification = classify({
	policy: await readPolicy(),
	full: auditPackages(),
	production: auditPackages({ omitDevelopment: true }),
})

const failures = [
	...classification.production.map(entry => productionFailure(entry)),
	...classification.expired.map(waiver => expiredFailure(waiver)),
]

if (failures.length > 0) {
	throw new Error(`Development advisory policy violation. ${failures.join(' ')}`)
}

const reviewed = new Set(classification.reviewed.map(entry => entry.name))
const development = classification.development.length
const unreviewed = classification.unreviewed.length
// Unreviewed and stale entries are named in the log but cannot fail a pull request: a new advisory
// in a development-only tool is a review task, not a broken build.
for (const entry of classification.unreviewed) {
	notice(`${entry.name} is development-only and unreviewed; npm run audit:development:sync records it.`)
}
for (const waiver of classification.stale) {
	notice(`${waiver.package} is waived but no longer reported; npm run audit:development:sync drops it.`)
}

const production = classification.production.length === 0
	? 'clean'
	: `${classification.production.length} package(s) - fatal`
const summary = [
	`production tree: ${production}`,
	`development-only tree: ${development} package(s), ${reviewed.size} reviewed, ${unreviewed} unreviewed`,
]
process.stdout.write(`Development advisory review - ${summary.join('; ')}.\n`)
await writeStepSummary(summary)

function productionFailure(entry) {
	return `${describePackage(entry)} reaches the production dependency tree; upgrade it instead of waiving it.`
}

function expiredFailure(waiver) {
	return `${waiver.package} waiver expired on ${waiver.expires}; renew it with ${RENEWAL}.`
}

async function writeStepSummary(summary) {
	if (!process.env.GITHUB_STEP_SUMMARY) {
		return
	}
	const rows = classification.development.map((entry) => {
		const review = reviewed.has(entry.name) ? 'reviewed' : 'unreviewed'
		return `| ${entry.name} | ${entry.severity} | ${entry.advisories.join(', ')} | ${review} |`
	})
	const markdown = [
		'### Development advisory review',
		'',
		...summary.map(line => `- ${line}`),
		'',
		'| Package | Severity | Advisory sources | Review |',
		'| --- | --- | --- | --- |',
		...rows,
		'',
	].join('\n')
	await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown)
}

function notice(message) {
	process.stdout.write(`${process.env.GITHUB_ACTIONS ? '::warning::' : 'note: '}${message}\n`)
}
