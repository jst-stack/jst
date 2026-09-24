import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ESLint } from 'eslint'
import { expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const fixture = resolve(root, 'src/features/architectureContractFixture')

it('guides invalid source toward the required filename, role, and effect boundary', async () => {
	const invalidName = resolve(fixture, 'ui/BadComponent.tsx')
	const invalidEffect = resolve(fixture, 'model/orders.model.ts')
	const validAdapter = resolve(root, 'src/entities/architectureContractFixture/repository/orders.repository.ts')

	try {
		await mkdir(resolve(fixture, 'ui'), { recursive: true })
		await mkdir(resolve(fixture, 'model'), { recursive: true })
		await mkdir(resolve(validAdapter, '..'), { recursive: true })
		await writeFile(invalidName, 'export function BadComponent() { return null }\n')
		await writeFile(invalidEffect, 'export const loadOrders = () => fetch(\'/orders\')\n')
		await writeFile(validAdapter, 'export const loadOrders = () => fetch(\'/orders\')\n')

		const [nameResult, effectResult, adapterResult] = await new ESLint({ cache: false, cwd: root })
			.lintFiles([invalidName, invalidEffect, validAdapter])
		expect(nameResult.messages.map(message => message.message).join('\n')).toMatch(/Rename "BadComponent\.tsx"/u)
		expect(effectResult.messages.map(message => message.message).join('\n')).toMatch(/Move fetch access behind an entity repository/u)
		expect(adapterResult.messages).toEqual([])
	}
	finally {
		await rm(fixture, { force: true, recursive: true })
		await rm(resolve(validAdapter, '../..'), { force: true, recursive: true })
	}
}, 20_000)
