export function createModel(typeName) {
	return `export interface ${typeName} {\n\treadonly id: string\n}\n\nexport function create${typeName}(value: ${typeName}): ${typeName} {\n\treturn { ...value }\n}\n`
}

export function createEntityPublicApi(typeName, name, hasRepository, stateful) {
	return `${stateful ? `export { ${typeName}Store } from './${name}.store'\n` : ''}export { create${typeName} } from './model/${name}.model'\nexport type { ${typeName} } from './model/${name}.model'\n${hasRepository ? `export { ${name}RepositoryToken } from './repository/${name}.repository'\nexport type { ${typeName}Repository } from './repository/${name}.repository'\n` : ''}`
}

export function createComponent(componentName, name, style, stateful) {
	if (stateful) {
		return `import { Button, Stack, Text } from '@mantine/core'\nimport styles from './${name}.component.module.${style}'\n\ninterface ${componentName}Props {\n\treadonly count: number\n\treadonly onIncrement: () => void\n}\n\nexport function ${componentName}({ count, onIncrement }: ${componentName}Props) {\n\treturn (\n\t\t<Stack aria-label="${name}" className={styles.root} component="section">\n\t\t\t<Text>\n\t\t\t\tCount:\n\t\t\t\t{' '}\n\t\t\t\t{count}\n\t\t\t</Text>\n\t\t\t<Button onClick={onIncrement}>Increment</Button>\n\t\t</Stack>\n\t)\n}\n`
	}
	return `import { Box } from '@mantine/core'\nimport styles from './${name}.component.module.${style}'\n\nexport function ${componentName}() {\n\treturn <Box aria-label="${name}" className={styles.root} component="section" />\n}\n`
}

export function createFeatureEntry(typeName, name, uiDirectory, stateful) {
	if (!stateful) {
		return `import { ${typeName}View } from './${uiDirectory}/${name}.component'\n\nexport function ${typeName}Entry() {\n\treturn <${typeName}View />\n}\n`
	}
	return `import { reatomComponent, useWrap } from '@reatom/react'\nimport { ${typeName}Store } from './${name}.store'\nimport { ${typeName}View } from './${uiDirectory}/${name}.component'\n\nconst store = new ${typeName}Store()\n\nfunction ${typeName}EntryViewModel() {\n\tconst onIncrement = useWrap(store.increment)\n\treturn <${typeName}View count={store.count()} onIncrement={onIncrement} />\n}\n\nexport const ${typeName}Entry = reatomComponent(${typeName}EntryViewModel, '${typeName}Entry')\n`
}

export function createStore(typeName, name) {
	return `import { action, atom } from '@reatom/core'\n\nexport class ${typeName}Store {\n\tcount = atom(0, '${name}.count')\n\tincrement = action(() => this.count.set(this.count() + 1), '${name}.increment')\n}\n`
}

export function createDto(typeName, name) {
	return `import { z } from 'zod'\n\nexport const ${name}DtoSchema = z.object({ id: z.string() })\nexport type ${typeName}Dto = z.infer<typeof ${name}DtoSchema>\n`
}

export function createRepository(typeName, name) {
	return `import type { ${typeName} } from '../model/${name}.model'\nimport { InjectionToken } from '@needle-di/core'\n\nexport interface ${typeName}Repository {\n\tfindById: (id: string) => Promise<${typeName}>\n}\n\nexport const ${name}RepositoryToken = new InjectionToken<${typeName}Repository>('${typeName.toUpperCase()}_REPOSITORY')\n`
}

export function createMapper(typeName, name) {
	return `import type { ${typeName}Dto } from '../repository/${name}.dto'\nimport type { ${typeName} } from './${name}.model'\nimport { create${typeName} } from './${name}.model'\n\nexport function map${typeName}Dto(dto: ${typeName}Dto): ${typeName} {\n\treturn create${typeName}({ id: dto.id })\n}\n`
}

export function createFetchAdapter(typeName, name, alias) {
	return `import type { ${typeName}Repository } from './${name}.repository'\nimport type { HttpClient } from '${alias}shared/http/httpClient.types'\nimport { inject } from '@needle-di/core'\nimport { HTTP_CLIENT_TOKEN } from '${alias}shared/http/httpClient.types'\nimport { map${typeName}Dto } from '../model/${name}.mapper'\nimport { ${name}DtoSchema } from './${name}.dto'\n\nexport class ${typeName}FetchAdapter implements ${typeName}Repository {\n\tconstructor(private readonly httpClient: HttpClient = inject(HTTP_CLIENT_TOKEN)) {}\n\n\tasync findById(id: string) {\n\t\tconst dto = ${name}DtoSchema.parse(await this.httpClient.request(\`/${name}/\${id}\`))\n\t\treturn map${typeName}Dto(dto)\n\t}\n}\n`
}

