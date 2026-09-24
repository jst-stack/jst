import { InjectionToken } from '@needle-di/core'

export interface KeyValueStorage {
	get: <T>(key: string) => Promise<T | null>
	set: <T>(key: string, value: T) => Promise<void>
	delete: (key: string) => Promise<void>
	clear: () => Promise<void>
}

export const KEY_VALUE_STORAGE_TOKEN = new InjectionToken<KeyValueStorage>(
	'KEY_VALUE_STORAGE',
)

export interface StorageOptions {
	prefix?: string
}
