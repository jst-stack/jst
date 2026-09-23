import { Outlet } from 'react-router'

export function BaseLayout() {
	return (
		<main id="main-content" tabIndex={-1}>
			<Outlet />
		</main>
	)
}
