import React from "react";

export interface DentalLabKanbanCardMenuItemProps {
	readonly icon: React.ReactNode;
	readonly label: string;
	readonly onClick: () => void;
	readonly title?: string;
	readonly testId?: string;
	readonly textColor?: string;
}

export function DentalLabKanbanCardMenuItem({
	icon,
	label,
	onClick,
	title,
	testId,
	textColor,
}: DentalLabKanbanCardMenuItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			role="menuitem"
			data-testid={testId}
			style={{ color: textColor }}
			className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium cursor-pointer min-h-[44px] sm:min-h-[36px] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors border-none bg-transparent"
		>
			<span className="shrink-0">{icon}</span>
			<span className="truncate">{label}</span>
		</button>
	);
}
