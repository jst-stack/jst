import { Badge, Code, Container, Stack, Text, Title } from '@mantine/core'
import { APP_CONFIG } from '@/shared/app.config'
import styles from './home.page.module.css'

const nextSteps = [
	{ detail: 'Generate a compliant vertical slice.', script: 'create:slice' },
	{ detail: 'Run the fast local quality gate.', script: 'validate' },
	{ detail: 'Run every release check before pushing.', script: 'check:release' },
] as const

export function HomePage() {
	return (
		<Container className={styles.page} component="section" size="lg">
			<Stack gap="xl">
				<div>
					<Badge color="lime" variant="light">Project ready</Badge>
					<Title className={styles.title} order={1}>{APP_CONFIG.name}</Title>
					<Text className={styles.lead} size="lg">
						Your SSR foundation, dependency boundaries, and production checks are wired. Replace this page with your first product route.
					</Text>
				</div>

				<div className={styles.steps}>
					{nextSteps.map(({ detail, script }, index) => (
						<div className={styles.step} key={script}>
							<Text className={styles.muted} fw={700} size="xs">
								0
								{index + 1}
							</Text>
							<Code className={styles.command}>{script}</Code>
							<Text className={styles.muted} size="sm">{detail}</Text>
						</div>
					))}
				</div>

				<Text className={styles.muted} size="sm">
					Architecture guide:
					{' '}
					<Code>skills/frontend-architecture/SKILL.md</Code>
				</Text>
			</Stack>
		</Container>
	)
}
