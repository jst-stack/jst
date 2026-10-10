import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

export async function prepareCompatibilityRelease(root, input) {
	validateInput(input)
	const compatibilityPath = resolve(root, 'jst.compatibility.json')
	const packagePath = resolve(root, 'package.json')
	const compatibility = JSON.parse(await readFile(compatibilityPath, 'utf8'))
	const manifest = JSON.parse(await readFile(packagePath, 'utf8'))
	const previousVersion = compatibility.template.version

	compatibility.template = { releaseTag: `v${input.templateVersion}`, version: input.templateVersion }
	compatibility.packages['@jst-stack/eslint-plugin'] = compatibleMinorRange(input.pluginVersion)
	manifest.devDependencies['@jst-stack/eslint-plugin'] = `^${input.pluginVersion}`

	await writeJson(compatibilityPath, compatibility)
	await writeJson(packagePath, manifest)
	await updateCompatibilityGuide(root, compatibility)
	await updateVersions(root, input.templateVersion, previousVersion)
	await updateChangelog(root, input.templateVersion, input.summary)
}

function validateInput(input) {
	for (const [name, value] of Object.entries(input)) {
		if (!value?.trim()) {
			throw new TypeError(`${name} is required.`)
		}
	}
	for (const [name, value] of [['templateVersion', input.templateVersion], ['pluginVersion', input.pluginVersion]]) {
		if (!/^\d+\.\d+\.\d+$/u.test(value)) {
			throw new TypeError(`${name} must use x.y.z.`)
		}
	}
}

function compatibleMinorRange(version) {
	const [major, minor] = version.split('.').map(Number)
	return `>=${version} <${major}.${minor + 1}.0`
}

async function updateCompatibilityGuide(root, compatibility) {
	const path = resolve(root, 'docs/compatibility.md')
	const content = await readFile(path, 'utf8')
	const row = `| \`${compatibility.template.releaseTag}\` | \`${compatibility.packages['create-jst']}\` | \`${compatibility.packages['@jst-stack/eslint-plugin']}\` | \`${compatibility.runtime.node}\` | npm 11, pnpm 10 |`
	await writeFile(path, content.replace(/^\| `v[^\n]+$/mu, row))
}

async function updateVersions(root, version, previousVersion) {
	const path = resolve(root, 'docs/versions.md')
	const content = await readFile(path, 'utf8')
	const current = `| \`v${version}\` | [Tagged documentation](https://github.com/jst-stack/jst/tree/v${version}/docs) | Current |`
	const previous = `| \`v${previousVersion}\` | [Tagged documentation](https://github.com/jst-stack/jst/tree/v${previousVersion}/docs) | Historical |`
	await writeFile(path, content.replace(/^\| `v[^\n]+\| Current \|$/mu, `${current}\n${previous}`))
}

async function updateChangelog(root, version, summary) {
	const path = resolve(root, 'CHANGELOG.md')
	const content = await readFile(path, 'utf8')
	const entry = `## ${version}\n\n- ${summary.replace(/\.$/u, '')}.\n\n`
	await writeFile(path, content.replace(/(Notable changes[^\n]*\n\n)/u, `$1${entry}`))
}

function writeJson(path, value) {
	return writeFile(path, `${JSON.stringify(value, null, '\t')}\n`)
}

function parseArguments(args) {
	const values = {}
	for (let index = 0; index < args.length; index += 2) {
		values[args[index]?.replace(/^--/u, '')] = args[index + 1]
	}
	return { pluginVersion: values['plugin-version'], summary: values.summary, templateVersion: values['template-version'] }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await prepareCompatibilityRelease(process.cwd(), parseArguments(process.argv.slice(2)))
}
