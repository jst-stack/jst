import type { Context } from 'react'
import { createContext, use } from 'react'

function useStrictContext<T>(context: Context<T | null>): T {
	const value = use(context)

	if (value === null) {
		throw new Error('Empty context value')
	}

	return value
}

function createStrictContext<T>() {
	const StrictContext = createContext<T | null>(null)

	return StrictContext
}

export function createDi<T>() {
	const injector = createStrictContext<T>()
	const useDi = () => useStrictContext(injector)

	return { Injector: injector.Provider, useDi }
}
