/**
 * PerioToothInspectorSiteDetails.tsx — Быстрый выбор глубины кармана (1–12 мм) для выбранной точки.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { calculateClinicalAttachmentLevel, type PerioSiteKey, type PerioToothRecord } from "@dental/shared";
import React from "react";

export const SITE_NAMES_RU: Record<PerioSiteKey, string> = {
	distoBuccal: "Дистально-вестибулярно (ДВ)",
	midBuccal: "Вестибулярно по центру (В)",
	mesioBuccal: "Медиально-вестибулярно (МВ)",
	distoLingual: "Дистально-орально (ДО)",
	midLingual: "Орально по центру (О)",
	mesioLingual: "Медиально-орально (МО)",
};

export interface PerioToothInspectorSiteDetailsProps {
	readonly selectedTooth: PerioToothRecord;
	readonly activeSiteKey: PerioSiteKey;
	readonly readOnly?: boolean | undefined;
	readonly onUpdateToothSite: (
		toothNumber: number, siteKey: PerioSiteKey,
		updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>,
	) => void;
}

const DEPTH_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const PerioToothInspectorSiteDetails: React.FC<PerioToothInspectorSiteDetailsProps> = React.memo(({
	selectedTooth, activeSiteKey, readOnly = false, onUpdateToothSite,
}) => {
	const currentSite = selectedTooth[activeSiteKey];

	return (
		<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2">
			<div className="flex items-center justify-between text-xs font-bold text-[var(--ink)]">
				<span className="text-[12px]">
					Ввод глубины для: <strong className="text-teal-600 dark:text-teal-400">{SITE_NAMES_RU[activeSiteKey] || activeSiteKey}</strong>
				</span>
				<span className="text-[11.5px] text-[var(--muted)] font-normal">Шкала: 1–12 мм</span>
			</div>
			<div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
				{DEPTH_VALUES.map((numVal) => {
					const isSelectedVal = currentSite?.probingDepthMm === numVal;
					const isNorm = numVal <= 3;
					const isBorderline = numVal === 4;
					return (
						<button
							key={numVal} type="button" aria-disabled={readOnly}
							onClick={() => !readOnly && onUpdateToothSite(selectedTooth.toothNumber, activeSiteKey, (prev) => ({
								probingDepthMm: numVal,
								bleedingOnProbing: numVal > 4 ? true : prev.bleedingOnProbing,
								calMm: calculateClinicalAttachmentLevel(numVal, prev.gingivalMarginMm ?? 0),
							}))}
							className={`h-9 rounded-lg font-black text-[13px] transition-all cursor-pointer flex items-center justify-center border active:scale-95 ${
								isSelectedVal
									? "bg-teal-600 text-white border-teal-500 shadow-xs ring-2 ring-teal-400"
									: isNorm
										? "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
										: isBorderline
											? "bg-amber-500/20 hover:bg-amber-500/35 text-amber-800 dark:text-amber-300 border-amber-500/40"
											: "bg-red-600/25 hover:bg-red-600/40 text-red-800 dark:text-red-200 border-red-500/50 shadow-xs"
							}`}
							title={`Глубина ${numVal} мм для ${SITE_NAMES_RU[activeSiteKey]}`}
							data-testid={`inspector-site-depth-${numVal}`}
						>
							{numVal}
						</button>
					);
				})}
			</div>
		</div>
	);
});

PerioToothInspectorSiteDetails.displayName = "PerioToothInspectorSiteDetails";
