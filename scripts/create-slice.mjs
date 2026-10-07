import { spawn } from 'node:child_process'
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const rawArguments = process.argv.slice(2)
const command = parseArgs({
	allowNegative: true,
	allowPositionals: true,
	args: rawArguments[0] === '--' ? rawArguments.slice(1) : rawArguments,
	options: {
		'dry-run': { type: 'boolean' },
		'install': { default: true, type: 'boolean' },
		'msw': { type: 'boolean' },
		'persistence': { type: 'boolean' },
		'public': { type: 'boolean' },
		'repository': { type: 'boolean' },
		'service': { type: 'boolean' },
		'stateful': { type: 'boolean' },
		'style': { type: 'string' },
		'tests': { type: 'boolean' },
		'ui': { type: 'boolean' },
		'yes': { short: 'y', type: 'boolean' },
	},
	strict: true,
})

const [kind, name] = command.positionals
validateInput(kind, name, command.positionals, command.values)
const values = await resolveValues(kind, command.values)
const root = process.cwd()
const policy = await readPolicy(root)
const layer = policy.generator.layers[kind]
const target = resolve(root, 'src', layer, name)
const style = values.style ?? policy.styles.moduleExtension
const plan = createPlan({ kind, name, policy, style, values })

await assertMissing(target)
if (values['dry-run']) {
	process.stdout.write(`${JSON.stringify({ dependencies: plan.dependencies, devDependencies: plan.devDependencies, files: [...plan.files.keys()] }, null, 2)}\n`)
	process.exit(0)
}

const temporary = resolve(dirname(target), `.${basename(target)}-${process.pid}.tmp`)
const projectFiles = await snapshotProjectFiles(root)
try {
	for (const [relativePath, source] of plan.files) {
		const path = resolve(temporary, relativePath)
		await mkdir(dirname(path), { recursive: true })
		await writeFile(path, source)
	}
	await rename(temporary, target)
	if (['feature', 'module'].includes(kind) && values.public) {
		await registerPublicApi(root, `src/${layer}/${name}/${name}${policy.imports.publicApiSuffix}.ts`)
	}
	if (values.install && (plan.dependencies.length || plan.devDependencies.length)) {
		await installDependencies(root, plan)
	}
	process.stdout.write(`Created ${kind} slice at src/${layer}/${name}.\n`)
}

catch (error) {
	await rm(temporary, { force: true, recursive: true })
	await rm(target, { force: true, recursive: true })
	await restoreProjectFiles(projectFiles)
	throw error
}

