/**
 * DENTE CRM — Tactile Keyboard Hotkey Badge Component
 * Authority: Mandate 8b (<= 120 lines), Apple HIG (Tactile Keys)
 */

import React from "react";

export interface ClinicalHelpHotkeyBadgeProps {
	readonly hotkey: string;
	readonly onClick?: () => void;
	readonly size?: "sm" | "md";
}

export const ClinicalHelpHotkeyBadge: React.FC<ClinicalHelpHotkeyBadgeProps> = React.memo(({
	hotkey,
	onClick,
	size = "sm",
}) => {
	const isInteractive = Boolean(onClick);

	const baseClasses =
		"inline-flex items-center justify-center font-mono font-semibold rounded-md border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] shadow-2xs transition-all";

	const sizeClasses =
		size === "sm"
			? "px-1.5 py-0.5 text-[10px] min-h-[20px]"
			: "px-2.5 py-1 text-xs min-h-[28px]";

	const interactiveClasses = isInteractive
		? "cursor-pointer hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 active:scale-95 min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-0"
		: "";

	return (
		<kbd
			onClick={onClick}
			className={`${baseClasses} ${sizeClasses} ${interactiveClasses}`}
			title={`Горячая клавиша: ${hotkey}`}
		>
			{hotkey}
		</kbd>
	);
});

ClinicalHelpHotkeyBadge.displayName = "ClinicalHelpHotkeyBadge";
