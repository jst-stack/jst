import { execFile } from 'node:child_process'
import { access, cp, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, '../..')
const excludedDirectories = new Set([
	'.git',
	'.eslintcache',
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
		const config = await readFile(resolve(fixtureRoot, 'src/shared/app.config.ts'), 'utf8')
		const route = await readFile(resolve(fixtureRoot, 'src/pages/_index/route.tsx'), 'utf8')

		expect(packageJson.name).toBe('field-notes')
		expect(packageJson.engines.node).toBe('>=24.15.0 <25')
		expect(packageJson.scripts).not.toHaveProperty('template:setup')
		expect(packageJson.scripts.doctor).toContain('react-doctor')
		expect(await readFile(resolve(fixtureRoot, '.husky/pre-commit'), 'utf8'))
			.toContain('npm run doctor:staged')
		expect(packageJson.dependencies).toHaveProperty('@needle-di/core')
		expect(packageJson.knip?.ignore).toContain('src/shared/lib/react.lib.ts')
		expect(packageJson.knip?.ignore).toContain('src/shared/ui/svgIcon.component.tsx')
		expect(packageJson.knip?.ignore).not.toContain('jst.config.ts')
		expect(config).toContain('description: \'Your team\\\'s private notes.\'')
		expect(config).toContain('language: \'uk-UA\'')
		expect(config).toContain('name: \'Field Notes\'')
		expect(config).toContain('primaryColor: \'violet\'')
		const readme = await readFile(resolve(fixtureRoot, 'README.md'), 'utf8')
		expect(readme).toContain('npm run validate')
		expect(readme).toContain('npm run check')
		expect(readme).toContain('skills/frontend-architecture/SKILL.md')
		expect(await readFile(resolve(fixtureRoot, 'src/shared/di/serviceLocator.context.ts'), 'utf8'))
			.toContain('export const useService')
		expect(await readFile(resolve(fixtureRoot, 'src/shared/lib/react.lib.ts'), 'utf8'))
			.toContain('export function createDi')
		expect(route).toContain('import { HomePage } from \'./home.page\'')
		expect(route).not.toContain('@mantine/core')
		expect(await readFile(resolve(fixtureRoot, 'src/pages/_index/home.page.tsx'), 'utf8'))
			.toContain('Project ready')
		await expect(access(resolve(fixtureRoot, 'src/pages/_index/home.page.module.css'))).resolves.toBeUndefined()
		await expect(access(resolve(fixtureRoot, 'src/pages/_index/home.page.tsx'))).resolves.toBeUndefined()
		await expect(access(resolve(fixtureRoot, 'src/entities/README.md'))).resolves.toBeUndefined()
		await expect(access(resolve(fixtureRoot, 'src/features/README.md'))).resolves.toBeUndefined()
		await expect(access(resolve(fixtureRoot, 'src/widgets/README.md'))).resolves.toBeUndefined()
		await expect(access(resolve(fixtureRoot, 'skills/frontend-architecture/SKILL.md'))).resolves.toBeUndefined()
		await expect(access(resolve(fixtureRoot, 'jst.compatibility.json'))).resolves.toBeUndefined()
		await expect(access(resolve(fixtureRoot, '.gitmodules'))).rejects.toThrow()
		await expect(access(resolve(fixtureRoot, 'showcase'))).rejects.toThrow()
		await expect(access(resolve(fixtureRoot, 'scripts/__tests__'))).rejects.toThrow()
		await expect(access(resolve(fixtureRoot, 'scripts/setup-template.mjs'))).rejects.toThrow()
		await runArchitectureCheck(fixtureRoot)
	}
	finally {
		await rm(temporaryRoot, { force: true, recursive: true })
	}
}, 30_000)

it('configures SCSS Modules consistently', async () => {
	const { fixtureRoot, temporaryRoot } = await createFixture('scss')

	try {
		await runSetup(fixtureRoot, ['--yes', '--name', 'scss-app', '--style', 'scss'])
		const packageJson = await readPackageJson(fixtureRoot)
		const policy = await readFile(resolve(fixtureRoot, 'jst.config.ts'), 'utf8')
		const stylelint = await readFile(resolve(fixtureRoot, 'stylelint.config.mjs'), 'utf8')

		expect(packageJson.devDependencies).toHaveProperty('sass')
		expect(packageJson.devDependencies).toHaveProperty('stylelint-config-standard-scss')
		expect(packageJson.devDependencies).not.toHaveProperty('postcss-scss')
		expect(packageJson.devDependencies).not.toHaveProperty('stylelint-config-standard')
		expect(Object.keys(packageJson.devDependencies)).toEqual(Object.keys(packageJson.devDependencies).toSorted())
		expect(policy).toContain('import { defineConfig } from \'@jst-stack/eslint-plugin\'')
		expect(policy).toContain('moduleExtension: \'scss\'')
		expect(stylelint).toContain('extends: [\'stylelint-config-standard-scss\']')
		await expect(access(resolve(fixtureRoot, 'src/root.module.scss'))).resolves.toBeUndefined()
		await expect(access(resolve(fixtureRoot, 'src/root.module.css'))).rejects.toThrow()
		expect(await readFile(resolve(fixtureRoot, 'src/root.tsx'), 'utf8'))
			.toContain('./root.module.scss')
		await expect(access(resolve(fixtureRoot, 'package-lock.json'))).rejects.toThrow()
	}
	finally {
		await rm(temporaryRoot, { force: true, recursive: true })
	}
}, 30_000)

async function createFixture(name: string) {
	const temporaryRoot = await mkdtemp(join(tmpdir(), `js-template-setup-${name}-`))
	const fixtureRoot = join(temporaryRoot, name)

	await cp(repositoryRoot, fixtureRoot, {
		recursive: true,
		filter: source => !excludedDirectories.has(relative(repositoryRoot, source).split(sep)[0]),
	})
	await symlink(resolve(repositoryRoot, 'node_modules'), resolve(fixtureRoot, 'node_modules'), 'dir')

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
		resolve(repositoryRoot, 'node_modules/@jst-stack/eslint-plugin/bin/jst-lint.mjs'),
		'architecture',
	], { cwd: fixtureRoot })
}

async function readPackageJson(fixtureRoot: string) {
	return JSON.parse(await readFile(resolve(fixtureRoot, 'package.json'), 'utf8')) as {
		name: string
		scripts: Record<string, string>
		dependencies: Record<string, string>
		devDependencies: Record<string, string>
		engines: { node: string }
		knip?: { ignore: string[] }
	}
}
