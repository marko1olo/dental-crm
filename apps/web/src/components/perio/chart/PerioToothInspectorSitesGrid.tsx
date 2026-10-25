/**
 * PerioToothInspectorSitesGrid.tsx — 6 точек зондирования зуба со степперами PD/GM и маркерами.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { calculateClinicalAttachmentLevel, PERIO_SITES_CONFIG, type PerioSiteKey, type PerioToothRecord } from "@dental/shared";
import React from "react";
import { probingDepthClinicalTone } from "../perioHeatmap";

export interface PerioToothInspectorSitesGridProps {
	readonly selectedTooth: PerioToothRecord;
	readonly activeSiteKey: PerioSiteKey;
	readonly onSetActiveSiteKey: (key: PerioSiteKey) => void;
	readonly readOnly?: boolean | undefined;
	readonly onUpdateToothSite: (toothNumber: number, siteKey: PerioSiteKey, updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>) => void;
}

export const PerioToothInspectorSitesGrid: React.FC<PerioToothInspectorSitesGridProps> = React.memo(({
	selectedTooth, activeSiteKey, onSetActiveSiteKey, readOnly = false, onUpdateToothSite,
}) => {
	const num = selectedTooth.toothNumber;

	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
			{PERIO_SITES_CONFIG.map((siteCfg) => {
				const site = selectedTooth[siteCfg.key] ?? {
					probingDepthMm: 2, gingivalMarginMm: 0,
					bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false,
				};
				const pd = site.probingDepthMm ?? 0;
				const gm = site.gingivalMarginMm ?? 0;
				const cal = calculateClinicalAttachmentLevel(pd, gm);
				const isSelected = activeSiteKey === siteCfg.key;

				return (
					<div
						key={siteCfg.key}
						onClick={() => onSetActiveSiteKey(siteCfg.key)}
						className={`p-2.5 rounded-lg border flex flex-col gap-1.5 transition-all cursor-pointer ${
							isSelected ? "ring-2 ring-teal-500 border-teal-500 bg-teal-500/15 shadow-xs" : "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/50"
						}`}
					>
						<div className="flex items-center justify-between text-[11px] font-bold text-teal-400">
							<span>{siteCfg.shortKey}</span>
							<span className="text-[10px] text-[var(--muted)] font-normal">CAL: {cal} мм</span>
						</div>

						{/* PD Stepper */}
						<div className="flex items-center justify-between text-xs">
							<span className="text-[10px] text-[var(--muted)]">PD:</span>
							<div className="flex items-center gap-1">
								{!readOnly && (
									<button
										type="button"
										onClick={() => onUpdateToothSite(num, siteCfg.key, (prev) => ({ probingDepthMm: Math.max(0, (prev.probingDepthMm ?? 0) - 1) }))}
										className="w-6 h-6 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
									>-</button>
								)}
								<span className={`w-6 text-center font-mono font-bold ${probingDepthClinicalTone(pd) === "success" ? "text-emerald-400" : probingDepthClinicalTone(pd) === "warning-low" ? "text-amber-400" : "text-rose-400"}`}>{pd}</span>
								{!readOnly && (
									<button
										type="button"
										onClick={() => onUpdateToothSite(num, siteCfg.key, (prev) => ({ probingDepthMm: Math.min(15, (prev.probingDepthMm ?? 0) + 1) }))}
										className="w-6 h-6 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
									>+</button>
								)}
							</div>
						</div>

						{/* GM Stepper */}
						<div className="flex items-center justify-between text-xs">
							<span className="text-[10px] text-[var(--muted)]">GM:</span>
							<div className="flex items-center gap-1">
								{!readOnly && (
									<button
										type="button"
										onClick={() => onUpdateToothSite(num, siteCfg.key, (prev) => ({ gingivalMarginMm: (prev.gingivalMarginMm ?? 0) - 1 }))}
										className="w-6 h-6 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
									>-</button>
								)}
								<span className="w-6 text-center font-mono text-[11px] text-[var(--ink)]">{gm > 0 ? `+${gm}` : gm}</span>
								{!readOnly && (
									<button
										type="button"
										onClick={() => onUpdateToothSite(num, siteCfg.key, (prev) => ({ gingivalMarginMm: (prev.gingivalMarginMm ?? 0) + 1 }))}
										className="w-6 h-6 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
									>+</button>
								)}
							</div>
						</div>

						{/* BOP, PLQ, PUS */}
						<div className="flex items-center justify-between pt-1 border-t border-[var(--line)] gap-1">
							<button
								type="button" disabled={readOnly}
								onClick={() => onUpdateToothSite(num, siteCfg.key, (p) => ({ bleedingOnProbing: !p.bleedingOnProbing }))}
								className={`flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-all ${site.bleedingOnProbing ? "bg-rose-500 text-white" : "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"}`}
							>BOP</button>
							<button
								type="button" disabled={readOnly}
								onClick={() => onUpdateToothSite(num, siteCfg.key, (p) => ({ plaque: !p.plaque }))}
								className={`flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-all ${site.plaque ? "bg-amber-500 text-slate-950 font-black" : "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"}`}
							>PLQ</button>
							<button
								type="button" disabled={readOnly}
								onClick={() => onUpdateToothSite(num, siteCfg.key, (p) => ({ suppuration: !p.suppuration }))}
								className={`flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-all ${site.suppuration ? "bg-indigo-500 text-white" : "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"}`}
							>PUS</button>
						</div>
					</div>
				);
			})}
		</div>
	);
});

PerioToothInspectorSitesGrid.displayName = "PerioToothInspectorSitesGrid";
