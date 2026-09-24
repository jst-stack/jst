import { access, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const structures = {
	entity: ['model', 'repository', 'services', 'ui'],
	feature: ['model', 'ui'],
	widget: ['ui'],
}
const layers = { entity: 'entities', feature: 'features', widget: 'widgets' }
const [kind, name] = process.argv.slice(2)

if (!structures[kind] || !name) {
	fail('Usage: npm run create:slice -- <entity|feature|widget> <lowerCamelName>')
}
if (!/^[a-z][A-Za-z0-9]*$/u.test(name)) {
	fail('Slice name must be lowerCamelCase, for example accountSettings.')
}

const target = resolve(`src/${layers[kind]}/${name}`)
try {
	await access(target)
	fail(`Slice already exists: src/${layers[kind]}/${name}`)
}
catch (error) {
	if (error?.code !== 'ENOENT') {
		throw error
	}
}

await Promise.all(structures[kind].map(async (directory) => {
	const path = resolve(target, directory)
	await mkdir(path, { recursive: true })
	await writeFile(resolve(path, '.gitkeep'), '')
}))

console.log(`Created ${kind} slice at src/${layers[kind]}/${name}.`)

function fail(message) {
	console.error(message)
	process.exit(1)
}
