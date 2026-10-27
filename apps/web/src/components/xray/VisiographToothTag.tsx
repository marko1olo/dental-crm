/**
 * VisiographToothTag.tsx — Метка зуба по формуле FDI (11–48) для рентген-снимка
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";

export interface VisiographToothTagProps {
	readonly toothCode?: string | number | undefined;
	readonly isSelected?: boolean;
	readonly onClick?: () => void;
	readonly title?: string;
}

export function VisiographToothTag({
	toothCode,
	isSelected = false,
	onClick,
	title,
}: VisiographToothTagProps) {
	const displayTooth = toothCode ? `Зуб #${toothCode}` : "Зуб не привязан";

	return (
		<div
			className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold select-none transition-colors border ${
				isSelected
					? "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]"
					: "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)]"
			}`}
			data-testid="visiograph-tooth-tag"
			title={title ?? `Привязка к зубной формуле FDI: ${displayTooth}`}
			onClick={onClick}
			role={onClick ? "button" : undefined}
		>
			<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)] shrink-0" aria-hidden="true" />
			<span className="whitespace-nowrap font-medium text-[11px] sm:text-xs">
				{displayTooth}
			</span>
		</div>
	);
}
