/**
 * PerioArchFilterBar.tsx — Фильтры выбора челюстей и секстантов S1..S6 для пародонтограммы.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import React from "react";

export type PerioArchFilterType = "all" | "upper" | "lower" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export interface PerioArchFilterBarProps {
	readonly archFilter: PerioArchFilterType;
	readonly onSetArchFilter: (filter: PerioArchFilterType) => void;
}

const SEXTANTS = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;

export const PerioArchFilterBar: React.FC<PerioArchFilterBarProps> = React.memo(({
	archFilter, onSetArchFilter,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 overflow-x-auto h-9 min-h-[36px] max-h-9 py-0.5 px-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold shrink-0 select-none">
			<div className="flex items-center gap-1.5 shrink-0">
				<button
					type="button" onClick={() => onSetArchFilter("all")}
					className={`secondary-button shrink-0 ${archFilter === "all" ? "active" : ""}`}
					data-testid="perio-arch-filter-all"
				>
					<span>Обе челюсти (18–48)</span>
				</button>
				<button
					type="button" onClick={() => onSetArchFilter("upper")}
					className={`secondary-button shrink-0 ${archFilter === "upper" ? "active" : ""}`}
					data-testid="perio-arch-filter-upper"
				>
					<span>Верхняя челюсть (18–28)</span>
				</button>
				<button
					type="button" onClick={() => onSetArchFilter("lower")}
					className={`secondary-button shrink-0 ${archFilter === "lower" ? "active" : ""}`}
					data-testid="perio-arch-filter-lower"
				>
					<span>Нижняя челюсть (48–38)</span>
				</button>
			</div>

			<div className="h-4 w-[1px] bg-[var(--line)] mx-0.5 shrink-0 hidden sm:block" />

			{/* Sextants S1..S6 */}
			<div className="flex items-center gap-1 shrink-0">
				{SEXTANTS.map((sName) => (
					<button
						key={sName} type="button"
						onClick={() => onSetArchFilter(archFilter === sName ? "all" : sName)}
						className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer h-7 flex items-center ${
							archFilter === sName
								? "bg-teal-600 text-white shadow-xs"
								: "bg-[var(--paper)] text-[var(--muted)] hover:text-teal-300 border border-[var(--line)]"
						}`}
						title={`Секстант ${sName}`}
					>
						{sName}
					</button>
				))}
			</div>

			<div className="text-[11px] text-[var(--muted)] flex items-center gap-2 shrink-0 ml-auto pl-2">
				<span className="truncate">
					{archFilter === "all" ? "32 зуба (6 точек на зуб)" : archFilter === "upper" ? "Верхняя челюсть (16 зубов)" : archFilter === "lower" ? "Нижняя челюсть (16 зубов)" : `Секстант ${archFilter}`}
				</span>
			</div>
		</div>
	);
});

PerioArchFilterBar.displayName = "PerioArchFilterBar";
