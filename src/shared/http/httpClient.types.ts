import { InjectionToken } from '@needle-di/core'

export interface HttpClient {
	request: (url: string, init?: RequestInit) => Promise<unknown>
}

export const HTTP_CLIENT_TOKEN = new InjectionToken<HttpClient>('HTTP_CLIENT')
