/**
 * PerioToothCardSitesRow.tsx — Ряд 3 точек зондирования (вестибулярный или оральный) в карточке зуба.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { calculateClinicalAttachmentLevel, type PerioSiteKey, type PerioToothRecord } from "@dental/shared";
import React from "react";
import { probingDepthClinicalClasses } from "../perioHeatmap";

export const SITE_SHORT_RU: Record<PerioSiteKey, string> = {
	distoBuccal: "ДВ", midBuccal: "В", mesioBuccal: "МВ",
	distoLingual: "ДО", midLingual: "О", mesioLingual: "МО",
};

export interface PerioToothCardSitesRowProps {
	readonly tooth: PerioToothRecord;
	readonly siteKeys: readonly PerioSiteKey[];
	readonly focusedSiteKey: PerioSiteKey | null;
	readonly readOnly: boolean;
	readonly onFocusSite: (siteKey: PerioSiteKey) => void;
	readonly onToggleBop: (siteKey: PerioSiteKey) => void;
	readonly onTogglePlaque: (siteKey: PerioSiteKey) => void;
}

export const PerioToothCardSitesRow: React.FC<PerioToothCardSitesRowProps> = React.memo(({
	tooth, siteKeys, focusedSiteKey, readOnly, onFocusSite, onToggleBop, onTogglePlaque,
}) => {
	return (
		<div className="grid grid-cols-3 gap-0.5 w-full">
			{siteKeys.map((sKey) => {
				const site = tooth[sKey] ?? {
					probingDepthMm: 2, gingivalMarginMm: 0,
					bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false,
				};
				const isFocused = focusedSiteKey === sKey;
				const pd = site.probingDepthMm ?? 0;

				return (
					<div
						key={sKey}
						onClick={(e) => { e.stopPropagation(); onFocusSite(sKey); }}
						className={`flex flex-col items-center justify-center py-0.5 px-0.5 rounded border transition-all ${
							isFocused ? "ring-2 ring-teal-400 bg-teal-500/25 border-teal-400 shadow-xs" : probingDepthClinicalClasses(pd)
						}`}
						title={`${SITE_SHORT_RU[sKey]}: карман ${pd} мм, CAL ${calculateClinicalAttachmentLevel(pd, site.gingivalMarginMm ?? 0)} мм`}
					>
						<span className="text-[7px] font-mono text-[var(--muted)] font-semibold leading-none select-none">{SITE_SHORT_RU[sKey]}</span>
						<span className="font-mono text-[10px] font-black leading-none mt-0.5">{pd}</span>
						<div className="flex items-center gap-1 mt-0.5">
							<button
								type="button" aria-disabled={readOnly}
								onClick={(e) => { e.stopPropagation(); if (!readOnly) onToggleBop(sKey); }}
								className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
									site.bleedingOnProbing
										? "bg-rose-500 border-rose-300 text-white shadow-xs ring-1 ring-rose-300"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-rose-500/50 hover:border-rose-400"
								}`}
								title="BOP" aria-label="BOP"
							>
								{site.bleedingOnProbing && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
							</button>
							<button
								type="button" aria-disabled={readOnly}
								onClick={(e) => { e.stopPropagation(); if (!readOnly) onTogglePlaque(sKey); }}
								className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
									site.plaque
										? "bg-amber-400 border-amber-200 text-slate-950 shadow-xs ring-1 ring-amber-200"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-amber-400/50 hover:border-amber-300"
								}`}
								title="PLQ" aria-label="PLQ"
							>
								{site.plaque && <span className="w-1.5 h-1.5 rounded-full bg-amber-950 block" />}
							</button>
						</div>
					</div>
				);
			})}
		</div>
	);
});

PerioToothCardSitesRow.displayName = "PerioToothCardSitesRow";
