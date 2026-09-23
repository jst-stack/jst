import type { MantineColorScheme } from '@mantine/core'
import { createTheme } from '@mantine/core'
import { APP_CONFIG } from '@/shared/config'

export const appColorScheme: MantineColorScheme = APP_CONFIG.colorScheme
export const forcedColorScheme = getForcedColorScheme(appColorScheme)

export const theme = createTheme({
	autoContrast: true,
	defaultRadius: 'sm',
	fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
	headings: {
		fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
		fontWeight: '600',
	},
	primaryColor: APP_CONFIG.primaryColor,
	primaryShade: { dark: 4, light: 7 },
})

function getForcedColorScheme(colorScheme: MantineColorScheme) {
	return colorScheme === 'auto' ? undefined : colorScheme
}
