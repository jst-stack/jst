import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { prepareCompatibilityRelease } from '../prepare-compatibility-release.mjs'

describe('prepare compatibility release', () => {
	it('updates every public compatibility surface together', async () => {
		const root = await mkdtemp(resolve(tmpdir(), 'jst-release-'))
		await writeFixture(root)
		await prepareCompatibilityRelease(root, { pluginVersion: '0.4.4', summary: 'Tighten policy validation', templateVersion: '0.4.17' })

		const compatibility = JSON.parse(await readFile(resolve(root, 'jst.compatibility.json'), 'utf8')) as { packages: Record<string, string>, template: { releaseTag: string, version: string } }
		const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')) as { devDependencies: Record<string, string> }
		expect(compatibility.template).toEqual({ releaseTag: 'v0.4.17', version: '0.4.17' })
		expect(compatibility.packages['@jst-stack/eslint-plugin']).toBe('>=0.4.4 <0.5.0')
		expect(manifest.devDependencies['@jst-stack/eslint-plugin']).toBe('^0.4.4')
		expect(await readFile(resolve(root, 'docs/compatibility.md'), 'utf8')).toContain('| `v0.4.17` |')
		expect(await readFile(resolve(root, 'docs/versions.md'), 'utf8')).toContain('| `v0.4.16` | [Tagged documentation](https://github.com/jst-stack/jst/tree/v0.4.16/docs) | Historical |')
		expect(await readFile(resolve(root, 'CHANGELOG.md'), 'utf8')).toContain('## 0.4.17\n\n- Tighten policy validation.')
	})

	it('rejects ambiguous release input before writing', async () => {
		await expect(prepareCompatibilityRelease('/tmp', { pluginVersion: 'latest', summary: '', templateVersion: 'v1' })).rejects.toThrow(/summary is required/u)
	})
})

async function writeFixture(root: string) {
	await mkdir(resolve(root, 'docs'))
	await writeFile(resolve(root, 'jst.compatibility.json'), JSON.stringify({ packages: { '@jst-stack/eslint-plugin': '>=0.4.3 <0.5.0', 'create-jst': '>=0.4.0 <0.5.0' }, runtime: { node: '>=24.15.0 <25' }, template: { releaseTag: 'v0.4.16', version: '0.4.16' } }))
	await writeFile(resolve(root, 'package.json'), JSON.stringify({ devDependencies: { '@jst-stack/eslint-plugin': '^0.4.3' } }))
	await writeFile(resolve(root, 'CHANGELOG.md'), '# Changelog\n\nNotable changes to JST.\n\n## 0.4.16\n')
	await writeFile(resolve(root, 'docs/compatibility.md'), '| Template | create-jst | ESLint plugin | Node | Package managers |\n| --- | --- | --- | --- | --- |\n| `v0.4.16` | `>=0.4.0 <0.5.0` | `>=0.4.3 <0.5.0` | `>=24.15.0 <25` | npm 11, pnpm 10 |\n')
	await writeFile(resolve(root, 'docs/versions.md'), '| Template | Documentation | Status |\n| --- | --- | --- |\n| `v0.4.16` | [Tagged documentation](https://github.com/jst-stack/jst/tree/v0.4.16/docs) | Current |\n')
}
