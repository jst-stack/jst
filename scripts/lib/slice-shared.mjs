import process from 'node:process'

export function fail(message) {
	process.stderr.write(`${message}\n`)
	process.exit(1)
}

export function toPascalCase(value) {
	return value[0].toUpperCase() + value.slice(1)
}
