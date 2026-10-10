export interface CompatibilityReleaseInput {
	pluginVersion: string
	summary: string
	templateVersion: string
}

export function prepareCompatibilityRelease(root: string, input: CompatibilityReleaseInput): Promise<void>
