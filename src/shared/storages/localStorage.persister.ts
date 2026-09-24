import type { KeyValueStorage, StorageOptions } from './storage.types'

export class LocalStoragePersister implements KeyValueStorage {
	private prefix: string
	private memoryStorage = new Map<string, string>()

	constructor(options: StorageOptions = {}) {
		this.prefix = options.prefix || 'app_'
	}

	private createKey(key: string): string {
		return `${this.prefix}${key}`
	}

	private getStorage() {
		if (typeof window === 'undefined') {
			return null
		}

		return window.localStorage
	}

	async get<T>(key: string): Promise<T | null> {
		try {
			const storageKey = this.createKey(key)
			const data
				= this.getStorage()?.getItem(storageKey)
					?? this.memoryStorage.get(storageKey)
					?? null

			return data ? JSON.parse(data) as T : null
		}
		catch (error) {
			console.error('Storage get error:', error)
			return null
		}
	}

	async set<T>(key: string, value: T): Promise<void> {
		try {
			const storageKey = this.createKey(key)
			const data = JSON.stringify(value)
			const storage = this.getStorage()

			if (storage) {
				storage.setItem(storageKey, data)
			}
			else {
				this.memoryStorage.set(storageKey, data)
			}
		}
		catch (error) {
			console.error('Storage set error:', error)
			throw error
		}
	}

	async delete(key: string): Promise<void> {
		const storageKey = this.createKey(key)
		this.getStorage()?.removeItem(storageKey)
		this.memoryStorage.delete(storageKey)
	}

	async clear(): Promise<void> {
		const storage = this.getStorage()

		if (storage) {
			for (const key of Object.keys(storage)) {
				if (key.startsWith(this.prefix)) {
					storage.removeItem(key)
				}
			}
		}

		this.memoryStorage.clear()
	}
}
