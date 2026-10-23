/**
 * PerioArchRow.tsx — Строка челюсти (16 зубов) с 6 точками зондирования.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import type { PerioSiteKey, PerioToothRecord } from "@dental/shared";
import React from "react";
import { PerioToothCard } from "./PerioToothCard";

export interface PerioArchRowProps {
	readonly title: string;
	readonly subtitle: string;
	readonly teethNumbers: readonly number[];
	readonly isUpper: boolean;
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly selectedToothNumber: number;
	readonly focusedSite: { toothNumber: number; siteKey: PerioSiteKey } | null;
	readonly readOnly?: boolean | undefined;
	readonly onSelectTooth: (toothNumber: number) => void;
	readonly onFocusSite: (toothNumber: number, siteKey: PerioSiteKey) => void;
	readonly onCycleMobility: (toothNumber: number) => void;
	readonly onCycleFurcation: (toothNumber: number) => void;
	readonly onToggleBop: (toothNumber: number, siteKey: PerioSiteKey) => void;
	readonly onTogglePlaque: (toothNumber: number, siteKey: PerioSiteKey) => void;
	readonly onToggleSuppuration: (toothNumber: number, siteKey: PerioSiteKey) => void;
	readonly onSetProbingDepth: (toothNumber: number, siteKey: PerioSiteKey, depth: number) => void;
	readonly onSetGingivalMargin: (toothNumber: number, siteKey: PerioSiteKey, gm: number) => void;
}

export const PerioArchRow: React.FC<PerioArchRowProps> = React.memo(({
	title, subtitle, teethNumbers, isUpper, toothMap, selectedToothNumber, focusedSite, readOnly = false,
	onSelectTooth, onFocusSite, onCycleMobility, onCycleFurcation,
	onToggleBop, onTogglePlaque, onToggleSuppuration, onSetProbingDepth, onSetGingivalMargin,
}) => {
	return (
		<div className="flex flex-col gap-1 min-w-[760px]">
			<div className="flex items-center justify-between px-2 py-1 bg-[var(--paper-soft)] rounded-t-lg border-b border-[var(--line)] text-xs font-bold text-teal-400">
				<span>{title}</span>
				<span className="text-[10px] text-[var(--muted)]">{subtitle}</span>
			</div>
			<div className="grid grid-cols-16 gap-1 bg-[var(--paper-soft)]/40 p-2 rounded-b-xl border border-[var(--line)]">
				{teethNumbers.map((toothNumber) => {
					const tooth = toothMap.get(toothNumber);
					if (!tooth) return null;
					return (
						<PerioToothCard
							key={toothNumber}
							tooth={tooth}
							isUpper={isUpper}
							isSelected={selectedToothNumber === toothNumber}
							focusedSiteKey={focusedSite?.toothNumber === toothNumber ? focusedSite.siteKey : null}
							readOnly={readOnly}
							onSelectTooth={() => onSelectTooth(toothNumber)}
							onFocusSite={(siteKey) => onFocusSite(toothNumber, siteKey)}
							onCycleMobility={() => onCycleMobility(toothNumber)}
							onCycleFurcation={() => onCycleFurcation(toothNumber)}
							onToggleBop={(siteKey) => onToggleBop(toothNumber, siteKey)}
							onTogglePlaque={(siteKey) => onTogglePlaque(toothNumber, siteKey)}
							onToggleSuppuration={(siteKey) => onToggleSuppuration(toothNumber, siteKey)}
							onSetProbingDepth={(siteKey, depth) => onSetProbingDepth(toothNumber, siteKey, depth)}
							onSetGingivalMargin={(siteKey, gm) => onSetGingivalMargin(toothNumber, siteKey, gm)}
						/>
					);
				})}
			</div>
		</div>
	);
});

PerioArchRow.displayName = "PerioArchRow";
