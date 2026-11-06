import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface Compatibility {
	packages: Record<string, string>
	runtime: { node: string }
	template: { releaseTag: string, version: string }
}

interface TemplateManifest {
	templateVersion: string
}

interface PackageManifest {
	devDependencies: Record<string, string>
	engines: { node: string }
}

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))

async function readJson<T>(name: string): Promise<T> {
	return JSON.parse(await readFile(resolve(root, name), 'utf8')) as T
}

describe('compatibility manifest', () => {
	it('agrees with the template version and the compatibility guide', async () => {
		const compatibility = await readJson<Compatibility>('jst.compatibility.json')
		const template = await readJson<TemplateManifest>('jst.template.json')
		const guide = await readFile(resolve(root, 'docs/compatibility.md'), 'utf8')
		expect(compatibility.template.version).toBe(template.templateVersion)
		expect(compatibility.template.releaseTag).toBe(`v${template.templateVersion}`)
		expect(guide).toContain(`| \`${compatibility.template.releaseTag}\` |`)
	})

	it('documents the manifest release once as current and in the changelog', async () => {
		const compatibility = await readJson<Compatibility>('jst.compatibility.json')
		const versions = await readFile(resolve(root, 'docs/versions.md'), 'utf8')
		const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8')
		const current = versions.split('\n').filter(line => line.includes('| Current |'))
		expect(current).toHaveLength(1)
		expect(current[0]).toContain(`| \`${compatibility.template.releaseTag}\` |`)
		expect(changelog).toContain(`## ${compatibility.template.version}\n`)
	})

	it('keeps the declared runtime and plugin ranges in sync with package.json', async () => {
		const compatibility = await readJson<Compatibility>('jst.compatibility.json')
		const manifest = await readJson<PackageManifest>('package.json')
		const plugin = manifest.devDependencies['@jst-stack/eslint-plugin'].replace(/^\D/u, '')
		const [major, minor] = plugin.split('.').map(Number)
		expect(compatibility.runtime.node).toBe(manifest.engines.node)
		expect(compatibility.packages['@jst-stack/eslint-plugin']).toBe(`>=${plugin} <${major}.${minor + 1}.0`)
	})
})
