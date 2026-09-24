import type { Container, Token } from '@needle-di/core'
import { createContext, use } from 'react'

export const AppContainerContext = createContext<Container | null>(null)

function useAppContainer() {
	const container = use(AppContainerContext)

	if (!container) {
		throw new Error('AppContainerProvider is missing in the React tree.')
	}

	return container
}

/**
 * Feature and page integration point.
 * @public
 */
export const useService = <T>(token: Token<T>) => useAppContainer().get(token)