export function createProvider(typeName, name) {
	return `import type { Container } from '@needle-di/core'\nimport { ${typeName}FetchAdapter } from './repository/${name}.adapter'\nimport { ${name}RepositoryToken } from './repository/${name}.repository'\n\nexport const scope = 'request' as const\n\nexport function provider(container: Container) {\n\tcontainer.bindAll({ provide: ${name}RepositoryToken, useClass: ${typeName}FetchAdapter })\n}\n`
}

export function createMswHandler(name) {
	return `import { http, HttpResponse } from 'msw'\n\nexport const ${name}Handlers = [\n\thttp.get('*/${name}/:id', ({ params }) => HttpResponse.json({ id: params.id })),\n]\n`
}

export function createTest({ kind, typeName, name, hasRepository, testsUi, uiDirectory }) {
	if (kind === 'entity') {
		return hasRepository
			? createEntityRepositoryTest({ typeName, name, testsUi, uiDirectory })
			: createEntityModelTest(typeName, name)
	}
	return createCompositionTest({ kind, typeName, name, uiDirectory })
}

function createEntityRepositoryTest({ typeName, name, testsUi, uiDirectory }) {
	const uiImports = testsUi
		? `import { HeadlessMantineProvider } from '@mantine/core'\nimport { render, screen } from '@testing-library/react'\n`
		: ''
	const uiComponentImport = testsUi
		? `import { ${typeName} } from '../${uiDirectory}/${name}.component'\n`
		: ''
	const uiTest = testsUi
		? `\n\tit('renders the props-driven entity view', () => {\n\t\trender(<HeadlessMantineProvider env="test"><${typeName} /></HeadlessMantineProvider>)\n\t\texpect(screen.getByRole('region', { name: '${name}' })).toBeTruthy()\n\t})\n`
		: ''
	return `${testsUi ? '// @vitest-environment jsdom\n\n' : ''}${uiImports}import { describe, expect, it } from 'vitest'\nimport { map${typeName}Dto } from '../model/${name}.mapper'\nimport { ${name}DtoSchema } from '../repository/${name}.dto'\n${uiComponentImport}\ndescribe('${name} boundary', () => {\n\tit('validates and maps an external DTO', () => {\n\t\tconst dto = ${name}DtoSchema.parse({ id: 'example' })\n\t\texpect(map${typeName}Dto(dto)).toEqual({ id: 'example' })\n\t})\n\n\tit('rejects an invalid external DTO', () => {\n\t\texpect(() => ${name}DtoSchema.parse({ id: 1 })).toThrow()\n\t})\n${uiTest}})\n`
}

function createEntityModelTest(typeName, name) {
	return `import { describe, expect, it } from 'vitest'\nimport { create${typeName} } from '../model/${name}.model'\n\ndescribe('${name} model', () => {\n\tit('creates an independent domain value', () => {\n\t\tconst source = { id: 'example' }\n\t\tconst model = create${typeName}(source)\n\t\texpect(model).toEqual(source)\n\t\texpect(model).not.toBe(source)\n\t})\n})\n`
}

function createCompositionTest({ kind, typeName, name, uiDirectory }) {
	const hasEntry = kind === 'feature' || kind === 'module'
	const importName = hasEntry ? `${typeName}Entry` : typeName
	const importPath = hasEntry ? `${name}.entry` : `${uiDirectory}/${name}.component`
	return `// @vitest-environment jsdom\n\nimport { HeadlessMantineProvider } from '@mantine/core'\nimport { render, screen } from '@testing-library/react'\nimport { describe, expect, it } from 'vitest'\nimport { ${importName} } from '../${importPath}'\n\ndescribe('${name} ${kind}', () => {\n\tit('renders its accessible composition boundary', () => {\n\t\trender(<HeadlessMantineProvider env="test"><${importName} /></HeadlessMantineProvider>)\n\t\texpect(screen.getByRole('region', { name: '${name}' })).toBeTruthy()\n\t})\n})\n`
}
