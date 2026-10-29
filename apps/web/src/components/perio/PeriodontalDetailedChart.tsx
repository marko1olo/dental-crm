/**
 * PeriodontalDetailedChart.tsx — Углубленная пародонтологическая карта по требованию
 * Разворачиваемая сетка зубов и 6 точек зондирования (Мандат 8e, 8b: <= 180 строк).
 */

import React, { useState } from "react";
import type { DetailedPerioTooth, PerioSiteDetail } from "./perioTypes";
import { LOWER_TEETH, SITES, type SiteKey, UPPER_TEETH } from "./perioCatalogData";

export interface PeriodontalDetailedChartProps {
	readonly teeth: readonly DetailedPerioTooth[];
	readonly onUpdateTooth?: (updated: DetailedPerioTooth) => void;
	readonly readOnly?: boolean | undefined;
	readonly defaultSelectedTooth?: number;
}

export function createDefaultToothRecord(toothNumber: number): DetailedPerioTooth {
	const normalSite: PerioSiteDetail = {
		probingDepthMm: 2,
		gingivalMarginMm: 0,
		bleedingOnProbing: false,
		plaque: false,
		calculus: false,
		suppuration: false,
		calMm: 2,
	};
	return {
		toothNumber,
		isMissing: false,
		isImplant: false,
		mobility: 0,
		furcation: 0,
		distoBuccal: { ...normalSite },
		midBuccal: { ...normalSite },
		mesioBuccal: { ...normalSite },
		distoLingual: { ...normalSite },
		midLingual: { ...normalSite },
		mesioLingual: { ...normalSite },
	};
}

export const PeriodontalDetailedChart: React.FC<PeriodontalDetailedChartProps> = React.memo(({
	teeth,
	onUpdateTooth,
	readOnly = false,
	defaultSelectedTooth = 16,
}) => {
	const [selectedToothNum, setSelectedToothNum] = useState<number>(defaultSelectedTooth);
	const [selectedSiteKey, setSelectedSiteKey] = useState<SiteKey>("distoBuccal");

	const currentTooth = teeth.find((t) => t.toothNumber === selectedToothNum) || createDefaultToothRecord(selectedToothNum);

	const handleDepthChange = (depth: number) => {
		if (readOnly || !onUpdateTooth) return;
		const site = currentTooth[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false };
		const updated: DetailedPerioTooth = {
			...currentTooth,
			[selectedSiteKey]: { ...site, probingDepthMm: depth, calMm: depth + (site.gingivalMarginMm || 0) },
		};
		onUpdateTooth(updated);
	};

	const handleBopToggle = () => {
		if (readOnly || !onUpdateTooth) return;
		const site = currentTooth[selectedSiteKey] || { probingDepthMm: 2, bleedingOnProbing: false };
		const updated: DetailedPerioTooth = {
			...currentTooth,
			[selectedSiteKey]: { ...site, bleedingOnProbing: !site.bleedingOnProbing },
		};
		onUpdateTooth(updated);
	};

	return (
		<div className="flex flex-col gap-3 w-full">
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2 overflow-x-auto">
				{[UPPER_TEETH, LOWER_TEETH].map((row, rIdx) => (
					<div key={rIdx} className="flex items-center gap-1 min-w-max pb-1">
						<span className="text-[11px] font-bold text-[var(--muted)] w-8">{rIdx === 0 ? "ВЧ:" : "НЧ:"}</span>
						{row.map((num) => {
							const isSelected = selectedToothNum === num;
							return (
								<button
									key={num}
									type="button"
									onClick={() => setSelectedToothNum(num)}
									disabled={readOnly}
									data-testid={`perio-tooth-btn-${num}`}
									className={`min-h-[44px] min-w-[44px] w-9 h-11 rounded-lg text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all border ${
										isSelected ? "bg-[#0d9488] text-white border-[#0f766e] ring-2 ring-[#0d9488]/40" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
									}`}
								>
									<span>{num}</span>
									<span className="text-[10px] opacity-70">2мм</span>
								</button>
							);
						})}
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="font-bold text-sm text-[var(--ink)]">Зуб #{selectedToothNum} — 6 точек зондирования</span>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{SITES.map((site) => {
							const isCurrentSite = selectedSiteKey === site.key;
							const data = currentTooth[site.key] || { probingDepthMm: 2, bleedingOnProbing: false };
							return (
								<button
									key={site.key}
									type="button"
									onClick={() => setSelectedSiteKey(site.key)}
									disabled={readOnly}
									className={`min-h-[44px] p-2.5 rounded-xl flex flex-col items-start gap-1 text-left border cursor-pointer transition-all ${
										isCurrentSite ? "bg-[#0d9488]/15 border-[#0d9488] text-[var(--ink)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
									}`}
								>
									<div className="flex items-center justify-between w-full">
										<span className="text-xs font-bold">{site.label}</span>
										{data.bleedingOnProbing && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />}
									</div>
									<div className="text-sm font-bold text-[#0d9488]">{data.probingDepthMm || 2} мм</div>
								</button>
							);
						})}
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--muted)]">Ввод глубины: {SITES.find((s) => s.key === selectedSiteKey)?.label}</span>
						<button
							type="button"
							onClick={handleBopToggle}
							disabled={readOnly}
							className={`min-h-[44px] min-w-[44px] px-3 rounded-lg font-bold text-xs flex items-center gap-1.5 border cursor-pointer transition-all ${
								currentTooth[selectedSiteKey]?.bleedingOnProbing ? "bg-rose-500 text-white border-rose-600" : "bg-[var(--paper)] text-rose-600 dark:text-rose-400 border-[var(--line)]"
							}`}
						>
							BOP (Кровоточивость)
						</button>
					</div>
					<div className="grid grid-cols-3 gap-1.5">
						{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
							<button
								key={val}
								type="button"
								onClick={() => handleDepthChange(val)}
								disabled={readOnly}
								className="min-h-[44px] min-w-[44px] h-12 rounded-xl text-base font-bold flex items-center justify-center cursor-pointer transition-all border bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
							>
								{val} мм
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
});

PeriodontalDetailedChart.displayName = "PeriodontalDetailedChart";
export default PeriodontalDetailedChart;
