import { execFile } from 'node:child_process'
import { access, cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, '../..')
const excludedDirectories = new Set([
	'.git',
	'.react-router',
	'build',
	'node_modules',
	'playwright-report',
	'showcase',
	'test-results',
])

it('creates a configured clean product', async () => {
	const { fixtureRoot, temporaryRoot } = await createFixture('clean')

	try {
		await runSetup(fixtureRoot, [
			'--yes',
			'--name',
			'field-notes',
			'--title',
			'Field Notes',
			'--description',
			'Your team\'s private notes.',
			'--lang',
			'uk-UA',
			'--color-scheme',
			'auto',
			'--primary-color',
			'violet',
		])

		const packageJson = await readPackageJson(fixtureRoot)
		const config = await readFile(resolve(fixtureRoot, 'src/shared/config.ts'), 'utf8')
		const route = await readFile(resolve(fixtureRoot, 'src/pages/_index/route.tsx'), 'utf8')

		expect(packageJson.name).toBe('field-notes')
		expect(packageJson.scripts).not.toHaveProperty('template:setup')
		expect(packageJson.dependencies).toHaveProperty('@needle-di/core')
		expect(packageJson.knip?.ignore).toContain('src/shared/lib/react.ts')
		expect(packageJson.knip?.ignore).toContain('src/shared/ui/SvgIcon.tsx')
		expect(config).toContain('description: \'Your team\\\'s private notes.\'')
		expect(config).toContain('language: \'uk-UA\'')
		expect(config).toContain('name: \'Field Notes\'')
		expect(config).toContain('primaryColor: \'violet\'')
		const readme = await readFile(resolve(fixtureRoot, 'README.md'), 'utf8')
		expect(readme).toContain('npm run check')
		expect(readme).toContain('skills/frontend-architecture/SKILL.md')
		expect(await readFile(resolve(fixtureRoot, 'src/app/container/container.context.ts'), 'utf8'))
			.toContain('export const useService')
		expect(await readFile(resolve(fixtureRoot, 'src/shared/lib/react.ts'), 'utf8'))
			.toContain('export function createDi')
		expect(route).toContain('import { HomePage } from \'./home.page\'')
		expect(route).not.toContain('@mantine/core')
		expect(await readFile(resolve(fixtureRoot, 'src/pages/_index/home.page.tsx'), 'utf8'))
			.toContain('<Container size="lg">')
		await expect(access(resolve(fixtureRoot, 'src/pages/_index/home.page.tsx'))).resolves.toBeUndefined()
		await expect(access(resolve(fixtureRoot, 'skills/frontend-architecture/SKILL.md'))).resolves.toBeUndefined()
		await expect(access(resolve(fixtureRoot, '.gitmodules'))).rejects.toThrow()
		await expect(access(resolve(fixtureRoot, 'showcase'))).rejects.toThrow()
		await expect(access(resolve(fixtureRoot, 'scripts/__tests__'))).rejects.toThrow()
		await expect(access(resolve(fixtureRoot, 'scripts/setup-template.mjs'))).rejects.toThrow()
		await runArchitectureCheck(fixtureRoot)
	}
	finally {
		await rm(temporaryRoot, { force: true, recursive: true })
	}
})

async function createFixture(name: string) {
	const temporaryRoot = await mkdtemp(join(tmpdir(), `js-template-setup-${name}-`))
	const fixtureRoot = join(temporaryRoot, name)

	await cp(repositoryRoot, fixtureRoot, {
		recursive: true,
		filter: source => !excludedDirectories.has(relative(repositoryRoot, source).split(sep)[0]),
	})

	return { fixtureRoot, temporaryRoot }
}

async function runSetup(fixtureRoot: string, args: string[]) {
	await execFileAsync(process.execPath, [
		resolve(fixtureRoot, 'scripts/setup-template.mjs'),
		...args,
	], { cwd: fixtureRoot })
}

async function runArchitectureCheck(fixtureRoot: string) {
	await execFileAsync(process.execPath, [
		resolve(fixtureRoot, 'scripts/check-architecture.mjs'),
	], { cwd: fixtureRoot })
}

async function readPackageJson(fixtureRoot: string) {
	return JSON.parse(await readFile(resolve(fixtureRoot, 'package.json'), 'utf8')) as {
		name: string
		scripts: Record<string, string>
		dependencies: Record<string, string>
		knip?: { ignore: string[] }
	}
}
