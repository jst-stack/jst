import type { Container } from '@needle-di/core'
import type { ReactNode } from 'react'
import { AppContainerContext } from '@/shared/di/serviceLocator.context'

export function AppContainerProvider({
	container,
	children,
}: {
	container: Container
	children: ReactNode
}) {
	return (
		<AppContainerContext value={container}>
			{children}
		</AppContainerContext>
	)
}
