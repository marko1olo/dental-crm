import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface ShiftCalloutProps extends ComponentPropsWithoutRef<"div"> {
	children: ReactNode;
	icon?: ReactNode;
}

/**
 * ShiftCallout component — renders warning/guidance callouts for shift management
 * with dark mode contrast optimization (no harsh light-amber glare in dark theme).
 */
export function ShiftCallout({
	children,
	icon,
	className = "",
	...props
}: ShiftCalloutProps) {
	return (
		<div
			className={`hero-call-guidance flex items-start gap-2.5 p-3 rounded-xl text-xs sm:text-sm leading-relaxed bg-[var(--warn-bg,#fef3c7)] text-[var(--warn-fg,#92400e)] border border-amber-300/50 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/50 ${className}`.trim()}
			{...props}
		>
			{icon ? (
				<span className="shrink-0 mt-0.5" aria-hidden="true">
					{icon}
				</span>
			) : null}
			<div className="flex-1 min-w-0">{children}</div>
		</div>
	);
}
