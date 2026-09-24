import type { Container } from '@needle-di/core'
import type { ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import { AppContainerProvider } from './container/container.provider'
import { appColorScheme, forcedColorScheme, theme } from './theme.config'

export function AppProviders({
	container,
	children,
}: {
	container: Container
	children: ReactNode
}) {
	return (
		<AppContainerProvider container={container}>
			<MantineProvider
				defaultColorScheme={appColorScheme}
				forceColorScheme={forcedColorScheme}
				theme={theme}
			>
				{children}
			</MantineProvider>
		</AppContainerProvider>
	)
}