async function resolveValues(kind, values) {
	if (!process.stdin.isTTY || values.yes) {
		return withDefaults(kind, values)
	}
	const prompts = createInterface({ input: process.stdin, output: process.stdout })
	try {
		const resolved = { ...values }
		if (kind === 'entity') {
			resolved.repository ??= await confirm(prompts, 'Add repository and HTTP adapter?')
			resolved.service ??= await confirm(prompts, 'Add domain service?')
			resolved.persistence ??= await confirm(prompts, 'Add persistence port?')
			resolved.msw ??= resolved.repository && await confirm(prompts, 'Add MSW contract handler?')
		}
		resolved.stateful ??= await confirm(prompts, 'Add Reatom state?')
		resolved.ui ??= kind !== 'entity' || await confirm(prompts, 'Add Mantine UI?')
		resolved.tests ??= await confirm(prompts, 'Add tests?', true)
		if (kind === 'feature' || kind === 'module') {
			resolved.public ??= await confirm(prompts, 'Expose a public API?')
		}
		return withDefaults(kind, resolved)
	}
	finally {
		prompts.close()
	}
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

function createPlan({ kind, name, policy, style, values }) {
	const typeName = toPascalCase(name)
	const publicApiSuffix = policy.imports.publicApiSuffix
	const testDirectory = policy.generator.testDirectory
	const testSuffix = policy.files.testSuffixes[0]
	const uiDirectory = policy.files.roleDirectories.component
	const files = new Map()
	const dependencies = new Set()
	const devDependencies = new Set()
	if (kind === 'entity') {
		files.set(`model/${name}.model.ts`, createModel(typeName))
		files.set(`${name}${publicApiSuffix}.ts`, createEntityPublicApi(typeName, name, values.repository, values.stateful))
	}
	if (kind === 'feature' || kind === 'module') {
		files.set(`${name}.entry.tsx`, createFeatureEntry(typeName, name, uiDirectory, values.stateful))
	}
	if (kind === 'widget') {
		files.set(`${name}${publicApiSuffix}.ts`, `export { ${typeName} } from './${uiDirectory}/${name}.component'\n`)
	}
	if (['feature', 'module'].includes(kind) && values.public) {
		files.set(`${name}${publicApiSuffix}.ts`, `export { ${typeName}Entry } from './${name}.entry'\n`)
	}
	if (values.ui || kind !== 'entity') {
		const componentName = ['feature', 'module'].includes(kind) ? `${typeName}View` : typeName
		files.set(`${uiDirectory}/${name}.component.tsx`, createComponent(componentName, name, style, ['feature', 'module'].includes(kind) && values.stateful))
		files.set(`${uiDirectory}/${name}.component.module.${style}`, `.root {\n\tdisplay: block;\n}\n`)
	}
	if (values.repository) {
		assertEntityOption(kind, '--repository')
		dependencies.add('zod')
		files.set(`repository/${name}.dto.ts`, createDto(typeName, name))
		files.set(`repository/${name}.repository.ts`, createRepository(typeName, name))
		files.set(`model/${name}.mapper.ts`, createMapper(typeName, name))
		files.set(`repository/${name}.adapter.ts`, createFetchAdapter(typeName, name, policy.imports.alias))
		files.set(`${name}.provider.ts`, createProvider(typeName, name))
	}
	if (values.service) {
		assertEntityOption(kind, '--service')
		files.set(`services/${name}.service.ts`, `export class ${typeName}Service {}\n`)
	}
	if (values.stateful) {
		if (kind === 'widget') {
			fail('--stateful is available only for entity, feature, and module slices.')
		}
		dependencies.add('@reatom/core')
		if (kind === 'feature' || kind === 'module') {
			dependencies.add('@reatom/react')
		}
		files.set(`${name}.store.ts`, createStore(typeName, name))
	}
	if (values.persistence) {
		assertEntityOption(kind, '--persistence')
		files.set(`repository/${name}.persister.ts`, `export interface ${typeName}Persister {\n\tclear(): Promise<void>\n}\n`)
	}
	if (values.msw) {
		assertEntityOption(kind, '--msw')
		if (!values.repository) {
			fail('--msw requires --repository.')
		}
		devDependencies.add('msw')
		files.set(`repository/${name}.handler.ts`, createMswHandler(name))
	}
	if (values.tests) {
		const testsUi = values.ui || kind !== 'entity'
		const extension = testsUi ? 'tsx' : 'ts'
		files.set(`${testDirectory}/${name}.${testSuffix}.${extension}`, createTest(kind, typeName, name, values.repository, testsUi, uiDirectory))
		if (testsUi) {
			devDependencies.add('@testing-library/react')
			devDependencies.add('jsdom')
		}
	}
	if (style === 'scss') {
		devDependencies.add('sass')
	}
	return { dependencies: [...dependencies], devDependencies: [...devDependencies], files }
}

function createModel(typeName) {
	return `export interface ${typeName} {\n\treadonly id: string\n}\n\nexport function create${typeName}(value: ${typeName}): ${typeName} {\n\treturn { ...value }\n}\n`
}

function createEntityPublicApi(typeName, name, hasRepository, stateful) {
	return `export { create${typeName} } from './model/${name}.model'\nexport type { ${typeName} } from './model/${name}.model'\n${stateful ? `export { ${typeName}Store } from './${name}.store'\n` : ''}${hasRepository ? `export { ${name}RepositoryToken } from './repository/${name}.repository'\nexport type { ${typeName}Repository } from './repository/${name}.repository'\n` : ''}`
}

function createComponent(componentName, name, style, stateful) {
	if (stateful) {
		return `import { Button, Stack, Text } from '@mantine/core'\nimport styles from './${name}.component.module.${style}'\n\ninterface ${componentName}Props {\n\treadonly count: number\n\treadonly onIncrement: () => void\n}\n\nexport function ${componentName}({ count, onIncrement }: ${componentName}Props) {\n\treturn (\n\t\t<Stack aria-label="${name}" className={styles.root} component="section">\n\t\t\t<Text>\n\t\t\t\tCount:\n\t\t\t\t{' '}\n\t\t\t\t{count}\n\t\t\t</Text>\n\t\t\t<Button onClick={onIncrement}>Increment</Button>\n\t\t</Stack>\n\t)\n}\n`
	}
	return `import { Box } from '@mantine/core'\nimport styles from './${name}.component.module.${style}'\n\nexport function ${componentName}() {\n\treturn <Box aria-label="${name}" className={styles.root} component="section" />\n}\n`
}

function createFeatureEntry(typeName, name, uiDirectory, stateful) {
	if (!stateful) {
		return `import { ${typeName}View } from './${uiDirectory}/${name}.component'\n\nexport function ${typeName}Entry() {\n\treturn <${typeName}View />\n}\n`
	}
	return `import { wrap } from '@reatom/core'\nimport { reatomComponent } from '@reatom/react'\nimport { ${typeName}Store } from './${name}.store'\nimport { ${typeName}View } from './${uiDirectory}/${name}.component'\n\nconst store = new ${typeName}Store()\n\nfunction ${typeName}EntryViewModel() {\n\treturn <${typeName}View count={store.count()} onIncrement={wrap(store.increment)} />\n}\n\nexport const ${typeName}Entry = reatomComponent(${typeName}EntryViewModel, '${typeName}Entry')\n`
}

function createStore(typeName, name) {
	return `import { action, atom } from '@reatom/core'\n\nexport class ${typeName}Store {\n\tcount = atom(0, '${name}.count')\n\tincrement = action(() => this.count.set(this.count() + 1), '${name}.increment')\n}\n`
}

function createDto(typeName, name) {
	return `import { z } from 'zod'\n\nexport const ${name}DtoSchema = z.object({ id: z.string() })\nexport type ${typeName}Dto = z.infer<typeof ${name}DtoSchema>\n`
}

function createRepository(typeName, name) {
	return `import type { ${typeName} } from '../model/${name}.model'\nimport { InjectionToken } from '@needle-di/core'\n\nexport interface ${typeName}Repository {\n\tfindById(id: string): Promise<${typeName}>\n}\n\nexport const ${name}RepositoryToken = new InjectionToken<${typeName}Repository>('${typeName.toUpperCase()}_REPOSITORY')\n`
}

function createMapper(typeName, name) {
	return `import type { ${typeName}Dto } from '../repository/${name}.dto'\nimport type { ${typeName} } from './${name}.model'\nimport { create${typeName} } from './${name}.model'\n\nexport function map${typeName}Dto(dto: ${typeName}Dto): ${typeName} {\n\treturn create${typeName}({ id: dto.id })\n}\n`
}

function createFetchAdapter(typeName, name, alias) {
	return `import type { HttpClient } from '${alias}shared/http/httpClient.types'\nimport type { ${typeName}Repository } from './${name}.repository'\nimport { inject } from '@needle-di/core'\nimport { HTTP_CLIENT_TOKEN } from '${alias}shared/http/httpClient.types'\nimport { map${typeName}Dto } from '../model/${name}.mapper'\nimport { ${name}DtoSchema } from './${name}.dto'\n\nexport class ${typeName}FetchAdapter implements ${typeName}Repository {\n\tconstructor(private readonly httpClient: HttpClient = inject(HTTP_CLIENT_TOKEN)) {}\n\n\tasync findById(id: string) {\n\t\tconst dto = ${name}DtoSchema.parse(await this.httpClient.request(\`/${name}/\${id}\`))\n\t\treturn map${typeName}Dto(dto)\n\t}\n}\n`
}

function createProvider(typeName, name) {
	return `import type { Container } from '@needle-di/core'\nimport { ${typeName}FetchAdapter } from './repository/${name}.adapter'\nimport { ${name}RepositoryToken } from './repository/${name}.repository'\n\nexport const scope = 'request' as const\n\nexport function provider(container: Container) {\n\tcontainer.bindAll({ provide: ${name}RepositoryToken, useClass: ${typeName}FetchAdapter })\n}\n`
}

function createMswHandler(name) {
	return `import { http, HttpResponse } from 'msw'\n\nexport const ${name}Handlers = [\n\thttp.get('*/${name}/:id', ({ params }) => HttpResponse.json({ id: params.id })),\n]\n`
}

function createTest(kind, typeName, name, hasRepository, testsUi, uiDirectory) {
	if (kind === 'entity' && hasRepository) {
		const uiImports = testsUi ? `import { HeadlessMantineProvider } from '@mantine/core'\nimport { render, screen } from '@testing-library/react'\nimport { ${typeName} } from '../${uiDirectory}/${name}.component'\n` : ''
		const uiTest = testsUi ? `\n\tit('renders the props-driven entity view', () => {\n\t\trender(<HeadlessMantineProvider env="test"><${typeName} /></HeadlessMantineProvider>)\n\t\texpect(screen.getByRole('region', { name: '${name}' })).toBeTruthy()\n\t})\n` : ''
		return `${testsUi ? '// @vitest-environment jsdom\n\n' : ''}${uiImports}import { describe, expect, it } from 'vitest'\nimport { map${typeName}Dto } from '../model/${name}.mapper'\nimport { ${name}DtoSchema } from '../repository/${name}.dto'\n\ndescribe('${name} boundary', () => {\n\tit('validates and maps an external DTO', () => {\n\t\tconst dto = ${name}DtoSchema.parse({ id: 'example' })\n\t\texpect(map${typeName}Dto(dto)).toEqual({ id: 'example' })\n\t})\n\n\tit('rejects an invalid external DTO', () => {\n\t\texpect(() => ${name}DtoSchema.parse({ id: 1 })).toThrow()\n\t})\n${uiTest}})\n`
	}
	if (kind === 'entity') {
		return `import { describe, expect, it } from 'vitest'\nimport { create${typeName} } from '../model/${name}.model'\n\ndescribe('${name} model', () => {\n\tit('creates an independent domain value', () => {\n\t\tconst source = { id: 'example' }\n\t\tconst model = create${typeName}(source)\n\t\texpect(model).toEqual(source)\n\t\texpect(model).not.toBe(source)\n\t})\n})\n`
	}
	const hasEntry = kind === 'feature' || kind === 'module'
	return `// @vitest-environment jsdom\n\nimport { HeadlessMantineProvider } from '@mantine/core'\nimport { render, screen } from '@testing-library/react'\nimport { describe, expect, it } from 'vitest'\nimport { ${typeName}${hasEntry ? 'Entry' : ''} } from '../${hasEntry ? `${name}.entry` : `${uiDirectory}/${name}.component`}'\n\ndescribe('${name} ${kind}', () => {\n\tit('renders its accessible composition boundary', () => {\n\t\trender(<HeadlessMantineProvider env="test"><${typeName}${hasEntry ? 'Entry' : ''} /></HeadlessMantineProvider>)\n\t\texpect(screen.getByRole('region', { name: '${name}' })).toBeTruthy()\n\t})\n})\n`
}

async function readPolicy(root) {
	const { defineConfig } = await import('@jst-stack/eslint-plugin')
	const path = resolve(root, 'jst.config.ts')
	try {
		await access(path)
	}
	catch (error) {
		if (error?.code === 'ENOENT') {
			return defineConfig()
		}
		throw error
	}
	const config = await import(pathToFileURL(path).href)
	return defineConfig(config.default)
}

async function installDependencies(root, plan) {
	const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
	const packageManager = manifest.packageManager?.startsWith('pnpm@') ? 'pnpm' : 'npm'
	const install = packageManager === 'pnpm'
		? ['add', '--ignore-workspace-root-check']
		: ['install']
	if (plan.dependencies.length) {
		await run(packageManager, [...install, ...plan.dependencies], root)
	}
	if (plan.devDependencies.length) {
		await run(packageManager, [...install, '--save-dev', ...plan.devDependencies], root)
	}
}

async function registerPublicApi(root, path) {
	const manifestPath = resolve(root, 'package.json')
	const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
	const ignore = new Set(manifest.knip?.ignore ?? [])
	ignore.add(path)
	manifest.knip = { ...manifest.knip, ignore: [...ignore].sort() }
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`)
}

async function snapshotProjectFiles(root) {
	return Promise.all(['package.json', 'package-lock.json', 'pnpm-lock.yaml'].map(async (name) => {
		const path = resolve(root, name)
		try {
			return { content: await readFile(path), path }
		}
		catch (error) {
			if (error?.code === 'ENOENT') {
				return { path }
			}
			throw error
		}
	}))
}

async function restoreProjectFiles(files) {
	await Promise.all(files.map(file => file.content ? writeFile(file.path, file.content) : rm(file.path, { force: true })))
}

function run(command, args, cwd) {
	return new Promise((resolvePromise, reject) => {
		const child = spawn(command, args, { cwd, stdio: 'inherit' })
		child.once('error', reject)
		child.once('close', code => code === 0
			? resolvePromise()
			: reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}.`)))
	})
}

async function assertMissing(path) {
	try {
		await access(path)
		fail(`Slice already exists: ${path}`)
	}
	catch (error) {
		if (error?.code !== 'ENOENT') {
			throw error
		}
	}
}

function validateInput(kind, name, positionals, values) {
	if (!['entity', 'feature', 'module', 'widget'].includes(kind) || !name || positionals.length !== 2) {
		fail('Usage: npm run create:slice -- <entity|feature|module|widget> <lowerCamelName> [options]')
	}
	if (!/^[a-z][A-Za-z0-9]*$/u.test(name)) {
		fail('Slice name must be lowerCamelCase, for example accountSettings.')
	}
	if (values.style && !['css', 'scss'].includes(values.style)) {
		fail('Style must be css or scss.')
	}
}

function assertEntityOption(kind, option) {
	if (kind !== 'entity') {
		fail(`${option} is available only for entity slices.`)
	}
}

function toPascalCase(value) {
	return value[0].toUpperCase() + value.slice(1)
}

function fail(message) {
	process.stderr.write(`${message}\n`)
	process.exit(1)
}
