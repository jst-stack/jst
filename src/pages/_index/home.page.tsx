import { Container, Title } from '@mantine/core'
import { APP_CONFIG } from '@/shared/app.config'

export function HomePage() {
	return (
		<Container size="lg">
			<Title order={1} py="xl">{APP_CONFIG.name}</Title>
		</Container>
	)
}
