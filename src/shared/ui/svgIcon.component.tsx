import type { SVGProps } from 'react'

export interface SvgIconProps extends SVGProps<SVGSVGElement> {
	name: string
}

export function SvgIcon({ name, ...props }: SvgIconProps) {
	const labelled = props['aria-label'] !== undefined || props['aria-labelledby'] !== undefined

	return (
		<svg
			aria-hidden={labelled ? undefined : true}
			focusable="false"
			height="1em"
			role={labelled ? 'img' : undefined}
			width="1em"
			{...props}
		>
			<use href={`#icon-${name}`} />
		</svg>
	)
}
