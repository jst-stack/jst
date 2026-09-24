import { APP_CONFIG } from '@/shared/app.config'
import { HomePage } from './home.page'

export default function HomeRoute() {
	const { description, name: title } = APP_CONFIG

	return (
		<>
			<title>{title}</title>
			<meta name="description" content={description} />
			<meta property="og:title" content={title} />
			<meta property="og:description" content={description} />
			<meta name="twitter:card" content="summary" />
			<HomePage />
		</>
	)
}
