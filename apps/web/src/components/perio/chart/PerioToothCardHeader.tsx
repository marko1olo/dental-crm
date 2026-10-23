/**
 * PerioToothCardHeader.tsx — Заголовок карточки зуба: номер, имплантат, подвижность Miller, фуркация Hamp.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { FURCATION_GRADES, isFurcationEligibleTooth, MOBILITY_GRADES, type PerioToothRecord } from "@dental/shared";
import React from "react";

export interface PerioToothCardHeaderProps {
	readonly tooth: PerioToothRecord;
	readonly isSelected: boolean;
	readonly isMissing: boolean;
	readonly isImplant: boolean;
	readonly readOnly: boolean;
	readonly onCycleMobility?: (() => void) | undefined;
	readonly onCycleFurcation?: (() => void) | undefined;
}

export const PerioToothCardHeader: React.FC<PerioToothCardHeaderProps> = React.memo(({
	tooth, isSelected, isMissing, isImplant, readOnly, onCycleMobility, onCycleFurcation,
}) => {
	return (
		<div className="w-full flex items-center justify-between text-[10px] font-bold px-0.5 mb-0.5 min-w-0">
			<span className={`truncate ${isSelected ? "text-teal-300 font-black scale-105" : "text-[var(--ink)]"}`}>
				{tooth.toothNumber}
			</span>
			<div className="flex items-center gap-0.5 shrink-0">
				{isImplant && (
					<span className="text-[8px] font-bold text-amber-400 font-mono px-0.5 rounded bg-amber-500/10 border border-amber-500/30" title="Дентальный имплантат">
						ИМП
					</span>
				)}
				{!isMissing && onCycleMobility && (
					<button
						type="button" disabled={readOnly}
						onClick={(e) => { e.stopPropagation(); onCycleMobility(); }}
						className={`px-1 py-0.2 rounded text-[8px] font-black tracking-tight cursor-pointer transition-all border ${
							tooth.mobility === 0
								? "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:bg-amber-500/20 hover:text-amber-300"
								: tooth.mobility === 1
									? "bg-amber-500/25 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30"
									: tooth.mobility === 2
										? "bg-orange-500/30 text-orange-200 border-orange-500/50 ring-1 ring-orange-400/40"
										: "bg-rose-500/35 text-rose-200 border-rose-500/60 ring-1 ring-rose-400/50 font-black animate-pulse"
						}`}
						title={`Подвижность Miller: ${MOBILITY_GRADES[tooth.mobility]?.nameRu ?? "0"}`}
						data-testid={`tooth-${tooth.toothNumber}-mobility`}
					>
						M{tooth.mobility}
					</button>
				)}
				{!isMissing && isFurcationEligibleTooth(tooth.toothNumber) && onCycleFurcation && (
					<button
						type="button" disabled={readOnly}
						onClick={(e) => { e.stopPropagation(); onCycleFurcation(); }}
						className={`px-1 py-0.2 rounded text-[8px] font-black tracking-tight cursor-pointer transition-all border ${
							tooth.furcation === 0
								? "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:bg-rose-500/20 hover:text-rose-300"
								: tooth.furcation === 1
									? "bg-amber-500/25 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30"
									: tooth.furcation === 2
										? "bg-orange-500/30 text-orange-200 border-orange-500/50 ring-1 ring-orange-400/40"
										: "bg-rose-600/35 text-rose-200 border-rose-500/60 ring-1 ring-rose-400/50 font-black"
						}`}
						title={`Фуркация Hamp: ${FURCATION_GRADES[tooth.furcation]?.nameRu ?? "0"}`}
						data-testid={`tooth-${tooth.toothNumber}-furcation`}
					>
						F{tooth.furcation}
					</button>
				)}
			</div>
		</div>
	);
});

PerioToothCardHeader.displayName = "PerioToothCardHeader";
