import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ESLint } from 'eslint'
import { expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const sourceFixture = resolve(root, 'src/features/architectureSourceFixture')
const testFixture = resolve(root, 'src/features/architectureTestFixture')

it('guides invalid source toward the required filename, role, and effect boundary', async () => {
	const invalidName = resolve(sourceFixture, 'ui/BadComponent.tsx')
	const invalidEffect = resolve(sourceFixture, 'model/orders.model.ts')
	const validAdapter = resolve(root, 'src/entities/architectureContractFixture/repository/orders.repository.ts')

	try {
		await mkdir(resolve(sourceFixture, 'ui'), { recursive: true })
		await mkdir(resolve(sourceFixture, 'model'), { recursive: true })
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
		await rm(sourceFixture, { force: true, recursive: true })
		await rm(resolve(validAdapter, '../..'), { force: true, recursive: true })
	}
}, 80_000)

it('keeps tests behind cross-slice public APIs', async () => {
	const invalidTest = resolve(testFixture, '__tests__/queue.test.ts')
	try {
		await mkdir(resolve(invalidTest, '..'), { recursive: true })
		await writeFile(invalidTest, 'import { stub } from \'@/entities/order/__tests__/orderGatewayStub.lib\'\nexport { stub }\n')
		const [result] = await new ESLint({ cache: false, cwd: root }).lintFiles([invalidTest])
		expect(result.messages.map(message => message.message).join('\n')).toMatch(/entities\/order through its order\.public public API/u)
	}
	finally {
		await rm(testFixture, { force: true, recursive: true })
	}
}, 80_000)
