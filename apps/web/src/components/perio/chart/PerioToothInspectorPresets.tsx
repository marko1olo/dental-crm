/**
 * PerioToothInspectorPresets.tsx — Клинические экспресс-пресеты глубин для выбранного зуба.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { calculateClinicalAttachmentLevel, PERIO_SITE_KEYS, type PerioSiteKey, type PerioToothRecord } from "@dental/shared";
import React from "react";

export interface PerioToothInspectorPresetsProps {
	readonly selectedTooth: PerioToothRecord;
	readonly readOnly?: boolean | undefined;
	readonly onUpdateToothProperties: (
		toothNumber: number,
		patch: Partial<Pick<PerioToothRecord, "mobility" | "furcation">>,
	) => void;
	readonly onUpdateToothSite: (
		toothNumber: number,
		siteKey: PerioSiteKey,
		updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>,
	) => void;
}

export const PerioToothInspectorPresets: React.FC<PerioToothInspectorPresetsProps> = React.memo(({
	selectedTooth, readOnly = false, onUpdateToothProperties, onUpdateToothSite,
}) => {
	const num = selectedTooth.toothNumber;
	if (readOnly || selectedTooth.isMissing) return null;

	const setAllSites = (depth: number, bop: boolean, plq: boolean, calc = false, supp = false) => {
		for (const key of PERIO_SITE_KEYS) {
			onUpdateToothSite(num, key, (prev) => ({
				probingDepthMm: depth, bleedingOnProbing: bop, plaque: plq, calculus: calc, suppuration: supp,
				calMm: calculateClinicalAttachmentLevel(depth, prev.gingivalMarginMm ?? 0),
			}));
		}
	};

	return (
		<div className="flex flex-col gap-2 pt-2 pb-1 border-t border-[var(--line)]">
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] font-bold text-[var(--muted)] shrink-0">Пресеты #{num}:</span>
				<button
					type="button" onClick={() => { setAllSites(2, false, false); onUpdateToothProperties(num, { mobility: 0, furcation: 0 }); }}
					className="secondary-button text-[11px] !min-h-[28px] !h-7 !px-2.5 !bg-emerald-500/10 !text-emerald-700 dark:!text-emerald-300 !border-emerald-500/30 font-bold shrink-0"
					data-testid="btn-perio-preset-norm"
				>
					<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
					<span>1–2 мм (Норма)</span>
				</button>
				<button
					type="button" onClick={() => setAllSites(3, true, false)}
					className="secondary-button text-[11px] !min-h-[28px] !h-7 !px-2.5 !bg-amber-500/10 !text-amber-700 dark:!text-amber-300 !border-amber-500/30 font-bold shrink-0"
					data-testid="btn-perio-preset-gingivitis"
				>
					<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
					<span>3–4 мм (Гингивит)</span>
				</button>
				<button
					type="button" onClick={() => setAllSites(4, true, true, true)}
					className="secondary-button text-[11px] !min-h-[28px] !h-7 !px-2.5 !bg-orange-500/10 !text-orange-700 dark:!text-orange-300 !border-orange-500/30 font-bold shrink-0"
					data-testid="btn-perio-preset-pocket-4"
				>
					<span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
					<span>Карман 4 мм</span>
				</button>
				<button
					type="button" onClick={() => { setAllSites(5, true, true, true); onUpdateToothProperties(num, { mobility: 1 }); }}
					className="secondary-button text-[11px] !min-h-[28px] !h-7 !px-2.5 !bg-rose-500/10 !text-rose-700 dark:!text-rose-300 !border-rose-500/30 font-bold shrink-0"
					data-testid="btn-perio-preset-pocket-5"
				>
					<span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
					<span>5+ мм (Тяжелый)</span>
				</button>
				<button
					type="button" onClick={() => { setAllSites(7, true, true, true, true); onUpdateToothProperties(num, { mobility: 2 }); }}
					className="secondary-button text-[11px] !min-h-[28px] !h-7 !px-2.5 !bg-rose-500/10 !text-rose-700 dark:!text-rose-300 !border-rose-500/30 font-bold shrink-0"
					data-testid="inspector-focus-pocket-severe"
				>
					<span>Карман &ge; 6 мм (Гной)</span>
				</button>
				<button
					type="button" onClick={() => {
						for (const key of ["distoBuccal", "midBuccal", "mesioBuccal"] as const) {
							onUpdateToothSite(num, key, (prev) => ({ gingivalMarginMm: 2, calMm: calculateClinicalAttachmentLevel(prev.probingDepthMm ?? 2, 2) }));
						}
					}}
					className="secondary-button text-[11px] !min-h-[28px] !h-7 !px-2.5 !bg-purple-500/10 !text-purple-700 dark:!text-purple-300 !border-purple-500/30 font-bold shrink-0"
					data-testid="inspector-focus-recession-2mm"
				>
					<span>Рецессия +2 мм (GM)</span>
				</button>
			</div>

			{/* Depth dial 1..9 mm */}
			<div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-[var(--line)]/60">
				<span className="text-[11px] font-bold text-[var(--muted)] shrink-0 mr-1">Пульт глубины (1–9 мм):</span>
				{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
					<button
						key={val} type="button" disabled={readOnly}
						onClick={() => setAllSites(val, val > 4, false)}
						className={`min-w-[34px] h-7.5 rounded-lg font-black text-xs flex items-center justify-center border transition-all cursor-pointer shadow-2xs active:scale-95 ${
							val <= 3
								? "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
								: val === 4
									? "bg-amber-500/20 hover:bg-amber-500/35 text-amber-800 dark:text-amber-300 border-amber-500/40"
									: "bg-red-600/25 hover:bg-red-600/40 text-red-800 dark:text-red-200 border-red-500/50 ring-1 ring-red-500/30 font-black shadow-xs"
						}`}
						data-testid={`inspector-depth-${val}`}
					>
						{val}
					</button>
				))}
			</div>
		</div>
	);
});

PerioToothInspectorPresets.displayName = "PerioToothInspectorPresets";
