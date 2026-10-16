import process from 'node:process'
import { createInterface } from 'node:readline/promises'

export async function resolveValues(kind, values) {
	if (!process.stdin.isTTY || values.yes) {
		return withDefaults(kind, values)
	}
	const prompts = createInterface({ input: process.stdin, output: process.stdout })
	try {
		return await promptMissingValues(kind, values, prompts)
	}
	finally {
		prompts.close()
	}
}

async function promptMissingValues(kind, values, prompts) {
	const entityAnswers = await promptEntityValues(kind, values, prompts)
	const sharedAnswers = await promptSharedValues(kind, values, prompts)
	return withDefaults(kind, { ...values, ...entityAnswers, ...sharedAnswers })
}

async function promptEntityValues(kind, values, prompts) {
	if (kind !== 'entity') {
		return {}
	}
	const repository = await resolveBoolean(values.repository, prompts, 'Add repository and HTTP adapter?')
	const service = await resolveBoolean(values.service, prompts, 'Add domain service?')
	const persistence = await resolveBoolean(values.persistence, prompts, 'Add persistence port?')
	let msw = values.msw
	if (msw === undefined) {
		msw = repository && await confirm(prompts, 'Add MSW contract handler?')
	}
	return { msw, persistence, repository, service }
}

async function promptSharedValues(kind, values, prompts) {
	const stateful = await resolveBoolean(values.stateful, prompts, 'Add Reatom state?')
	let ui = values.ui
	if (ui === undefined) {
		ui = kind !== 'entity' || await confirm(prompts, 'Add Mantine UI?')
	}
	const tests = await resolveBoolean(values.tests, prompts, 'Add tests?', true)
	let publicApi = values.public
	if (kind === 'feature' || kind === 'module') {
		publicApi = await resolveBoolean(values.public, prompts, 'Expose a public API?')
	}
	return { public: publicApi, stateful, tests, ui }
}

async function resolveBoolean(value, prompts, label, fallback = false) {
	if (value !== undefined) {
		return value
	}
	return confirm(prompts, label, fallback)
}

function withDefaults(kind, values) {
	return {
		...values,
		public: values.public ?? ['feature', 'module'].includes(kind),
	}
}

async function confirm(prompts, label, fallback = false) {
	const suffix = fallback ? 'Y/n' : 'y/N'
	const answer = (await prompts.question(`${label} [${suffix}] `)).trim().toLowerCase()
	return answer ? ['y', 'yes'].includes(answer) : fallback
}
