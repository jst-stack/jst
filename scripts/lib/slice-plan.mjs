import { fail, toPascalCase } from './slice-shared.mjs'
import {
	createComponent,
	createDto,
	createEntityPublicApi,
	createFeatureEntry,
	createFetchAdapter,
	createMapper,
	createModel,
	createMswHandler,
	createProvider,
	createRepository,
	createStore,
	createTest,
} from './slice-templates.mjs'

export function createPlan(options) {
	const files = new Map()
	const dependencies = new Set()
	const devDependencies = new Set()
	const plan = {
		...options,
		devDependencies,
		dependencies,
		files,
		publicApiSuffix: options.policy.imports.publicApiSuffix,
		testDirectory: options.policy.generator.testDirectory,
		testSuffix: options.policy.files.testSuffixes[0],
		typeName: toPascalCase(options.name),
		uiDirectory: options.policy.files.roleDirectories.component,
	}

	planOwnedFiles(plan)
	planComponentFiles(plan)
	planRepositoryFiles(plan)
	planServiceFile(plan)
	planStatefulFile(plan)
	planPersistenceFile(plan)
	planMswFile(plan)
	planTestFile(plan)
	if (plan.style === 'scss') {
		devDependencies.add('sass')
	}

	return { dependencies: [...dependencies], devDependencies: [...devDependencies], files }
}

function planOwnedFiles(plan) {
	const { files, kind, name, publicApiSuffix, typeName, values } = plan
	if (kind === 'entity') {
		files.set(`model/${name}.model.ts`, createModel(typeName))
		files.set(`${name}${publicApiSuffix}.ts`, createEntityPublicApi(typeName, name, values.repository, values.stateful))
		return
	}
	if (kind === 'feature' || kind === 'module') {
		files.set(`${name}.entry.tsx`, createFeatureEntry(typeName, name, plan.uiDirectory, values.stateful))
		if (values.public) {
			files.set(`${name}${publicApiSuffix}.ts`, `export { ${typeName}Entry } from './${name}.entry'\n`)
		}
		return
	}
	if (kind === 'widget') {
		files.set(`${name}${publicApiSuffix}.ts`, `export { ${typeName} } from './${plan.uiDirectory}/${name}.component'\n`)
	}
}

function planComponentFiles(plan) {
	const { files, kind, name, style, typeName, values } = plan
	if (!values.ui && kind === 'entity') {
		return
	}
	const uiDirectory = plan.uiDirectory
	const componentName = ['feature', 'module'].includes(kind) ? `${typeName}View` : typeName
	const stateful = ['feature', 'module'].includes(kind) && values.stateful
	files.set(`${uiDirectory}/${name}.component.tsx`, createComponent(componentName, name, style, stateful))
	files.set(`${uiDirectory}/${name}.component.module.${style}`, '.root {\n\tdisplay: block;\n}\n')
}

function planRepositoryFiles(plan) {
	const { dependencies, files, kind, name, policy, typeName, values } = plan
	if (!values.repository) {
		return
	}
	assertEntityOption(kind, '--repository')
	dependencies.add('zod')
	files.set(`repository/${name}.dto.ts`, createDto(typeName, name))
	files.set(`repository/${name}.repository.ts`, createRepository(typeName, name))
	files.set(`model/${name}.mapper.ts`, createMapper(typeName, name))
	files.set(`repository/${name}.adapter.ts`, createFetchAdapter(typeName, name, policy.imports.alias))
	files.set(`${name}.provider.ts`, createProvider(typeName, name))
}

function planServiceFile(plan) {
	const { files, kind, name, typeName, values } = plan
	if (!values.service) {
		return
	}
	assertEntityOption(kind, '--service')
	files.set(`services/${name}.service.ts`, `export class ${typeName}Service {}\n`)
}

function planStatefulFile(plan) {
	const { dependencies, files, kind, name, typeName, values } = plan
	if (!values.stateful) {
		return
	}
	if (kind === 'widget') {
		fail('--stateful is available only for entity, feature, and module slices.')
	}
	dependencies.add('@reatom/core')
	if (kind === 'feature' || kind === 'module') {
		dependencies.add('@reatom/react')
	}
	files.set(`${name}.store.ts`, createStore(typeName, name))
}

function planPersistenceFile(plan) {
	const { files, kind, name, typeName, values } = plan
	if (!values.persistence) {
		return
	}
	assertEntityOption(kind, '--persistence')
	files.set(`repository/${name}.persister.ts`, `export interface ${typeName}Persister {\n\tclear: () => Promise<void>\n}\n`)
}

function planMswFile(plan) {
	const { devDependencies, files, kind, name, values } = plan
	if (!values.msw) {
		return
	}
	assertEntityOption(kind, '--msw')
	if (!values.repository) {
		fail('--msw requires --repository.')
	}
	devDependencies.add('msw')
	files.set(`repository/${name}.handler.ts`, createMswHandler(name))
}

function planTestFile(plan) {
	const { devDependencies, files, kind, name, typeName, values } = plan
	if (!values.tests) {
		return
	}
	const testsUi = values.ui || kind !== 'entity'
	const extension = testsUi ? 'tsx' : 'ts'
	files.set(
		`${plan.testDirectory}/${name}.${plan.testSuffix}.${extension}`,
		createTest({ kind, typeName, name, hasRepository: values.repository, testsUi, uiDirectory: plan.uiDirectory }),
	)
	if (testsUi) {
		devDependencies.add('@testing-library/react')
		devDependencies.add('jsdom')
	}
}

function assertEntityOption(kind, option) {
	if (kind !== 'entity') {
		fail(`${option} is available only for entity slices.`)
	}
}
