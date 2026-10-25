/**
 * PerioMobileToothCard.tsx — Карточка выбранного зуба в мобильном кокпите (вестибулярная и оральная стороны).
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { calculateClinicalAttachmentLevel, isFurcationEligibleTooth, type PerioSiteKey, type PerioToothRecord } from "@dental/shared";
import React from "react";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols";
import { probingDepthClinicalClasses } from "../perioHeatmap";
import { SITE_SHORT_RU } from "./PerioToothCard";
import { PerioToothVisual } from "./PerioToothVisual";

export interface PerioMobileToothCardProps {
	readonly selectedTooth: PerioToothRecord; readonly focusedSiteKey: PerioSiteKey; readonly readOnly: boolean; readonly isUpper: boolean;
	readonly buccalSites: readonly PerioSiteKey[]; readonly lingualSites: readonly PerioSiteKey[];
	readonly onFocusSite: (num: number, key: PerioSiteKey) => void; readonly onCycleMobility: (num: number) => void; readonly onCycleFurcation: (num: number) => void;
	readonly updateToothProperties: (num: number, patch: Partial<Pick<PerioToothRecord, "isMissing" | "isImplant" | "mobility" | "furcation">>) => void;
}

export const PerioMobileToothCard: React.FC<PerioMobileToothCardProps> = React.memo(({
	selectedTooth, focusedSiteKey, readOnly, isUpper, buccalSites, lingualSites,
	onFocusSite, onCycleMobility, onCycleFurcation, updateToothProperties,
}) => {
	const num = selectedTooth.toothNumber;

	const renderSitesRow = (sites: readonly PerioSiteKey[], title: string) => (
		<div className="flex flex-col gap-1 w-full">
			<span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">{title}</span>
			<div className="grid grid-cols-3 gap-1.5 w-full">
				{sites.map((sKey) => {
					const site = selectedTooth[sKey] ?? { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false };
					const isFocused = focusedSiteKey === sKey;
					const pd = site.probingDepthMm ?? 0;
					const cal = calculateClinicalAttachmentLevel(pd, site.gingivalMarginMm ?? 0);

					return (
						<button
							key={sKey} type="button" onClick={() => onFocusSite(num, sKey)}
							className={`min-h-[56px] p-1.5 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
								isFocused ? "ring-2 ring-teal-500 bg-teal-500/20 border-teal-500 shadow-md scale-[1.02]" : probingDepthClinicalClasses(pd)
							}`}
							data-testid={`perio-sensor-${sKey}`}
						>
							<div className="w-full flex items-center justify-between text-[10px] font-semibold text-[var(--muted)]">
								<span>{SITE_SHORT_RU[sKey]}</span>
								<span className="text-[9px]">CAL {cal}</span>
							</div>
							<span className="text-xl font-black font-mono leading-none my-0.5">{pd} <span className="text-xs font-normal">мм</span></span>
							<div className="flex items-center gap-1">
								{site.bleedingOnProbing && <span className="w-2 h-2 rounded-full bg-rose-500" title="BOP" />}
								{site.plaque && <span className="w-2 h-2 rounded-full bg-amber-400" title="PLQ" />}
								{site.suppuration && <span className="w-2 h-2 rounded-full bg-indigo-500" title="PUS" />}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);

	return (
		<div className="p-3 rounded-2xl bg-[var(--paper)] border border-teal-500/30 shadow-sm flex flex-col gap-3 w-full">
			<div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 min-w-0">
					<span className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-300 font-black text-base flex items-center justify-center border border-teal-500/40 shrink-0">{num}</span>
					<div className="min-w-0">
						<h4 className="text-xs font-bold text-[var(--ink)] truncate">{getToothFolkAndAnatomicalNameRu(num)}</h4>
						<span className="text-[10px] text-[var(--muted)] block truncate">{selectedTooth.isMissing ? "Зуб отсутствует" : selectedTooth.isImplant ? "Имплантат" : "Естественный зуб"}</span>
					</div>
				</div>

				{!readOnly && (
					<div className="flex items-center gap-1.5 text-xs">
						<button
							type="button" onClick={() => updateToothProperties(num, { isMissing: !selectedTooth.isMissing })}
							className={`min-h-[44px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${selectedTooth.isMissing ? "bg-[var(--line-strong)] text-[var(--ink)]" : "bg-[var(--paper-soft)] text-[var(--muted)]"}`}
						>
							{selectedTooth.isMissing ? "Отсутствует" : "Отс."}
						</button>
						<button
							type="button" onClick={() => updateToothProperties(num, { isImplant: !selectedTooth.isImplant })}
							className={`min-h-[44px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${selectedTooth.isImplant ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-[var(--paper-soft)] text-[var(--muted)]"}`}
						>
							{selectedTooth.isImplant ? "Импл. +" : "Импл."}
						</button>
						<button
							type="button" onClick={() => onCycleMobility(num)}
							className={`min-h-[44px] px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${selectedTooth.mobility > 0 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-[var(--paper-soft)] text-[var(--muted)]"}`}
						>
							M {selectedTooth.mobility}
						</button>
						{isFurcationEligibleTooth(num) && (
							<button
								type="button" onClick={() => onCycleFurcation(num)}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${selectedTooth.furcation > 0 ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : "bg-[var(--paper-soft)] text-[var(--muted)]"}`}
							>
								F {selectedTooth.furcation}
							</button>
						)}
					</div>
				)}
			</div>

			{!selectedTooth.isMissing ? (
				<div className="flex flex-col gap-2 w-full">
					{renderSitesRow(buccalSites, "Вестибулярно (щечная / губная)")}
					<div className="w-full py-1 flex items-center justify-center">
						<PerioToothVisual toothNumber={num} isUpper={isUpper} isMissing={selectedTooth.isMissing} isImplant={selectedTooth.isImplant} buccalPd={selectedTooth.midBuccal?.probingDepthMm ?? 2} lingualPd={selectedTooth.midLingual?.probingDepthMm ?? 2} />
					</div>
					{renderSitesRow(lingualSites, "Орально (язычная / нёбная)")}
				</div>
			) : (
				<div className="py-6 text-center text-xs text-[var(--muted)]">Зуб #{num} отсутствует.</div>
			)}
		</div>
	);
});

PerioMobileToothCard.displayName = "PerioMobileToothCard";
