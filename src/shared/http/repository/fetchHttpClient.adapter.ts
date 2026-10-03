import type { HttpClient } from '../httpClient.types'

export class FetchHttpClient implements HttpClient {
	async request(url: string, init?: RequestInit): Promise<unknown> {
		const response = await fetch(url, init)
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText}`)
		}
		return response.json()
	}
}
