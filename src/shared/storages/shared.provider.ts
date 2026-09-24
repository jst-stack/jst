import type { Container } from '@needle-di/core'
import { LocalStoragePersister } from './localStorage.persister'
import { KEY_VALUE_STORAGE_TOKEN } from './storage.types'

export function provider(container: Container) {
	container.bindAll({
		provide: KEY_VALUE_STORAGE_TOKEN,
		useClass: LocalStoragePersister,
	})
}
