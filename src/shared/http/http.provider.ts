import type { Container } from '@needle-di/core'
import { HTTP_CLIENT_TOKEN } from './httpClient.types'
import { FetchHttpClient } from './repository/fetchHttpClient.adapter'

export const scope = 'request' as const

export function provider(container: Container) {
	container.bindAll({ provide: HTTP_CLIENT_TOKEN, useClass: FetchHttpClient })
}
