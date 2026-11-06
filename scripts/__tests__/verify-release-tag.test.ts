import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { verifyReleaseTag } from '../verify-release-tag.mjs'

describe('verify release tag', () => {
	it('accepts a tag the compatibility manifest documents', async () => {
		const root = await writeManifest({ releaseTag: 'v0.4.37', version: '0.4.37' })
		await expect(verifyReleaseTag(root, 'v0.4.37')).resolves.toBe('v0.4.37')
	})

	it('refuses to publish a tag the manifest does not document', async () => {
		const root = await writeManifest({ releaseTag: 'v0.4.31', version: '0.4.31' })
		await expect(verifyReleaseTag(root, 'v0.4.37')).rejects.toThrow(/declares v0\.4\.31, but this run publishes v0\.4\.37/u)
	})

	it('refuses a manifest without a release tag', async () => {
		const root = await writeManifest({})
		await expect(verifyReleaseTag(root, 'v0.4.37')).rejects.toThrow(/no template release tag/u)
	})
})

async function writeManifest(template: Record<string, string>) {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-tag-'))
	await writeFile(resolve(root, 'jst.compatibility.json'), JSON.stringify({ packages: {}, runtime: {}, template }))
	return root
}
