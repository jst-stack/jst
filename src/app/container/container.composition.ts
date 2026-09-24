import type { ProviderModule } from './container.types'
import { Container } from '@needle-di/core'

const providerModules = import.meta.glob<ProviderModule>([
	'../../entities/**/*.provider.ts',
	'../../features/**/*.provider.ts',
	'../../shared/**/*.provider.ts',
], {
	eager: true,
})

export function createAppContainer() {
	const container = new Container()

	for (const [modulePath, module] of Object.entries(providerModules)) {
		if (typeof module.provider !== 'function') {
			throw new TypeError(`[DI] Invalid provider module: ${modulePath}`)
		}

		module.provider(container)
	}

	return container
}
