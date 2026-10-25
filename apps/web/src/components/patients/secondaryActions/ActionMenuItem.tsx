import React from "react";

interface ActionMenuItemProps {
	readonly icon: React.ReactNode;
	readonly label: string;
	readonly onClick: () => void;
	readonly title?: string;
	readonly testId: string;
	readonly badge?: React.ReactNode;
}

export function ActionMenuItem({
	icon,
	label,
	onClick,
	title,
	testId,
	badge,
}: ActionMenuItemProps) {
	return (
		<button
			type="button"
			className="patient-dropdown-item hover:bg-[var(--paper-hover)] text-[var(--ink)] flex items-center justify-between gap-2 w-full px-3 py-2 min-h-[36px] text-xs font-semibold rounded-md border-none bg-transparent cursor-pointer text-left transition-colors"
			onClick={onClick}
			title={title ?? label}
			data-testid={testId}
		>
			<span className="flex items-center gap-2 min-w-0 truncate">
				{icon}
				<span className="truncate">{label}</span>
			</span>
			{badge}
		</button>
	);
}
