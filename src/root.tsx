import type { ReactNode } from 'react'
import type { Route } from './+types/root'
import { ColorSchemeScript } from '@mantine/core'
import { useState } from 'react'
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Scripts,
	ScrollRestoration,
} from 'react-router'
import svgSprite from 'virtual:svg-icons/sprite'
import { AppProviders } from './app/app.component'
import { BaseLayout } from './app/baseLayout.component'
import { createAppContainer } from './app/container/container.composition'
import { appColorScheme, forcedColorScheme } from './app/theme.config'
import styles from './root.module.css'
import { APP_CONFIG } from './shared/app.config'
import '@mantine/core/styles.css'
import './index.css'

export const headers: Route.HeadersFunction = () => ({
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Content-Type-Options': 'nosniff',
	'X-XSS-Protection': '0',
})

export function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang={APP_CONFIG.language} suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<ColorSchemeScript
					defaultColorScheme={appColorScheme}
					forceColorScheme={forcedColorScheme}
				/>
				<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
				<Meta />
				<Links />
			</head>
			<body>
				{/* SVG content is compiled from repository-owned files during the Vite build. */}
				{/* eslint-disable-next-line react/dom-no-dangerously-set-innerhtml */}
				<div aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgSprite }} />
				<a className={styles.skipLink} href="#main-content">Skip to content</a>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export default function Root() {
	const [container] = useState(createAppContainer)

	return (
		<AppProviders container={container}>
			<BaseLayout />
		</AppProviders>
	)
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	const notFound = isRouteErrorResponse(error) && error.status === 404
	const title = `${notFound ? 'Page not found' : 'Error'} | ${APP_CONFIG.name}`

	return (
		<>
			<title>{title}</title>
			<meta name="robots" content="noindex" />
			<main id="main-content" tabIndex={-1}>
				<h1>{notFound ? '404' : 'Something went wrong'}</h1>
				<p>{notFound ? 'The requested page was not found.' : 'Please try again later.'}</p>
			</main>
		</>
	)
}
