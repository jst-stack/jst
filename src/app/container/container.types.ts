import type { Container } from '@needle-di/core'

type ProviderFn = (container: Container) => void

export interface ProviderModule {
	provider: ProviderFn
}
