/**
 * PerioArchGrid.tsx — Двухрядная сетка верхней и нижней челюстей (32 зуба, 192 точки).
 * Архитектурный слой Layer 5: Facade (Мандат 8b, <= 120 строк).
 */

import {
	PERIO_LOWER_ARCH_TEETH,
	PERIO_UPPER_ARCH_TEETH,
	type PerioSiteKey,
	type PerioToothRecord,
} from "@dental/shared";
import { Layers } from "lucide-react";
import React from "react";
import { PerioProbe } from "../../icons/DentalIcons";
import { PerioArchFilterBar, type PerioArchFilterType } from "./PerioArchFilterBar";
import { PerioArchRow } from "./PerioArchRow";

export type { PerioArchFilterType };

export interface PerioArchGridProps {
	readonly isTier3ProbingExpanded: boolean;
	readonly onExpandTier3: () => void;
	readonly archFilter: PerioArchFilterType;
	readonly onSetArchFilter: (filter: PerioArchFilterType) => void;
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

export const PerioArchGrid: React.FC<PerioArchGridProps> = React.memo(({
	isTier3ProbingExpanded, onExpandTier3, archFilter, onSetArchFilter,
	toothMap, selectedToothNumber, focusedSite, readOnly = false,
	onSelectTooth, onFocusSite, onCycleMobility, onCycleFurcation,
	onToggleBop, onTogglePlaque, onToggleSuppuration, onSetProbingDepth, onSetGingivalMargin,
}) => {
	if (!isTier3ProbingExpanded) {
		return (
			<div className="p-4 rounded-2xl bg-[var(--paper-soft)]/70 border border-dashed border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
				<div className="flex items-center gap-3">
					<div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 shrink-0"><Layers size={22} /></div>
					<div className="flex flex-col gap-0.5">
						<span className="text-sm font-black text-[var(--ink)]">6 точек зондирования (углублённый осмотр по требованию)</span>
						<span className="text-xs text-[var(--muted)]">Доступно в расширенном режиме. На обычном приёме используйте экспресс-скрининг выше.</span>
					</div>
				</div>
				<button
					type="button" onClick={onExpandTier3}
					className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-black transition-all cursor-pointer shrink-0 active:scale-95 flex items-center justify-center gap-1.5"
					data-testid="expand-perio-chart-tier3-btn"
				>
					<PerioProbe size={16} />
					<span>Развернуть 6 точек зондирования</span>
				</button>
			</div>
		);
	}

	const showUpper = archFilter === "all" || archFilter === "upper" || archFilter === "S1" || archFilter === "S2" || archFilter === "S3";
	const showLower = archFilter === "all" || archFilter === "lower" || archFilter === "S4" || archFilter === "S5" || archFilter === "S6";

	return (
		<div className="flex flex-col gap-4 overflow-x-auto pb-2">
			<PerioArchFilterBar archFilter={archFilter} onSetArchFilter={onSetArchFilter} />

			{showUpper && (
				<PerioArchRow
					title="ВЕРХНЯЯ ЧЕЛЮСТЬ (МАКСИЛЛА) • 18–11 | 21–28"
					subtitle="Вестибулярно (ДВ • В • МВ) / Небно (ДО • О • МО)"
					teethNumbers={PERIO_UPPER_ARCH_TEETH}
					isUpper={true}
					toothMap={toothMap}
					selectedToothNumber={selectedToothNumber}
					focusedSite={focusedSite}
					readOnly={readOnly}
					onSelectTooth={onSelectTooth}
					onFocusSite={onFocusSite}
					onCycleMobility={onCycleMobility}
					onCycleFurcation={onCycleFurcation}
					onToggleBop={onToggleBop}
					onTogglePlaque={onTogglePlaque}
					onToggleSuppuration={onToggleSuppuration}
					onSetProbingDepth={onSetProbingDepth}
					onSetGingivalMargin={onSetGingivalMargin}
				/>
			)}

			{showLower && (
				<PerioArchRow
					title="НИЖНЯЯ ЧЕЛЮСТЬ (МАНДИБУЛА) • 48–41 | 31–38"
					subtitle="Вестибулярно (ДВ • В • МВ) / Язычно (ДО • О • МО)"
					teethNumbers={PERIO_LOWER_ARCH_TEETH}
					isUpper={false}
					toothMap={toothMap}
					selectedToothNumber={selectedToothNumber}
					focusedSite={focusedSite}
					readOnly={readOnly}
					onSelectTooth={onSelectTooth}
					onFocusSite={onFocusSite}
					onCycleMobility={onCycleMobility}
					onCycleFurcation={onCycleFurcation}
					onToggleBop={onToggleBop}
					onTogglePlaque={onTogglePlaque}
					onToggleSuppuration={onToggleSuppuration}
					onSetProbingDepth={onSetProbingDepth}
					onSetGingivalMargin={onSetGingivalMargin}
				/>
			)}
		</div>
	);
});

PerioArchGrid.displayName = "PerioArchGrid";
