import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

export async function verifyReleaseTag(root, tag) {
	const compatibility = JSON.parse(await readFile(resolve(root, 'jst.compatibility.json'), 'utf8'))
	const declared = compatibility?.template?.releaseTag
	if (declared === tag) {
		return declared
	}
	const version = typeof tag === 'string' ? tag.replace(/^v/u, '') : ''
	throw new Error(
		`jst.compatibility.json declares ${declared ?? 'no template release tag'}, but this run publishes ${tag ?? 'no tag'}. Run "npm run release:prepare -- --template-version ${version} --plugin-version <plugin version> --summary \"<summary>\"" and commit the result before releasing.`,
	)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	verifyReleaseTag(process.cwd(), process.argv[2]).catch((error) => {
		console.error(error.message)
		process.exitCode = 1
	})
}
